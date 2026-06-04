export interface DashboardUser {
  user_id: number;
  nickname: string;
}

export interface AssetSummary {
  total_asset_amount: number;
  account_count: number;
  active_account_count: number;
  card_count: number;
  active_card_count: number;
  currency: string;
}

export interface SpendingSummary {
  period_type: "TODAY" | "WEEK" | "MONTH";
  start_date: string;
  end_date: string;
  income_amount: number;
  expense_amount: number;
  card_expense_amount: number;
  net_amount: number;
  transaction_count: number;
}

export interface DashboardTransaction {
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

export interface SyncSummary {
  has_pending_sync: boolean;
  pending_count: number;
  failed_count: number;
  last_synced_at: string | null;
}

export interface CachePolicy {
  cacheable: boolean;
  recommended_stale_time_seconds: number;
}

export interface DashboardData {
  user: DashboardUser;
  asset_summary: AssetSummary;
  spending_summary: SpendingSummary;
  recent_transactions: DashboardTransaction[];
  sync_summary: SyncSummary;
  cache_policy: CachePolicy;
}

export interface DashboardQuery {
  recent_limit?: number;
  summary_period?: "TODAY" | "WEEK" | "MONTH";
  base_date?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}
