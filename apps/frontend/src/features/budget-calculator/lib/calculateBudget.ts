import type { BudgetCalculatorSource } from "../../../entities/dashboard/model/budgetCalculator.types";

// 예산 계산기 세 결과(예산계산기정책.md 7장). 서버에 보내거나 저장하지 않고 화면에서만 계산한다.

export interface BudgetCalculatorInput {
  baseAccountId: number;
  minimumBalance: number;
  nextMonthIncome: number;
}

export interface BudgetCalculationResult {
  /** 1번: 다음 달 수입 전 기준 계좌 예상 잔여금 (음수 가능) */
  remainingBalance: number;
  /** 2번: 최소 유지금액을 지키기 위해 필요한 추가 예상 수입 */
  requiredAdditionalIncome: number;
  /** 3번: 다음 달 추가 카드 사용 여유 */
  nextMonthCardAllowance: number;
  breakdown: {
    baseBalance: number;
    cashSameUseExpense: number;
    baseCardExpense: number;
    nextInstallment: number;
    cardFixedExpense: number;
  };
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function calculateBudget(
  source: BudgetCalculatorSource,
  input: BudgetCalculatorInput
): BudgetCalculationResult | null {
  const account = source.accounts.find((a) => a.account_id === input.baseAccountId);
  if (!account) return null;

  // 현금 동일 사용 지출은 1번과 3번에 같은 값을 쓴다.
  const cashSameUseExpense = sum(source.cash_same_use_expenses.map((e) => e.amount));
  const baseCardExpense = sum(source.base_period_card_expenses.map((e) => e.total_amount));
  const nextInstallment = sum(source.next_period_installments.map((i) => i.total_amount));
  const cardFixedExpense = sum(source.card_fixed_expenses.map((e) => e.total_amount));

  // 1번: 잔액 기준일 잔액 - 현금 동일 사용 지출 - 기준 월 카드 사용액(마이너스 그대로).
  const remainingBalance = account.balance - cashSameUseExpense - baseCardExpense;

  // 2번: 다음 달 예상 수입은 사용하지 않는다.
  const requiredAdditionalIncome = Math.max(0, input.minimumBalance - remainingBalance);

  // 3번: 최소 유지금액은 1·2번에서 판단하므로 다시 빼지 않는다.
  const nextMonthCardAllowance = Math.max(
    0,
    input.nextMonthIncome - cashSameUseExpense - nextInstallment - cardFixedExpense
  );

  return {
    remainingBalance,
    requiredAdditionalIncome,
    nextMonthCardAllowance,
    breakdown: {
      baseBalance: account.balance,
      cashSameUseExpense,
      baseCardExpense,
      nextInstallment,
      cardFixedExpense
    }
  };
}

/** "YYYY-MM"에서 개월을 더하거나 뺀다. */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${year}년 ${monthNumber}월`;
}
