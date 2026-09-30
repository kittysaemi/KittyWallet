import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

export const FIXED_EXPENSE_SETTING_KEY = "fixed_expense_auto_enabled";

export interface FixedExpenseSourceRow {
  transactionId: bigint;
  userId: bigint;
  walletId: bigint;
  categoryId: bigint;
  amount: Prisma.Decimal;
  memo: string | null;
  transactionDate: Date;
}

export interface FixedExpenseCreateRow {
  userId: bigint;
  walletId: bigint;
  categoryId: bigint;
  amount: Prisma.Decimal;
  memo: string | null;
  transactionDate: Date;
}

@Injectable()
export class FixedExpenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 고정지출 자동화 설정을 켠 사용자 ID 목록. */
  async findEnabledUserIds(): Promise<bigint[]> {
    const settings = await this.prisma.userSetting.findMany({
      where: { settingKey: FIXED_EXPENSE_SETTING_KEY, settingValue: { equals: true } },
      select: { userId: true }
    });
    return settings.map((s) => s.userId);
  }

  /** 지난달 고정지출로 체크된 카드 일시불 지출. */
  findSourceTransactions(
    userIds: bigint[],
    startDate: Date,
    endDate: Date
  ): Promise<FixedExpenseSourceRow[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId: { in: userIds },
        deletedYn: false,
        fixedExpenseYn: true,
        walletType: "CARD",
        transactionType: "EXPENSE",
        installmentId: null,
        transactionDate: { gte: startDate, lte: endDate }
      },
      select: {
        transactionId: true,
        userId: true,
        walletId: true,
        categoryId: true,
        amount: true,
        memo: true,
        transactionDate: true
      },
      orderBy: [{ transactionDate: "asc" }, { transactionId: "asc" }]
    });
  }

  /** 삭제되지 않았고 사용 중인 카드 ID 목록. */
  async findActiveCardIds(cardIds: bigint[]): Promise<Set<string>> {
    if (cardIds.length === 0) {
      return new Set();
    }
    const cards = await this.prisma.card.findMany({
      where: { cardId: { in: cardIds }, deletedYn: false, useYn: true },
      select: { cardId: true }
    });
    return new Set(cards.map((c) => c.cardId.toString()));
  }

  /** 한 트랜잭션으로 모두 등록한다. 하나라도 실패하면 전체가 롤백된다. */
  async createAll(rows: FixedExpenseCreateRow[], syncedAt: Date): Promise<number> {
    if (rows.length === 0) {
      return 0;
    }
    const result = await this.prisma.$transaction((tx) =>
      tx.transaction.createMany({
        data: rows.map((row) => ({
          userId: row.userId,
          walletId: row.walletId,
          categoryId: row.categoryId,
          walletType: "CARD" as const,
          transactionType: "EXPENSE" as const,
          amount: row.amount,
          memo: row.memo,
          transactionDate: row.transactionDate,
          fixedExpenseYn: true,
          deletedYn: false,
          syncedAt
        }))
      })
    );
    return result.count;
  }
}
