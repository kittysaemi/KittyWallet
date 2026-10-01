import { Injectable } from "@nestjs/common";
import { Prisma, TransactionType } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

// 계좌이동 전용 카테고리명. dashboard.repository.ts·transfer.repository.ts와 동일한 값이다.
// transferGroupId가 없는 레거시 계좌이동 거래를 카테고리명으로 함께 걸러낸다.
const TRANSFER_CATEGORY_NAME = "계좌금액이동";

// 카드 항목은 삭제 거래와 계좌이동을 제외한다.
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
  categoryName: string;
  memo: string | null;
  transactionDate: Date;
  amount: number;
  interest: number;
}

export interface BudgetCashExpenseRow extends BudgetExpenseRow {
  accountName: string;
}

export interface BudgetInstallmentRow extends BudgetExpenseRow {
  installmentId: bigint;
  installmentSeq: number | null;
}

const EXPENSE_SELECT = {
  transactionId: true,
  walletId: true,
  memo: true,
  transactionDate: true,
  amount: true,
  interest: true,
  category: { select: { categoryName: true } }
} satisfies Prisma.TransactionSelect;

function toExpenseRow(row: Prisma.TransactionGetPayload<{ select: typeof EXPENSE_SELECT }>) {
  return {
    transactionId: row.transactionId,
    walletId: row.walletId,
    categoryName: row.category.categoryName,
    memo: row.memo,
    transactionDate: row.transactionDate,
    amount: row.amount.toNumber(),
    interest: row.interest
  };
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
   * 잔액 기준일 잔액 재구성용: 기준일까지(그날 포함) 계좌 거래의 계좌별 수입·지출 합계.
   * 실제 잔액 변동을 재현해야 하므로 계좌이동도 포함한다(삭제 거래만 제외).
   */
  async getAccountBalanceDeltasUntil(
    userId: bigint,
    accountIds: bigint[],
    balanceDate: Date
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
        transactionDate: { lte: balanceDate }
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

  /**
   * 기준 월 현금 동일 사용 지출(예산계산기정책.md 6장): "n월 현금 동일 사용"이 체크된 계좌 지출.
   * 일반 계좌 지출과 계좌이동 보내는 쪽 거래를 모두 포함하므로 계좌이동 필터를 두지 않는다(삭제 거래만 제외).
   */
  async getCashSameUseExpenses(
    userId: bigint,
    startDate: Date,
    endDate: Date
  ): Promise<BudgetCashExpenseRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedYn: false,
        walletType: "ACCOUNT",
        transactionType: TransactionType.EXPENSE,
        nextMonthCashYn: true,
        transactionDate: { gte: startDate, lte: endDate }
      },
      select: EXPENSE_SELECT,
      orderBy: [{ transactionDate: "asc" }, { transactionId: "asc" }]
    });
    // 아카이브된 계좌의 거래도 표시할 수 있도록 계좌명은 삭제 여부와 무관하게 조회한다.
    const accounts = await this.prisma.account.findMany({
      where: { userId, accountId: { in: [...new Set(rows.map((row) => row.walletId))] } },
      select: { accountId: true, accountName: true }
    });
    const names = new Map(accounts.map((a) => [a.accountId.toString(), a.accountName]));
    return rows.map((row) => ({
      ...toExpenseRow(row),
      accountName: names.get(row.walletId.toString()) ?? ""
    }));
  }

  /** 기간 내 카드 지출(일시불·할부 회차, 계좌이동·삭제 제외). 자동 등록된 오늘 이후 날짜 거래도 포함한다. */
  async getCardExpensesInPeriod(
    userId: bigint,
    startDate: Date,
    endDate: Date
  ): Promise<BudgetExpenseRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        ...NOT_DELETED_NOT_TRANSFER,
        userId,
        walletType: "CARD",
        transactionType: TransactionType.EXPENSE,
        transactionDate: { gte: startDate, lte: endDate }
      },
      select: EXPENSE_SELECT,
      orderBy: [{ transactionDate: "asc" }, { transactionId: "asc" }]
    });
    return rows.map(toExpenseRow);
  }

  /** 기준 월 카드 고정지출: 고정지출 체크된 카드 일시불 지출(고정지출 자동화 설정과 무관). */
  async getCardFixedExpensesInPeriod(
    userId: bigint,
    startDate: Date,
    endDate: Date
  ): Promise<BudgetExpenseRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        ...NOT_DELETED_NOT_TRANSFER,
        userId,
        walletType: "CARD",
        transactionType: TransactionType.EXPENSE,
        installmentId: null,
        fixedExpenseYn: true,
        transactionDate: { gte: startDate, lte: endDate }
      },
      select: EXPENSE_SELECT,
      orderBy: [{ transactionDate: "asc" }, { transactionId: "asc" }]
    });
    return rows.map(toExpenseRow);
  }

  /** 기간에 배정된 카드 할부 회차. */
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
      select: { ...EXPENSE_SELECT, installmentId: true, installmentSeq: true },
      orderBy: [{ transactionDate: "asc" }, { transactionId: "asc" }]
    });
    return rows.map((row) => ({
      ...toExpenseRow(row),
      installmentId: row.installmentId as bigint,
      installmentSeq: row.installmentSeq
    }));
  }
}
