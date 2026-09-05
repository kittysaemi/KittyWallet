import type { ApiResponse } from "../../icon/model/icon.types";

export interface TransactionItem {
  transaction_id: number;
  wallet_type: "ACCOUNT" | "CARD";
  wallet_id: number;
  wallet_name: string;
  wallet_deleted: boolean;
  category_id: number;
  category_name: string;
  transaction_type: "INCOME" | "EXPENSE";
  amount: number;
  interest?: number;
  memo: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  installment_id?: number | null;
  installment_seq?: number | null;
  installment_total_count?: number | null;
  installment_original_amount?: number | null;
  /** 계좌이동으로 등록된 거래의 짝을 연결하는 값. 백엔드 API(#389) 배포 전까지는 항상 없음. */
  transfer_group_id?: string | null;
}

export interface InstallmentItem {
  transaction_id: number;
  installment_seq: number;
  amount: number;
  interest?: number;
  transaction_date: string;
}

export interface InstallmentInfo {
  original_amount: number;
  current_total_amount: number;
  remaining_amount: number;
  total_interest?: number;
  installment_months: number;
  purchase_date: string;
  installment_items: InstallmentItem[];
}

export interface TransactionDetailItem extends TransactionItem {
  installment_info?: InstallmentInfo | null;
}

export interface TransactionListData {
  items: TransactionItem[];
  page: number;
  limit: number;
  total_count: number;
  period_summary?: { total_expense: number } | null;
}

export interface CreateTransactionRequest {
  wallet_type: "ACCOUNT" | "CARD";
  wallet_id: number;
  category_id: number;
  transaction_type: "INCOME" | "EXPENSE";
  amount: number;
  memo?: string;
  transaction_date: string;
  timezone?: string;
  installment?: { installment_months: number };
}

export interface CreateTransactionResult {
  transaction_id: number;
  updated_at: string;
  synced_at: string | null;
  installment_id?: number;
  transactions?: InstallmentItem[];
}

export interface UpdateTransactionRequest {
  wallet_type?: "ACCOUNT" | "CARD";
  wallet_id?: number;
  category_id?: number;
  transaction_type?: "INCOME" | "EXPENSE";
  amount?: number;
  interest?: number;
  memo?: string | null;
  transaction_date?: string;
  timezone?: string;
}

export interface UpdateTransactionResult {
  transaction_id: number;
  wallet_type: string;
  wallet_id: number;
  transaction_type: string;
  amount: number;
  transaction_date: string;
  updated_at: string;
}

export interface DeleteTransactionResult {
  transaction_id: number;
  deleted_yn: boolean;
  updated_at: string;
}

export interface TransactionListParams {
  start_date?: string;
  end_date?: string;
  keyword?: string;
  wallet_type?: string;
  wallet_id?: number;
  category_id?: number;
  // 다중 선택 필터(#353). 쉼표 구분 문자열로 보낸다.
  // - category_ids: "1,2,3"
  // - wallet_ids: "ACCOUNT:1,CARD:2" (지갑은 유형+ID 쌍으로만 식별된다)
  // 단일 값 파라미터(category_id/wallet_type/wallet_id)도 계속 지원되므로, 지갑별 거래내역이나
  // 검색처럼 하나만 지정하는 화면은 기존 파라미터를 그대로 쓰면 된다.
  category_ids?: string;
  wallet_ids?: string;
  // 할부 거래(installment_id가 있는 거래)를 목록에서 제외한다.
  exclude_installment?: boolean;
  transaction_type?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ConvertToInstallmentRequest {
  installment_months: number;
  timezone?: string;
}

export interface CreateTransferRequest {
  from_account_id: number;
  to_account_id: number;
  amount: number;
  transaction_date: string;
  memo?: string;
  timezone?: string;
}

export interface UpdateTransferRequest {
  from_account_id?: number;
  to_account_id?: number;
  amount?: number;
  transaction_date?: string;
  memo?: string | null;
  timezone?: string;
}

export interface TransferResult {
  transfer_group_id: string;
  from_transaction_id: number;
  to_transaction_id: number;
  from_account_id: number;
  from_account_name: string;
  from_account_deleted: boolean;
  to_account_id: number;
  to_account_name: string;
  to_account_deleted: boolean;
  amount: number;
  transaction_date: string;
  updated_at: string;
}

export type { ApiResponse };
