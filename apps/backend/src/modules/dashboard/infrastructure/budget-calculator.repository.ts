import { Injectable } from "@nestjs/common";
import { Prisma, TransactionType } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { RecurringSourceTransaction } from "../domain/recurring-expense.classifier";

// 계좌이동 전용 카테고리명. dashboard.repository.ts·transfer.repository.ts와 동일한 값이다.
// transferGroupId가 없는 레거시 계좌이동 거래를 카테고리명으로 함께 걸러낸다.
const TRANSFER_CATEGORY_NAME = "계좌금액이동";

// 예산 계산기는 삭제 거래와 계좌이동(보내는 쪽·받는 쪽)을 원본·반복 판별에서 모두 제외한다.
const NOT_DELETED_NOT_TRANSFER = {
  deletedYn: false,
  transferGroupId: null,
  category: { categoryName: { not: TRANSFER_CATEGORY_NAME } }
} satisfies Prisma.TransactionWhereInput;

export interface BudgetAccountRow {
  accountId: bigint;
  accountName: string;
  initialBalance: number;
}

export interface BudgetCardRow {
  cardId: bigint;
  cardName: string;
}

export interface BudgetExpenseRow {
  transactionId: bigint;
  walletId: bigint;
  categoryId: bigint;
  categoryName: string;
  memo: string | null;
  transactionDate: Date;
  amount: number;
  interest: number;
  nextMonthCashYn: boolean;
}

export interface BudgetInstallmentRow {
  transactionId: bigint;
  walletId: bigint;
  installmentId: bigint;
  installmentSeq: number | null;
  categoryName: string;
  memo: string | null;
  amount: number;
  interest: number;
}

