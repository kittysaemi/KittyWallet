import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { authApi } from "../../entities/auth/api/authApi";
import { useAuthStore } from "../../entities/auth/store/authStore";
import { applyThemeSetting, DEFAULT_THEME } from "../../entities/settings/model/theme";
import { userApi } from "../../entities/user/api/userApi";
import { getPendingSyncCount } from "../../shared/storage/syncQueue";
import { clearUserApiCaches } from "../../pwa/cache/cacheInvalidation";
import { deleteDb } from "../../pwa/indexed-db/indexedDb.client";
import { Button } from "../../shared/ui/Button";

const nicknameSchema = z
  .string()
  .trim()
  .min(1, "닉네임을 입력해주세요.")
  .max(30, "닉네임은 30자 이하여야 합니다.");

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const updateNickname = useAuthStore((state) => state.updateNickname);

  const [isEditingNickname, setIsEditingNickname] = React.useState(false);
  const [nicknameInput, setNicknameInput] = React.useState("");
  const [nicknameError, setNicknameError] = React.useState("");
  const [isWithdrawOpen, setIsWithdrawOpen] = React.useState(false);
  const [withdrawError, setWithdrawError] = React.useState("");

  const userQuery = useQuery({
    queryKey: ["user", "me"],
    queryFn: userApi.getMe
  });

  const user = userQuery.data?.data;

  const updateProfileMutation = useMutation({
    mutationFn: (nickname: string) => userApi.updateProfile(nickname),
    onSuccess: (res) => {
      if (res.success && res.data) {
        updateNickname(res.data.nickname);
        void queryClient.invalidateQueries({ queryKey: ["user", "me"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        setIsEditingNickname(false);
        setNicknameError("");
      }
    },
    onError: () => {
      setNicknameError("닉네임 수정에 실패했습니다. 다시 시도해주세요.");
    }
  });

  const withdrawMutation = useMutation({
    mutationFn: userApi.withdraw,
    onSuccess: async () => {
      await clearUserApiCaches();
      await deleteDb();
      clearAuth();
      void queryClient.clear();
      applyThemeSetting(DEFAULT_THEME);
      navigate("/login", { replace: true });
    },
    onError: (err: unknown) => {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })
        ?.response?.data?.error?.code;
      setWithdrawError(
        code === "USER_003"
          ? "미동기화 데이터가 있습니다. 동기화 완료 후 다시 시도해주세요."
          : "탈퇴 처리에 실패했습니다. 다시 시도해주세요."
      );
    }
  });

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 실패해도 로컬 상태는 제거
    }
    await clearUserApiCaches();
    clearAuth();
    void queryClient.clear();
    applyThemeSetting(DEFAULT_THEME);
    navigate("/login", { replace: true });
  };

  const handleStartEditNickname = () => {
    setNicknameInput(user?.nickname ?? "");
    setNicknameError("");
    setIsEditingNickname(true);
  };

  const handleSaveNickname = () => {
    const result = nicknameSchema.safeParse(nicknameInput);
    if (!result.success) {
      setNicknameError(result.error.errors[0]?.message ?? "입력값을 확인해주세요.");
      return;
    }
    if (result.data === user?.nickname) {
      setIsEditingNickname(false);
      return;
    }
    updateProfileMutation.mutate(result.data);
  };

  const handleOpenWithdraw = async () => {
    setWithdrawError("");
    const pendingCount = await getPendingSyncCount();
    if (pendingCount > 0) {
      setWithdrawError("미동기화 데이터가 있습니다. 동기화 완료 후 다시 시도해주세요.");
      return;
    }
    setIsWithdrawOpen(true);
  };

  const handleConfirmWithdraw = () => {
    setWithdrawError("");
    withdrawMutation.mutate();
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
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
              aria-label="뒤로"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">사용자 설정</h1>
          </div>
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
            aria-label="뒤로"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">사용자 설정</h1>
        </div>

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
                        if (e.key === "Enter") handleSaveNickname();
                        if (e.key === "Escape") setIsEditingNickname(false);
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

        <p className="text-center text-xs text-[var(--color-text-caption)]">
          KittyWallet v{__APP_VERSION__}
        </p>
      </div>

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
              탈퇴하면 등록한 데이터가 삭제되며 복구할 수 없습니다.
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
                  setWithdrawError("");
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
