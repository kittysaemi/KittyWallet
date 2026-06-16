import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma, TransactionType, WalletType } from "@prisma/client";
import { AppException } from "../../../common/exceptions/app.exception";
import { getTodayInTimezone } from "../../../common/utils/date.util";
import { BalanceViolationError } from "../domain/errors";
import {
  AccountBalanceTransaction,
  FindTransactionsCondition,
  TransactionWithCategory,
  TransactionsRepository
} from "../infrastructure/transactions.repository";

export interface UpdateTransactionResult {
  transaction_id: number;
  wallet_type: string;
  wallet_id: number;
  transaction_type: string;
  amount: number;
  transaction_date: string;
  updated_at: string;
}

export interface DeleteTransactionResult {
  transaction_id: number;
  deleted_yn: boolean;
  updated_at: string;
}

interface UpdateTransactionCommand {
  transactionId: bigint;
  userId: bigint;
  walletType?: string;
  walletId?: number;
  categoryId?: number;
  transactionType?: string;
  amount?: number;
  memo?: string | null;
  transactionDate?: string;
  timezone?: string;
}

interface GetTransactionsCommand {
  userId: bigint;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  walletType?: string;
  walletId?: number;
  categoryId?: number;
  transactionType?: string;
  page: number;
  limit: number;
  sort: string;
}

interface CreateTransactionCommand {
  userId: bigint;
  walletType: "ACCOUNT" | "CARD";
  walletId: bigint;
  categoryId: bigint;
  transactionType: "INCOME" | "EXPENSE";
  amount: number;
  memo?: string;
  transactionDate: string;
  timezone?: string;
}

interface BalanceCandidate {
  transactionId?: bigint;
  transactionType: "INCOME" | "EXPENSE";
  amount: number;
  transactionDate: Date;
}

export interface TransactionItem {
  transaction_id: number;
  wallet_type: string;
  wallet_id: number;
  wallet_name: string;
  wallet_deleted: boolean;
  category_id: number;
  category_name: string;
  transaction_type: string;
  amount: number;
  memo: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionResult {
  transaction_id: number;
  updated_at: string;
  synced_at: string | null;
}

@Injectable()
export class TransactionsService {
  constructor(private readonly transactionsRepository: TransactionsRepository) {}

