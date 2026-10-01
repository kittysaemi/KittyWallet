import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../../../common/exceptions/app.exception";
import { getTodayInTimezone } from "../../../../common/utils/date.util";
import { SUPPORTED_TIMEZONES, TimezoneSetting } from "../../../settings/domain/settings-policy";
import {
  calcBudgetPeriods,
  fromDateString,
  isValidDateString,
  isValidMonthString,
  MonthPeriod,
  previousMonthString,
  toDateString
} from "../../domain/budget-period";
import { BudgetCalculatorRepository } from "../../infrastructure/budget-calculator.repository";

// 예산 계산기 원본 조회(대시보드API.md "예산 계산기 원본 조회 API").
// 읽기 전용이며 계산 결과를 만들거나 저장하지 않는다. 세 결과는 화면이 로컬로 계산한다.

function periodResponse(period: MonthPeriod) {
  return {
    year: period.year,
    month: period.month,
    start_date: toDateString(period.startDate),
    end_date: toDateString(period.endDate)
  };
}

function validationError(message: string): AppException {
  return new AppException("VALIDATION_001", message, HttpStatus.BAD_REQUEST);
}

@Injectable()
export class GetBudgetCalculatorSourceUseCase {
  constructor(private readonly repository: BudgetCalculatorRepository) {}

  async execute(userId: bigint, baseMonth: string, baseDate?: string) {
    if (!isValidMonthString(baseMonth)) {
      throw validationError("계산 기준 월 형식이 올바르지 않습니다.");
    }

    // 기준 월은 사용자 시간대 기준 이번 달 또는 지난달만 허용한다(예산계산기정책.md 3.1).
    const timezoneSetting = await this.repository.getUserTimezoneSetting(userId);
    const timezone = SUPPORTED_TIMEZONES.includes(timezoneSetting as TimezoneSetting)
      ? (timezoneSetting as TimezoneSetting)
      : undefined;
    const today = getTodayInTimezone(timezone);
    const currentMonth = today.slice(0, 7);

    let balanceDate: string;
    if (baseMonth === currentMonth) {
      balanceDate = today;
    } else if (baseMonth === previousMonthString(currentMonth)) {
      if (!baseDate) {
        throw validationError("잔액 기준일을 입력해 주세요.");
      }
      if (!isValidDateString(baseDate)) {
        throw validationError("잔액 기준일 형식이 올바르지 않습니다.");
      }
      if (baseDate > today) {
        throw validationError("오늘 이후 날짜는 잔액 기준일로 선택할 수 없습니다.");
      }
      balanceDate = baseDate;
    } else {
      throw validationError("이번 달 또는 지난달만 선택할 수 있습니다.");
    }

    const { base, next } = calcBudgetPeriods(baseMonth);

    try {
      const [accounts, cards] = await Promise.all([
        this.repository.getAccounts(userId),
        this.repository.getCards(userId)
      ]);
      const [balanceDeltas, cashSameUseExpenses, cardExpenses, nextInstallments, cardFixedExpenses] =
        await Promise.all([
          this.repository.getAccountBalanceDeltasUntil(
            userId,
            accounts.map((a) => a.accountId),
            fromDateString(balanceDate)
          ),
          this.repository.getCashSameUseExpenses(userId, base.startDate, base.endDate),
          this.repository.getCardExpensesInPeriod(userId, base.startDate, base.endDate),
          this.repository.getCardInstallmentsInPeriod(userId, next.startDate, next.endDate),
          this.repository.getCardFixedExpensesInPeriod(userId, base.startDate, base.endDate)
        ]);

      return {
        base_period: periodResponse(base),
        next_period: periodResponse(next),
        balance_date: balanceDate,
        accounts: accounts.map((account) => ({
          account_id: Number(account.accountId),
          account_name: account.accountName,
          balance: account.initialBalance + (balanceDeltas.get(account.accountId.toString()) ?? 0)
        })),
        cards: cards.map((card) => ({
          card_id: Number(card.cardId),
          card_name: card.cardName
        })),
        cash_same_use_expenses: cashSameUseExpenses.map((tx) => ({
          transaction_id: Number(tx.transactionId),
          account_id: Number(tx.walletId),
          account_name: tx.accountName,
          category_name: tx.categoryName,
          memo: tx.memo,
          transaction_date: toDateString(tx.transactionDate),
          amount: tx.amount
        })),
        base_period_card_expenses: cardExpenses.map((tx) => ({
          transaction_id: Number(tx.transactionId),
          card_id: Number(tx.walletId),
          category_name: tx.categoryName,
          memo: tx.memo,
          transaction_date: toDateString(tx.transactionDate),
          amount: tx.amount,
          interest: tx.interest,
          total_amount: tx.amount + tx.interest
        })),
        next_period_installments: nextInstallments.map((tx) => ({
          item_id: `installment-${tx.installmentId}-${tx.installmentSeq ?? tx.transactionId}`,
          card_id: Number(tx.walletId),
          category_name: tx.categoryName,
          memo: tx.memo,
          transaction_date: toDateString(tx.transactionDate),
          installment_seq: tx.installmentSeq,
          total_amount: tx.amount + tx.interest
        })),
        card_fixed_expenses: cardFixedExpenses.map((tx) => ({
          transaction_id: Number(tx.transactionId),
          card_id: Number(tx.walletId),
          category_name: tx.categoryName,
          memo: tx.memo,
          transaction_date: toDateString(tx.transactionDate),
          total_amount: tx.amount + tx.interest
        }))
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
