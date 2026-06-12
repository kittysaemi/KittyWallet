import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Plus, RotateCw, X } from "lucide-react";
import { z } from "zod";
import { accountApi } from "../../entities/account/api/accountApi";
import type { AccountItem } from "../../entities/account/model/account.types";
import { cardApi } from "../../entities/card/api/cardApi";
import type { CardItem } from "../../entities/card/model/card.types";
import { categoryApi } from "../../entities/category/api/categoryApi";
import type { CategoryItem } from "../../entities/category/model/category.types";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem, IconOptionItem } from "../../entities/icon/model/icon.types";
import { IconPickerSheet } from "../../features/icons/IconPickerSheet";
import { IconSelect } from "../../features/icons/IconSelect";
import { Button } from "../../shared/ui/Button";
import { IconRenderer } from "../../shared/ui/IconRenderer";
import { useSearchParams } from "react-router-dom";
import {
  invalidateAccountCaches,
  invalidateCardCaches,
  invalidateCategoryCaches
} from "../../pwa/cache/cacheInvalidation";

type ManageTab = "accounts" | "cards" | "categories" | "icons";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

const accountNameSchema = z
  .string()
  .trim()
  .min(1, "계좌명을 입력해주세요.")
  .max(15, "계좌명은 한글 기준 15자 이하여야 합니다.");
const cardNameSchema = z
  .string()
  .trim()
  .min(1, "카드명을 입력해주세요.")
  .max(15, "카드명은 한글 기준 15자 이하여야 합니다.");
const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "카테고리명을 입력해주세요.")
  .max(15, "카테고리명은 한글 기준 15자 이하여야 합니다.");

const mergeIcons = (visibleIcons: IconItem[], hiddenIcons: IconItem[]) =>
  [...visibleIcons, ...hiddenIcons]
    .filter(
      (icon, index, icons) => icons.findIndex((item) => item.icon_id === icon.icon_id) === index
    )
    .sort((left, right) => left.icon_id - right.icon_id);

const ListSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className={`${cardClass} flex items-center gap-4 p-4`}>
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-[var(--color-bg-secondary)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded-lg bg-[var(--color-bg-secondary)]" />
          <div className="h-3 w-1/3 rounded-lg bg-[var(--color-bg-secondary)]" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Archive Dialog ────────────────────────────────────────
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
        <p className="text-xs text-[var(--color-text-caption)] text-center">
          유지된 거래 내역은 통계에 반영되나 수정·삭제가 불가합니다.
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

// ─── Accounts Tab ─────────────────────────────────────────
const AccountsTab: React.FC = () => {
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
  const [archiveTarget, setArchiveTarget] = React.useState<AccountItem | null>(null);
  const [pickerTarget, setPickerTarget] = React.useState<
    { type: "create" } | { type: "edit"; item: AccountItem } | null
  >(null);

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.getAccounts(),
    staleTime: 0,
    refetchOnMount: "always",
    retry: isOffline ? false : 3
  });
  const iconsQuery = useQuery({
    queryKey: ["icons", "select"],
    queryFn: () => iconApi.getIcons(true),
    staleTime: 5 * 60 * 1000
  });

  const iconMap = React.useMemo(() => {
    const map = new Map<number, IconItem>();
    iconsQuery.data?.data?.items.forEach((icon) => map.set(icon.icon_id, icon));
    return map;
  }, [iconsQuery.data]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      invalidateAccountCaches()
    ]);
  };

  const createMutation = useMutation({
    mutationFn: accountApi.createAccount,
    onSuccess: async () => {
      setIsCreating(false);
      setNewName("");
      setNewBalance("");
      setNewIconId(undefined);
      setErrors({});
      setNewAllowNegative(false);
      setNewNegativeLimit("");
      await refresh();
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
      await refresh();
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
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        invalidateAccountCaches()
      ]);
    }
  });

  const accounts = accountsQuery.data?.data?.items ?? [];
  const isLoading = accountsQuery.isLoading;
  const isError = accountsQuery.isError || (accountsQuery.data && !accountsQuery.data.success);
  const isPending = createMutation.isPending || updateMutation.isPending || archiveMutation.isPending;

  const saveCreate = () => {
    const name = accountNameSchema.safeParse(newName);
    const balance = Number(newBalance);
    const negativeLimit = Number(newNegativeLimit || "0");
    const errs: Record<string, string> = {};
    if (!name.success) errs.newName = name.error.errors[0]?.message ?? "입력값을 확인해주세요.";
    if (newBalance === "" || Number.isNaN(balance)) errs.newBalance = "잔액을 입력해주세요.";
    if (balance < 0) errs.newBalance = "초기 잔액은 0 이상이어야 합니다.";
    if (Number.isNaN(negativeLimit) || negativeLimit < 0)
      errs.newNegativeLimit = "마이너스 한도는 0 이상이어야 합니다.";
    if (!newIconId) errs.newIcon = "아이콘을 선택해주세요.";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || !name.success || !newIconId) return;
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
    <>
      <div className="flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-secondary)]">등록된 계좌를 관리합니다.</p>
          <button
            type="button"
            aria-label="계좌 등록"
            onClick={() => setIsCreating((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-text-primary)]"
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
                onChange={(e) => setNewName(e.target.value)}
                placeholder="계좌명"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
              />
            </div>
            <input
              aria-label="초기 잔액"
              inputMode="numeric"
              value={newBalance ? Number(newBalance).toLocaleString() : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
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
                  className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${newAllowNegative ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-primary)]"}`}
                >
                  <span
                    className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${newAllowNegative ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>
              {newAllowNegative && (
                <input
                  aria-label="신규 계좌 마이너스 한도"
                  inputMode="numeric"
                  value={newNegativeLimit ? Number(newNegativeLimit).toLocaleString() : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
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
                  .map((err) => (
                    <p key={err} className="text-xs text-[var(--color-danger)]">
                      {err}
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

        {isLoading && <ListSkeleton />}

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
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => saveName(account)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveName(account);
                          if (e.key === "Escape") {
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
                        onClick={() => {
                          if (isPending) return;
                          setEditingId(account.account_id);
                          setEditingName(account.account_name);
                        }}
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
            archiveMutation.mutate({
              id: archiveTarget.account_id,
              deleteTransactions
            })
          }
          onCancel={() => setArchiveTarget(null)}
        />
      )}
    </>
  );
};

// ─── Cards Tab ────────────────────────────────────────────
const CardsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const isOffline = !navigator.onLine;
  const [isCreating, setIsCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newIconId, setNewIconId] = React.useState<number | undefined>();
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = React.useState<CardItem | null>(null);
  const [pickerTarget, setPickerTarget] = React.useState<
    { type: "create" } | { type: "edit"; item: CardItem } | null
  >(null);

  const cardsQuery = useQuery({
    queryKey: ["cards"],
    queryFn: () => cardApi.getCards(),
    staleTime: 0,
    refetchOnMount: "always",
    retry: isOffline ? false : 3
  });
  const iconsQuery = useQuery({
    queryKey: ["icons", "select"],
    queryFn: () => iconApi.getIcons(true),
    staleTime: 5 * 60 * 1000
  });

  const iconMap = React.useMemo(() => {
    const map = new Map<number, IconItem>();
    iconsQuery.data?.data?.items.forEach((icon) => map.set(icon.icon_id, icon));
    return map;
  }, [iconsQuery.data]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cards"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      invalidateCardCaches()
    ]);
  };

  const createMutation = useMutation({
    mutationFn: cardApi.createCard,
    onSuccess: async () => {
      setIsCreating(false);
      setNewName("");
      setNewIconId(undefined);
      setErrors({});
      await refresh();
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { message?: string } })?.error?.message
          : undefined;
      setErrors((prev) => ({ ...prev, newName: msg ?? "카드 등록에 실패했습니다." }));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof cardApi.updateCard>[1] }) =>
      cardApi.updateCard(id, data),
    onSuccess: async () => {
      setEditingId(null);
      setEditingName("");
      setErrors({});
      await refresh();
    }
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, deleteTransactions }: { id: number; deleteTransactions: boolean }) =>
      cardApi.deleteCard(id, deleteTransactions),
    onSuccess: async () => {
      setArchiveTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cards"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        invalidateCardCaches()
      ]);
    }
  });

  const cards = cardsQuery.data?.data?.items ?? [];
  const isLoading = cardsQuery.isLoading;
  const isError = cardsQuery.isError || (cardsQuery.data && !cardsQuery.data.success);
  const isPending = createMutation.isPending || updateMutation.isPending || archiveMutation.isPending;

  const saveCreate = () => {
    const parsed = cardNameSchema.safeParse(newName);
    const errs: Record<string, string> = {};
    if (!parsed.success) errs.newName = parsed.error.errors[0]?.message ?? "입력값을 확인해주세요.";
    if (!newIconId) errs.newIcon = "아이콘을 선택해주세요.";
    setErrors(errs);
    if (!parsed.success || !newIconId) return;
    createMutation.mutate({ card_name: parsed.data, icon_id: newIconId });
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewName("");
    setNewIconId(undefined);
    setErrors({});
  };

  const saveName = (card: CardItem) => {
    if (editingId !== card.card_id) return;
    const parsed = cardNameSchema.safeParse(editingName);
    if (!parsed.success) {
      setErrors((prev) => ({
        ...prev,
        [`name-${card.card_id}`]: parsed.error.errors[0]?.message ?? "입력값을 확인해주세요."
      }));
      return;
    }
    setEditingId(null);
    setEditingName("");
    if (parsed.data === card.card_name) return;
    updateMutation.mutate({ id: card.card_id, data: { card_name: parsed.data } });
  };

  const selectIcon = (icon: IconItem) => {
    if (!pickerTarget) return;
    if (pickerTarget.type === "create") {
      setNewIconId(icon.icon_id);
      setErrors((prev) => ({ ...prev, newIcon: "" }));
      setPickerTarget(null);
      return;
    }
    updateMutation.mutate({ id: pickerTarget.item.card_id, data: { icon_id: icon.icon_id } });
    setPickerTarget(null);
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-secondary)]">등록된 카드를 관리합니다.</p>
          <button
            type="button"
            aria-label="카드 등록"
            onClick={() => setIsCreating((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-text-primary)]"
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
                aria-label="카드 아이콘 선택"
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
                aria-label="카드명"
                value={newName}
                maxLength={15}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="카드명"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
              />
            </div>
            {Object.values(errors).some(Boolean) && (
              <div className="space-y-1">
                {Object.values(errors)
                  .filter(Boolean)
                  .map((err) => (
                    <p key={err} className="text-xs text-[var(--color-danger)]">
                      {err}
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

        {isLoading && <ListSkeleton />}

        {isError && (
          <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4">
            <p className="font-medium text-[var(--color-text-primary)]">
              카드 목록을 불러오지 못했습니다.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => void cardsQuery.refetch()}
            >
              다시 시도
            </Button>
          </div>
        )}

        {!isLoading && !isError && cards.length === 0 && !isCreating && (
          <div className={`${cardClass} flex flex-col items-center px-6 py-12 text-center`}>
            <span className="text-5xl">🐾</span>
            <p className="mt-4 font-semibold text-[var(--color-text-primary)]">
              아직 등록된 카드가 없어요.
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              첫 카드를 등록해볼까요?
            </p>
          </div>
        )}

        {!isLoading && !isError && cards.length > 0 && (
          <div className="flex flex-col gap-3" aria-label="카드 목록">
            {cards.map((card) => {
              const isEditing = editingId === card.card_id;
              const icon = iconMap.get(card.icon_id);
              return (
                <div
                  key={card.card_id}
                  className={`${cardClass} relative flex items-center gap-4 p-4`}
                >
                  <button
                    type="button"
                    aria-label={`${card.card_name} 아이콘 변경`}
                    disabled={isPending}
                    onClick={() => setPickerTarget({ type: "edit", item: card })}
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
                        aria-label={`${card.card_name} 이름 수정`}
                        value={editingName}
                        maxLength={15}
                        autoFocus
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => saveName(card)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveName(card);
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditingName("");
                          }
                        }}
                        className="min-h-10 w-full rounded-xl border border-[var(--color-primary)] bg-[var(--color-bg-input)] px-3 py-2 font-semibold text-[var(--color-text-primary)] outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        aria-label={`${card.card_name} 이름 변경`}
                        disabled={isPending}
                        onClick={() => {
                          if (isPending) return;
                          setEditingId(card.card_id);
                          setEditingName(card.card_name);
                        }}
                        className="truncate cursor-pointer select-none text-left font-semibold text-[var(--color-text-primary)] disabled:cursor-not-allowed"
                      >
                        {card.card_name}
                      </button>
                    )}
                    {errors[`name-${card.card_id}`] && (
                      <p className="mt-1 text-xs text-[var(--color-danger)]">
                        {errors[`name-${card.card_id}`]}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`${card.card_name} 삭제`}
                    disabled={isPending}
                    onClick={() => setArchiveTarget(card)}
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
        title="카드 아이콘 선택"
        isOpen={pickerTarget !== null}
        selectedIconId={pickerTarget?.type === "create" ? newIconId : pickerTarget?.item.icon_id}
        onClose={() => setPickerTarget(null)}
        onSelect={selectIcon}
      />

      {archiveTarget && (
        <ArchiveDialog
          name={archiveTarget.card_name}
          isDeleting={archiveMutation.isPending}
          onConfirm={(deleteTransactions) =>
            archiveMutation.mutate({ id: archiveTarget.card_id, deleteTransactions })
          }
          onCancel={() => setArchiveTarget(null)}
        />
      )}
    </>
  );
};

// ─── Categories Tab ───────────────────────────────────────
interface CategoryRowProps {
  category: CategoryItem;
  icon?: IconItem;
  disabled: boolean;
  editingNameId: number | null;
  editingName: string;
  error?: string;
  onStartNameEdit: (category: CategoryItem) => void;
  onNameChange: (value: string) => void;
  onNameCancel: () => void;
  onNameSave: (category: CategoryItem) => void;
  onIconEdit: (category: CategoryItem) => void;
  onToggleShow: (category: CategoryItem) => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({
  category,
  icon,
  disabled,
  editingNameId,
  editingName,
  error,
  onStartNameEdit,
  onNameChange,
  onNameCancel,
  onNameSave,
  onIconEdit,
  onToggleShow
}) => {
  const canEditDetails = category.editable && category.show;
  const isEditingName = editingNameId === category.category_id;
  const isDefaultCategory = category.is_default || !category.editable;

  if (isDefaultCategory) {
    return (
      <li
        aria-label={category.category_name}
        className={`flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center shadow-[0_4px_16px_var(--color-card-shadow)] transition ${
          category.show
            ? "border-[var(--color-border-primary)] bg-[var(--color-bg-card)]"
            : "border-[var(--gray-200)] bg-[var(--gray-100)]"
        }`}
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${category.show ? "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]" : "bg-[var(--gray-100)] text-[var(--gray-500)] grayscale"}`}
        >
          {icon ? (
            <IconRenderer
              providerType={icon.provider_type}
              providerKey={icon.provider_key}
              size={26}
            />
          ) : (
            <span className="text-sm font-semibold" aria-hidden="true">
              {category.category_name.charAt(0)}
            </span>
          )}
        </div>
        <p
          className={`w-full truncate text-sm font-semibold ${category.show ? "text-[var(--color-text-primary)]" : "text-[var(--gray-500)]"}`}
        >
          {category.category_name}
        </p>
      </li>
    );
  }

  return (
    <li
      role="button"
      tabIndex={0}
      aria-label={`${category.category_name} ${category.show ? "숨기기" : "표시하기"}`}
      onClick={() => {
        if (!disabled) onToggleShow(category);
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) onToggleShow(category);
      }}
      className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 shadow-[0_4px_16px_var(--color-card-shadow)] col-span-full cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`${category.category_name} 아이콘 변경`}
          disabled={!canEditDetails || disabled}
          onClick={(e) => {
            e.stopPropagation();
            onIconEdit(category);
          }}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed ${category.show ? "border-[var(--color-border-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]" : "border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-500)]"} ${canEditDetails ? "hover:bg-[var(--color-bg-secondary)]" : ""}`}
        >
          {icon ? (
            <IconRenderer
              providerType={icon.provider_type}
              providerKey={icon.provider_key}
              size={26}
            />
          ) : (
            <span className="text-sm font-semibold" aria-hidden="true">
              {category.category_name.charAt(0)}
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isEditingName ? (
              <input
                aria-label={`${category.category_name} 이름 수정`}
                value={editingName}
                onChange={(e) => onNameChange(e.target.value)}
                onBlur={() => onNameSave(category)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") onNameSave(category);
                  if (e.key === "Escape") onNameCancel();
                }}
                onClick={(e) => e.stopPropagation()}
                disabled={disabled}
                autoFocus
                className="min-h-10 min-w-0 flex-1 rounded-xl border border-[var(--color-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-base font-semibold text-[var(--color-text-primary)] outline-none ring-2 ring-[var(--color-primary-soft)]"
                maxLength={15}
              />
            ) : (
              <button
                type="button"
                aria-label={`${category.category_name} 이름 변경`}
                disabled={!canEditDetails || disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onStartNameEdit(category);
                }}
                className={`min-w-0 cursor-pointer select-none truncate text-left text-base font-semibold disabled:cursor-not-allowed ${category.show ? "text-[var(--color-text-primary)]" : "text-[var(--gray-500)]"} ${canEditDetails ? "underline-offset-4 hover:underline" : ""}`}
              >
                {category.category_name}
              </button>
            )}
          </div>
          {error && <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>}
        </div>
      </div>
    </li>
  );
};

const CategoriesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingNameId, setEditingNameId] = React.useState<number | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [nameErrors, setNameErrors] = React.useState<Record<number, string>>({});
  const [isCreating, setIsCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newIconId, setNewIconId] = React.useState<number | undefined>();
  const [pickerTarget, setPickerTarget] = React.useState<
    { type: "create" } | { type: "edit"; item: CategoryItem } | null
  >(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories", "manage"],
    queryFn: () => categoryApi.getCategories()
  });
  const iconsQuery = useQuery({
    queryKey: ["icons", "category-manage"],
    queryFn: async () => {
      const [visible, hidden] = await Promise.all([
        iconApi.getIcons(true),
        iconApi.getIcons(false)
      ]);
      if (!visible.success || !visible.data) return visible;
      if (!hidden.success || !hidden.data) return hidden;
      return { ...visible, data: { items: mergeIcons(visible.data.items, hidden.data.items) } };
    }
  });

  const refreshCategories = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["categories", "manage"] }),
      queryClient.invalidateQueries({ queryKey: ["categories", "select"] }),
      queryClient.invalidateQueries({ queryKey: ["categories", "active"] }),
      queryClient.invalidateQueries({ queryKey: ["statistics"] }),
      invalidateCategoryCaches()
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: ({
      categoryId,
      data
    }: {
      categoryId: number;
      data: Parameters<typeof categoryApi.updateCategory>[1];
    }) => categoryApi.updateCategory(categoryId, data),
    onSuccess: async () => {
      setEditingNameId(null);
      setEditingName("");
      await refreshCategories();
    }
  });

  const createMutation = useMutation({
    mutationFn: categoryApi.createCategory,
    onSuccess: async () => {
      setIsCreating(false);
      setNewName("");
      setNewIconId(undefined);
      setNameErrors({});
      await refreshCategories();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } }).response
        ?.data?.error?.message;
      setNameErrors({ 0: msg ?? "카테고리 등록에 실패했습니다." });
    }
  });

  const isLoading = categoriesQuery.isLoading || iconsQuery.isLoading;
  const isError =
    categoriesQuery.isError ||
    iconsQuery.isError ||
    (categoriesQuery.data && !categoriesQuery.data.success) ||
    (iconsQuery.data && !iconsQuery.data.success);
  const categories = categoriesQuery.data?.data?.items ?? [];
  const icons = iconsQuery.data?.data?.items ?? [];
  const iconsById = new Map(icons.map((icon) => [icon.icon_id, icon]));

  const retry = () => {
    void categoriesQuery.refetch();
    void iconsQuery.refetch();
  };

  const startNameEdit = (category: CategoryItem) => {
    if (
      !category.editable ||
      !category.show ||
      updateMutation.isPending ||
      createMutation.isPending
    )
      return;
    setNameErrors((prev) => ({ ...prev, [category.category_id]: "" }));
    setEditingNameId(category.category_id);
    setEditingName(category.category_name);
  };

  const saveName = (category: CategoryItem) => {
    if (editingNameId !== category.category_id) return;
    const parsed = categoryNameSchema.safeParse(editingName);
    if (!parsed.success) {
      setNameErrors((prev) => ({
        ...prev,
        [category.category_id]: parsed.error.errors[0]?.message ?? "입력값을 확인해주세요."
      }));
      return;
    }
    setEditingNameId(null);
    setEditingName("");
    if (parsed.data === category.category_name) return;
    updateMutation.mutate({
      categoryId: category.category_id,
      data: { category_name: parsed.data }
    });
  };

  const saveCreate = () => {
    const parsed = categoryNameSchema.safeParse(newName);
    const errs: Record<number, string> = {};
    if (!parsed.success) {
      errs[0] = parsed.error.errors[0]?.message ?? "입력값을 확인해주세요.";
    } else if (!newIconId) {
      errs[0] = "아이콘을 선택해주세요.";
    }
    setNameErrors(errs);
    if (!parsed.success || !newIconId) return;
    createMutation.mutate({ category_name: parsed.data, icon_id: newIconId });
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewName("");
    setNewIconId(undefined);
    setNameErrors((prev) => ({ ...prev, 0: "" }));
  };

  const selectIcon = (icon: IconItem) => {
    if (!pickerTarget) return;
    if (pickerTarget.type === "create") {
      setNewIconId(icon.icon_id);
      setNameErrors((prev) => ({ ...prev, 0: "" }));
      setPickerTarget(null);
      return;
    }
    if (!pickerTarget.item.editable || !pickerTarget.item.show) return;
    updateMutation.mutate({
      categoryId: pickerTarget.item.category_id,
      data: { icon_id: icon.icon_id }
    });
    setPickerTarget(null);
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        <header className="flex items-start justify-between gap-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            거래에 사용할 카테고리의 표시 여부를 관리합니다.
          </p>
          <button
            type="button"
            aria-label="카테고리 등록"
            onClick={() => setIsCreating((prev) => !prev)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </header>

        {isLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-[var(--color-border-secondary)] bg-[var(--color-bg-card)] p-3"
              >
                <div className="h-12 w-12 rounded-2xl bg-[var(--color-bg-secondary)]" />
                <div className="flex-1">
                  <div className="h-4 w-24 rounded bg-[var(--color-bg-secondary)]" />
                  <div className="mt-2 h-3 w-16 rounded bg-[var(--color-bg-secondary)]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              카테고리 목록을 불러오지 못했습니다.
            </p>
            <Button type="button" variant="secondary" className="mt-3" onClick={retry}>
              <span className="inline-flex items-center gap-2">
                <RotateCw size={16} aria-hidden="true" />
                다시 시도
              </span>
            </Button>
          </div>
        )}

        {isCreating && (
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 shadow-[0_4px_16px_var(--color-card-shadow)] flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="카테고리 아이콘 선택"
                onClick={() => setPickerTarget({ type: "create" })}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-primary-soft)]"
              >
                {newIconId && iconsById.get(newIconId) ? (
                  <IconRenderer
                    providerType={iconsById.get(newIconId)!.provider_type}
                    providerKey={iconsById.get(newIconId)!.provider_key}
                    size={24}
                  />
                ) : (
                  <Plus size={20} aria-hidden="true" />
                )}
              </button>
              <input
                aria-label="카테고리명"
                value={newName}
                maxLength={15}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="카테고리명"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
              />
            </div>
            {nameErrors[0] && (
              <p className="mt-2 text-xs text-[var(--color-danger)]">{nameErrors[0]}</p>
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

        {!isLoading && !isError && categories.length === 0 && !isCreating && (
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 shadow-[0_4px_16px_var(--color-card-shadow)]">
            <div className="flex flex-col items-center py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]">
                <Plus size={26} aria-hidden="true" />
              </div>
              <p className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">
                등록된 카테고리가 없습니다.
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                카테고리를 추가하면 거래를 더 쉽게 정리할 수 있어요.
              </p>
            </div>
          </div>
        )}

        {!isLoading && !isError && categories.length > 0 && (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-label="카테고리 목록">
            {categories.map((category) => (
              <CategoryRow
                key={category.category_id}
                category={category}
                icon={iconsById.get(category.icon_id)}
                disabled={updateMutation.isPending}
                editingNameId={editingNameId}
                editingName={editingName}
                error={nameErrors[category.category_id]}
                onStartNameEdit={startNameEdit}
                onNameChange={setEditingName}
                onNameCancel={() => {
                  setEditingNameId(null);
                  setEditingName("");
                }}
                onNameSave={saveName}
                onIconEdit={(item) => setPickerTarget({ type: "edit", item })}
                onToggleShow={(item) =>
                  updateMutation.mutate({
                    categoryId: item.category_id,
                    data: { show: !item.show }
                  })
                }
              />
            ))}
          </ul>
        )}

        {updateMutation.isError && (
          <p className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-text-primary)]">
            표시 여부를 변경하지 못했습니다. 다시 시도해주세요.
          </p>
        )}
      </div>
      <IconPickerSheet
        title="카테고리 아이콘 선택"
        isOpen={pickerTarget !== null}
        selectedIconId={pickerTarget?.type === "create" ? newIconId : pickerTarget?.item.icon_id}
        onClose={() => setPickerTarget(null)}
        onSelect={selectIcon}
      />
    </>
  );
};

