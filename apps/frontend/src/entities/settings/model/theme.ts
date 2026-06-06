import type { AppSettings, ThemeSetting } from "./settings.types";

export const DEFAULT_THEME: ThemeSetting = "cat-pink";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: DEFAULT_THEME,
  currency: "KRW",
  sync_enabled: true,
  transaction_list_page_size: 20
};

export const THEME_OPTIONS: Array<{
  value: ThemeSetting;
  label: string;
  description: string;
}> = [
  {
    value: "cat-pink",
    label: "고양이",
    description: "따뜻한 기본 핑크 테마"
  },
  {
    value: "mint",
    label: "민트",
    description: "산뜻한 초록빛 테마"
  },
  {
    value: "lavender",
    label: "라벤더",
    description: "차분한 보라빛 테마"
  }
];

const themeValues = THEME_OPTIONS.map((theme) => theme.value);

export function normalizeThemeSetting(value: unknown): ThemeSetting {
  return themeValues.includes(value as ThemeSetting) ? (value as ThemeSetting) : DEFAULT_THEME;
}

export function normalizeAppSettings(settings: Partial<AppSettings> | undefined): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...settings,
    theme: normalizeThemeSetting(settings?.theme)
  };
}

export function applyThemeSetting(theme: unknown): void {
  document.documentElement.dataset.theme = normalizeThemeSetting(theme);
}
