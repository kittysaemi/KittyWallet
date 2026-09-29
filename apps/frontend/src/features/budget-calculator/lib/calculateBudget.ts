import type { BudgetCalculatorSource } from "../../../entities/dashboard/model/budgetCalculator.types";

// 예산 계산기 세 결과(예산계산기정책.md 7장). 서버에 보내거나 저장하지 않고 화면에서만 계산한다.

export interface BudgetCalculatorInput {
  baseAccountId: number;
  minimumBalance: number;
  nextMonthIncome: number;
  selectedCandidateIds: ReadonlySet<string>;
}

export interface BudgetCalculationResult {
  /** 1번: 다음 달 수입 전 기준 계좌 예상 잔여금 (음수 가능) */
  remainingBalance: number;
  /** 2번: 최소 유지금액을 지키기 위해 필요한 추가 예상 수입 */
  requiredAdditionalIncome: number;
  /** 3번: 다음 달 추가 카드 사용 여유 */
  nextMonthCardAllowance: number;
  breakdown: {
    openingBalance: number;
    baseIncome: number;
    baseCashExpense: number;
    baseCardExpense: number;
    nextCashFixed: number;
    nextCardFixed: number;
    automaticTotal: number;
    selectedCandidateTotal: number;
  };
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function calculateBudget(
  source: BudgetCalculatorSource,
  input: BudgetCalculatorInput
): BudgetCalculationResult | null {
  const account = source.accounts.find((a) => a.account_id === input.baseAccountId);
  if (!account) return null;

  // 1번: 기준 월 실제 등록 거래만 사용한다. 카드는 모든 카드의 amount + interest.
  const baseCashExpense = sum(source.base_period_items.cash_expenses.map((e) => e.amount));
  const baseCardExpense = sum(source.base_period_items.card_expenses.map((e) => e.total_amount));
  const remainingBalance =
    account.opening_balance + account.base_period_income_amount - baseCashExpense - baseCardExpense;

  // 2번: 다음 달 예상 수입은 사용하지 않는다.
  const requiredAdditionalIncome = Math.max(0, input.minimumBalance - remainingBalance);

  // 3번: 사용자가 켠 후보만 결제수단에 맞춰 다음 달 현금/카드 고정지출에 더한다.
  const selectedCandidates = source.next_period_items.candidates.filter((c) =>
    input.selectedCandidateIds.has(c.item_id)
  );
  const automaticCash = sum(source.next_period_items.cash_fixed_items.map((i) => i.amount));
  const automaticCard = sum(source.next_period_items.card_fixed_items.map((i) => i.amount));
  const selectedCash = sum(selectedCandidates.filter((c) => c.source_type === "ACCOUNT").map((c) => c.amount));
  const selectedCard = sum(selectedCandidates.filter((c) => c.source_type === "CARD").map((c) => c.amount));
  const nextCashFixed = automaticCash + selectedCash;
  const nextCardFixed = automaticCard + selectedCard;
  // 최소 유지금액은 1·2번에서 판단하므로 3번 식에서 다시 빼지 않는다.
  const nextMonthCardAllowance = Math.max(0, input.nextMonthIncome - nextCashFixed - nextCardFixed);

  return {
    remainingBalance,
    requiredAdditionalIncome,
    nextMonthCardAllowance,
    breakdown: {
      openingBalance: account.opening_balance,
      baseIncome: account.base_period_income_amount,
      baseCashExpense,
      baseCardExpense,
      nextCashFixed,
      nextCardFixed,
      automaticTotal: automaticCash + automaticCard,
      selectedCandidateTotal: selectedCash + selectedCard
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
