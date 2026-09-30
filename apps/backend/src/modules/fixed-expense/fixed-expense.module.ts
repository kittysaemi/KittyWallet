import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { FixedExpenseScheduler } from "./application/fixed-expense.scheduler";
import { RegisterFixedExpensesUseCase } from "./application/register-fixed-expenses.use-case";
import { FixedExpenseRepository } from "./infrastructure/fixed-expense.repository";

// 카드 고정지출 자동 등록 예약 작업(모듈정의.md 14장). HTTP API는 제공하지 않는다.
@Module({
  imports: [PrismaModule],
  providers: [FixedExpenseRepository, RegisterFixedExpensesUseCase, FixedExpenseScheduler]
})
export class FixedExpenseModule {}
