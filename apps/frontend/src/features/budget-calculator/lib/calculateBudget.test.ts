import type { BudgetCalculatorSource } from "../../../entities/dashboard/model/budgetCalculator.types";
import { calculateBudget, formatMonthLabel, shiftMonth } from "./calculateBudget";

const source: BudgetCalculatorSource = {
  base_period: { year: 2026, month: 9, start_date: "2026-09-01", end_date: "2026-09-30" },
  next_period: { year: 2026, month: 10, start_date: "2026-10-01", end_date: "2026-10-31" },
  balance_date: "2026-09-20",
  accounts: [
    { account_id: 1, account_name: "CMA_RP", balance: 3_000_000 },
    { account_id: 2, account_name: "생활비 통장", balance: 200_000 }
  ],
  cards: [{ card_id: 5, card_name: "신한카드" }],
  cash_same_use_expenses: [
    { transaction_id: 1, account_id: 2, account_name: "생활비 통장", category_name: "관리비", memo: null, transaction_date: "2026-09-10", amount: 200_000 },
    { transaction_id: 2, account_id: 1, account_name: "CMA_RP", category_name: "계좌금액이동", memo: "적금", transaction_date: "2026-09-05", amount: 300_000 }
  ],
  base_period_card_expenses: [
    { transaction_id: 3, card_id: 5, category_name: "쇼핑", memo: null, transaction_date: "2026-09-18", amount: 1_000_000, interest: 20_000, total_amount: 1_020_000 }
  ],
  next_period_installments: [
    { item_id: "installment-20-4", card_id: 5, category_name: "가전", memo: null, transaction_date: "2026-10-10", installment_seq: 4, total_amount: 82_000 }
  ],
  card_fixed_expenses: [
    { transaction_id: 4, card_id: 5, category_name: "통신", memo: null, transaction_date: "2026-09-25", total_amount: 55_000 }
  ]
};

const base = { baseAccountId: 1, minimumBalance: 0, nextMonthIncome: 0 };

describe("calculateBudget", () => {
  it("1번은 기준 잔액 - 현금 동일 사용 지출(모든 계좌) - 기준 월 카드 사용액(이자 포함)이다", () => {
    const result = calculateBudget(source, base);
    // 3,000,000 - (200,000 + 300,000) - 1,020,000
    expect(result?.remainingBalance).toBe(1_480_000);
    expect(result?.breakdown).toMatchObject({
      baseBalance: 3_000_000,
      cashSameUseExpense: 500_000,
      baseCardExpense: 1_020_000
    });
  });

  it("1번이 마이너스이면 마이너스 그대로 둔다", () => {
    // 200,000 - 500,000 - 1,020,000
    expect(calculateBudget(source, { ...base, baseAccountId: 2 })?.remainingBalance).toBe(-1_320_000);
  });

  it("2번은 max(0, 최소 유지금액 - 1번)이며 다음 달 예상 수입을 쓰지 않는다", () => {
    expect(calculateBudget(source, { ...base, minimumBalance: 2_000_000 })?.requiredAdditionalIncome).toBe(520_000);
    expect(
      calculateBudget(source, { ...base, minimumBalance: 2_000_000, nextMonthIncome: 9_999_999 })?.requiredAdditionalIncome
    ).toBe(520_000);
    expect(calculateBudget(source, { ...base, minimumBalance: 1_000_000 })?.requiredAdditionalIncome).toBe(0);
  });

  it("3번은 max(0, 예상 수입 - 현금 동일 사용 지출 - 다음 달 할부 - 카드 고정지출)이며 최소 유지금액을 빼지 않는다", () => {
    const result = calculateBudget(source, { ...base, minimumBalance: 5_000_000, nextMonthIncome: 3_000_000 });
    // 3,000,000 - 500,000 - 82,000 - 55,000
    expect(result?.nextMonthCardAllowance).toBe(2_363_000);
    expect(result?.breakdown).toMatchObject({ nextInstallment: 82_000, cardFixedExpense: 55_000 });
    expect(calculateBudget(source, { ...base, nextMonthIncome: 100_000 })?.nextMonthCardAllowance).toBe(0);
  });

  it("기준 계좌가 원본에 없으면 계산하지 않는다", () => {
    expect(calculateBudget(source, { ...base, baseAccountId: 99 })).toBeNull();
  });
});

describe("shiftMonth / formatMonthLabel", () => {
  it("연도 경계를 넘어 월을 이동한다", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("YYYY-MM을 한국어 월 표기로 바꾼다", () => {
    expect(formatMonthLabel("2026-09")).toBe("2026년 9월");
  });
});
