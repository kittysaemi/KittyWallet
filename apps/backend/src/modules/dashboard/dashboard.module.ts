import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaModule } from "../../database/prisma.module";
import { DashboardService } from "./application/dashboard.service";
import { GetBudgetCalculatorSourceUseCase } from "./application/use-cases/get-budget-calculator-source.use-case";
import {
  BUDGET_CALCULATOR_CONFIG,
  loadBudgetCalculatorConfig
} from "./domain/budget-calculator-config";
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
    GetBudgetCalculatorSourceUseCase,
    {
      provide: BUDGET_CALCULATOR_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        loadBudgetCalculatorConfig((key) => configService.get<string>(key))
    }
  ]
})
export class DashboardModule {}
