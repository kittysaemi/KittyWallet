import { Injectable } from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

export interface AssetSummaryData {
  total_asset_amount: number;
  account_count: number;
  active_account_count: number;
  card_count: number;
  active_card_count: number;
}

export interface SpendingSummaryData {
  income_amount: number;
  expense_amount: number;
  card_expense_amount: number;
  net_amount: number;
  transaction_count: number;
}

export interface RecentTransactionData {
  transaction_id: number;
  wallet_type: string;
  wallet_id: number;
  category_id: number;
  category_name: string;
  transaction_type: string;
  amount: number;
  memo: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(userId: bigint): Promise<{ userId: bigint; nickname: string } | null> {
    return this.prisma.user.findFirst({
      where: { userId },
      select: { userId: true, nickname: true }
    });
  }

  async getAssetSummary(userId: bigint): Promise<AssetSummaryData> {
    const [accounts, cards] = await Promise.all([
      this.prisma.account.findMany({
        where: { userId },
        select: { currentBalance: true, useYn: true }
      }),
      this.prisma.card.findMany({
        where: { userId },
        select: { useYn: true }
      })
    ]);

    const total_asset_amount = accounts.reduce(
      (sum, a) => sum + a.currentBalance.toNumber(),
      0
    );

    return {
      total_asset_amount,
      account_count: accounts.length,
      active_account_count: accounts.filter((a) => a.useYn).length,
      card_count: cards.length,
      active_card_count: cards.filter((c) => c.useYn).length
    };
  }

  async getSpendingSummary(
    userId: bigint,
    startDate: Date,
    endDate: Date
  ): Promise<SpendingSummaryData> {
    const baseWhere = {
      userId,
      deletedYn: false,
      transactionDate: { gte: startDate, lte: endDate }
    };

    const [incomeResult, expenseResult, cardExpenseResult] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...baseWhere, transactionType: TransactionType.INCOME },
        _sum: { amount: true },
        _count: { transactionId: true }
      }),
      this.prisma.transaction.aggregate({
        where: { ...baseWhere, transactionType: TransactionType.EXPENSE },
        _sum: { amount: true },
        _count: { transactionId: true }
      }),
      this.prisma.transaction.aggregate({
        where: { ...baseWhere, transactionType: TransactionType.EXPENSE, walletType: "CARD" },
        _sum: { amount: true }
      })
    ]);

    const income_amount = incomeResult._sum.amount?.toNumber() ?? 0;
    const expense_amount = expenseResult._sum.amount?.toNumber() ?? 0;
    const card_expense_amount = cardExpenseResult._sum.amount?.toNumber() ?? 0;
    const transaction_count =
      incomeResult._count.transactionId + expenseResult._count.transactionId;

    return {
      income_amount,
      expense_amount,
      card_expense_amount,
      net_amount: income_amount - expense_amount,
      transaction_count
    };
  }

  async getRecentTransactions(
    userId: bigint,
    limit: number
  ): Promise<RecentTransactionData[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, deletedYn: false },
      include: { category: true },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: limit
    });

    const accountIds = transactions
      .filter((t) => t.walletType === "ACCOUNT")
      .map((t) => t.walletId);
    const cardIds = transactions
      .filter((t) => t.walletType === "CARD")
      .map((t) => t.walletId);

    const [accounts, cards] = await Promise.all([
      accountIds.length > 0
        ? this.prisma.account.findMany({
            where: { accountId: { in: accountIds } },
            select: { accountId: true, accountName: true }
          })
        : [],
      cardIds.length > 0
        ? this.prisma.card.findMany({
            where: { cardId: { in: cardIds } },
            select: { cardId: true, cardName: true }
          })
        : []
    ]);

    const accountMap = new Map(accounts.map((a) => [String(a.accountId), a.accountName]));
    const cardMap = new Map(cards.map((c) => [String(c.cardId), c.cardName]));

    return transactions.map((t) => ({
      transaction_id: Number(t.transactionId),
      wallet_type: t.walletType,
      wallet_id: Number(t.walletId),
      wallet_name:
        t.walletType === "ACCOUNT"
          ? (accountMap.get(String(t.walletId)) ?? "")
          : (cardMap.get(String(t.walletId)) ?? ""),
      category_id: Number(t.categoryId),
      category_name: t.category.categoryName,
      transaction_type: t.transactionType,
      amount: t.amount.toNumber(),
      memo: t.memo,
      transaction_date: t.transactionDate.toISOString().split("T")[0],
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString()
    }));
  }

  async getLastSyncedAt(userId: bigint): Promise<string | null> {
    const syncClient = await this.prisma.syncClient.findFirst({
      where: { userId },
      orderBy: { lastSyncedAt: "desc" },
      select: { lastSyncedAt: true }
    });
    return syncClient?.lastSyncedAt?.toISOString() ?? null;
  }
}
