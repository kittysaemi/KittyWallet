import type { ApiResponse } from "../../icon/model/icon.types";

export interface AccountItem {
  account_id: number;
  account_name: string;
  icon_id: number;
  initial_balance: number;
  current_balance: number | null;
  use_yn: boolean;
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
  use_yn?: boolean;
}

export interface UpdateAccountRequest {
  account_name?: string;
  icon_id?: number;
  use_yn?: boolean;
}

export type { ApiResponse };
