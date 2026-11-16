import type { BudgetCalculatorSource } from "../../../entities/dashboard/model/budgetCalculator.types";

// 예산 계산기 세 결과(예산계산기정책.md 7장). 서버에 보내거나 저장하지 않고 화면에서만 계산한다.

export interface BudgetCalculatorInput {
  baseAccountId: number;
  /** 예상 수입 */
  expectedIncome: number;
  /** 현금 고정지출(사용자 직접 입력) */
  cashFixedExpense: number;
  minimumBalance: number;
}

export interface BudgetCalculationResult {
  /** 1번: 남는 금액 = 예산 - 지출 (음수 가능) */
  difference: number;
  /** 2번: 추가로 필요한 금액 = max(0, 지출 - 예산) */
  requiredAmount: number;
  /** 3번: {최소 유지금액}원을 유지하기 위해 필요한 금액 = max(0, 최소 유지금액 - 남는 금액) */
  minimumBalanceShortfall: number;
  breakdown: {
    baseBalance: number;
    expectedIncome: number;
    /** 예산 = 기준 잔액 + 예상 수입 */
    budget: number;
    cardExpense: number;
    cashFixedExpense: number;
    /** 지출 = 카드 사용액 + 현금 고정지출 */
    expense: number;
  };
}

export function calculateBudget(
  source: BudgetCalculatorSource,
  input: BudgetCalculatorInput
): BudgetCalculationResult | null {
  const account = source.accounts.find((a) => a.account_id === input.baseAccountId);
  if (!account) return null;

  const budget = account.balance + input.expectedIncome;
  const expense = source.card_total_amount + input.cashFixedExpense;

  // 1번: 예산 - 지출(마이너스 그대로).
  const difference = budget - expense;
  // 2번: 예산이 모자랄 때 필요한 금액.
  const requiredAmount = Math.max(0, expense - budget);
  // 3번: 최소 유지금액은 1·2번 계산에 사용하지 않는다.
  const minimumBalanceShortfall = Math.max(0, input.minimumBalance - difference);

  return {
    difference,
    requiredAmount,
    minimumBalanceShortfall,
    breakdown: {
      baseBalance: account.balance,
      expectedIncome: input.expectedIncome,
      budget,
      cardExpense: source.card_total_amount,
      cashFixedExpense: input.cashFixedExpense,
      expense
    }
  };
}

/** "YYYY-MM"의 1일~말일(예산 계산기 계산 기간 기본값). */
export function getMonthRange(month: string): { startDate: string; endDate: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { startDate: `${month}-01`, endDate: `${month}-${String(lastDay).padStart(2, "0")}` };
}

/**
 * 계산 기간 검증(예산계산기정책.md 3.1, 예외처리.md 9.1). 오류 문구를 반환하며 유효하면 undefined.
 * 시작일은 오늘 이후를 막고, 종료일의 미래 날짜는 허용한다.
 */
export function validateBudgetPeriod(
  startDate: string,
  endDate: string,
  today: string
): string | undefined {
  if (!startDate || !endDate) return "계산 기간을 입력해 주세요.";
  if (startDate > today) return "시작일은 오늘 이후 날짜로 선택할 수 없습니다.";
  if (startDate > endDate) return "시작일은 종료일보다 늦을 수 없습니다.";
  return undefined;
}
