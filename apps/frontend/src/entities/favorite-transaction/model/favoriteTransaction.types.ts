import type { ApiResponse } from "../../icon/model/icon.types";

export interface FavoriteTransactionItem {
  favorite_transaction_id: number;
  transaction_type: "INCOME" | "EXPENSE";
  wallet_type: "ACCOUNT" | "CARD";
  wallet_id: number;
  wallet_name: string;
  wallet_use_yn: boolean;
  wallet_deleted: boolean;
  category_id: number;
  category_name: string;
  category_show: boolean;
  amount: number;
  memo: string | null;
  balance_insufficient: boolean;
  created_at: string;
  updated_at: string;
}

export interface FavoriteTransactionListData {
  items: FavoriteTransactionItem[];
}

export interface SaveFavoriteTransactionRequest {
  transaction_type: "INCOME" | "EXPENSE";
  wallet_type: "ACCOUNT" | "CARD";
  wallet_id: number;
  category_id: number;
  amount: number;
  memo?: string;
}

export interface SaveFavoriteTransactionResult {
  favorite_transaction_id: number;
  created_at: string;
  updated_at: string;
}

export type { ApiResponse };