// ─── Icons Tab ────────────────────────────────────────────
const IconsTab: React.FC = () => {
  const [selectedIcon, setSelectedIcon] = React.useState<IconItem | null>(null);
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const [selectedOption, setSelectedOption] = React.useState<IconOptionItem | undefined>();
  const queryClient = useQueryClient();

  const iconsQuery = useQuery({
    queryKey: ["icons", "manage"],
    queryFn: async () => {
      const [visible, hidden] = await Promise.all([
        iconApi.getIcons(true),
        iconApi.getIcons(false)
      ]);
      if (!visible.success || !visible.data) return visible;
      if (!hidden.success || !hidden.data) return hidden;
      return { ...visible, data: { items: mergeIcons(visible.data.items, hidden.data.items) } };
    }
  });

  const normalizedSearchText = searchText.trim().toLowerCase();
  const iconOptionsQuery = useQuery({
    queryKey: ["icon-options", normalizedSearchText],
    queryFn: () => iconApi.searchIconOptions(normalizedSearchText),
    enabled: isRegistering && normalizedSearchText.length > 0
  });

  const refreshIcons = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["icons", "manage"] }),
      queryClient.invalidateQueries({ queryKey: ["icons", "select"] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (iconCode: string) => iconApi.createIcon({ icon_code: iconCode, show: true }),
    onSuccess: async () => {
      setSearchText("");
      setSelectedOption(undefined);
      setIsRegistering(false);
      await refreshIcons();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ iconId, show }: { iconId: number; show: boolean }) =>
      iconApi.updateIcon(iconId, { show }),
    onSuccess: refreshIcons
  });

  const icons = iconsQuery.data?.data?.items ?? [];
  const userIcons = icons.filter((icon) => !icon.is_default);
  const existingIconCodes = new Set(icons.map((icon) => icon.icon_code));
  const searchResults =
    iconOptionsQuery.data?.success && iconOptionsQuery.data.data
      ? iconOptionsQuery.data.data.items.filter(
          (option) => !existingIconCodes.has(option.icon_code)
        )
      : [];
  const isError = iconsQuery.isError || (iconsQuery.data && !iconsQuery.data.success);

  return (
    <div className="flex flex-col gap-5">
      <section className={`${cardClass} p-4`}>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          공통 아이콘 선택
        </h2>
        <div className="mt-4">
          <IconSelect selectedIconId={selectedIcon?.icon_id} onSelect={setSelectedIcon} />
        </div>
      </section>

      <section className={`${cardClass} p-4`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            사용자 아이콘
          </h2>
          {!isRegistering && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsRegistering(true);
                setSearchText("");
                setSelectedOption(undefined);
              }}
            >
              등록
            </Button>
          )}
        </div>

        {isRegistering && (
          <div className="mt-4 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4">
            <label
              htmlFor="icon-option-search-manage"
              className="text-sm font-medium text-[var(--color-text-secondary)]"
            >
              아이콘 이름 검색
            </label>
            <input
              id="icon-option-search-manage"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSelectedOption(undefined);
              }}
              placeholder="wallet, piggy-bank"
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-caption)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-soft)]"
            />
            {normalizedSearchText.length === 0 && (
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                등록할 아이콘 이름을 검색해주세요.
              </p>
            )}
            {iconOptionsQuery.isLoading && (
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">검색 중입니다.</p>
            )}
            {normalizedSearchText.length > 0 &&
              !iconOptionsQuery.isLoading &&
              searchResults.length === 0 && (
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  등록 가능한 검색 결과가 없습니다.
                </p>
              )}
            {searchResults.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-3" aria-label="아이콘 검색 결과">
                {searchResults.map((option) => {
                  const selected = option.icon_code === selectedOption?.icon_code;
                  return (
                    <button
                      key={option.icon_code}
                      type="button"
                      aria-label={`등록할 아이콘 선택: ${option.icon_code}`}
                      aria-pressed={selected}
                      onClick={() => setSelectedOption(option)}
                      className={`flex h-16 items-center justify-center rounded-2xl border transition ${selected ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]" : "border-[var(--color-border-secondary)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-primary)]"}`}
                    >
                      <IconRenderer
                        providerType={option.provider_type}
                        providerKey={option.provider_key}
                        size={26}
                      />
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                isLoading={createMutation.isPending}
                disabled={!selectedOption}
                fullWidth
                onClick={() => {
                  if (selectedOption) createMutation.mutate(selectedOption.icon_code);
                }}
              >
                등록
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsRegistering(false);
                  setSearchText("");
                  setSelectedOption(undefined);
                }}
              >
                취소
              </Button>
            </div>
            {createMutation.isError && (
              <p className="mt-3 text-sm text-[var(--color-danger)]">아이콘 등록에 실패했습니다.</p>
            )}
          </div>
        )}

        {iconsQuery.isLoading && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-[var(--color-bg-secondary)]" />
            ))}
          </div>
        )}

        {isError && (
          <div className="mt-4 rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              아이콘 목록을 불러오지 못했습니다.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => void iconsQuery.refetch()}
            >
              다시 시도
            </Button>
          </div>
        )}

        {!iconsQuery.isLoading && !isError && userIcons.length === 0 && (
          <p className="mt-4 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">
            등록된 사용자 아이콘이 없습니다.
          </p>
        )}

        {!iconsQuery.isLoading && !isError && userIcons.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-3" aria-label="사용자 아이콘 목록">
            {userIcons.map((icon) => (
              <button
                key={icon.icon_id}
                type="button"
                aria-label={`${icon.icon_code} 아이콘 ${icon.show ? "숨기기" : "표시하기"}`}
                aria-pressed={icon.show}
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ iconId: icon.icon_id, show: !icon.show })}
                className={`flex h-16 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${icon.show ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]" : "border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-500)]"}`}
              >
                <IconRenderer
                  providerType={icon.provider_type}
                  providerKey={icon.provider_key}
                  size={26}
                />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// ─── ManagePage ───────────────────────────────────────────
const TABS: { key: ManageTab; label: string }[] = [
  { key: "accounts", label: "계좌" },
  { key: "cards", label: "카드" },
  { key: "categories", label: "카테고리" },
  { key: "icons", label: "아이콘" }
];

const VALID_TABS = new Set<ManageTab>(["accounts", "cards", "categories", "icons"]);

const ManagePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") as ManageTab;
  const tab: ManageTab = VALID_TABS.has(rawTab) ? rawTab : "accounts";

  const setTab = (next: ManageTab) => setSearchParams({ tab: next }, { replace: true });

  return (
    <div className="bg-[var(--color-bg-primary)]">
      <div className="mx-auto max-w-[480px] px-4 pb-6 pt-6">
        <div className="mb-4 flex items-center">
          <h1 className="font-gamja text-2xl text-[var(--color-text-primary)]">관리</h1>
        </div>
        <div className="mb-5 flex border-b border-[var(--color-border-primary)]">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 text-sm font-semibold transition border-b-2 ${
                tab === key
                  ? "border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "accounts" && <AccountsTab />}
        {tab === "cards" && <CardsTab />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "icons" && <IconsTab />}
      </div>
    </div>
  );
};

export default ManagePage;
