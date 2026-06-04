import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { DashboardService } from "../application/dashboard.service";
import { DashboardQueryDto } from "./dto/request/dashboard-query.dto";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(@CurrentUser() user: JwtPayload, @Query() query: DashboardQueryDto) {
    return this.dashboardService.getDashboard(BigInt(user.sub), query);
  }
}
