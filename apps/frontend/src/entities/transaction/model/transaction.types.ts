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
  transaction_type?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ConvertToInstallmentRequest {
  installment_months: number;
  timezone?: string;
}

export type { ApiResponse };
