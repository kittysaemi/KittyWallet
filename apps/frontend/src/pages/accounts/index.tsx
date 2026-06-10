import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Plus, X } from "lucide-react";
import { z } from "zod";
import { accountApi } from "../../entities/account/api/accountApi";
import type { AccountItem } from "../../entities/account/model/account.types";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { Button } from "../../shared/ui/Button";
import { IconRenderer } from "../../shared/ui/IconRenderer";
import { IconPickerSheet } from "../../features/icons/IconPickerSheet";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

const accountNameSchema = z
  .string()
  .trim()
  .min(1, "계좌명을 입력해주세요.")
  .max(15, "계좌명은 한글 기준 15자 이하여야 합니다.");

type PickerTarget = { type: "create" } | { type: "edit"; item: AccountItem } | null;

const AccountListSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3" aria-label="계좌 목록을 불러오는 중입니다.">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className={`${cardClass} flex items-center gap-4 p-4`} aria-hidden="true">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-[var(--color-bg-secondary)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded-lg bg-[var(--color-bg-secondary)]" />
          <div className="h-3 w-1/3 rounded-lg bg-[var(--color-bg-secondary)]" />
        </div>
      </div>
    ))}
  </div>
);

const ArchiveDialog: React.FC<{
  name: string;
  isDeleting: boolean;
  onConfirm: (deleteTransactions: boolean) => void;
  onCancel: () => void;
}> = ({ name, isDeleting, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8 sm:items-center sm:pb-0">
    <div className="w-full max-w-[400px] rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-6 shadow-xl">
      <h2 className="mb-2 text-base font-bold text-[var(--color-text-primary)]">
        {name} 삭제
      </h2>
      <p className="mb-1 text-sm text-[var(--color-text-secondary)]">
        삭제하면 목록에서 사라지며 복구할 수 없습니다.
      </p>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        거래 내역을 어떻게 처리할까요?
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => onConfirm(true)}
          className="min-h-11 w-full rounded-xl bg-[var(--color-danger)] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "거래 내역 포함 삭제"}
        </button>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => onConfirm(false)}
          className="min-h-11 w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-bg-primary)] disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "거래 내역 유지하고 삭제"}
        </button>
        <p className="text-center text-xs text-[var(--color-text-caption)]">
          유지된 거래 내역은 통계에 반영되나 수정이 불가합니다.
        </p>
        <button
          type="button"
          disabled={isDeleting}
          onClick={onCancel}
          className="min-h-11 w-full rounded-xl text-sm font-medium text-[var(--color-text-secondary)] disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </div>
  </div>
);

const AccountsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const isOffline = !navigator.onLine;
  const [isCreating, setIsCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newBalance, setNewBalance] = React.useState("");
  const [newIconId, setNewIconId] = React.useState<number | undefined>();
  const [newAllowNegative, setNewAllowNegative] = React.useState(false);
  const [newNegativeLimit, setNewNegativeLimit] = React.useState("");
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pickerTarget, setPickerTarget] = React.useState<PickerTarget>(null);
  const [archiveTarget, setArchiveTarget] = React.useState<AccountItem | null>(null);

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.getAccounts(),
    retry: isOffline ? false : 3
  });

  const iconsQuery = useQuery({
    queryKey: ["icons", "select"],
    queryFn: () => iconApi.getIcons(true),
    staleTime: 5 * 60 * 1000
  });

  const refreshAccounts = async () => {
    await queryClient.invalidateQueries({ queryKey: ["accounts"] });
  };

  const createMutation = useMutation({
    mutationFn: accountApi.createAccount,
    onSuccess: async () => {
      setIsCreating(false);
      setNewName("");
      setNewBalance("");
      setNewIconId(undefined);
      setNewAllowNegative(false);
      setNewNegativeLimit("");
      setErrors({});
      await refreshAccounts();
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { message?: string } })?.error?.message
          : undefined;
      setErrors((prev) => ({ ...prev, newName: msg ?? "계좌 등록에 실패했습니다." }));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: number;
      data: Parameters<typeof accountApi.updateAccount>[1];
    }) => accountApi.updateAccount(id, data),
    onSuccess: async () => {
      setEditingId(null);
      setEditingName("");
      setErrors({});
      await refreshAccounts();
    }
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, deleteTransactions }: { id: number; deleteTransactions: boolean }) =>
      accountApi.deleteAccount(id, deleteTransactions),
    onSuccess: async () => {
      setArchiveTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      ]);
    }
  });

  const iconMap = React.useMemo(() => {
    const map = new Map<number, IconItem>();
    iconsQuery.data?.data?.items.forEach((icon) => map.set(icon.icon_id, icon));
    return map;
  }, [iconsQuery.data]);

  const accounts = accountsQuery.data?.data?.items ?? [];
  const isLoading = accountsQuery.isLoading;
  const isError = accountsQuery.isError || (accountsQuery.data && !accountsQuery.data.success);
  const isPending = createMutation.isPending || updateMutation.isPending || archiveMutation.isPending;

  const saveCreate = () => {
    const name = accountNameSchema.safeParse(newName);
    const balance = Number(newBalance);
    const negativeLimit = Number(newNegativeLimit || "0");
    const nextErrors: Record<string, string> = {};
    if (!name.success)
      nextErrors.newName = name.error.errors[0]?.message ?? "입력값을 확인해주세요.";
    if (newBalance === "" || Number.isNaN(balance)) nextErrors.newBalance = "잔액을 입력해주세요.";
    if (balance < 0) nextErrors.newBalance = "초기 잔액은 0 이상이어야 합니다.";
    if (Number.isNaN(negativeLimit) || negativeLimit < 0)
      nextErrors.newNegativeLimit = "마이너스 한도는 0 이상이어야 합니다.";
    if (!newIconId) nextErrors.newIcon = "아이콘을 선택해주세요.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !name.success || !newIconId) return;
    createMutation.mutate({
      account_name: name.data,
      initial_balance: balance,
      icon_id: newIconId,
      allow_negative_balance: newAllowNegative,
      negative_balance_limit: newAllowNegative ? negativeLimit : 0
    });
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewName("");
    setNewBalance("");
    setNewIconId(undefined);
    setNewAllowNegative(false);
    setNewNegativeLimit("");
    setErrors({});
  };

  const startEditName = (account: AccountItem) => {
    if (isPending) return;
    setEditingId(account.account_id);
    setEditingName(account.account_name);
  };

  const saveName = (account: AccountItem) => {
    if (editingId !== account.account_id) return;
    const parsed = accountNameSchema.safeParse(editingName);
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        [`name-${account.account_id}`]: parsed.error.errors[0]?.message ?? "입력값을 확인해주세요."
      }));
      return;
    }
    setEditingId(null);
    setEditingName("");
    if (parsed.data === account.account_name) return;
    updateMutation.mutate({ id: account.account_id, data: { account_name: parsed.data } });
  };

  const selectIcon = (icon: IconItem) => {
    if (!pickerTarget) return;
    if (pickerTarget.type === "create") {
      setNewIconId(icon.icon_id);
      setErrors((prev) => ({ ...prev, newIcon: "" }));
      setPickerTarget(null);
      return;
    }
    updateMutation.mutate({ id: pickerTarget.item.account_id, data: { icon_id: icon.icon_id } });
    setPickerTarget(null);
  };

  return (
    <div className="bg-[var(--color-bg-primary)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">계좌 관리</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              등록된 계좌를 관리합니다.
            </p>
          </div>
          <button
            type="button"
            aria-label="계좌 등록"
            onClick={() => setIsCreating((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-text-primary)]"
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </header>

        {isOffline && (
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[#FFF8E8] px-4 py-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              현재 오프라인 상태예요. 저장한 내용은 연결 후 동기화됩니다.
            </p>
          </div>
        )}

        {isCreating && (
          <div className={`${cardClass} flex flex-col gap-3 p-4`}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="계좌 아이콘 선택"
                onClick={() => setPickerTarget({ type: "create" })}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-primary-soft)]"
              >
                {newIconId && iconMap.get(newIconId) ? (
                  <IconRenderer
                    providerType={iconMap.get(newIconId)!.provider_type}
                    providerKey={iconMap.get(newIconId)!.provider_key}
                    size={24}
                  />
                ) : (
                  <Plus size={20} aria-hidden="true" />
                )}
              </button>
              <input
                aria-label="계좌명"
                value={newName}
                maxLength={15}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="계좌명"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
              />
            </div>
            <input
              aria-label="초기 잔액"
              inputMode="numeric"
              value={newBalance ? Number(newBalance).toLocaleString() : ""}
              onChange={(event) => {
                const raw = event.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                setNewBalance(raw);
              }}
              onKeyDown={(e) => {
                if (e.key === "." || e.key === ",") e.preventDefault();
              }}
              placeholder="초기 잔액"
              className="min-h-11 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
            />
            <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    마이너스 통장
                  </span>
                  <p className="text-xs text-[var(--color-text-caption)]">
                    등록 후 변경 불가
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={newAllowNegative}
                  aria-label="신규 계좌 마이너스 허용"
                  onClick={() => setNewAllowNegative((prev) => !prev)}
                  className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                    newAllowNegative
                      ? "bg-[var(--color-primary)]"
                      : "bg-[var(--color-border-primary)]"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      newAllowNegative ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {newAllowNegative && (
                <input
                  aria-label="신규 계좌 마이너스 한도"
                  inputMode="numeric"
                  value={newNegativeLimit ? Number(newNegativeLimit).toLocaleString() : ""}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                    setNewNegativeLimit(raw);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "." || e.key === ",") e.preventDefault();
                  }}
                  placeholder="마이너스 한도"
                  className="mt-3 min-h-11 w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
                />
              )}
            </div>
            {Object.values(errors).some(Boolean) && (
              <div className="space-y-1">
                {Object.values(errors)
                  .filter(Boolean)
                  .map((error) => (
                    <p key={error} className="text-xs text-[var(--color-danger)]">
                      {error}
                    </p>
                  ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                fullWidth
                onClick={saveCreate}
                isLoading={createMutation.isPending}
              >
                등록
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={cancelCreate}
                disabled={createMutation.isPending}
              >
                취소
              </Button>
            </div>
          </div>
        )}

        {isLoading && <AccountListSkeleton />}

        {isError && (
          <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4">
            <p className="font-medium text-[var(--color-text-primary)]">
              계좌 목록을 불러오지 못했습니다.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => void accountsQuery.refetch()}
            >
              다시 시도
            </Button>
          </div>
        )}

        {!isLoading && !isError && accounts.length === 0 && !isCreating && (
          <div className={`${cardClass} flex flex-col items-center px-6 py-12 text-center`}>
            <span className="text-5xl">🐾</span>
            <p className="mt-4 font-semibold text-[var(--color-text-primary)]">
              아직 등록된 계좌가 없어요.
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              첫 계좌를 등록해볼까요?
            </p>
          </div>
        )}

        {!isLoading && !isError && accounts.length > 0 && (
          <div className="flex flex-col gap-3" aria-label="계좌 목록">
            {accounts.map((account) => {
              const isEditing = editingId === account.account_id;
              const icon = iconMap.get(account.icon_id);
              return (
                <div
                  key={account.account_id}
                  className={`${cardClass} relative flex items-center gap-4 p-4`}
                >
                  <button
                    type="button"
                    aria-label={`${account.account_name} 아이콘 변경`}
                    disabled={isPending}
                    onClick={() => setPickerTarget({ type: "edit", item: account })}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] disabled:cursor-not-allowed"
                  >
                    {icon ? (
                      <IconRenderer
                        providerType={icon.provider_type}
                        providerKey={icon.provider_key}
                        size={24}
                      />
                    ) : (
                      <span className="text-xl">💳</span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1 pr-8">
                    {isEditing ? (
                      <input
                        aria-label={`${account.account_name} 이름 수정`}
                        value={editingName}
                        maxLength={15}
                        autoFocus
                        onChange={(event) => setEditingName(event.target.value)}
                        onBlur={() => saveName(account)}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === "Enter") saveName(account);
                          if (event.key === "Escape") {
                            setEditingId(null);
                            setEditingName("");
                          }
                        }}
                        className="min-h-10 w-full rounded-xl border border-[var(--color-primary)] bg-[var(--color-bg-input)] px-3 py-2 font-semibold text-[var(--color-text-primary)] outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        aria-label={`${account.account_name} 이름 변경`}
                        disabled={isPending}
                        onClick={() => startEditName(account)}
                        className="truncate cursor-pointer select-none text-left font-semibold text-[var(--color-text-primary)] disabled:cursor-not-allowed"
                      >
                        {account.account_name}
                      </button>
                    )}
                    {account.current_balance !== null && (
                      <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                        {account.current_balance.toLocaleString()}원
                      </p>
                    )}
                    {account.allow_negative_balance && (
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        마이너스 통장 · 한도 {account.negative_balance_limit.toLocaleString()}원
                      </p>
                    )}
                    {errors[`name-${account.account_id}`] && (
                      <p className="mt-1 text-xs text-[var(--color-danger)]">
                        {errors[`name-${account.account_id}`]}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`${account.account_name} 삭제`}
                    disabled={isPending}
                    onClick={() => setArchiveTarget(account)}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-caption)] transition hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-danger)] disabled:cursor-not-allowed"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <IconPickerSheet
        title="계좌 아이콘 선택"
        isOpen={pickerTarget !== null}
        selectedIconId={pickerTarget?.type === "create" ? newIconId : pickerTarget?.item.icon_id}
        onClose={() => setPickerTarget(null)}
        onSelect={selectIcon}
      />

      {archiveTarget && (
        <ArchiveDialog
          name={archiveTarget.account_name}
          isDeleting={archiveMutation.isPending}
          onConfirm={(deleteTransactions) =>
            archiveMutation.mutate({ id: archiveTarget.account_id, deleteTransactions })
          }
          onCancel={() => setArchiveTarget(null)}
        />
      )}
    </div>
  );
};

export default AccountsPage;
