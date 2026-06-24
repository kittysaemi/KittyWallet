import { Injectable } from "@nestjs/common";
import { Prisma, TransactionType, WalletType } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

export interface StatisticsCondition {
  userId: bigint;
  startDate?: Date;
  endDate?: Date;
  walletType?: WalletType;
  walletId?: bigint;
  transactionType?: TransactionType;
}

export interface TransactionTypeAmountGroup {
  transactionType: TransactionType;
  amount: Prisma.Decimal | null;
  transactionCount: number;
}

export interface DailyTransactionTypeAmountGroup extends TransactionTypeAmountGroup {
  transactionDate: Date;
}

export interface CategoryAmountGroup {
  categoryId: bigint;
  amount: Prisma.Decimal | null;
  transactionCount: number;
  category: {
    categoryName: string;
    iconId: bigint;
  } | null;
}

export interface WalletCategoryGroup {
  walletId: bigint;
  walletType: WalletType;
  walletName: string;
  categoryId: bigint;
  amount: Prisma.Decimal | null;
  category: {
    categoryName: string;
    iconId: bigint;
  } | null;
}

@Injectable()
export class StatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(condition: StatisticsCondition): Prisma.TransactionWhereInput {
    return {
      userId: condition.userId,
      deletedYn: false,
      ...(condition.startDate && condition.endDate
        ? { transactionDate: { gte: condition.startDate, lte: condition.endDate } }
        : {}),
      category: {
        categoryUserSettings: {
          none: {
            userId: condition.userId,
            includeInStatistics: false
          }
        }
      },
      ...(condition.walletType ? { walletType: condition.walletType } : {}),
      ...(condition.walletId ? { walletId: condition.walletId } : {}),
      ...(condition.transactionType ? { transactionType: condition.transactionType } : {})
    };
  }

  async groupAmountsByTransactionType(
    condition: StatisticsCondition
  ): Promise<TransactionTypeAmountGroup[]> {
    const rows = await this.prisma.transaction.groupBy({
      by: ["transactionType"],
      where: this.buildWhere(condition),
      _sum: { amount: true, interest: true },
      _count: { _all: true }
    });

    return rows.map((row) => {
      const combined = (row._sum.amount?.toNumber() ?? 0) + Number(row._sum.interest ?? 0);
      return {
        transactionType: row.transactionType,
        amount: new Prisma.Decimal(combined),
        transactionCount: row._count._all
      };
    });
  }

  async groupDailyAmountsByTransactionType(
    condition: StatisticsCondition
  ): Promise<DailyTransactionTypeAmountGroup[]> {
    const rows = await this.prisma.transaction.groupBy({
      by: ["transactionDate", "transactionType"],
      where: this.buildWhere(condition),
      _sum: { amount: true, interest: true },
      _count: { _all: true },
      orderBy: [{ transactionDate: "asc" }, { transactionType: "asc" }]
    });

    return rows.map((row) => {
      const combined = (row._sum.amount?.toNumber() ?? 0) + Number(row._sum.interest ?? 0);
      return {
        transactionDate: row.transactionDate,
        transactionType: row.transactionType,
        amount: new Prisma.Decimal(combined),
        transactionCount: row._count._all
      };
    });
  }

  async groupExpensesByWalletAndCategory(
    condition: StatisticsCondition
  ): Promise<WalletCategoryGroup[]> {
    const rows = await this.prisma.transaction.groupBy({
      by: ["walletId", "walletType", "categoryId"],
      where: {
        ...this.buildWhere(condition),
        transactionType: "EXPENSE"
      },
      _sum: { amount: true, interest: true },
      orderBy: { _sum: { amount: "desc" } }
    });

    return this.attachWalletAndCategoryNames(
      rows.map((r) => ({
        ...r,
        _sum: {
          amount: new Prisma.Decimal(
            (r._sum.amount?.toNumber() ?? 0) + Number(r._sum.interest ?? 0)
          )
        }
      }))
    );
  }

  async groupIncomesByWalletAndCategory(
    condition: StatisticsCondition
  ): Promise<WalletCategoryGroup[]> {
    const rows = await this.prisma.transaction.groupBy({
      by: ["walletId", "walletType", "categoryId"],
      where: {
        ...this.buildWhere(condition),
        transactionType: "INCOME"
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } }
    });

    return this.attachWalletAndCategoryNames(rows);
  }

  private async attachWalletAndCategoryNames(
    rows: {
      walletId: bigint;
      walletType: WalletType;
      categoryId: bigint;
      _sum: { amount: Prisma.Decimal | null };
    }[]
  ): Promise<WalletCategoryGroup[]> {
    const categoryIds = [...new Set(rows.map((r) => r.categoryId))];
    const accountIds = rows.filter((r) => r.walletType === "ACCOUNT").map((r) => r.walletId);
    const cardIds = rows.filter((r) => r.walletType === "CARD").map((r) => r.walletId);

    const [categories, accounts, cards] = await Promise.all([
      categoryIds.length
        ? this.prisma.category.findMany({
            where: { categoryId: { in: categoryIds } },
            select: { categoryId: true, categoryName: true, iconId: true }
          })
        : [],
      accountIds.length
        ? this.prisma.account.findMany({
            where: { accountId: { in: accountIds } },
            select: { accountId: true, accountName: true }
          })
        : [],
      cardIds.length
        ? this.prisma.card.findMany({
            where: { cardId: { in: cardIds } },
            select: { cardId: true, cardName: true }
          })
        : []
    ]);

    const categoryMap = new Map(categories.map((c) => [String(c.categoryId), c]));
    const walletNameMap = new Map<string, string>();
    accounts.forEach((a) => walletNameMap.set(String(a.accountId), a.accountName));
    cards.forEach((c) => walletNameMap.set(String(c.cardId), c.cardName));

    return rows.map((row) => ({
      walletId: row.walletId,
      walletType: row.walletType,
      walletName: walletNameMap.get(String(row.walletId)) ?? "알 수 없음",
      categoryId: row.categoryId,
      amount: row._sum.amount,
      category: categoryMap.get(String(row.categoryId)) ?? null
    }));
  }

  async groupAmountsByCategory(condition: StatisticsCondition): Promise<CategoryAmountGroup[]> {
    const rows = await this.prisma.transaction.groupBy({
      by: ["categoryId"],
      where: this.buildWhere(condition),
      _sum: { amount: true, interest: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } }
    });

    const categoryIds = rows.map((row) => row.categoryId);
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { categoryId: { in: categoryIds } },
          select: {
            categoryId: true,
            categoryName: true,
            iconId: true
          }
        })
      : [];
    const categoryMap = new Map(
      categories.map((category) => [String(category.categoryId), category])
    );

    return rows.map((row) => {
      const combined = (row._sum.amount?.toNumber() ?? 0) + Number(row._sum.interest ?? 0);
      return {
        categoryId: row.categoryId,
        amount: new Prisma.Decimal(combined),
        transactionCount: row._count._all,
        category: categoryMap.get(String(row.categoryId)) ?? null
      };
    });
  }

  async groupCategoryAmountsByInstallmentOrigin(
    condition: StatisticsCondition
  ): Promise<CategoryAmountGroup[]> {
    const nonInstallmentWhere = {
      ...this.buildWhere(condition),
      transactionType: TransactionType.EXPENSE,
      installmentId: null
    };

    const installmentWhere = {
      userId: condition.userId,
      deletedYn: false,
      ...(condition.startDate && condition.endDate
        ? { purchaseDate: { gte: condition.startDate, lte: condition.endDate } }
        : {}),
      ...(condition.walletId ? { cardId: condition.walletId } : {}),
      category: {
        categoryUserSettings: {
          none: { userId: condition.userId, includeInStatistics: false }
        }
      }
    };

    const skipInstallmentPass = condition.walletType === "ACCOUNT";

    const [nonInstallmentRows, installmentRows] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ["categoryId"],
        where: nonInstallmentWhere,
        _sum: { amount: true, interest: true },
        _count: { _all: true }
      }),
      skipInstallmentPass
        ? Promise.resolve([])
        : this.prisma.cardInstallment.groupBy({
            by: ["categoryId"],
            where: installmentWhere,
            _sum: { originalAmount: true },
            _count: { _all: true }
          })
    ]);

    const amountMap = new Map<string, { amount: number; count: number }>();

    for (const row of nonInstallmentRows) {
      const key = String(row.categoryId);
      const amount = (row._sum.amount?.toNumber() ?? 0) + Number(row._sum.interest ?? 0);
      amountMap.set(key, { amount, count: row._count._all });
    }

    for (const row of installmentRows) {
      const key = String(row.categoryId);
      const amount = row._sum.originalAmount?.toNumber() ?? 0;
      const existing = amountMap.get(key);
      amountMap.set(key, {
        amount: (existing?.amount ?? 0) + amount,
        count: (existing?.count ?? 0) + row._count._all
      });
    }

    const allCategoryIds = Array.from(amountMap.keys()).map((id) => BigInt(id));
    const categories = allCategoryIds.length
      ? await this.prisma.category.findMany({
          where: { categoryId: { in: allCategoryIds } },
          select: { categoryId: true, categoryName: true, iconId: true }
        })
      : [];
    const categoryMap = new Map(categories.map((c) => [String(c.categoryId), c]));

    return Array.from(amountMap.entries())
      .map(([catId, { amount, count }]) => ({
        categoryId: BigInt(catId),
        amount: new Prisma.Decimal(amount),
        transactionCount: count,
        category: categoryMap.get(catId) ?? null
      }))
      .sort((a, b) => b.amount.toNumber() - a.amount.toNumber());
  }
}
