import type { BudgetCalculatorSource } from "../../../entities/dashboard/model/budgetCalculator.types";
import { calculateBudget, getMonthRange, validateBudgetPeriod } from "./calculateBudget";

const source: BudgetCalculatorSource = {
  period: { start_date: "2026-09-01", end_date: "2026-09-30" },
  balance_date: "2026-09-20",
  accounts: [
    { account_id: 1, account_name: "CMA_RP", balance: 3_000_000 },
    { account_id: 2, account_name: "생활비 통장", balance: 200_000 }
  ],
  card_total_amount: 1_020_000,
  card_transaction_count: 2
};

const base = { baseAccountId: 1, expectedIncome: 0, cashFixedExpense: 0, minimumBalance: 0 };

describe("calculateBudget", () => {
  it("예산은 기준 잔액 + 예상 수입, 지출은 카드 사용액 + 현금 고정지출이다", () => {
    const result = calculateBudget(source, { ...base, expectedIncome: 500_000, cashFixedExpense: 200_000 });

    expect(result?.breakdown).toEqual({
      baseBalance: 3_000_000,
      expectedIncome: 500_000,
      budget: 3_500_000,
      cardExpense: 1_020_000,
      cashFixedExpense: 200_000,
      expense: 1_220_000
    });
  });

  it("1번 차액은 예산 - 지출이며, 남으면 양수·모자라면 마이너스 그대로다", () => {
    // 3,500,000 - 1,220,000
    expect(
      calculateBudget(source, { ...base, expectedIncome: 500_000, cashFixedExpense: 200_000 })?.difference
    ).toBe(2_280_000);
    // 200,000 - (1,020,000 + 300,000)
    expect(
      calculateBudget(source, { ...base, baseAccountId: 2, cashFixedExpense: 300_000 })?.difference
    ).toBe(-1_120_000);
  });

  it("2번 필요 금액은 max(0, 지출 - 예산)이다", () => {
    expect(
      calculateBudget(source, { ...base, baseAccountId: 2, cashFixedExpense: 300_000 })?.requiredAmount
    ).toBe(1_120_000);
    // 예산이 남으면 0
    expect(calculateBudget(source, base)?.requiredAmount).toBe(0);
  });

  it("3번 최소 유지금액 부족은 max(0, 최소 유지금액 - 차액)이다", () => {
    // 차액: 3,000,000 - 1,020,000 = 1,980,000
    expect(calculateBudget(source, { ...base, minimumBalance: 2_500_000 })?.minimumBalanceShortfall).toBe(520_000);
    expect(calculateBudget(source, { ...base, minimumBalance: 1_980_000 })?.minimumBalanceShortfall).toBe(0);
    expect(calculateBudget(source, { ...base, minimumBalance: 1_000_000 })?.minimumBalanceShortfall).toBe(0);
  });

  it("차액이 음수이면 3번은 필요 금액에 최소 유지금액을 더한 값이다", () => {
    // 차액: 200,000 - 1,020,000 = -820,000
    const result = calculateBudget(source, { ...base, baseAccountId: 2, minimumBalance: 500_000 });

    expect(result?.difference).toBe(-820_000);
    expect(result?.requiredAmount).toBe(820_000);
    expect(result?.minimumBalanceShortfall).toBe(1_320_000);
  });

  it("최소 유지금액은 1번·2번 결과에 영향을 주지 않는다", () => {
    const without = calculateBudget(source, { ...base, baseAccountId: 2 });
    const withMinimum = calculateBudget(source, { ...base, baseAccountId: 2, minimumBalance: 9_999_999 });

    expect(withMinimum?.difference).toBe(without?.difference);
    expect(withMinimum?.requiredAmount).toBe(without?.requiredAmount);
  });

  it("기준 계좌가 원본에 없으면 계산하지 않는다", () => {
    expect(calculateBudget(source, { ...base, baseAccountId: 99 })).toBeNull();
  });
});

describe("getMonthRange", () => {
  it("월의 1일~말일을 반환한다(윤년·연말 포함)", () => {
    expect(getMonthRange("2026-09")).toEqual({ startDate: "2026-09-01", endDate: "2026-09-30" });
    expect(getMonthRange("2028-02")).toEqual({ startDate: "2028-02-01", endDate: "2028-02-29" });
    expect(getMonthRange("2026-12")).toEqual({ startDate: "2026-12-01", endDate: "2026-12-31" });
  });
});

describe("validateBudgetPeriod", () => {
  const today = "2026-09-20";

  it("시작일은 오늘까지 허용하고 종료일의 미래 날짜도 허용한다", () => {
    expect(validateBudgetPeriod("2026-09-20", "2026-09-20", today)).toBeUndefined();
    expect(validateBudgetPeriod("2026-09-01", "2027-12-31", today)).toBeUndefined();
    expect(validateBudgetPeriod("2020-01-01", "2026-09-30", today)).toBeUndefined();
  });

  it("기간이 비어 있으면 입력 안내를 반환한다", () => {
    expect(validateBudgetPeriod("", "2026-09-30", today)).toBe("계산 기간을 입력해 주세요.");
    expect(validateBudgetPeriod("2026-09-01", "", today)).toBe("계산 기간을 입력해 주세요.");
  });

  it("시작일이 오늘 이후이면 오류를 반환한다", () => {
    expect(validateBudgetPeriod("2026-09-21", "2026-09-30", today)).toBe(
      "시작일은 오늘 이후 날짜로 선택할 수 없습니다."
    );
  });

  it("시작일이 종료일보다 늦으면 오류를 반환한다", () => {
    expect(validateBudgetPeriod("2026-09-15", "2026-09-10", today)).toBe(
      "시작일은 종료일보다 늦을 수 없습니다."
    );
  });
});
