import { Injectable } from "@nestjs/common";
import { Prisma, TransactionType, WalletType } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

export interface StatisticsCondition {
  userId: bigint;
  startDate: Date;
  endDate: Date;
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

@Injectable()
export class StatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(condition: StatisticsCondition): Prisma.TransactionWhereInput {
    return {
      userId: condition.userId,
      deletedYn: false,
      transactionDate: {
        gte: condition.startDate,
        lte: condition.endDate
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
      _sum: { amount: true },
      _count: { _all: true }
    });

    return rows.map((row) => ({
      transactionType: row.transactionType,
      amount: row._sum.amount,
      transactionCount: row._count._all
    }));
  }

  async groupDailyAmountsByTransactionType(
    condition: StatisticsCondition
  ): Promise<DailyTransactionTypeAmountGroup[]> {
    const rows = await this.prisma.transaction.groupBy({
      by: ["transactionDate", "transactionType"],
      where: this.buildWhere(condition),
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: [{ transactionDate: "asc" }, { transactionType: "asc" }]
    });

    return rows.map((row) => ({
      transactionDate: row.transactionDate,
      transactionType: row.transactionType,
      amount: row._sum.amount,
      transactionCount: row._count._all
    }));
  }

  async groupAmountsByCategory(condition: StatisticsCondition): Promise<CategoryAmountGroup[]> {
    const rows = await this.prisma.transaction.groupBy({
      by: ["categoryId"],
      where: this.buildWhere(condition),
      _sum: { amount: true },
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

    return rows.map((row) => ({
      categoryId: row.categoryId,
      amount: row._sum.amount,
      transactionCount: row._count._all,
      category: categoryMap.get(String(row.categoryId)) ?? null
    }));
  }
}
