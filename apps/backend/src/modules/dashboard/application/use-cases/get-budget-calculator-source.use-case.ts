import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { AppException } from "../../../../common/exceptions/app.exception";
import { getTodayInTimezone } from "../../../../common/utils/date.util";
import { SUPPORTED_TIMEZONES, TimezoneSetting } from "../../../settings/domain/settings-policy";
import {
  BUDGET_CALCULATOR_CONFIG,
  BudgetCalculatorConfig
} from "../../domain/budget-calculator-config";
import {
  calcBudgetPeriods,
  isValidMonthString,
  MonthPeriod,
  toDateString
} from "../../domain/budget-period";
import {
  classifyRecurringTransactions,
  recurringKey
} from "../../domain/recurring-expense.classifier";
import { BudgetCalculatorRepository } from "../../infrastructure/budget-calculator.repository";

// 예산 계산기 원본 조회(대시보드API.md "예산 계산기 원본 조회 API").
// 읽기 전용이며 계산 결과를 만들거나 저장하지 않는다. 세 결과는 화면이 로컬로 계산한다.

type Classification = "AUTOMATIC" | "CANDIDATE";

function periodResponse(period: MonthPeriod) {
  return {
    year: period.year,
    month: period.month,
    start_date: toDateString(period.startDate),
    end_date: toDateString(period.endDate)
  };
}

@Injectable()
export class GetBudgetCalculatorSourceUseCase {
  constructor(
    private readonly repository: BudgetCalculatorRepository,
    @Inject(BUDGET_CALCULATOR_CONFIG) private readonly config: BudgetCalculatorConfig
  ) {}

