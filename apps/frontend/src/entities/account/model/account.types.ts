import type { ApiResponse } from "../../icon/model/icon.types";

export interface AccountItem {
  account_id: number;
  account_name: string;
  icon_id: number;
  initial_balance: number;
  current_balance: number | null;
  allow_negative_balance: boolean;
  negative_balance_limit: number;
  created_at: string;
  updated_at: string;
}

export interface AccountListData {
  items: AccountItem[];
}

export interface CreateAccountRequest {
  account_name: string;
  initial_balance: number;
  icon_id: number;
  allow_negative_balance?: boolean;
  negative_balance_limit?: number;
}

export interface UpdateAccountRequest {
  account_name?: string;
  icon_id?: number;
}

export type { ApiResponse };
