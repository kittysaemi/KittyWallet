import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { settingsApi } from "../../entities/settings/api/settingsApi";
import type { AppSettings } from "../../entities/settings/model/settings.types";
import {
  applyThemeSetting,
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  THEME_OPTIONS
} from "../../entities/settings/model/theme";
import { Button } from "../../shared/ui/Button";
import { APP_VERSION } from "../../shared/constants/version";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

const AppSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [appSettings, setAppSettings] = React.useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [settingsError, setSettingsError] = React.useState("");
  const [settingsSavedMessage, setSettingsSavedMessage] = React.useState("");
  const savedThemeRef = React.useRef(DEFAULT_APP_SETTINGS.theme);
  const currentThemeRef = React.useRef(DEFAULT_APP_SETTINGS.theme);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.getSettings
  });

  const savedSettings = React.useMemo(
    () => normalizeAppSettings(settingsQuery.data?.data?.settings),
    [settingsQuery.data]
  );

  const isSettingsDirty =
    appSettings.theme !== savedSettings.theme ||
    appSettings.currency !== savedSettings.currency ||
    appSettings.sync_enabled !== savedSettings.sync_enabled;

  React.useEffect(() => {
    if (settingsQuery.data?.success && settingsQuery.data.data) {
      const normalizedSettings = normalizeAppSettings(settingsQuery.data.data.settings);
      setAppSettings(normalizedSettings);
      savedThemeRef.current = normalizedSettings.theme;
      currentThemeRef.current = normalizedSettings.theme;
      applyThemeSetting(normalizedSettings.theme);
      setSettingsError("");
    }
  }, [settingsQuery.data]);

  React.useEffect(
    () => () => {
      if (currentThemeRef.current !== savedThemeRef.current) {
        applyThemeSetting(savedThemeRef.current);
      }
    },
    []
  );

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: AppSettings) => settingsApi.updateSettings({ settings }),
    onSuccess: (res) => {
      if (res.success && res.data) {
        const normalizedSettings = normalizeAppSettings(res.data.settings);
        setAppSettings(normalizedSettings);
        savedThemeRef.current = normalizedSettings.theme;
        currentThemeRef.current = normalizedSettings.theme;
        applyThemeSetting(normalizedSettings.theme);
        setSettingsError("");
        setSettingsSavedMessage("설정이 저장되었습니다.");
        void queryClient.invalidateQueries({ queryKey: ["settings"] });
      }
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "설정 저장에 실패했습니다. 다시 시도해주세요.";
      setSettingsError(message);
      setSettingsSavedMessage("");
    }
  });

  const handleChangeAppSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setAppSettings((prev) => ({ ...prev, [key]: value }));
    if (key === "theme") {
      currentThemeRef.current = value as AppSettings["theme"];
      applyThemeSetting(value);
    }
    setSettingsError("");
    setSettingsSavedMessage("");
  };

  const handleSaveAppSettings = () => {
    updateSettingsMutation.mutate(appSettings);
  };

  return (
    <div className="bg-[var(--color-bg-primary)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            aria-label="뒤로"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">앱 설정</h1>
            {settingsQuery.data?.data?.updated_at && (
              <p className="mt-1 text-xs text-[var(--color-text-caption)]">
                {new Date(settingsQuery.data.data.updated_at).toLocaleDateString("ko-KR")} 저장
              </p>
            )}
          </div>
        </header>

        <section className={`${cardClass} flex flex-col gap-5 p-4`}>
          {settingsQuery.isLoading ? (
            <div className="flex flex-col gap-3" aria-label="설정 불러오는 중">
              <div className="h-20 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
              <div className="h-11 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
              <div className="h-16 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
            </div>
          ) : settingsQuery.isError || (settingsQuery.data && !settingsQuery.data.success) ? (
            <div>
              <p className="text-sm text-[var(--color-text-primary)]">
                앱 설정을 불러오지 못했습니다.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() => void settingsQuery.refetch()}
              >
                다시 시도
              </Button>
            </div>
          ) : (
            <>
              <div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  테마
                </span>
                <div
                  role="radiogroup"
                  aria-label="테마"
                  className="mt-2 grid grid-cols-3 gap-2"
                >
                  {THEME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={appSettings.theme === option.value}
                      onClick={() => handleChangeAppSetting("theme", option.value)}
                      className={`min-h-[88px] rounded-xl border px-3 py-3 text-left text-sm transition ${
                        appSettings.theme === option.value
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] ring-2 ring-[var(--color-primary-soft)]"
                          : "border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <span className="block font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs leading-4">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                표시 통화
                <select
                  value={appSettings.currency}
                  onChange={(e) =>
                    handleChangeAppSetting("currency", e.target.value as AppSettings["currency"])
                  }
                  className="min-h-11 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-primary)] outline-none"
                >
                  <option value="KRW">KRW</option>
                </select>
              </label>

              <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3 py-2">
                <span>
                  <span className="block text-sm font-medium text-[var(--color-text-primary)]">
                    자동 동기화
                  </span>
                  <span className="block text-xs text-[var(--color-text-secondary)]">
                    네트워크 복구 시 대기 중인 거래를 동기화합니다.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={appSettings.sync_enabled}
                  onChange={(e) => handleChangeAppSetting("sync_enabled", e.target.checked)}
                  className="h-5 w-5 accent-[var(--color-primary)]"
                />
              </label>

              {settingsError && (
                <p role="alert" className="text-sm text-[var(--color-danger)]">
                  {settingsError}
                </p>
              )}
              {settingsSavedMessage && (
                <p className="text-sm text-[var(--color-success)]">{settingsSavedMessage}</p>
              )}

              <Button
                type="button"
                fullWidth
                disabled={!isSettingsDirty || updateSettingsMutation.isPending}
                isLoading={updateSettingsMutation.isPending}
                onClick={handleSaveAppSettings}
              >
                앱 설정 저장
              </Button>
            </>
          )}
        </section>

        <p className="text-center text-xs text-[var(--color-text-caption)]">
          KittyWallet v{APP_VERSION}
        </p>
      </div>
    </div>
  );
};

export default AppSettingsPage;
