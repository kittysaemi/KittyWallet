import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { GetBudgetCalculatorSourceUseCase } from "../application/use-cases/get-budget-calculator-source.use-case";
import { BudgetCalculatorSourceQueryDto } from "./dto/request/budget-calculator-source-query.dto";

// 기존 DashboardController(GET /dashboard)와 분리한 예산 계산기 전용 컨트롤러.
@Controller("dashboard")
export class BudgetCalculatorController {
  constructor(private readonly getBudgetCalculatorSource: GetBudgetCalculatorSourceUseCase) {}

  @Get("budget-calculator-source")
  getSource(@CurrentUser() user: JwtPayload, @Query() query: BudgetCalculatorSourceQueryDto) {
    return this.getBudgetCalculatorSource.execute(BigInt(user.sub), query.base_month);
  }
}