  async updateTransaction(command: UpdateTransactionCommand): Promise<UpdateTransactionResult> {
    const existing = await this.transactionsRepository.findById(
      command.transactionId,
      command.userId
    );
    if (!existing) {
      throw new AppException("TX_005", "거래 내역을 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }

    if (existing.walletType === "ACCOUNT") {
      const account = await this.transactionsRepository.findOwnedAccount(
        existing.walletId,
        command.userId
      );
      if (account?.deletedYn) {
        throw new AppException(
          "WALLET_001",
          "삭제된 지갑의 거래는 수정할 수 없습니다.",
          HttpStatus.BAD_REQUEST
        );
      }
    } else {
      const card = await this.transactionsRepository.findOwnedCard(
        existing.walletId,
        command.userId
      );
      if (card?.deletedYn) {
        throw new AppException(
          "WALLET_001",
          "삭제된 지갑의 거래는 수정할 수 없습니다.",
          HttpStatus.BAD_REQUEST
        );
      }
    }

    const hasUpdate =
      command.walletType !== undefined ||
      command.walletId !== undefined ||
      command.categoryId !== undefined ||
      command.transactionType !== undefined ||
      command.amount !== undefined ||
      command.memo !== undefined ||
      command.transactionDate !== undefined;
    if (!hasUpdate) {
      throw new AppException(
        "VALIDATION_001",
        "수정 가능한 필드가 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const effWalletType = (command.walletType ?? existing.walletType) as "ACCOUNT" | "CARD";
    const effWalletId = command.walletId ? BigInt(command.walletId) : existing.walletId;
    const effTransactionType = (command.transactionType ?? existing.transactionType) as
      | "INCOME"
      | "EXPENSE";
    const effAmount = command.amount ?? existing.amount.toNumber();
    const effDate = command.transactionDate
      ? new Date(command.transactionDate)
      : existing.transactionDate;

    if (effTransactionType === "INCOME" && effWalletType === "CARD") {
      throw new AppException(
        "TX_007",
        "카드로 수입 거래를 저장할 수 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const todayStr = getTodayInTimezone(command.timezone);
    if (command.transactionDate && command.transactionDate > todayStr) {
      throw new AppException("TX_001", "미래 날짜는 등록할 수 없습니다.", HttpStatus.BAD_REQUEST);
    }

    if (command.categoryId !== undefined) {
      const category = await this.transactionsRepository.findCategory(
        BigInt(command.categoryId),
        command.userId
      );
      if (!category) {
        throw new AppException(
          "CATEGORY_002",
          "카테고리를 찾을 수 없습니다.",
          HttpStatus.NOT_FOUND
        );
      }
    }

    if (effWalletType === "ACCOUNT") {
      const account = await this.transactionsRepository.findAccount(effWalletId, command.userId);
      if (!account) {
        throw new AppException("TX_003", "존재하지 않는 계좌입니다.", HttpStatus.NOT_FOUND);
      }
    } else if (effWalletType === "CARD") {
      const card = await this.transactionsRepository.findCard(effWalletId, command.userId);
      if (!card) {
        throw new AppException("TX_004", "존재하지 않는 카드입니다.", HttpStatus.NOT_FOUND);
      }
    }

    const balanceChanges: Array<{ accountId: bigint; delta: number }> = [];
    const oldWalletType = existing.walletType as "ACCOUNT" | "CARD";
    const oldWalletId = existing.walletId;
    const oldAmount = existing.amount.toNumber();
    const oldTransactionType = existing.transactionType as "INCOME" | "EXPENSE";

    if (oldWalletType === "ACCOUNT") {
      const restoreDelta = oldTransactionType === "INCOME" ? -oldAmount : oldAmount;
      const existingEntry = balanceChanges.find((c) => c.accountId === oldWalletId);
      if (existingEntry) {
        existingEntry.delta += restoreDelta;
      } else {
        balanceChanges.push({ accountId: oldWalletId, delta: restoreDelta });
      }
    }

    if (effWalletType === "ACCOUNT") {
      const applyDelta = effTransactionType === "INCOME" ? effAmount : -effAmount;
      const existingEntry = balanceChanges.find((c) => c.accountId === effWalletId);
      if (existingEntry) {
        existingEntry.delta += applyDelta;
      } else {
        balanceChanges.push({ accountId: effWalletId, delta: applyDelta });
      }
    }

    const needsBalanceValidation =
      effTransactionType === "EXPENSE" ||
      (effTransactionType === "INCOME" &&
        oldTransactionType === "INCOME" &&
        effWalletType === "ACCOUNT" &&
        (effAmount < oldAmount ||
          effDate > existing.transactionDate ||
          effWalletId !== oldWalletId));

    if (needsBalanceValidation) {
      const accountIdsToValidate = Array.from(
        new Set(balanceChanges.map((change) => change.accountId.toString()))
      ).map((accountId) => BigInt(accountId));

      await Promise.all(
        accountIdsToValidate.map((accountId) =>
          this.assertAccountDailyBalanceAllowed(command.userId, accountId, {
            excludeTransactionId: existing.transactionId,
            candidate:
              effWalletType === "ACCOUNT" && accountId === effWalletId
                ? {
                    transactionId: existing.transactionId,
                    transactionType: effTransactionType,
                    amount: effAmount,
                    transactionDate: effDate
                  }
                : undefined
          })
        )
      );
    }

    const updateData: Prisma.TransactionUpdateInput = {
      ...(effWalletType !== existing.walletType ? { walletType: effWalletType } : {}),
      ...(effWalletId !== existing.walletId ? { walletId: effWalletId } : {}),
      ...(command.categoryId !== undefined
        ? { category: { connect: { categoryId: BigInt(command.categoryId) } } }
        : {}),
      ...(effTransactionType !== existing.transactionType
        ? { transactionType: effTransactionType }
        : {}),
      ...(command.amount !== undefined ? { amount: command.amount } : {}),
      ...(command.memo !== undefined ? { memo: command.memo } : {}),
      ...(command.transactionDate !== undefined ? { transactionDate: effDate } : {})
    };

    let updated;
    try {
      updated = await this.transactionsRepository.updateWithBalances(
        command.transactionId,
        updateData,
        balanceChanges
      );
    } catch (err) {
      if (err instanceof BalanceViolationError) {
        throw new AppException("ACCOUNT_004", err.message, HttpStatus.BAD_REQUEST);
      }
      throw err;
    }

    return {
      transaction_id: Number(updated.transactionId),
      wallet_type: updated.walletType,
      wallet_id: Number(updated.walletId),
      transaction_type: updated.transactionType,
      amount: updated.amount.toNumber(),
      transaction_date: updated.transactionDate.toISOString().split("T")[0],
      updated_at: updated.updatedAt.toISOString()
    };
  }

  async deleteTransaction(transactionId: bigint, userId: bigint): Promise<DeleteTransactionResult> {
    const existing = await this.transactionsRepository.findById(transactionId, userId);
    if (!existing) {
      throw new AppException("TX_005", "거래 내역을 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }

    let balanceChange: { accountId: bigint; delta: number } | undefined;
    if (existing.walletType === "ACCOUNT") {
      const restoreDelta =
        existing.transactionType === "INCOME"
          ? -existing.amount.toNumber()
          : existing.amount.toNumber();
      balanceChange = { accountId: existing.walletId, delta: restoreDelta };

      if (existing.transactionType === "INCOME") {
        await this.assertAccountDailyBalanceAllowed(userId, existing.walletId, {
          excludeTransactionId: existing.transactionId
        });
      }
    }

    let deleted;
    try {
      deleted = await this.transactionsRepository.softDeleteWithBalance(transactionId, balanceChange);
    } catch (err) {
      if (err instanceof BalanceViolationError) {
        throw new AppException("ACCOUNT_004", err.message, HttpStatus.BAD_REQUEST);
      }
      throw err;
    }

    return {
      transaction_id: Number(deleted.transactionId),
      deleted_yn: true,
      updated_at: deleted.updatedAt.toISOString()
    };
  }

  async getTransactions(command: GetTransactionsCommand): Promise<{
    items: TransactionItem[];
    page: number;
    limit: number;
    total_count: number;
    period_summary: { total_expense: number } | null;
  }> {
    const hasWalletType = command.walletType !== undefined;
    const hasWalletId = command.walletId !== undefined;
    if (hasWalletType !== hasWalletId) {
      throw new AppException(
        "TX_006",
        "wallet_type과 wallet_id는 함께 전달해야 합니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const condition: FindTransactionsCondition = {
      userId: command.userId,
      startDate: command.startDate ? new Date(command.startDate) : undefined,
      endDate: command.endDate ? new Date(command.endDate) : undefined,
      keyword: command.keyword,
      walletType: command.walletType as WalletType | undefined,
      walletId: command.walletId ? BigInt(command.walletId) : undefined,
      categoryId: command.categoryId ? BigInt(command.categoryId) : undefined,
      transactionType: command.transactionType as TransactionType | undefined
    };

    const orderBy = this.buildOrderBy(command.sort);

    const isCardFilter = command.walletType === "CARD" && command.walletId !== undefined;

    const [transactions, total, cardExpense] = await Promise.all([
      this.transactionsRepository.findMany(condition, command.page, command.limit, orderBy),
      this.transactionsRepository.count(condition),
      isCardFilter
        ? this.transactionsRepository.sumCardExpense(
            command.userId,
            BigInt(command.walletId!),
            condition.startDate,
            condition.endDate
          )
        : Promise.resolve(null)
    ]);

    const items = await this.attachWalletNames(transactions);
    const period_summary = isCardFilter ? { total_expense: cardExpense as number } : null;

    return { items, page: command.page, limit: command.limit, total_count: total, period_summary };
  }

  async getTransaction(transactionId: bigint, userId: bigint): Promise<TransactionItem> {
    const transaction = await this.transactionsRepository.findById(transactionId, userId);
    if (!transaction) {
      throw new AppException("TX_005", "거래 내역을 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }

    const [item] = await this.attachWalletNames([transaction]);
    return item;
  }

  async getRecentTransactions(
    userId: bigint,
    limit: number
  ): Promise<{ items: TransactionItem[] }> {
    const transactions = await this.transactionsRepository.findRecent(userId, limit);
    const items = await this.attachWalletNames(transactions);
    return { items };
  }

  private buildOrderBy(sort: string): Prisma.TransactionOrderByWithRelationInput[] {
    switch (sort) {
      case "transaction_date_asc":
        return [{ transactionDate: "asc" }, { createdAt: "asc" }];
      case "amount_desc":
        return [{ amount: "desc" }];
      case "amount_asc":
        return [{ amount: "asc" }];
      default:
        return [{ transactionDate: "desc" }, { createdAt: "desc" }];
    }
  }

  private async attachWalletNames(
    transactions: TransactionWithCategory[]
  ): Promise<TransactionItem[]> {
    const accountIds = transactions
      .filter((t) => t.walletType === "ACCOUNT")
      .map((t) => t.walletId);
    const cardIds = transactions.filter((t) => t.walletType === "CARD").map((t) => t.walletId);

    const [accounts, cards] = await Promise.all([
      accountIds.length > 0 ? this.transactionsRepository.findAccountsByIds(accountIds) : [],
      cardIds.length > 0 ? this.transactionsRepository.findCardsByIds(cardIds) : []
    ]);

    const accountMap = new Map(
      accounts.map((a) => [String(a.accountId), { name: a.accountName, deleted: a.deletedYn }])
    );
    const cardMap = new Map(
      cards.map((c) => [String(c.cardId), { name: c.cardName, deleted: c.deletedYn || !c.useYn }])
    );

    return transactions.map((t) => this.toItem(t, accountMap, cardMap));
  }

  private toItem(
    t: TransactionWithCategory,
    accountMap: Map<string, { name: string; deleted: boolean }>,
    cardMap: Map<string, { name: string; deleted: boolean }>
  ): TransactionItem {
    const wallet =
      t.walletType === "ACCOUNT"
        ? accountMap.get(String(t.walletId))
        : cardMap.get(String(t.walletId));

    return {
      transaction_id: Number(t.transactionId),
      wallet_type: t.walletType,
      wallet_id: Number(t.walletId),
      wallet_name: wallet?.name ?? "",
      wallet_deleted: wallet?.deleted ?? true,
      category_id: Number(t.categoryId),
      category_name: t.category.categoryName,
      transaction_type: t.transactionType,
      amount: t.amount.toNumber(),
      memo: t.memo,
      transaction_date: t.transactionDate.toISOString().split("T")[0],
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString()
    };
  }

  async createTransaction(command: CreateTransactionCommand): Promise<CreateTransactionResult> {
    if (command.transactionType === "INCOME" && command.walletType === "CARD") {
      throw new AppException(
        "TX_007",
        "카드로 수입 거래를 저장할 수 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const todayStr = getTodayInTimezone(command.timezone);
    if (command.transactionDate > todayStr) {
      throw new AppException("TX_001", "미래 날짜는 등록할 수 없습니다.", HttpStatus.BAD_REQUEST);
    }

    const category = await this.transactionsRepository.findCategory(
      command.categoryId,
      command.userId
    );
    if (!category) {
      throw new AppException("CATEGORY_002", "카테고리를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }

    const transactionDate = new Date(command.transactionDate);
    const now = new Date();

    if (command.walletType === "ACCOUNT") {
      const account = await this.transactionsRepository.findAccount(
        command.walletId,
        command.userId
      );
      if (!account) {
        throw new AppException("TX_003", "존재하지 않는 계좌입니다.", HttpStatus.NOT_FOUND);
      }

      if (command.transactionType === "EXPENSE") {
        await this.assertAccountDailyBalanceAllowed(command.userId, account.accountId, {
          candidate: {
            transactionType: command.transactionType,
            amount: command.amount,
            transactionDate
          }
        });
      }

      const balanceDelta = command.transactionType === "INCOME" ? command.amount : -command.amount;

      let transaction;
      try {
        transaction = await this.transactionsRepository.createWithAccountBalanceUpdate(
          {
            userId: command.userId,
            categoryId: command.categoryId,
            walletId: command.walletId,
            transactionType: command.transactionType,
            walletType: command.walletType,
            amount: command.amount,
            transactionDate,
            memo: command.memo,
            syncedAt: now
          },
          account.accountId,
          balanceDelta
        );
      } catch (err) {
        if (err instanceof BalanceViolationError) {
          throw new AppException("ACCOUNT_004", err.message, HttpStatus.BAD_REQUEST);
        }
        throw err;
      }

      return {
        transaction_id: Number(transaction.transactionId),
        updated_at: transaction.updatedAt.toISOString(),
        synced_at: transaction.syncedAt?.toISOString() ?? null
      };
    }

    const card = await this.transactionsRepository.findCard(command.walletId, command.userId);
    if (!card) {
      throw new AppException("TX_004", "존재하지 않는 카드입니다.", HttpStatus.NOT_FOUND);
    }

    const transaction = await this.transactionsRepository.create({
      userId: command.userId,
      categoryId: command.categoryId,
      walletId: command.walletId,
      transactionType: command.transactionType,
      walletType: command.walletType,
      amount: command.amount,
      transactionDate,
      memo: command.memo,
      syncedAt: now
    });

    return {
      transaction_id: Number(transaction.transactionId),
      updated_at: transaction.updatedAt.toISOString(),
      synced_at: transaction.syncedAt?.toISOString() ?? null
    };
  }

  private async assertAccountDailyBalanceAllowed(
    userId: bigint,
    accountId: bigint,
    options: {
      excludeTransactionId?: bigint;
      candidate?: BalanceCandidate;
    } = {}
  ): Promise<void> {
    const account = await this.transactionsRepository.findOwnedAccount(accountId, userId);
    if (!account) {
      throw new AppException("TX_003", "존재하지 않는 계좌입니다.", HttpStatus.NOT_FOUND);
    }

    const transactions = await this.transactionsRepository.findAccountTransactionsForBalance(
      accountId,
      userId
    );
    const filtered = transactions.filter(
      (transaction) => transaction.transactionId !== options.excludeTransactionId
    );
    const dailyDeltas = this.buildDailyDeltas(filtered, options.candidate);
    let balance = account.initialBalance.toNumber();
    const minimumAllowed = account.allowNegativeBalance
      ? -account.negativeBalanceLimit.toNumber()
      : 0;

    for (const delta of dailyDeltas.values()) {
      balance += delta;
      if (balance < minimumAllowed) {
        throw new AppException(
          "ACCOUNT_004",
          "잔액이 부족하거나 마이너스 한도를 초과했습니다.",
          HttpStatus.BAD_REQUEST
        );
      }
    }
  }

  private buildDailyDeltas(
    transactions: AccountBalanceTransaction[],
    candidate?: BalanceCandidate
  ): Map<string, number> {
    const dailyDeltas = new Map<string, number>();

    for (const transaction of transactions) {
      this.addDailyDelta(dailyDeltas, {
        transactionType: transaction.transactionType as "INCOME" | "EXPENSE",
        amount: transaction.amount.toNumber(),
        transactionDate: transaction.transactionDate
      });
    }

    if (candidate) {
      this.addDailyDelta(dailyDeltas, candidate);
    }

    return new Map(
      Array.from(dailyDeltas.entries()).sort(([left], [right]) => left.localeCompare(right))
    );
  }

  private addDailyDelta(dailyDeltas: Map<string, number>, entry: BalanceCandidate): void {
    const dateKey = entry.transactionDate.toISOString().split("T")[0];
    const delta = entry.transactionType === "INCOME" ? entry.amount : -entry.amount;
    dailyDeltas.set(dateKey, (dailyDeltas.get(dateKey) ?? 0) + delta);
  }
}
