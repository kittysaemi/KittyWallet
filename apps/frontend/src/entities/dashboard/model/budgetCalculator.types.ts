// 예산 계산기 원본 조회 API 응답(대시보드API.md "예산 계산기 원본 조회 API").

export interface BudgetPeriod {
  year: number;
  month: number;
  start_date: string;
  end_date: string;
}

export interface BudgetAccount {
  account_id: number;
  account_name: string;
  opening_balance: number;
  base_period_income_amount: number;
}

export interface BudgetCard {
  card_id: number;
  card_name: string;
}

export interface BudgetCashExpense {
  transaction_id: number;
  account_id: number;
  category_name: string;
  memo: string | null;
  transaction_date: string;
  amount: number;
}

export interface BudgetCardExpense {
  transaction_id: number;
  card_id: number;
  category_name: string;
  memo: string | null;
  transaction_date: string;
  amount: number;
  interest: number;
  total_amount: number;
}

export type BudgetClassification = "AUTOMATIC" | "CANDIDATE";

export interface BudgetCashFixedItem {
  item_id: string;
  account_id: number;
  category_name: string;
  memo: string | null;
  amount: number;
  classification: BudgetClassification;
  reason: string;
}

export interface BudgetCardFixedItem {
  item_id: string;
  card_id: number;
  category_name: string;
  memo: string | null;
  amount: number;
  classification: BudgetClassification;
  reason: string;
}

export interface BudgetCandidate {
  item_id: string;
  source_type: "ACCOUNT" | "CARD";
  wallet_id: number;
  category_name: string;
  memo: string | null;
  amount: number;
  classification: BudgetClassification;
  reason: string;
}

export interface BudgetCalculatorSource {
  base_period: BudgetPeriod;
  next_period: BudgetPeriod;
  accounts: BudgetAccount[];
  cards: BudgetCard[];
  base_period_items: {
    cash_expenses: BudgetCashExpense[];
    card_expenses: BudgetCardExpense[];
  };
  next_period_items: {
    cash_fixed_items: BudgetCashFixedItem[];
    card_fixed_items: BudgetCardFixedItem[];
    candidates: BudgetCandidate[];
  };
}
