import { Injectable, Logger } from "@nestjs/common";
import { getTodayInTimezone } from "../../../common/utils/date.util";
import { calcFixedExpensePeriod, toTargetDate } from "../domain/fixed-expense-period";
import { FixedExpenseRepository } from "../infrastructure/fixed-expense.repository";

// 카드 고정지출 자동 등록(거래정책.md 10장, 모듈정의.md 14장).
// 지난달 고정지출로 체크된 카드 일시불 지출을 이번 달 거래로 한꺼번에 1회분 등록한다.

export interface RegisterFixedExpensesResult {
  created: number;
  skipped: number;
}

@Injectable()
export class RegisterFixedExpensesUseCase {
  private readonly logger = new Logger("FixedExpenseAutoRegister");

  constructor(private readonly repository: FixedExpenseRepository) {}

  /** today: 실행일("YYYY-MM-DD", Asia/Seoul). 미지정 시 오늘. */
  async execute(today: string = getTodayInTimezone()): Promise<RegisterFixedExpensesResult> {
    const period = calcFixedExpensePeriod(today);
    this.logger.log(`start: run_date=${today}`);

    try {
      const userIds = await this.repository.findEnabledUserIds();
      if (userIds.length === 0) {
        this.logger.log("done: created=0 skipped=0 (no enabled user)");
        return { created: 0, skipped: 0 };
      }

      const sources = await this.repository.findSourceTransactions(
        userIds,
        period.sourceStartDate,
        period.sourceEndDate
      );
      const activeCardIds = await this.repository.findActiveCardIds(
        Array.from(new Set(sources.map((s) => s.walletId.toString()))).map((id) => BigInt(id))
      );

      // 삭제되었거나 사용 안 함인 카드의 거래는 오류로 보지 않고 건너뛴다.
      const targets = sources.filter((s) => activeCardIds.has(s.walletId.toString()));
      const skipped = sources.length - targets.length;

      const created = await this.repository.createAll(
        targets.map((s) => ({
          userId: s.userId,
          walletId: s.walletId,
          categoryId: s.categoryId,
          amount: s.amount,
          memo: s.memo,
          transactionDate: toTargetDate(s.transactionDate, period.targetYear, period.targetMonthIndex)
        })),
        new Date()
      );

      this.logger.log(`done: created=${created} skipped=${skipped}`);
      return { created, skipped };
    } catch (error) {
      // 등록은 한 트랜잭션이므로 이미 롤백되었다. 재시도하지 않는다.
      this.logger.error(
        `failed: run_date=${today} (all registrations rolled back)`,
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }
}
