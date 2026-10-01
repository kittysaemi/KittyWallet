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
  /** 잔액 기준일(그날 포함)의 계좌 잔액 */
  balance: number;
}

export interface BudgetCard {
  card_id: number;
  card_name: string;
}

/** 기준 월 "n월 현금 동일 사용" 체크 계좌 지출(계좌이동 보내는 쪽 포함) */
export interface BudgetCashSameUseExpense {
  transaction_id: number;
  account_id: number;
  account_name: string;
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

export interface BudgetInstallment {
  item_id: string;
  card_id: number;
  category_name: string;
  memo: string | null;
  transaction_date: string;
  installment_seq: number | null;
  total_amount: number;
}

export interface BudgetCardFixedExpense {
  transaction_id: number;
  card_id: number;
  category_name: string;
  memo: string | null;
  transaction_date: string;
  total_amount: number;
}

export interface BudgetCalculatorSource {
  base_period: BudgetPeriod;
  next_period: BudgetPeriod;
  balance_date: string;
  accounts: BudgetAccount[];
  cards: BudgetCard[];
  cash_same_use_expenses: BudgetCashSameUseExpense[];
  base_period_card_expenses: BudgetCardExpense[];
  next_period_installments: BudgetInstallment[];
  card_fixed_expenses: BudgetCardFixedExpense[];
}
