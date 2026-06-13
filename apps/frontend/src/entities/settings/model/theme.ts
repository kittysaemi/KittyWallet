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

// href 속성만 변경하면 Chrome이 favicon을 재fetch하지 않아 탭 아이콘이 바뀌지 않음.
// 기존 link 요소를 제거하고 새로 추가해야 Chrome이 새 favicon을 인식함.
function replaceLinkElement(
  id: string,
  rel: string,
  type: string,
  sizes: string | undefined,
  href: string
): void {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const link = document.createElement("link");
  link.id = id;
  link.rel = rel;
  link.type = type;
  if (sizes) link.setAttribute("sizes", sizes);
  link.href = href;
  document.head.appendChild(link);
}

function updateLinkHref(id: string, href: string): void {
  const el = document.querySelector<HTMLLinkElement>(`#${id}`);
  if (el) el.href = href;
}

export function applyThemeSetting(theme: unknown, persist = true): void {
  const normalized = normalizeThemeSetting(theme);
  document.documentElement.dataset.theme = normalized;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_PRIMARY_COLORS[normalized];

  const folder = THEME_FOLDER[normalized];
  const base = `/kittywallet/icons/themes/${folder}`;
  // ?v= 쿼리로 URL을 고유하게 만들어 WebKit(iOS Chrome 포함)의 HTTP 캐시를 우회함.
  // 동일 경로 파일이라도 URL이 달라지면 브라우저가 반드시 재fetch함.
  const bust = `?v=${Date.now()}`;
  replaceLinkElement("favicon-ico", "icon", "image/x-icon", undefined, `${base}/favicon/favicon.ico${bust}`);
  replaceLinkElement("favicon-32", "icon", "image/png", "32x32", `${base}/favicon/favicon-32x32.png${bust}`);
  replaceLinkElement("favicon-16", "icon", "image/png", "16x16", `${base}/favicon/favicon-16x16.png${bust}`);
  replaceLinkElement("apple-touch-icon", "apple-touch-icon", "image/png", undefined, `${base}/apple-touch/apple-touch-icon.png${bust}`);
  updateLinkHref("manifest-link", `/kittywallet/api/v1/manifest?theme=${folder}`);

  if (persist) {
    try {
      localStorage.setItem(THEME_LS_KEY, normalized);
      document.cookie = `kw_theme=${folder}; path=/; SameSite=Lax; max-age=31536000`;
    } catch { /* storage unavailable */ }
  }
}
