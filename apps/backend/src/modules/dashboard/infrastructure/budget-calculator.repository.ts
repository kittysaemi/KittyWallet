import { Injectable } from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

export interface BudgetAccountRow {
  accountId: bigint;
  accountName: string;
  initialBalance: number;
}

export interface BudgetCardTotal {
  /** 기간 내 카드 거래의 `amount + interest` 합계 */
  totalAmount: number;
  /** 합산한 카드 거래 건수 */
  transactionCount: number;
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

  /**
   * 기준 잔액(오늘 잔액) 재구성용: 기준일까지(그날 포함) 계좌 거래의 계좌별 수입·지출 합계.
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
   * 계산 기간(양 끝 포함)의 카드 사용액 합계와 거래 건수(예산계산기정책.md 5장).
   * 삭제 거래만 제외하고 모든 카드 거래를 합산한다. 일시불과 할부 회차 모두 `amount + interest`이며,
   * 카테고리 통계 제외·고정지출 체크·거래일이 오늘 이후인지(자동 등록 거래 포함)는 조건으로 쓰지 않는다.
   */
  async getCardTotalInPeriod(
    userId: bigint,
    startDate: Date,
    endDate: Date
  ): Promise<BudgetCardTotal> {
    const result = await this.prisma.transaction.aggregate({
      where: {
        userId,
        walletType: "CARD",
        deletedYn: false,
        transactionDate: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true, interest: true },
      _count: { _all: true }
    });
    return {
      totalAmount: (result._sum.amount?.toNumber() ?? 0) + (result._sum.interest ?? 0),
      transactionCount: result._count._all
    };
  }
}
