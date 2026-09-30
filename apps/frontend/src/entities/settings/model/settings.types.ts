import type { ApiResponse } from "../../auth/model/auth.types";

export type ThemeSetting = "cat-pink" | "mint" | "lavender";
export type CurrencySetting = "KRW";
export type TimezoneSetting = "Asia/Seoul";

export interface AppSettings {
  theme: ThemeSetting;
  currency: CurrencySetting;
  sync_enabled: boolean;
  timezone: TimezoneSetting;
  transaction_list_page_size: number;
  /** 카드 고정지출 자동 등록 사용 여부(기본 false). false면 고정지출 체크박스를 표시하지 않는다. */
  fixed_expense_auto_enabled: boolean;
}

export interface SettingsData {
  settings: AppSettings;
  updated_at: string | null;
}

export type SettingsResponse = ApiResponse<SettingsData>;
export type UpdateSettingsRequest = {
  settings: AppSettings;
};
