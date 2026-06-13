import type { AppSettings, ThemeSetting } from "./settings.types";

export const DEFAULT_THEME: ThemeSetting = "cat-pink";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: DEFAULT_THEME,
  currency: "KRW",
  sync_enabled: true,
  transaction_list_page_size: 20
};

const THEME_PRIMARY_COLORS: Record<ThemeSetting, string> = {
  "cat-pink": "#fda5e3",
  "mint": "#77d8b8",
  "lavender": "#bfa8ff"
};

const THEME_FOLDER: Record<ThemeSetting, string> = {
  "cat-pink": "pink",
  "mint": "mint",
  "lavender": "purple"
};

const THEME_LS_KEY = "kw_theme";

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

export function getStoredTheme(): ThemeSetting {
  try {
    return normalizeThemeSetting(localStorage.getItem(THEME_LS_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

function updateLinkHref(id: string, href: string): void {
  const el = document.querySelector<HTMLLinkElement>(`#${id}`);
  if (el) el.href = href;
}

export function applyThemeSetting(theme: unknown): void {
  const normalized = normalizeThemeSetting(theme);
  document.documentElement.dataset.theme = normalized;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_PRIMARY_COLORS[normalized];

  const folder = THEME_FOLDER[normalized];
  const base = `/kittywallet/icons/themes/${folder}`;
  updateLinkHref("favicon-ico", `${base}/favicon/favicon.ico`);
  updateLinkHref("favicon-32", `${base}/favicon/favicon-32x32.png`);
  updateLinkHref("favicon-16", `${base}/favicon/favicon-16x16.png`);
  updateLinkHref("apple-touch-icon", `${base}/apple-touch/apple-touch-icon.png`);
  updateLinkHref("manifest-link", `/kittywallet/api/v1/manifest?theme=${folder}`);

  try {
    localStorage.setItem(THEME_LS_KEY, normalized);
  } catch { /* storage unavailable */ }
}
