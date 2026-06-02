import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, RotateCw } from "lucide-react";
import { categoryApi } from "../../entities/category/api/categoryApi";
import type { CategoryItem } from "../../entities/category/model/category.types";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
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
  onToggleShow: (category: CategoryItem) => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({ category, icon, disabled, onToggleShow }) => (
  <li className={cardClass}>
    <div className="flex items-center gap-3">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
          category.show
            ? "border-[var(--color-border-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
            : "border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-500)]"
        }`}
      >
        {icon ? (
          <IconRenderer providerType={icon.provider_type} providerKey={icon.provider_key} size={26} />
        ) : (
          <span className="text-sm font-semibold" aria-hidden="true">
            {category.category_name.charAt(0)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`truncate text-base font-semibold ${
              category.show ? "text-[var(--color-text-primary)]" : "text-[var(--gray-500)]"
            }`}
          >
            {category.category_name}
          </p>
          {category.is_default && (
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                category.show
                  ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                  : "bg-[var(--gray-100)] text-[var(--gray-500)]"
              }`}
            >
              기본
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {category.editable && (
          <button
            type="button"
            aria-label={`${category.category_name} 수정`}
            disabled
            title="카테고리 수정 화면은 다음 작업에서 구현됩니다."
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border-secondary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-disabled)] disabled:cursor-not-allowed"
          >
            <Pencil size={18} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          aria-label={`${category.category_name} ${category.show ? "숨기기" : "표시하기"}`}
          aria-pressed={category.show}
          disabled={disabled}
          onClick={() => onToggleShow(category)}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${
            category.show
              ? "border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-soft)]"
              : "border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--color-bg-secondary)]"
          }`}
        >
          {category.show ? (
            <Eye size={18} aria-hidden="true" />
          ) : (
            <EyeOff size={18} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  </li>
);

const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories", "manage"],
    queryFn: () => categoryApi.getCategories()
  });

  const iconsQuery = useQuery({
    queryKey: ["icons", "category-manage"],
    queryFn: async () => {
      const [visible, hidden] = await Promise.all([iconApi.getIcons(true), iconApi.getIcons(false)]);
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
    mutationFn: ({ categoryId, show }: { categoryId: number; show: boolean }) =>
      categoryApi.updateCategory(categoryId, { show }),
    onSuccess: refreshCategories
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

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-6">
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
            disabled
            title="카테고리 등록 화면은 다음 작업에서 구현됩니다."
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-text-primary)] opacity-50"
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </header>

        {isLoading && <CategoryListSkeleton />}
        {!isLoading && isError && <CategoryErrorState onRetry={retry} />}
        {!isLoading && !isError && categories.length === 0 && <CategoryEmptyState />}
        {!isLoading && !isError && categories.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="카테고리 목록">
            {categories.map((category) => (
              <CategoryRow
                key={category.category_id}
                category={category}
                icon={iconsById.get(category.icon_id)}
                disabled={updateMutation.isPending}
                onToggleShow={(item) =>
                  updateMutation.mutate({ categoryId: item.category_id, show: !item.show })
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
    </div>
  );
};

export default CategoriesPage;
