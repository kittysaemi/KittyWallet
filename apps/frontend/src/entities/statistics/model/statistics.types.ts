import type { ApiResponse } from "../../transaction/model/transaction.types";

export interface MonthlyStatisticsParams {
  month?: string;
  wallet_type?: "ACCOUNT" | "CARD";
  wallet_id?: number;
}

export interface MonthlyDailyItem {
  date: string;
  income_amount: number;
  expense_amount: number;
  transaction_count: number;
}

export interface MonthlyStatisticsData {
  month: string;
  wallet_type: string | null;
  income_amount: number;
  expense_amount: number;
  net_amount: number;
  transaction_count: number;
  daily_items: MonthlyDailyItem[];
}

export interface CategoryStatisticsParams {
  start_date: string;
  end_date: string;
  transaction_type?: "INCOME" | "EXPENSE";
  wallet_type?: "ACCOUNT" | "CARD";
  wallet_id?: number;
  limit?: number;
}

export interface CategoryStatisticsItem {
  category_id: number;
  category_name: string;
  icon_id: number | null;
  amount: number;
  transaction_count: number;
  ratio: number;
}

export interface CategoryStatisticsData {
  start_date: string;
  end_date: string;
  total_amount: number;
  items: CategoryStatisticsItem[];
}

export interface PeriodStatisticsParams {
  start_date: string;
  end_date: string;
  wallet_type?: "ACCOUNT" | "CARD";
  wallet_id?: number;
  group_by?: "DAY" | "MONTH";
}

export interface PeriodStatisticsItem {
  period: string;
  income_amount: number;
  expense_amount: number;
  transaction_count: number;
}

export interface PeriodStatisticsData {
  start_date: string;
  end_date: string;
  income_amount: number;
  expense_amount: number;
  net_amount: number;
  items: PeriodStatisticsItem[];
}

export interface VisualizationParams {
  month?: string;
  start_date?: string;
  end_date?: string;
  wallet_type?: "ACCOUNT" | "CARD";
  wallet_id?: number;
}

export interface SummaryTopCategory {
  category_id: number;
  category_name: string;
  icon_id: number | null;
  amount: number;
}

export interface SummaryStatisticsData {
  month: string;
  income_amount: number;
  expense_amount: number;
  net_amount: number;
  transaction_count: number;
  top_category: SummaryTopCategory | null;
}

export interface CategoryTopItem {
  rank: number | null;
  category_id: number | null;
  category_name: string;
  icon_id: number | null;
  amount: number;
  ratio: number;
}

export interface CategoryTopStatisticsData {
  month: string;
  total_expense: number;
  items: CategoryTopItem[];
}

export interface CalendarDailyItem {
  date: string;
  expense_amount: number;
}

export interface CalendarStatisticsData {
  month: string;
  max_daily_expense: number;
  daily_items: CalendarDailyItem[];
}

export type { ApiResponse };
