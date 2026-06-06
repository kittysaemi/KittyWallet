import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { userApi } from '../../entities/user/api/userApi';
import { authApi } from '../../entities/auth/api/authApi';
import { settingsApi } from '../../entities/settings/api/settingsApi';
import type { AppSettings, ThemeSetting } from '../../entities/settings/model/settings.types';
import { useAuthStore } from '../../entities/auth/store/authStore';
import { Button } from '../../shared/ui/Button';
import { getPendingSyncCount } from '../../shared/storage/syncQueue';

const nicknameSchema = z
  .string()
  .trim()
  .min(1, '닉네임을 입력해주세요.')
  .max(30, '닉네임은 30자 이하여야 합니다.');

const cardClass =
  'rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]';

const defaultAppSettings: AppSettings = {
  theme: 'system',
  currency: 'KRW',
  sync_enabled: true,
  transaction_list_page_size: 20,
};

const themeOptions: Array<{ value: ThemeSetting; label: string }> = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

const pageSizeOptions = [10, 20, 30, 50];

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const updateNickname = useAuthStore((state) => state.updateNickname);

  const [isEditingNickname, setIsEditingNickname] = React.useState(false);
  const [nicknameInput, setNicknameInput] = React.useState('');
  const [nicknameError, setNicknameError] = React.useState('');

  const [isWithdrawOpen, setIsWithdrawOpen] = React.useState(false);
  const [withdrawError, setWithdrawError] = React.useState('');
  const [appSettings, setAppSettings] = React.useState<AppSettings>(defaultAppSettings);
  const [settingsError, setSettingsError] = React.useState('');
  const [settingsSavedMessage, setSettingsSavedMessage] = React.useState('');

  const userQuery = useQuery({
    queryKey: ['user', 'me'],
    queryFn: userApi.getMe,
  });

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });

  const user = userQuery.data?.data;
  const savedSettings = settingsQuery.data?.data?.settings ?? defaultAppSettings;
  const isSettingsDirty =
    appSettings.theme !== savedSettings.theme ||
    appSettings.currency !== savedSettings.currency ||
    appSettings.sync_enabled !== savedSettings.sync_enabled ||
    appSettings.transaction_list_page_size !== savedSettings.transaction_list_page_size;

  React.useEffect(() => {
    if (settingsQuery.data?.success && settingsQuery.data.data) {
      setAppSettings(settingsQuery.data.data.settings);
      setSettingsError('');
    }
  }, [settingsQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: (nickname: string) => userApi.updateProfile(nickname),
    onSuccess: (res) => {
      if (res.success && res.data) {
        updateNickname(res.data.nickname);
        void queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        setIsEditingNickname(false);
        setNicknameError('');
      }
    },
    onError: () => {
      setNicknameError('닉네임 수정에 실패했습니다. 다시 시도해주세요.');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: userApi.withdraw,
    onSuccess: () => {
      clearAuth();
      void queryClient.clear();
      navigate('/login', { replace: true });
    },
    onError: (err: unknown) => {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })
        ?.response?.data?.error?.code;
      if (code === 'USER_003') {
        setWithdrawError('미동기화 데이터가 있습니다. 동기화 완료 후 다시 시도해주세요.');
      } else {
        setWithdrawError('탈퇴 처리에 실패했습니다. 다시 시도해주세요.');
      }
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: AppSettings) => settingsApi.updateSettings({ settings }),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setAppSettings(res.data.settings);
        setSettingsError('');
        setSettingsSavedMessage('설정이 저장되었습니다.');
        void queryClient.invalidateQueries({ queryKey: ['settings'] });
      }
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? '설정 저장에 실패했습니다. 다시 시도해주세요.';
      setSettingsError(message);
      setSettingsSavedMessage('');
    },
  });

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 실패해도 로컬 상태는 제거
    }
    clearAuth();
    navigate('/login', { replace: true });
  };

  const handleStartEditNickname = () => {
    setNicknameInput(user?.nickname ?? '');
    setNicknameError('');
    setIsEditingNickname(true);
  };

  const handleSaveNickname = () => {
    const result = nicknameSchema.safeParse(nicknameInput);
    if (!result.success) {
      setNicknameError(result.error.errors[0]?.message ?? '입력값을 확인해주세요.');
      return;
    }
    if (result.data === user?.nickname) {
      setIsEditingNickname(false);
      return;
    }
    updateProfileMutation.mutate(result.data);
  };

  const handleOpenWithdraw = async () => {
    setWithdrawError('');
    const pendingCount = await getPendingSyncCount();
    if (pendingCount > 0) {
      setWithdrawError('미동기화 데이터가 있습니다. 동기화 완료 후 다시 시도해주세요.');
      return;
    }
    setIsWithdrawOpen(true);
  };

  const handleConfirmWithdraw = () => {
    setWithdrawError('');
    withdrawMutation.mutate();
  };

  const handleChangeAppSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setAppSettings((prev) => ({ ...prev, [key]: value }));
    setSettingsError('');
    setSettingsSavedMessage('');
  };

  const handleSaveAppSettings = () => {
    updateSettingsMutation.mutate(appSettings);
  };

  if (userQuery.isLoading) {
    return (
      <div className="bg-[var(--color-bg-primary)] px-4 py-6">
        <div className="mx-auto w-full max-w-[480px]">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-[var(--color-bg-secondary)]" />
          <div className={`${cardClass} mt-6 h-32 animate-pulse`} />
        </div>
      </div>
    );
  }

  if (userQuery.isError || (userQuery.data && !userQuery.data.success)) {
    return (
      <div className="bg-[var(--color-bg-primary)] px-4 py-6">
        <div className="mx-auto w-full max-w-[480px]">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">설정</h1>
          <div className={`${cardClass} mt-6 p-4`}>
            <p className="text-[var(--color-text-primary)]">사용자 정보를 불러오지 못했습니다.</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => void userQuery.refetch()}
            >
              다시 시도
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-primary)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">설정</h1>

        {/* 사용자 정보 */}
        <section aria-labelledby="profile-heading">
          <h2
            id="profile-heading"
            className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]"
          >
            사용자 정보
          </h2>
          <div className={`${cardClass} flex flex-col gap-4 p-4`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">이메일</span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {user?.email}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-sm text-[var(--color-text-secondary)]">닉네임</span>
              {isEditingNickname ? (
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      aria-label="닉네임 입력"
                      value={nicknameInput}
                      maxLength={30}
                      autoFocus
                      onChange={(e) => setNicknameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveNickname();
                        if (e.key === 'Escape') setIsEditingNickname(false);
                      }}
                      className="min-h-10 flex-1 rounded-xl border border-[var(--color-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
                    />
                    <Button
                      type="button"
                      onClick={handleSaveNickname}
                      isLoading={updateProfileMutation.isPending}
                    >
                      저장
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={updateProfileMutation.isPending}
                      onClick={() => setIsEditingNickname(false)}
                    >
                      취소
                    </Button>
                  </div>
                  {nicknameError && (
                    <p className="text-xs text-[var(--color-danger)]">{nicknameError}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {user?.nickname}
                  </span>
                  <button
                    type="button"
                    aria-label="닉네임 수정"
                    onClick={handleStartEditNickname}
                    className="rounded-lg px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
                  >
                    수정
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 앱 설정 */}
        <section aria-labelledby="app-settings-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="app-settings-heading"
              className="text-sm font-semibold text-[var(--color-text-secondary)]"
            >
              앱 설정
            </h2>
            {settingsQuery.data?.data?.updated_at && (
              <span className="text-xs text-[var(--color-text-caption)]">
                {new Date(settingsQuery.data.data.updated_at).toLocaleDateString('ko-KR')} 저장
              </span>
            )}
          </div>

          <div className={`${cardClass} flex flex-col gap-5 p-4`}>
            {settingsQuery.isLoading ? (
              <div className="flex flex-col gap-3" aria-label="설정 불러오는 중">
                <div className="h-11 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
                <div className="h-11 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
                <div className="h-11 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
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
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={appSettings.theme === option.value}
                        onClick={() => handleChangeAppSetting('theme', option.value)}
                        className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition ${
                          appSettings.theme === option.value
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]'
                            : 'border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  표시 통화
                  <select
                    value={appSettings.currency}
                    onChange={(e) =>
                      handleChangeAppSetting('currency', e.target.value as AppSettings['currency'])
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
                    onChange={(e) => handleChangeAppSetting('sync_enabled', e.target.checked)}
                    className="h-5 w-5 accent-[var(--color-primary)]"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  거래 목록 페이지 크기
                  <select
                    value={appSettings.transaction_list_page_size}
                    onChange={(e) =>
                      handleChangeAppSetting(
                        'transaction_list_page_size',
                        Number(e.target.value)
                      )
                    }
                    className="min-h-11 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-primary)] outline-none"
                  >
                    {pageSizeOptions.map((size) => (
                      <option key={size} value={size}>
                        {size}개
                      </option>
                    ))}
                  </select>
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
          </div>
        </section>

        {/* 계정 관리 */}
        <section aria-labelledby="account-heading">
          <h2
            id="account-heading"
            className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]"
          >
            계정 관리
          </h2>
          <div className={`${cardClass} flex flex-col divide-y divide-[var(--color-border-primary)]`}>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center px-4 py-4 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
            >
              로그아웃
            </button>
            <button
              type="button"
              onClick={() => void handleOpenWithdraw()}
              className="flex w-full items-center px-4 py-4 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-bg-secondary)]"
            >
              회원 탈퇴
            </button>
          </div>
          {withdrawError && !isWithdrawOpen && (
            <p className="mt-2 text-xs text-[var(--color-danger)]">{withdrawError}</p>
          )}
        </section>
      </div>

      {/* 회원 탈퇴 확인 모달 */}
      {isWithdrawOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-safe"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWithdrawOpen(false);
          }}
        >
          <div className="w-full max-w-[480px] rounded-t-3xl bg-[var(--color-bg-card)] px-6 pb-8 pt-6">
            <h3
              id="withdraw-title"
              className="text-lg font-bold text-[var(--color-text-primary)]"
            >
              정말 탈퇴하시겠어요?
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              탈퇴하면 모든 데이터에 접근할 수 없게 됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>

            {withdrawError && (
              <p className="mt-3 text-sm text-[var(--color-danger)]">{withdrawError}</p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                variant="danger"
                fullWidth
                onClick={handleConfirmWithdraw}
                isLoading={withdrawMutation.isPending}
              >
                탈퇴하기
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                disabled={withdrawMutation.isPending}
                onClick={() => {
                  setIsWithdrawOpen(false);
                  setWithdrawError('');
                }}
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
