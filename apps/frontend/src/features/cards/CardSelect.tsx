import React from "react";
import { useQuery } from "@tanstack/react-query";
import { cardApi } from "../../entities/card/api/cardApi";
import type { CardItem } from "../../entities/card/model/card.types";
import { Button } from "../../shared/ui/Button";

interface CardSelectProps {
  selectedCardId?: number;
  onSelect: (card: CardItem) => void;
}

const CardSelectSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2" aria-label="카드 목록을 불러오는 중입니다.">
    {Array.from({ length: 2 }).map((_, i) => (
      <div key={i} className="h-12 rounded-xl bg-[var(--color-bg-secondary)]" aria-hidden="true" />
    ))}
  </div>
);

export const CardSelect: React.FC<CardSelectProps> = ({ selectedCardId, onSelect }) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["cards", "active"],
    queryFn: () => cardApi.getCards({ use_yn: true })
  });

  if (isLoading) return <CardSelectSkeleton />;

  if (isError || !data?.success || !data.data) {
    return (
      <div className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          카드 목록을 불러오지 못했습니다.
        </p>
        <Button type="button" variant="secondary" className="mt-2" onClick={() => void refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  const cards = data.data.items;

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]">
        사용 가능한 카드가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" aria-label="카드 선택">
      {cards.map((card) => {
        const selected = card.card_id === selectedCardId;
        return (
          <button
            key={card.card_id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(card)}
            className={`flex min-h-11 items-center rounded-xl border px-4 py-2 text-left transition ${
              selected
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
            }`}
          >
            <span className="font-medium text-[var(--color-text-primary)]">{card.card_name}</span>
          </button>
        );
      })}
    </div>
  );
};
