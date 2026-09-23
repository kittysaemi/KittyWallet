import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import { getTodayInTimezone } from "../../../common/utils/date.util";
import { DashboardRepository } from "../infrastructure/dashboard.repository";
import { DashboardQueryDto } from "../presentation/dto/request/dashboard-query.dto";

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getDashboard(userId: bigint, query: DashboardQueryDto) {
    const recentLimit = query.recent_limit ?? 5;
    const summaryPeriod = query.summary_period ?? "MONTH";
    // 거래일자(transactionDate)는 "YYYY-MM-DD" 형태의 달력 날짜를 UTC 자정으로 정규화해
    // 저장/조회한다. 기준 날짜도 같은 방식(UTC 자정)으로 맞춰야 서버 프로세스의 로컬
    // 시스템 시간대와 무관하게 항상 같은 날짜 범위를 계산할 수 있다.
    const baseDateStr = query.base_date ?? getTodayInTimezone();
    const baseDate = new Date(`${baseDateStr}T00:00:00.000Z`);
    const { startDate, endDate } = this.calcPeriod(summaryPeriod, baseDate);
    const forecastPeriod = this.calcCashExpenseForecastPeriod(baseDate);

    const user = await this.dashboardRepository.getUser(userId);
    if (!user) {
      throw new AppException("DASHBOARD_002", "대시보드 조회 실패", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const [assetSummary, spendingSummary, recentTransactions, lastSyncedAt, forecastAmounts] =
      await Promise.all([
        this.dashboardRepository.getAssetSummary(userId),
        this.dashboardRepository.getSpendingSummary(userId, startDate, endDate),
        this.dashboardRepository.getRecentTransactions(userId, recentLimit),
        this.dashboardRepository.getLastSyncedAt(userId),
        this.dashboardRepository.getCashExpenseForecastAmounts(
          userId,
          forecastPeriod.startDate,
          forecastPeriod.endDate
        )
      ]);

    return {
      user: {
        user_id: Number(user.userId),
        nickname: user.nickname
      },
      asset_summary: {
        ...assetSummary,
        currency: "KRW"
      },
      spending_summary: {
        period_type: summaryPeriod,
        start_date: startDate.toISOString().split("T")[0],
        end_date: baseDateStr,
        ...spendingSummary
      },
      recent_transactions: recentTransactions,
      cash_expense_forecast: {
        target_year: forecastPeriod.targetYear,
        target_month: forecastPeriod.targetMonth,
        start_date: forecastPeriod.startDate.toISOString().split("T")[0],
        end_date: forecastPeriod.endDate.toISOString().split("T")[0],
        ...forecastAmounts,
        total_amount:
          forecastAmounts.account_checked_expense_amount + forecastAmounts.card_expense_amount
      },
      sync_summary: {
        has_pending_sync: false,
        pending_count: 0,
        failed_count: 0,
        last_synced_at: lastSyncedAt
      },
      cache_policy: {
        cacheable: true,
        recommended_stale_time_seconds: 60
      }
    };
  }

  // 현금 지출 예상은 summary_period와 무관하게 base_date가 속한 달력 월(1일~말일)의 거래로
  // "다음 달" 지출을 예상한다. 12월이면 대상은 다음 해 1월이다.
  private calcCashExpenseForecastPeriod(baseDate: Date): {
    startDate: Date;
    endDate: Date;
    targetYear: number;
    targetMonth: number;
  } {
    const year = baseDate.getUTCFullYear();
    const month = baseDate.getUTCMonth();
    const startDate = new Date(Date.UTC(year, month, 1));
    // Date.UTC(year, month + 1, 0)은 해당 월의 말일이다(DATE 컬럼과 같은 UTC 자정 기준).
    const endDate = new Date(Date.UTC(year, month + 1, 0));
    const target = new Date(Date.UTC(year, month + 1, 1));
    return {
      startDate,
      endDate,
      targetYear: target.getUTCFullYear(),
      targetMonth: target.getUTCMonth() + 1
    };
  }

  private calcPeriod(
    period: "TODAY" | "WEEK" | "MONTH",
    baseDate: Date
  ): { startDate: Date; endDate: Date } {
    // baseDate는 UTC 자정으로 정규화된 달력 날짜이므로, 이후 계산도 전부 UTC getter/Date.UTC로
    // 수행해 서버의 로컬 시스템 시간대에 영향받지 않도록 한다.
    const endDate = new Date(Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      23, 59, 59, 999
    ));

    let startDate: Date;
    if (period === "TODAY") {
      startDate = new Date(Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate()
      ));
    } else if (period === "WEEK") {
      startDate = new Date(Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate() - 6
      ));
    } else {
      startDate = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), 1));
    }

    return { startDate, endDate };
  }
}
