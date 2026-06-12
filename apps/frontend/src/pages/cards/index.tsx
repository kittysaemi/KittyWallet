import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Plus, X } from "lucide-react";
import { z } from "zod";
import { cardApi } from "../../entities/card/api/cardApi";
import type { CardItem } from "../../entities/card/model/card.types";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconPickerSheet } from "../../features/icons/IconPickerSheet";
import { Button } from "../../shared/ui/Button";
import { IconRenderer } from "../../shared/ui/IconRenderer";
import { invalidateCardCaches } from "../../pwa/cache/cacheInvalidation";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

const cardNameSchema = z
  .string()
  .trim()
  .min(1, "카드명을 입력해주세요.")
  .max(15, "카드명은 한글 기준 15자 이하여야 합니다.");

type PickerTarget = { type: "create" } | { type: "edit"; item: CardItem } | null;

const CardListSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3" aria-label="카드 목록을 불러오는 중입니다.">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className={`${cardClass} flex items-center gap-4 p-4`} aria-hidden="true">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-[var(--color-bg-secondary)]" />
        <div className="h-4 w-1/2 rounded-lg bg-[var(--color-bg-secondary)]" />
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

const CardsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const isOffline = !navigator.onLine;
  const [isCreating, setIsCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newIconId, setNewIconId] = React.useState<number | undefined>();
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pickerTarget, setPickerTarget] = React.useState<PickerTarget>(null);
  const [archiveTarget, setArchiveTarget] = React.useState<CardItem | null>(null);

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

  const refreshCards = async () => {
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
      await refreshCards();
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
      await refreshCards();
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

  const iconMap = React.useMemo(() => {
    const map = new Map<number, IconItem>();
    iconsQuery.data?.data?.items.forEach((icon) => map.set(icon.icon_id, icon));
    return map;
  }, [iconsQuery.data]);

  const cards = cardsQuery.data?.data?.items ?? [];
  const isLoading = cardsQuery.isLoading;
  const isError = cardsQuery.isError || (cardsQuery.data && !cardsQuery.data.success);
  const isPending = createMutation.isPending || updateMutation.isPending || archiveMutation.isPending;

  const saveCreate = () => {
    const parsed = cardNameSchema.safeParse(newName);
    const nextErrors: Record<string, string> = {};
    if (!parsed.success)
      nextErrors.newName = parsed.error.errors[0]?.message ?? "입력값을 확인해주세요.";
    if (!newIconId) nextErrors.newIcon = "아이콘을 선택해주세요.";
    setErrors(nextErrors);
    if (!parsed.success || !newIconId) return;
    createMutation.mutate({ card_name: parsed.data, icon_id: newIconId });
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewName("");
    setNewIconId(undefined);
    setErrors({});
  };

  const startEditName = (card: CardItem) => {
    if (isPending) return;
    setEditingId(card.card_id);
    setEditingName(card.card_name);
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
      <div className="bg-[var(--color-bg-primary)] px-4 py-6">
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">카드 관리</h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                등록된 카드를 관리합니다.
              </p>
            </div>
            <button
              type="button"
              aria-label="카드 등록"
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
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="카드명"
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
                />
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

          {isLoading && <CardListSkeleton />}

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
                          onChange={(event) => setEditingName(event.target.value)}
                          onBlur={() => saveName(card)}
                          onKeyDown={(event) => {
                            event.stopPropagation();
                            if (event.key === "Enter") saveName(card);
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
                          aria-label={`${card.card_name} 이름 변경`}
                          disabled={isPending}
                          onClick={() => startEditName(card)}
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
      </div>

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

export default CardsPage;
