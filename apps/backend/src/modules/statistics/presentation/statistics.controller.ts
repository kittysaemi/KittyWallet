import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { StatisticsService } from "../application/statistics.service";
import { CategoryStatisticsQueryDto } from "./dto/request/category-statistics-query.dto";
import { MonthlyStatisticsQueryDto } from "./dto/request/monthly-statistics-query.dto";
import { PeriodStatisticsQueryDto } from "./dto/request/period-statistics-query.dto";
import { VisualizationQueryDto } from "./dto/request/visualization-query.dto";

const DEFAULT_CATEGORY_LIMIT = 10;
const MAX_CATEGORY_LIMIT = 50;

@Controller("statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("monthly")
  getMonthlyStatistics(@CurrentUser() user: JwtPayload, @Query() query: MonthlyStatisticsQueryDto) {
    return this.statisticsService.getMonthlyStatistics({
      userId: BigInt(user.sub),
      month: query.month,
      walletType: query.wallet_type,
      walletId: query.wallet_id ? BigInt(query.wallet_id) : undefined
    });
  }

  @Get("category")
  getCategoryStatistics(
    @CurrentUser() user: JwtPayload,
    @Query() query: CategoryStatisticsQueryDto
  ) {
    const limit = query.limit
      ? Math.min(MAX_CATEGORY_LIMIT, Math.max(1, parseInt(query.limit, 10)))
      : DEFAULT_CATEGORY_LIMIT;

    return this.statisticsService.getCategoryStatistics({
      userId: BigInt(user.sub),
      startDate: query.start_date,
      endDate: query.end_date,
      transactionType: query.transaction_type,
      walletType: query.wallet_type,
      walletId: query.wallet_id ? BigInt(query.wallet_id) : undefined,
      limit
    });
  }

  @Get("period")
  getPeriodStatistics(@CurrentUser() user: JwtPayload, @Query() query: PeriodStatisticsQueryDto) {
    return this.statisticsService.getPeriodStatistics({
      userId: BigInt(user.sub),
      startDate: query.start_date,
      endDate: query.end_date,
      walletType: query.wallet_type,
      walletId: query.wallet_id ? BigInt(query.wallet_id) : undefined,
      groupBy: query.group_by
    });
  }

  @Get("summary")
  getSummaryStatistics(@CurrentUser() user: JwtPayload, @Query() query: VisualizationQueryDto) {
    return this.statisticsService.getSummaryStatistics({
      userId: BigInt(user.sub),
      month: query.month,
      walletType: query.wallet_type,
      walletId: query.wallet_id ? BigInt(query.wallet_id) : undefined
    });
  }

  @Get("category-top")
  getCategoryTopStatistics(@CurrentUser() user: JwtPayload, @Query() query: VisualizationQueryDto) {
    return this.statisticsService.getCategoryTopStatistics({
      userId: BigInt(user.sub),
      month: query.month,
      walletType: query.wallet_type,
      walletId: query.wallet_id ? BigInt(query.wallet_id) : undefined
    });
  }

  @Get("calendar")
  getCalendarStatistics(@CurrentUser() user: JwtPayload, @Query() query: VisualizationQueryDto) {
    return this.statisticsService.getCalendarStatistics({
      userId: BigInt(user.sub),
      month: query.month,
      walletType: query.wallet_type,
      walletId: query.wallet_id ? BigInt(query.wallet_id) : undefined
    });
  }

  @Get("sankey")
  getSankeyStatistics(@CurrentUser() user: JwtPayload, @Query() query: VisualizationQueryDto) {
    return this.statisticsService.getSankeyStatistics({
      userId: BigInt(user.sub),
      month: query.month,
      walletType: query.wallet_type,
      walletId: query.wallet_id ? BigInt(query.wallet_id) : undefined
    });
  }
}
