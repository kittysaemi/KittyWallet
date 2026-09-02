import { randomUUID } from "crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { Account, Transaction } from "@prisma/client";
import { AppException } from "../../../common/exceptions/app.exception";
import { getTodayInTimezone } from "../../../common/utils/date.util";
import {
  BalanceCandidateEntry,
  calculateBalanceAtDate,
  excludeTransactions,
  minimumAllowedBalance
} from "../domain/balance-at-date.util";
import {
  TransferBalanceViolationError,
  TransferPairCorruptedError,
  TransferPairNotFoundError
} from "../domain/errors";
import { BalanceChange, PrismaClientOrTx, TransferRepository } from "../infrastructure/transfer.repository";

export interface CreateTransferCommand {
  userId: bigint;
  fromAccountId: bigint;
  toAccountId: bigint;
  amount: number;
  transactionDate: string;
  memo?: string;
  timezone?: string;
}

export interface UpdateTransferCommand {
  userId: bigint;
  transferGroupId: string;
  fromAccountId?: number;
  toAccountId?: number;
  amount?: number;
  transactionDate?: string;
  memo?: string | null;
  timezone?: string;
}

export interface TransferResult {
  transfer_group_id: string;
  from_transaction_id: number;
  to_transaction_id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  transaction_date: string;
  updated_at: string;
}

@Injectable()
export class TransferService {
  constructor(private readonly transferRepository: TransferRepository) {}

