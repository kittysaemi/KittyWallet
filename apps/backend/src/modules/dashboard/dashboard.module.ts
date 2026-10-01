import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { DashboardService } from "./application/dashboard.service";
import { GetBudgetCalculatorSourceUseCase } from "./application/use-cases/get-budget-calculator-source.use-case";
import { BudgetCalculatorRepository } from "./infrastructure/budget-calculator.repository";
import { DashboardRepository } from "./infrastructure/dashboard.repository";
import { BudgetCalculatorController } from "./presentation/budget-calculator.controller";
import { DashboardController } from "./presentation/dashboard.controller";

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController, BudgetCalculatorController],
  providers: [
    DashboardRepository,
    DashboardService,
    BudgetCalculatorRepository,
    GetBudgetCalculatorSourceUseCase
  ]
})
export class DashboardModule {}
