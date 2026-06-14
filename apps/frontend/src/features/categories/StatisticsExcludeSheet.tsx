import React from "react";
import { X } from "lucide-react";
import type { CategoryItem } from "../../entities/category/model/category.types";
import { IconRenderer } from "../../shared/ui/IconRenderer";

interface StatisticsExcludeSheetProps {
  isOpen: boolean;
  categories: CategoryItem[];
  disabled: boolean;
  onClose: () => void;
  onToggle: (category: CategoryItem) => void;
}

export const StatisticsExcludeSheet: React.FC<StatisticsExcludeSheetProps> = ({
  isOpen,
  categories,
  disabled,
  onClose,
  onToggle
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-0 sm:items-center sm:px-4">
      <div className="flex max-h-[70vh] w-full max-w-[480px] flex-col rounded-t-3xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)] sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">통계 제외 관리</h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              거래 내역과 잔액은 유지되고 통계 합계에서만 제외됩니다.
            </p>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <ul className="min-h-0 overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]" aria-label="통계 제외 카테고리 목록">
          {categories.map((category) => {
            const included = category.include_in_statistics;
            const icon = category.icon;
            return (
              <li key={category.category_id}>
                <button
                  type="button"
                  aria-label={`${category.category_name} 통계 ${included ? "제외하기" : "포함하기"}`}
                  disabled={disabled}
                  onClick={() => onToggle(category)}
                  className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition mb-2 disabled:cursor-not-allowed ${
                    included
                      ? "border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]"
                      : "border-[var(--gray-200)] bg-[var(--gray-100)]"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      included
                        ? "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
                        : "bg-[var(--gray-200)] text-[var(--gray-500)] grayscale"
                    }`}
                  >
                    {icon ? (
                      <IconRenderer
                        providerType={icon.provider_type}
                        providerKey={icon.provider_key}
                        size={20}
                      />
                    ) : (
                      <span className="text-sm font-semibold" aria-hidden="true">
                        {category.category_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span
                    className={`flex-1 text-sm font-semibold ${
                      included ? "text-[var(--color-text-primary)]" : "text-[var(--gray-500)]"
                    }`}
                  >
                    {category.category_name}
                  </span>
                  {!included && (
                    <span className="shrink-0 rounded-full bg-[var(--gray-200)] px-2 py-0.5 text-xs font-medium text-[var(--gray-500)]">
                      통계 제외
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
