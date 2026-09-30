import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { RegisterFixedExpensesUseCase } from "./register-fixed-expenses.use-case";

@Injectable()
export class FixedExpenseScheduler {
  constructor(private readonly registerFixedExpenses: RegisterFixedExpensesUseCase) {}

  // 매월 1일 00:00(Asia/Seoul) 1회 실행한다.
  @Cron("0 0 1 * *", { name: "fixed-expense-auto-register", timeZone: "Asia/Seoul" })
  async handleMonthlyRegister(): Promise<void> {
    // 실패는 use case에서 롤백·오류 로그로 처리한다. 예약 작업 자체는 종료만 한다.
    await this.registerFixedExpenses.execute().catch(() => undefined);
  }
}
