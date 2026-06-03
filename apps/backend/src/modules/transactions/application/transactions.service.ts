import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import { TransactionsRepository } from "../infrastructure/transactions.repository";

interface CreateTransactionCommand {
  userId: bigint;
  walletType: "ACCOUNT" | "CARD";
  walletId: bigint;
  categoryId: bigint;
  transactionType: "INCOME" | "EXPENSE";
  amount: number;
  memo?: string;
  transactionDate: string;
}

export interface CreateTransactionResult {
  transaction_id: number;
  updated_at: string;
  synced_at: string | null;
}

@Injectable()
export class TransactionsService {
  constructor(private readonly transactionsRepository: TransactionsRepository) {}

  async createTransaction(command: CreateTransactionCommand): Promise<CreateTransactionResult> {
    if (command.transactionType === "INCOME" && command.walletType === "CARD") {
      throw new AppException(
        "TX_007",
        "카드로 수입 거래를 저장할 수 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (command.transactionDate > todayStr) {
      throw new AppException(
        "TX_001",
        "미래 날짜는 등록할 수 없습니다.",
        HttpStatus.BAD_REQUEST
      );
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
        const newBalance = account.currentBalance.toNumber() - command.amount;
        if (newBalance < 0) {
          throw new AppException(
            "ACCOUNT_004",
            "잔액이 부족합니다. 지출 금액이 현재 잔액을 초과합니다.",
            HttpStatus.BAD_REQUEST
          );
        }
      }

      const balanceDelta =
        command.transactionType === "INCOME" ? command.amount : -command.amount;

      const transaction = await this.transactionsRepository.createWithAccountBalanceUpdate(
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
}
