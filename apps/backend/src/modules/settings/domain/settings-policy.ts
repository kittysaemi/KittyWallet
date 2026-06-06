import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";

export const SETTING_DEFAULTS = {
  theme: "cat-pink",
  currency: "KRW",
  sync_enabled: true,
  transaction_list_page_size: 20
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export interface SettingsMap {
  theme: "cat-pink" | "mint" | "lavender";
  currency: "KRW";
  sync_enabled: boolean;
  transaction_list_page_size: number;
}

export type SettingValue = SettingsMap[SettingKey];
export type PartialSettingsMap = Partial<SettingsMap>;

const settingKeys = Object.keys(SETTING_DEFAULTS) as SettingKey[];

export function assertSettingKey(key: string): asserts key is SettingKey {
  if (!settingKeys.includes(key as SettingKey)) {
    throw new AppException("SETTING_001", "지원하지 않는 설정값입니다.", HttpStatus.BAD_REQUEST);
  }
}

export function normalizeSettings(input: Record<string, unknown>): PartialSettingsMap {
  const settings = Object.entries(input).reduce<Record<string, SettingValue>>((result, [key, value]) => {
    assertSettingKey(key);
    result[key] = normalizeSettingValue(key, value);
    return result;
  }, {});

  return settings as PartialSettingsMap;
}

export function mergeWithDefaultSettings(settings: PartialSettingsMap): SettingsMap {
  return {
    ...SETTING_DEFAULTS,
    ...settings,
    theme: normalizeThemeValue(settings.theme)
  };
}

function normalizeSettingValue(key: SettingKey, value: unknown): SettingValue {
  switch (key) {
    case "theme":
      return normalizeThemeValue(value);
    case "currency":
      if (value === "KRW") {
        return value;
      }
      break;
    case "sync_enabled":
      if (typeof value === "boolean") {
        return value;
      }
      break;
    case "transaction_list_page_size":
      if (typeof value === "number" && Number.isInteger(value) && value > 0) {
        return value;
      }
      break;
  }

  throw new AppException("SETTING_001", "지원하지 않는 설정값입니다.", HttpStatus.BAD_REQUEST);
}

function normalizeThemeValue(value: unknown): SettingsMap["theme"] {
  if (value === "cat-pink" || value === "mint" || value === "lavender") {
    return value;
  }

  if (value === undefined || value === "system" || value === "light" || value === "dark") {
    return SETTING_DEFAULTS.theme;
  }

  throw new AppException("SETTING_001", "지원하지 않는 설정값입니다.", HttpStatus.BAD_REQUEST);
}
