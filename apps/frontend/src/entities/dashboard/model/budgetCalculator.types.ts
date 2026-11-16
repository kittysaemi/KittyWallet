// 예산 계산기 원본 조회 API 응답(대시보드API.md "예산 계산기 원본 조회 API").

export interface BudgetPeriod {
  start_date: string;
  end_date: string;
}

export interface BudgetAccount {
  account_id: number;
  account_name: string;
  /** 기준 잔액: 오늘(그날 포함)의 계좌 잔액 */
  balance: number;
}

export interface BudgetCalculatorSource {
  /** 요청한 계산 기간 */
  period: BudgetPeriod;
  /** 기준 잔액의 기준일(오늘) */
  balance_date: string;
  accounts: BudgetAccount[];
  /** 계산 기간의 모든 카드 거래 합계(삭제 제외, 할부는 월 할부금 + 이자) */
  card_total_amount: number;
  /** 합산한 카드 거래 건수 */
  card_transaction_count: number;
}
