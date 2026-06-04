import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import { DashboardRepository } from "../infrastructure/dashboard.repository";
import { DashboardQueryDto } from "../presentation/dto/request/dashboard-query.dto";

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getDashboard(userId: bigint, query: DashboardQueryDto) {
    const recentLimit = query.recent_limit ?? 5;
    const summaryPeriod = query.summary_period ?? "MONTH";
    const baseDate = query.base_date
      ? new Date(query.base_date)
      : new Date();

    const baseDateStr = baseDate.toISOString().split("T")[0];
    const { startDate, endDate } = this.calcPeriod(summaryPeriod, baseDate);

    const user = await this.dashboardRepository.getUser(userId);
    if (!user) {
      throw new AppException("DASHBOARD_002", "대시보드 조회 실패", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const [assetSummary, spendingSummary, recentTransactions, lastSyncedAt] = await Promise.all([
      this.dashboardRepository.getAssetSummary(userId),
      this.dashboardRepository.getSpendingSummary(userId, startDate, endDate),
      this.dashboardRepository.getRecentTransactions(userId, recentLimit),
      this.dashboardRepository.getLastSyncedAt(userId)
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

  private calcPeriod(
    period: "TODAY" | "WEEK" | "MONTH",
    baseDate: Date
  ): { startDate: Date; endDate: Date } {
    const endDate = new Date(baseDate);
    endDate.setHours(23, 59, 59, 999);

    let startDate: Date;
    if (period === "TODAY") {
      startDate = new Date(baseDate);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "WEEK") {
      startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }
}
