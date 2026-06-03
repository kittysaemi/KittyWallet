import type { ApiResponse } from "../../icon/model/icon.types";

export interface TransactionItem {
  transaction_id: number;
  wallet_type: "ACCOUNT" | "CARD";
  wallet_id: number;
  wallet_name: string;
  category_id: number;
  category_name: string;
  transaction_type: "INCOME" | "EXPENSE";
  amount: number;
  memo: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionListData {
  items: TransactionItem[];
  page: number;
  limit: number;
  total_count: number;
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

export type { ApiResponse };