  async createTransfer(command: CreateTransferCommand): Promise<TransferResult> {
    if (command.amount <= 0) {
      throw new AppException("TRANSFER_002", "이동 금액은 0보다 커야 합니다.", HttpStatus.BAD_REQUEST);
    }
    if (command.fromAccountId === command.toAccountId) {
      throw new AppException(
        "TRANSFER_001",
        "보내는 계좌와 받는 계좌는 서로 달라야 합니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const todayStr = getTodayInTimezone(command.timezone);
    if (command.transactionDate > todayStr) {
      throw new AppException("TX_001", "미래 날짜는 등록할 수 없습니다.", HttpStatus.BAD_REQUEST);
    }

    const transactionDate = new Date(command.transactionDate);
    const now = new Date();
    const transferGroupId = randomUUID();

    try {
      const { fromTransaction, toTransaction } = await this.transferRepository.runInTransaction(
        async (tx) => {
          const accountIds = [command.fromAccountId, command.toAccountId];
          await this.transferRepository.lockAccounts(tx, accountIds);

          const accounts = await this.transferRepository.findAccountsByIds(tx, accountIds, command.userId);
          const accountMap = this.toAccountMap(accounts);
          const fromAccount = this.assertActiveAccount(accountMap.get(command.fromAccountId.toString()));
          const toAccount = this.assertActiveAccount(accountMap.get(command.toAccountId.toString()));

          const category = await this.transferRepository.findOrCreateTransferCategory(tx, command.userId);

          await this.assertPointInTimeBalance(tx, command.userId, fromAccount, [], transactionDate, [
            { transactionType: "EXPENSE", amount: command.amount, transactionDate }
          ]);

          return this.transferRepository.createTransferPair(tx, {
            userId: command.userId,
            categoryId: category.categoryId,
            fromAccountId: fromAccount.accountId,
            toAccountId: toAccount.accountId,
            amount: command.amount,
            transactionDate,
            memo: command.memo ?? null,
            transferGroupId,
            now
          });
        }
      );

      return this.toTransferResult(fromTransaction, toTransaction);
    } catch (err) {
      return this.mapError(err);
    }
  }

  async updateTransfer(command: UpdateTransferCommand): Promise<TransferResult> {
    const hasUpdate =
      command.fromAccountId !== undefined ||
      command.toAccountId !== undefined ||
      command.amount !== undefined ||
      command.transactionDate !== undefined ||
      command.memo !== undefined;
    if (!hasUpdate) {
      throw new AppException(
        "VALIDATION_001",
        "수정 가능한 필드가 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    if (command.amount !== undefined && command.amount <= 0) {
      throw new AppException("TRANSFER_002", "이동 금액은 0보다 커야 합니다.", HttpStatus.BAD_REQUEST);
    }

    const todayStr = getTodayInTimezone(command.timezone);
    if (command.transactionDate && command.transactionDate > todayStr) {
      throw new AppException("TX_001", "미래 날짜는 등록할 수 없습니다.", HttpStatus.BAD_REQUEST);
    }

    try {
      const { fromTransaction, toTransaction } = await this.transferRepository.runInTransaction(
        async (tx) => {
          const pairRows = await this.transferRepository.findTransferPair(
            tx,
            command.userId,
            command.transferGroupId
          );
          this.assertPairIntegrity(pairRows);
          const [oldFromTx, oldToTx] = this.splitPair(pairRows);

          await this.transferRepository.lockTransactions(tx, [
            oldFromTx.transactionId,
            oldToTx.transactionId
          ]);

          const newFromAccountId =
            command.fromAccountId !== undefined ? BigInt(command.fromAccountId) : oldFromTx.walletId;
          const newToAccountId =
            command.toAccountId !== undefined ? BigInt(command.toAccountId) : oldToTx.walletId;
          const newAmount = command.amount ?? oldFromTx.amount.toNumber();
          const newDate = command.transactionDate ? new Date(command.transactionDate) : oldFromTx.transactionDate;
          const oldDate = oldFromTx.transactionDate;

          if (newFromAccountId === newToAccountId) {
            throw new AppException(
              "TRANSFER_001",
              "보내는 계좌와 받는 계좌는 서로 달라야 합니다.",
              HttpStatus.BAD_REQUEST
            );
          }

          const affectedAccountIds = this.uniqueIds([
            oldFromTx.walletId,
            oldToTx.walletId,
            newFromAccountId,
            newToAccountId
          ]);
          await this.transferRepository.lockAccounts(tx, affectedAccountIds);

          const accounts = await this.transferRepository.findAccountsByIds(
            tx,
            affectedAccountIds,
            command.userId
          );
          const accountMap = this.toAccountMap(accounts);
          const newFromAccount = this.assertActiveAccount(accountMap.get(newFromAccountId.toString()));
          this.assertActiveAccount(accountMap.get(newToAccountId.toString()));

          const excludeIds = [oldFromTx.transactionId, oldToTx.transactionId];

          // 새 보내는 계좌는 항상 시점 기준 잔액 검증이 필요하다(지출 발생/증가 가능성).
          await this.assertPointInTimeBalance(tx, command.userId, newFromAccount, excludeIds, newDate, [
            { transactionType: "EXPENSE", amount: newAmount, transactionDate: newDate }
          ]);

          // 받는 계좌가 바뀌는 경우, 예전 받는 계좌는 수입이 사라지므로 예전 날짜 기준으로도 재검증한다.
          if (oldToTx.walletId !== newToAccountId) {
            const oldToAccount = accountMap.get(oldToTx.walletId.toString());
            if (!oldToAccount) {
              throw new AppException(
                "TX_003",
                "존재하지 않는 계좌입니다.",
                HttpStatus.NOT_FOUND
              );
            }
            await this.assertPointInTimeBalance(tx, command.userId, oldToAccount, excludeIds, oldDate, []);
          }

          const balanceChanges = this.buildUpdateBalanceChanges({
            oldFromAccountId: oldFromTx.walletId,
            oldToAccountId: oldToTx.walletId,
            oldAmount: oldFromTx.amount.toNumber(),
            newFromAccountId,
            newToAccountId,
            newAmount
          });

          const hasMemoUpdate = command.memo !== undefined;

          return this.transferRepository.updateTransferPair(
            tx,
            {
              fromTransactionId: oldFromTx.transactionId,
              toTransactionId: oldToTx.transactionId,
              fromAccountId: newFromAccountId,
              toAccountId: newToAccountId,
              amount: newAmount,
              transactionDate: newDate,
              memo: hasMemoUpdate ? (command.memo ?? null) : undefined,
              hasMemoUpdate
            },
            balanceChanges
          );
        }
      );

      return this.toTransferResult(fromTransaction, toTransaction);
    } catch (err) {
      return this.mapError(err);
    }
  }

  async deleteTransfer(userId: bigint, transferGroupId: string): Promise<null> {
    try {
      await this.transferRepository.runInTransaction(async (tx) => {
        const pairRows = await this.transferRepository.findTransferPair(tx, userId, transferGroupId);
        this.assertPairIntegrity(pairRows);
        const [fromTx, toTx] = this.splitPair(pairRows);

        await this.transferRepository.lockTransactions(tx, [fromTx.transactionId, toTx.transactionId]);
        await this.transferRepository.lockAccounts(tx, [fromTx.walletId, toTx.walletId]);

        const accounts = await this.transferRepository.findAccountsByIds(
          tx,
          [fromTx.walletId, toTx.walletId],
          userId
        );
        const accountMap = this.toAccountMap(accounts);
        const toAccount = accountMap.get(toTx.walletId.toString());
        if (!toAccount) {
          throw new AppException("TX_003", "존재하지 않는 계좌입니다.", HttpStatus.NOT_FOUND);
        }

        // 받는 계좌는 수입이 사라지므로, 삭제 전 날짜 기준으로 재검증한다.
        await this.assertPointInTimeBalance(
          tx,
          userId,
          toAccount,
          [fromTx.transactionId, toTx.transactionId],
          fromTx.transactionDate,
          []
        );

        const balanceChanges: BalanceChange[] = [
          { accountId: fromTx.walletId, delta: fromTx.amount.toNumber() },
          { accountId: toTx.walletId, delta: -toTx.amount.toNumber() }
        ];

        await this.transferRepository.deleteTransferPair(
          tx,
          fromTx.transactionId,
          toTx.transactionId,
          balanceChanges
        );
      });
    } catch (err) {
      this.mapError(err);
    }

    return null;
  }

  async getTransfer(userId: bigint, transferGroupId: string): Promise<TransferResult> {
    const pairRows = await this.transferRepository.findTransferPairReadOnly(userId, transferGroupId);

    try {
      this.assertPairIntegrity(pairRows);
    } catch (err) {
      return this.mapError(err);
    }

    const [fromTx, toTx] = this.splitPair(pairRows);
    return this.toTransferResult(fromTx, toTx);
  }

  private toAccountMap(accounts: Account[]): Map<string, Account> {
    return new Map(accounts.map((account) => [account.accountId.toString(), account]));
  }

  private assertActiveAccount(account: Account | undefined): Account {
    if (!account || account.deletedYn) {
      throw new AppException("TX_003", "존재하지 않는 계좌입니다.", HttpStatus.NOT_FOUND);
    }
    return account;
  }

  private uniqueIds(ids: bigint[]): bigint[] {
    return Array.from(new Set(ids.map((id) => id.toString()))).map((id) => BigInt(id));
  }

  private assertPairIntegrity(pairRows: Transaction[]): void {
    if (pairRows.length === 0) {
      throw new TransferPairNotFoundError();
    }
    if (pairRows.length !== 2) {
      throw new TransferPairCorruptedError();
    }
    const [a, b] = pairRows;
    if (a.walletType !== "ACCOUNT" || b.walletType !== "ACCOUNT") {
      throw new TransferPairCorruptedError();
    }
    const types = new Set([a.transactionType, b.transactionType]);
    if (!types.has("EXPENSE") || !types.has("INCOME")) {
      throw new TransferPairCorruptedError();
    }
    if (!a.amount.equals(b.amount)) {
      throw new TransferPairCorruptedError();
    }
    if (a.transactionDate.getTime() !== b.transactionDate.getTime()) {
      throw new TransferPairCorruptedError();
    }
  }

  private splitPair(pairRows: Transaction[]): [Transaction, Transaction] {
    const fromTx = pairRows.find((t) => t.transactionType === "EXPENSE");
    const toTx = pairRows.find((t) => t.transactionType === "INCOME");
    if (!fromTx || !toTx) {
      throw new TransferPairCorruptedError();
    }
    return [fromTx, toTx];
  }

  private async assertPointInTimeBalance(
    tx: PrismaClientOrTx,
    userId: bigint,
    account: Account,
    excludeTransactionIds: bigint[],
    asOfDate: Date,
    candidates: BalanceCandidateEntry[]
  ): Promise<void> {
    const ledger = await this.transferRepository.findAccountLedger(tx, account.accountId, userId);
    const filtered = excludeTransactions(
      ledger.map((t) => ({
        transactionId: t.transactionId,
        transactionType: t.transactionType as "INCOME" | "EXPENSE",
        amount: t.amount.toNumber(),
        transactionDate: t.transactionDate
      })),
      excludeTransactionIds
    );
    const projectedBalance = calculateBalanceAtDate(
      account.initialBalance.toNumber(),
      filtered,
      asOfDate,
      candidates
    );
    const minimum = minimumAllowedBalance({
      allowNegativeBalance: account.allowNegativeBalance,
      negativeBalanceLimit: account.negativeBalanceLimit.toNumber()
    });
    if (projectedBalance < minimum) {
      throw new TransferBalanceViolationError(projectedBalance);
    }
  }

  private buildUpdateBalanceChanges(params: {
    oldFromAccountId: bigint;
    oldToAccountId: bigint;
    oldAmount: number;
    newFromAccountId: bigint;
    newToAccountId: bigint;
    newAmount: number;
  }): BalanceChange[] {
    const deltas = new Map<string, number>();
    const add = (accountId: bigint, delta: number) => {
      const key = accountId.toString();
      deltas.set(key, (deltas.get(key) ?? 0) + delta);
    };

    add(params.oldFromAccountId, params.oldAmount);
    add(params.oldToAccountId, -params.oldAmount);
    add(params.newFromAccountId, -params.newAmount);
    add(params.newToAccountId, params.newAmount);

    return Array.from(deltas.entries())
      .filter(([, delta]) => delta !== 0)
      .map(([accountId, delta]) => ({ accountId: BigInt(accountId), delta }));
  }

  private toTransferResult(fromTx: Transaction, toTx: Transaction): TransferResult {
    const updatedAt = fromTx.updatedAt > toTx.updatedAt ? fromTx.updatedAt : toTx.updatedAt;
    return {
      transfer_group_id: fromTx.transferGroupId!,
      from_transaction_id: Number(fromTx.transactionId),
      to_transaction_id: Number(toTx.transactionId),
      from_account_id: Number(fromTx.walletId),
      to_account_id: Number(toTx.walletId),
      amount: fromTx.amount.toNumber(),
      transaction_date: fromTx.transactionDate.toISOString().split("T")[0],
      updated_at: updatedAt.toISOString()
    };
  }

  private mapError(err: unknown): never {
    if (err instanceof TransferBalanceViolationError) {
      throw new AppException("ACCOUNT_004", err.message, HttpStatus.BAD_REQUEST, {
        projected_balance: err.projectedBalance
      });
    }
    if (err instanceof TransferPairNotFoundError) {
      throw new AppException("TRANSFER_003", err.message, HttpStatus.NOT_FOUND);
    }
    if (err instanceof TransferPairCorruptedError) {
      throw new AppException("TRANSFER_004", err.message, HttpStatus.CONFLICT);
    }
    throw err;
  }
}
