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
}

export interface SettingsData {
  settings: AppSettings;
  updated_at: string | null;
}

export type SettingsResponse = ApiResponse<SettingsData>;
export type UpdateSettingsRequest = {
  settings: AppSettings;
};
