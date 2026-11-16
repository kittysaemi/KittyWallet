import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../../../common/exceptions/app.exception";
import { getTodayInTimezone } from "../../../../common/utils/date.util";
import { SUPPORTED_TIMEZONES, TimezoneSetting } from "../../../settings/domain/settings-policy";
import { fromDateString, isValidDateString } from "../../domain/budget-period";
import { BudgetCalculatorRepository } from "../../infrastructure/budget-calculator.repository";

// 예산 계산기 원본 조회(대시보드API.md "예산 계산기 원본 조회 API").
// 읽기 전용이며 계산 결과를 만들거나 저장하지 않는다. 세 결과는 화면이 로컬로 계산한다.

function validationError(message: string): AppException {
  return new AppException("VALIDATION_001", message, HttpStatus.BAD_REQUEST);
}

@Injectable()
export class GetBudgetCalculatorSourceUseCase {
  constructor(private readonly repository: BudgetCalculatorRepository) {}

  async execute(userId: bigint, startDate: string, endDate: string) {
    if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
      throw validationError("계산 기간 형식이 올바르지 않습니다.");
    }

    // 시작일은 사용자 시간대 기준 오늘까지만 허용하고, 종료일은 미래 날짜를 허용한다
    // (예산계산기정책.md 4.1). 기준 잔액은 계산 기간과 무관하게 항상 오늘 기준이다.
    const timezoneSetting = await this.repository.getUserTimezoneSetting(userId);
    const timezone = SUPPORTED_TIMEZONES.includes(timezoneSetting as TimezoneSetting)
      ? (timezoneSetting as TimezoneSetting)
      : undefined;
    const today = getTodayInTimezone(timezone);

    if (startDate > today) {
      throw validationError("시작일은 오늘 이후 날짜로 선택할 수 없습니다.");
    }
    if (startDate > endDate) {
      throw validationError("시작일은 종료일보다 늦을 수 없습니다.");
    }

    try {
      const accounts = await this.repository.getAccounts(userId);
      const [balanceDeltas, cardTotal] = await Promise.all([
        this.repository.getAccountBalanceDeltasUntil(
          userId,
          accounts.map((a) => a.accountId),
          fromDateString(today)
        ),
        this.repository.getCardTotalInPeriod(userId, fromDateString(startDate), fromDateString(endDate))
      ]);

      return {
        period: { start_date: startDate, end_date: endDate },
        balance_date: today,
        accounts: accounts.map((account) => ({
          account_id: Number(account.accountId),
          account_name: account.accountName,
          balance: account.initialBalance + (balanceDeltas.get(account.accountId.toString()) ?? 0)
        })),
        card_total_amount: cardTotal.totalAmount,
        card_transaction_count: cardTotal.transactionCount
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException(
        "DASHBOARD_002",
        "예산 계산 원본 조회 실패",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
