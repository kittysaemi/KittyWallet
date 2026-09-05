import { Injectable } from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

// 계좌이동 전용 카테고리명. transfer.repository.ts와 동일한 값이다.
// transferGroupId(2026-09-02 마이그레이션으로 추가)가 채워진 거래는 그 값으로 판별하고,
// 그 이전에 생성된 레거시 계좌이동 거래는 transferGroupId가 없으므로 카테고리명으로 함께 걸러낸다.
// 프론트 entities/transaction/lib/isTransfer.ts의 판별 기준과 맞춰야 한다.
const TRANSFER_CATEGORY_NAME = "계좌금액이동";

export interface AssetSummaryData {
  total_asset_amount: number;
  account_count: number;
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
  wallet_name: string;
  wallet_deleted: boolean;
  category_id: number;
  category_name: string;
  transaction_type: string;
  amount: number;
  interest: number;
  memo: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  installment_seq: number | null;
  installment_total_count: number | null;
  installment_original_amount: number | null;
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
        select: { currentBalance: true }
      }),
      this.prisma.card.findMany({
        where: { userId },
        select: { useYn: true }
      })
    ]);

    const total_asset_amount = accounts.reduce((sum, a) => sum + a.currentBalance.toNumber(), 0);

    return {
      total_asset_amount,
      account_count: accounts.length,
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
      transactionDate: { gte: startDate, lte: endDate },
      category: {
        categoryUserSettings: {
          none: {
            userId,
            includeInStatistics: false
          }
        }
      }
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

  async getRecentTransactions(userId: bigint, limit: number): Promise<RecentTransactionData[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedYn: false,
        // 할부의 실제 구매(1회차)는 최근 발생한 거래이므로 표시하되, 아직 발생하지 않은
        // 이후 회차(미래 청구분)는 최근내역에서 제외한다.
        OR: [{ installmentId: null }, { installmentSeq: 1 }],
        // 계좌이동 거래는 여러 계좌를 섞어 보여주는 "최근 내역"에는 노출하지 않는다
        // (지갑별 거래내역에서만 노출). 쿼리 단계에서 제외해야 limit(6)이 항상 채워진다 —
        // 응답을 받은 뒤 클라이언트에서 걸러내면 표시 개수가 limit보다 줄어들 수 있다.
        transferGroupId: null,
        category: { categoryName: { not: TRANSFER_CATEGORY_NAME } }
      },
      include: { category: true, cardInstallment: true },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: limit
    });

    const accountIds = transactions
      .filter((t) => t.walletType === "ACCOUNT")
      .map((t) => t.walletId);
    const cardIds = transactions.filter((t) => t.walletType === "CARD").map((t) => t.walletId);

    const [accounts, cards] = await Promise.all([
      accountIds.length > 0
        ? this.prisma.account.findMany({
            where: { accountId: { in: accountIds } },
            select: { accountId: true, accountName: true, deletedYn: true }
          })
        : [],
      cardIds.length > 0
        ? this.prisma.card.findMany({
            where: { cardId: { in: cardIds } },
            select: { cardId: true, cardName: true, deletedYn: true }
          })
        : []
    ]);

    const accountMap = new Map(accounts.map((a) => [String(a.accountId), a.accountName]));
    const accountDeletedMap = new Map(accounts.map((a) => [String(a.accountId), a.deletedYn]));
    const cardMap = new Map(cards.map((c) => [String(c.cardId), c.cardName]));
    const cardDeletedMap = new Map(cards.map((c) => [String(c.cardId), c.deletedYn]));

    return transactions.map((t) => ({
      transaction_id: Number(t.transactionId),
      wallet_type: t.walletType,
      wallet_id: Number(t.walletId),
      wallet_name:
        t.walletType === "ACCOUNT"
          ? (accountMap.get(String(t.walletId)) ?? "")
          : (cardMap.get(String(t.walletId)) ?? ""),
      wallet_deleted:
        t.walletType === "ACCOUNT"
          ? (accountDeletedMap.get(String(t.walletId)) ?? false)
          : (cardDeletedMap.get(String(t.walletId)) ?? false),
      category_id: Number(t.categoryId),
      category_name: t.category.categoryName,
      transaction_type: t.transactionType,
      amount: t.amount.toNumber(),
      interest: t.interest,
      memo: t.memo,
      transaction_date: t.transactionDate.toISOString().split("T")[0],
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
      installment_seq: t.installmentSeq ?? null,
      installment_total_count: t.installmentTotalCount ?? null,
      installment_original_amount: t.cardInstallment?.originalAmount.toNumber() ?? null
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
