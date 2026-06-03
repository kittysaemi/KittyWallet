import React from "react";
import { X } from "lucide-react";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconSelect } from "./IconSelect";

interface IconPickerSheetProps {
  title: string;
  selectedIconId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (icon: IconItem) => void;
}

export const IconPickerSheet: React.FC<IconPickerSheetProps> = ({
  title,
  selectedIconId,
  isOpen,
  onClose,
  onSelect
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-0 sm:items-center sm:px-4">
      <div className="max-h-[82vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5 shadow-[0_4px_16px_var(--color-card-shadow)] sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <IconSelect selectedIconId={selectedIconId} onSelect={onSelect} />
      </div>
    </div>
  );
};
