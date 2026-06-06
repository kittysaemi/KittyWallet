import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCw } from "lucide-react";
import { z } from "zod";
import { categoryApi } from "../../entities/category/api/categoryApi";
import type { CategoryItem } from "../../entities/category/model/category.types";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconPickerSheet } from "../../features/icons/IconPickerSheet";
import { Button } from "../../shared/ui/Button";
import { IconRenderer } from "../../shared/ui/IconRenderer";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 shadow-[0_4px_16px_var(--color-card-shadow)]";

const mergeIcons = (visibleIcons: IconItem[], hiddenIcons: IconItem[]) =>
  [...visibleIcons, ...hiddenIcons]
    .filter(
      (icon, index, icons) => icons.findIndex((item) => item.icon_id === icon.icon_id) === index
    )
    .sort((left, right) => left.icon_id - right.icon_id);

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "카테고리명을 입력해주세요.")
  .max(15, "카테고리명은 한글 기준 15자 이하여야 합니다.");

const CategoryListSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3" aria-label="카테고리 목록을 불러오는 중입니다.">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-[var(--color-border-secondary)] bg-[var(--color-bg-card)] p-3"
        aria-hidden="true"
      >
        <div className="h-12 w-12 rounded-2xl bg-[var(--color-bg-secondary)]" />
        <div className="flex-1">
          <div className="h-4 w-24 rounded bg-[var(--color-bg-secondary)]" />
          <div className="mt-2 h-3 w-16 rounded bg-[var(--color-bg-secondary)]" />
        </div>
        <div className="h-10 w-10 rounded-xl bg-[var(--color-bg-secondary)]" />
      </div>
    ))}
  </div>
);

const CategoryEmptyState: React.FC = () => (
  <div className={cardClass}>
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
);

interface CategoryErrorStateProps {
  onRetry: () => void;
}

const CategoryErrorState: React.FC<CategoryErrorStateProps> = ({ onRetry }) => (
  <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4">
    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
      카테고리 목록을 불러오지 못했습니다.
    </p>
    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
      네트워크 상태를 확인한 뒤 다시 시도해주세요.
    </p>
    <Button type="button" variant="secondary" className="mt-3" onClick={onRetry}>
      <span className="inline-flex items-center gap-2">
        <RotateCw size={16} aria-hidden="true" />
        다시 시도
      </span>
    </Button>
  </div>
);

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
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            category.show
              ? "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
              : "bg-[var(--gray-100)] text-[var(--gray-500)] grayscale"
          }`}
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
          className={`w-full truncate text-sm font-semibold ${
            category.show ? "text-[var(--color-text-primary)]" : "text-[var(--gray-500)]"
          }`}
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
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) onToggleShow(category);
      }}
      className={`${cardClass} col-span-full cursor-pointer`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`${category.category_name} 아이콘 변경`}
          disabled={!canEditDetails || disabled}
          onClick={(event) => {
            event.stopPropagation();
            onIconEdit(category);
          }}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed ${
            category.show
              ? "border-[var(--color-border-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
              : "border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-500)]"
          } ${canEditDetails ? "hover:bg-[var(--color-bg-secondary)]" : ""}`}
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
                onChange={(event) => onNameChange(event.target.value)}
                onBlur={() => onNameSave(category)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") onNameSave(category);
                  if (event.key === "Escape") onNameCancel();
                }}
                onClick={(event) => event.stopPropagation()}
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
                onClick={(event) => {
                  event.stopPropagation();
                  onStartNameEdit(category);
                }}
                className={`min-w-0 cursor-pointer select-none truncate text-left text-base font-semibold disabled:cursor-not-allowed ${
                  category.show ? "text-[var(--color-text-primary)]" : "text-[var(--gray-500)]"
                } ${canEditDetails ? "underline-offset-4 hover:underline" : ""}`}
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

const CategoriesPage: React.FC = () => {
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

      return {
        ...visible,
        data: {
          items: mergeIcons(visible.data.items, hidden.data.items)
        }
      };
    }
  });

  const refreshCategories = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["categories", "manage"] }),
      queryClient.invalidateQueries({ queryKey: ["categories", "select"] })
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
    const nextErrors: Record<number, string> = {};
    if (!parsed.success) {
      nextErrors[0] = parsed.error.errors[0]?.message ?? "입력값을 확인해주세요.";
    } else if (!newIconId) {
      nextErrors[0] = "아이콘을 선택해주세요.";
    }
    setNameErrors(nextErrors);
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
    <div className="bg-[var(--color-bg-primary)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">카테고리 관리</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              거래에 사용할 카테고리의 표시 여부를 관리합니다.
            </p>
          </div>
          <button
            type="button"
            aria-label="카테고리 등록"
            onClick={() => setIsCreating((prev) => !prev)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </header>

        {isLoading && <CategoryListSkeleton />}
        {!isLoading && isError && <CategoryErrorState onRetry={retry} />}
        {isCreating && (
          <div className={`${cardClass} flex flex-col gap-3`}>
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
                onChange={(event) => setNewName(event.target.value)}
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
        {!isLoading && !isError && categories.length === 0 && !isCreating && <CategoryEmptyState />}
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
    </div>
  );
};

export default CategoriesPage;
