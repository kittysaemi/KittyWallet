import type { BudgetCalculatorSource } from "../../../entities/dashboard/model/budgetCalculator.types";
import { calculateBudget, formatMonthLabel, shiftMonth } from "./calculateBudget";

const source: BudgetCalculatorSource = {
  base_period: { year: 2026, month: 9, start_date: "2026-09-01", end_date: "2026-09-30" },
  next_period: { year: 2026, month: 10, start_date: "2026-10-01", end_date: "2026-10-31" },
  accounts: [
    { account_id: 1, account_name: "CMA_RP", opening_balance: 1_300_000, base_period_income_amount: 3_000_000 },
    { account_id: 2, account_name: "생활비 통장", opening_balance: 200_000, base_period_income_amount: 0 }
  ],
  cards: [{ card_id: 5, card_name: "신한카드" }],
  base_period_items: {
    cash_expenses: [
      { transaction_id: 1, account_id: 1, category_name: "식비", memo: null, transaction_date: "2026-09-05", amount: 400_000 },
      { transaction_id: 2, account_id: 2, category_name: "관리비", memo: null, transaction_date: "2026-09-10", amount: 200_000 }
    ],
    card_expenses: [
      {
        transaction_id: 3,
        card_id: 5,
        category_name: "쇼핑",
        memo: null,
        transaction_date: "2026-09-18",
        amount: 1_000_000,
        interest: 20_000,
        total_amount: 1_020_000
      }
    ]
  },
  next_period_items: {
    cash_fixed_items: [
      { item_id: "cash-next-month-2", account_id: 2, category_name: "관리비", memo: null, amount: 200_000, classification: "AUTOMATIC", reason: "" }
    ],
    card_fixed_items: [
      { item_id: "installment-20-4", card_id: 5, category_name: "가전", memo: null, amount: 82_000, classification: "AUTOMATIC", reason: "" }
    ],
    candidates: [
      { item_id: "candidate-10", source_type: "CARD", wallet_id: 5, category_name: "의료", memo: "병원", amount: 35_000, classification: "CANDIDATE", reason: "" },
      { item_id: "candidate-11", source_type: "ACCOUNT", wallet_id: 1, category_name: "운동", memo: "헬스", amount: 60_000, classification: "CANDIDATE", reason: "" }
    ]
  }
};

describe("calculateBudget", () => {
  it("1번은 기준 월 시작 잔액 + 기준 계좌 수입 - 모든 계좌 현금지출 - 모든 카드 지출(이자 포함)이다", () => {
    const result = calculateBudget(source, {
      baseAccountId: 1,
      minimumBalance: 0,
      nextMonthIncome: 0,
      selectedCandidateIds: new Set()
    });
    // 1,300,000 + 3,000,000 - (400,000 + 200,000) - 1,020,000
    expect(result?.remainingBalance).toBe(2_680_000);
  });

  it("2번은 max(0, 최소 유지금액 - 1번)이며 다음 달 예상 수입을 쓰지 않는다", () => {
    const base = { baseAccountId: 1, selectedCandidateIds: new Set<string>() };
    expect(calculateBudget(source, { ...base, minimumBalance: 3_000_000, nextMonthIncome: 0 })?.requiredAdditionalIncome).toBe(320_000);
    expect(calculateBudget(source, { ...base, minimumBalance: 3_000_000, nextMonthIncome: 9_999_999 })?.requiredAdditionalIncome).toBe(320_000);
    expect(calculateBudget(source, { ...base, minimumBalance: 1_000_000, nextMonthIncome: 0 })?.requiredAdditionalIncome).toBe(0);
  });

  it("1번 결과가 음수이면 음수 그대로 두고 2번에 반영한다", () => {
    const result = calculateBudget(source, {
      baseAccountId: 2,
      minimumBalance: 100_000,
      nextMonthIncome: 0,
      selectedCandidateIds: new Set()
    });
    // 200,000 + 0 - 600,000 - 1,020,000
    expect(result?.remainingBalance).toBe(-1_420_000);
    expect(result?.requiredAdditionalIncome).toBe(1_520_000);
  });

  it("3번은 max(0, 입력한 예상 수입 - 다음 달 현금 고정지출 - 카드 고정지출)이며 최소 유지금액을 빼지 않는다", () => {
    const result = calculateBudget(source, {
      baseAccountId: 1,
      minimumBalance: 5_000_000,
      nextMonthIncome: 3_000_000,
      selectedCandidateIds: new Set()
    });
    expect(result?.nextMonthCardAllowance).toBe(3_000_000 - 200_000 - 82_000);
    expect(result?.breakdown).toMatchObject({ automaticTotal: 282_000, selectedCandidateTotal: 0 });
  });

  it("선택한 후보만 결제수단에 맞춰 3번에 더하고 1·2번은 바뀌지 않는다", () => {
    const without = calculateBudget(source, {
      baseAccountId: 1,
      minimumBalance: 3_000_000,
      nextMonthIncome: 3_000_000,
      selectedCandidateIds: new Set()
    });
    const withCandidates = calculateBudget(source, {
      baseAccountId: 1,
      minimumBalance: 3_000_000,
      nextMonthIncome: 3_000_000,
      selectedCandidateIds: new Set(["candidate-10", "candidate-11"])
    });
    expect(withCandidates?.breakdown.nextCardFixed).toBe(82_000 + 35_000);
    expect(withCandidates?.breakdown.nextCashFixed).toBe(200_000 + 60_000);
    expect(withCandidates?.nextMonthCardAllowance).toBe((without?.nextMonthCardAllowance ?? 0) - 95_000);
    expect(withCandidates?.remainingBalance).toBe(without?.remainingBalance);
    expect(withCandidates?.requiredAdditionalIncome).toBe(without?.requiredAdditionalIncome);
  });

  it("3번은 고정지출이 수입보다 크면 0이다", () => {
    const result = calculateBudget(source, {
      baseAccountId: 1,
      minimumBalance: 0,
      nextMonthIncome: 100_000,
      selectedCandidateIds: new Set()
    });
    expect(result?.nextMonthCardAllowance).toBe(0);
  });

  it("원본에 없는 계좌면 계산하지 않는다", () => {
    expect(
      calculateBudget(source, { baseAccountId: 99, minimumBalance: 0, nextMonthIncome: 0, selectedCandidateIds: new Set() })
    ).toBeNull();
  });
});

describe("shiftMonth / formatMonthLabel", () => {
  it("연도 경계를 넘어 이동한다", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(formatMonthLabel("2026-09")).toBe("2026년 9월");
  });
});