  async execute(userId: bigint, baseMonth: string) {
    if (!isValidMonthString(baseMonth)) {
      throw new AppException(
        "VALIDATION_001",
        "계산 기준 월 형식이 올바르지 않습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    // 오늘 날짜는 미래 월 차단에만 사용한다. 기간 경계와 계산 대상은 기준 월로만 정한다.
    const timezoneSetting = await this.repository.getUserTimezoneSetting(userId);
    const timezone = SUPPORTED_TIMEZONES.includes(timezoneSetting as TimezoneSetting)
      ? (timezoneSetting as TimezoneSetting)
      : undefined;
    const currentMonth = getTodayInTimezone(timezone).slice(0, 7);
    if (baseMonth > currentMonth) {
      throw new AppException(
        "VALIDATION_001",
        "미래 월은 계산 기준으로 선택할 수 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const periods = calcBudgetPeriods(
      baseMonth,
      this.config.observationMonths,
      this.config.candidateRecentMonths
    );
    const { base, next } = periods;

    try {
      const [accounts, cards] = await Promise.all([
        this.repository.getAccounts(userId),
        this.repository.getCards(userId)
      ]);
      const [
        balanceDeltas,
        baseIncome,
        baseCashExpenses,
        baseCardExpenses,
        nextInstallments,
        recurringSource
      ] = await Promise.all([
        this.repository.getAccountBalanceDeltasBefore(
          userId,
          accounts.map((a) => a.accountId),
          base.startDate
        ),
        this.repository.getAccountIncomeInPeriod(userId, base.startDate, base.endDate),
        this.repository.getExpensesInPeriod(userId, "ACCOUNT", base.startDate, base.endDate),
        this.repository.getExpensesInPeriod(userId, "CARD", base.startDate, base.endDate),
        this.repository.getCardInstallmentsInPeriod(userId, next.startDate, next.endDate),
        this.repository.getRecurringSourceTransactions(
          userId,
          periods.observationStartDate,
          base.startDate
        )
      ]);

      // 기준 월의 "n월 현금 동일 사용" 체크 거래는 다음 달 현금 고정지출로 바로 반영한다.
      const checkedCashExpenses = baseCashExpenses.filter((tx) => tx.nextMonthCashYn);
      // 같은 지출이 체크 거래와 반복 판별로 두 번 반영되지 않도록 체크 거래의 키는 반복 판별에서 제외한다.
      const checkedKeys = new Set(
        checkedCashExpenses.map((tx) =>
          recurringKey("ACCOUNT", tx.walletId, tx.categoryId, tx.memo)
        )
      );
      const recurring = classifyRecurringTransactions(recurringSource, this.config, {
        nextStartDate: next.startDate,
        nextEndDate: next.endDate,
        candidateRecentStartDate: periods.candidateRecentStartDate,
        observationMonths: this.config.observationMonths
      }).filter((item) => !checkedKeys.has(item.key));

      const automatic = recurring.filter((item) => item.classification === "AUTOMATIC");
      const candidates = recurring.filter((item) => item.classification === "CANDIDATE");

      return {
        base_period: periodResponse(base),
        next_period: periodResponse(next),
        accounts: accounts.map((account) => {
          const key = account.accountId.toString();
          return {
            account_id: Number(account.accountId),
            account_name: account.accountName,
            opening_balance: account.initialBalance + (balanceDeltas.get(key) ?? 0),
            base_period_income_amount: baseIncome.get(key) ?? 0
          };
        }),
        cards: cards.map((card) => ({
          card_id: Number(card.cardId),
          card_name: card.cardName
        })),
        base_period_items: {
          cash_expenses: baseCashExpenses.map((tx) => ({
            transaction_id: Number(tx.transactionId),
            account_id: Number(tx.walletId),
            category_name: tx.categoryName,
            memo: tx.memo,
            transaction_date: toDateString(tx.transactionDate),
            amount: tx.amount
          })),
          card_expenses: baseCardExpenses.map((tx) => ({
            transaction_id: Number(tx.transactionId),
            card_id: Number(tx.walletId),
            category_name: tx.categoryName,
            memo: tx.memo,
            transaction_date: toDateString(tx.transactionDate),
            amount: tx.amount,
            interest: tx.interest,
            total_amount: tx.amount + tx.interest
          }))
        },
        next_period_items: {
          cash_fixed_items: [
            ...checkedCashExpenses.map((tx) => ({
              item_id: `cash-next-month-${tx.transactionId}`,
              account_id: Number(tx.walletId),
              category_name: tx.categoryName,
              memo: tx.memo,
              amount: tx.amount,
              classification: "AUTOMATIC" as Classification,
              reason: `${base.month}월 거래의 ${next.month}월 현금 동일 사용 체크`
            })),
            ...automatic
              .filter((item) => item.walletType === "ACCOUNT")
              .map((item) => ({
                item_id: `cash-recurring-${item.latestTransactionId}`,
                account_id: Number(item.walletId),
                category_name: item.categoryName,
                memo: item.memo,
                amount: item.amount,
                classification: item.classification as Classification,
                reason: item.reason
              }))
          ],
          card_fixed_items: [
            ...nextInstallments.map((tx) => ({
              item_id: `installment-${tx.installmentId}-${tx.installmentSeq ?? tx.transactionId}`,
              card_id: Number(tx.walletId),
              category_name: tx.categoryName,
              memo: tx.memo,
              amount: tx.amount + tx.interest,
              classification: "AUTOMATIC" as Classification,
              reason:
                tx.installmentSeq !== null
                  ? `다음 달 할부 ${tx.installmentSeq}회차`
                  : "다음 달 할부 회차"
            })),
            ...automatic
              .filter((item) => item.walletType === "CARD")
              .map((item) => ({
                item_id: `card-recurring-${item.latestTransactionId}`,
                card_id: Number(item.walletId),
                category_name: item.categoryName,
                memo: item.memo,
                amount: item.amount,
                classification: item.classification as Classification,
                reason: item.reason
              }))
          ],
          candidates: candidates.map((item) => ({
            item_id: `candidate-${item.latestTransactionId}`,
            source_type: item.walletType,
            wallet_id: Number(item.walletId),
            category_name: item.categoryName,
            memo: item.memo,
            amount: item.amount,
            classification: item.classification as Classification,
            reason: item.reason
          }))
        }
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