@Injectable()
export class BudgetCalculatorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUserTimezoneSetting(userId: bigint): Promise<unknown> {
    const setting = await this.prisma.userSetting.findUnique({
      where: { userId_settingKey: { userId, settingKey: "timezone" } },
      select: { settingValue: true }
    });
    return setting?.settingValue ?? null;
  }

  async getAccounts(userId: bigint): Promise<BudgetAccountRow[]> {
    const accounts = await this.prisma.account.findMany({
      where: { userId, deletedYn: false },
      select: { accountId: true, accountName: true, initialBalance: true },
      orderBy: { accountId: "asc" }
    });
    return accounts.map((a) => ({
      accountId: a.accountId,
      accountName: a.accountName,
      initialBalance: a.initialBalance.toNumber()
    }));
  }

  async getCards(userId: bigint): Promise<BudgetCardRow[]> {
    return this.prisma.card.findMany({
      where: { userId, deletedYn: false },
      select: { cardId: true, cardName: true },
      orderBy: { cardId: "asc" }
    });
  }

  /**
   * 기준 월 시작 시점 잔액 재구성용: 기준 월 이전 계좌 거래의 계좌별 수입·지출 합계.
   * 실제 잔액 변동을 재현해야 하므로 계좌이동도 포함한다(삭제 거래만 제외).
   */
  async getAccountBalanceDeltasBefore(
    userId: bigint,
    accountIds: bigint[],
    beforeDate: Date
  ): Promise<Map<string, number>> {
    const deltas = new Map<string, number>();
    if (accountIds.length === 0) {
      return deltas;
    }
    const rows = await this.prisma.transaction.groupBy({
      by: ["walletId", "transactionType"],
      where: {
        userId,
        walletType: "ACCOUNT",
        walletId: { in: accountIds },
        deletedYn: false,
        transactionDate: { lt: beforeDate }
      },
      _sum: { amount: true }
    });
    for (const row of rows) {
      const key = row.walletId.toString();
      const amount = row._sum.amount?.toNumber() ?? 0;
      const signed = row.transactionType === TransactionType.INCOME ? amount : -amount;
      deltas.set(key, (deltas.get(key) ?? 0) + signed);
    }
    return deltas;
  }

  /** 기준 월 계좌별 실제 수입 합계(계좌이동 제외). */
  async getAccountIncomeInPeriod(
    userId: bigint,
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.transaction.groupBy({
      by: ["walletId"],
      where: {
        ...NOT_DELETED_NOT_TRANSFER,
        userId,
        walletType: "ACCOUNT",
        transactionType: TransactionType.INCOME,
        transactionDate: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    });
    return new Map(rows.map((row) => [row.walletId.toString(), row._sum.amount?.toNumber() ?? 0]));
  }

  /** 기간 내 계좌 또는 카드 지출(계좌이동·삭제 제외). */
  async getExpensesInPeriod(
    userId: bigint,
    walletType: "ACCOUNT" | "CARD",
    startDate: Date,
    endDate: Date
  ): Promise<BudgetExpenseRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        ...NOT_DELETED_NOT_TRANSFER,
        userId,
        walletType,
        transactionType: TransactionType.EXPENSE,
        transactionDate: { gte: startDate, lte: endDate }
      },
      select: {
        transactionId: true,
        walletId: true,
        categoryId: true,
        memo: true,
        transactionDate: true,
        amount: true,
        interest: true,
        nextMonthCashYn: true,
        category: { select: { categoryName: true } }
      },
      orderBy: [{ transactionDate: "asc" }, { transactionId: "asc" }]
    });
    return rows.map((row) => ({
      transactionId: row.transactionId,
      walletId: row.walletId,
      categoryId: row.categoryId,
      categoryName: row.category.categoryName,
      memo: row.memo,
      transactionDate: row.transactionDate,
      amount: row.amount.toNumber(),
      interest: row.interest,
      nextMonthCashYn: row.nextMonthCashYn
    }));
  }

  /** 다음 달에 배정된 카드 할부 회차. */
  async getCardInstallmentsInPeriod(
    userId: bigint,
    startDate: Date,
    endDate: Date
  ): Promise<BudgetInstallmentRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        ...NOT_DELETED_NOT_TRANSFER,
        userId,
        walletType: "CARD",
        transactionType: TransactionType.EXPENSE,
        installmentId: { not: null },
        transactionDate: { gte: startDate, lte: endDate }
      },
      select: {
        transactionId: true,
        walletId: true,
        installmentId: true,
        installmentSeq: true,
        memo: true,
        amount: true,
        interest: true,
        category: { select: { categoryName: true } }
      },
      orderBy: [{ transactionDate: "asc" }, { transactionId: "asc" }]
    });
    return rows.map((row) => ({
      transactionId: row.transactionId,
      walletId: row.walletId,
      installmentId: row.installmentId as bigint,
      installmentSeq: row.installmentSeq,
      categoryName: row.category.categoryName,
      memo: row.memo,
      amount: row.amount.toNumber(),
      interest: row.interest
    }));
  }

  /**
   * 반복 판별 원본: 관찰 구간(기준 월 직전 N개 완료 월)의 계좌·카드 지출.
   * 할부 회차는 별도(다음 달 할부)로 반영하므로 제외한다.
   */
  async getRecurringSourceTransactions(
    userId: bigint,
    startDate: Date,
    beforeDate: Date
  ): Promise<RecurringSourceTransaction[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        ...NOT_DELETED_NOT_TRANSFER,
        userId,
        transactionType: TransactionType.EXPENSE,
        installmentId: null,
        transactionDate: { gte: startDate, lt: beforeDate }
      },
      select: {
        transactionId: true,
        walletType: true,
        walletId: true,
        categoryId: true,
        memo: true,
        transactionDate: true,
        amount: true,
        interest: true,
        category: { select: { categoryName: true } }
      }
    });
    return rows.map((row) => ({
      transactionId: row.transactionId,
      walletType: row.walletType,
      walletId: row.walletId,
      categoryId: row.categoryId,
      categoryName: row.category.categoryName,
      memo: row.memo,
      transactionDate: row.transactionDate,
      amount: row.amount.toNumber() + (row.walletType === "CARD" ? row.interest : 0)
    }));
  }
}
