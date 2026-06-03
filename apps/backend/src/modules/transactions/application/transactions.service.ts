import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma, TransactionType, WalletType } from "@prisma/client";
import { AppException } from "../../../common/exceptions/app.exception";
import {
  FindTransactionsCondition,
  TransactionWithCategory,
  TransactionsRepository
} from "../infrastructure/transactions.repository";

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
}

export interface TransactionItem {
  transaction_id: number;
  wallet_type: string;
  wallet_id: number;
  wallet_name: string;
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

  async getTransactions(
    command: GetTransactionsCommand
  ): Promise<{ items: TransactionItem[]; page: number; limit: number; total_count: number }> {
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

    const [transactions, total] = await Promise.all([
      this.transactionsRepository.findMany(condition, command.page, command.limit, orderBy),
      this.transactionsRepository.count(condition)
    ]);

    const items = await this.attachWalletNames(transactions);

    return { items, page: command.page, limit: command.limit, total_count: total };
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
    const cardIds = transactions
      .filter((t) => t.walletType === "CARD")
      .map((t) => t.walletId);

    const [accounts, cards] = await Promise.all([
      accountIds.length > 0 ? this.transactionsRepository.findAccountsByIds(accountIds) : [],
      cardIds.length > 0 ? this.transactionsRepository.findCardsByIds(cardIds) : []
    ]);

    const accountMap = new Map(accounts.map((a) => [String(a.accountId), a.accountName]));
    const cardMap = new Map(cards.map((c) => [String(c.cardId), c.cardName]));

    return transactions.map((t) => this.toItem(t, accountMap, cardMap));
  }

  private toItem(
    t: TransactionWithCategory,
    accountMap: Map<string, string>,
    cardMap: Map<string, string>
  ): TransactionItem {
    const walletName =
      t.walletType === "ACCOUNT"
        ? (accountMap.get(String(t.walletId)) ?? "")
        : (cardMap.get(String(t.walletId)) ?? "");

    return {
      transaction_id: Number(t.transactionId),
      wallet_type: t.walletType,
      wallet_id: Number(t.walletId),
      wallet_name: walletName,
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
