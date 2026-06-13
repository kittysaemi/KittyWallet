import React from "react";
import { useQuery } from "@tanstack/react-query";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { Button } from "../../shared/ui/Button";
import { IconRenderer } from "../../shared/ui/IconRenderer";

interface IconSelectProps {
  selectedIconId?: number;
  onSelect: (icon: IconItem) => void;
}

const IconSelectSkeleton: React.FC = () => (
  <div className="grid grid-cols-5 gap-2" aria-label="아이콘 목록을 불러오는 중입니다.">
    {Array.from({ length: 10 }).map((_, index) => (
      <div
        key={index}
        className="h-14 rounded-xl bg-[var(--color-bg-secondary)]"
        aria-hidden="true"
      />
    ))}
  </div>
);

export const IconSelect: React.FC<IconSelectProps> = ({ selectedIconId, onSelect }) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["icons", "select"],
    queryFn: () => iconApi.getIcons(true)
  });

  if (isLoading) {
    return <IconSelectSkeleton />;
  }

  if (isError || !data?.success || !data.data) {
    return (
      <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          아이콘 목록을 불러오지 못했습니다.
        </p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => void refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  const items = data.data.items;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">
        선택 가능한 아이콘이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2" aria-label="아이콘 선택">
      {items.map((icon) => {
        const selected = icon.icon_id === selectedIconId;
        return (
          <button
            key={icon.icon_id}
            type="button"
            aria-label={`아이콘 선택: ${icon.icon_code}`}
            aria-pressed={selected}
            onClick={() => onSelect(icon)}
            className={`flex h-14 items-center justify-center rounded-xl border transition ${
              selected
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border-secondary)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)]"
            }`}
          >
            <IconRenderer providerType={icon.provider_type} providerKey={icon.provider_key} size={22} />
          </button>
        );
      })}
    </div>
  );
};
