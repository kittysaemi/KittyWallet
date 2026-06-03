import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cardApi } from "../../entities/card/api/cardApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { CardItem } from "../../entities/card/model/card.types";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { Button } from "../../shared/ui/Button";
import { IconRenderer } from "../../shared/ui/IconRenderer";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

const CardRow: React.FC<{
  card: CardItem;
  icon: IconItem | undefined;
  onClick: () => void;
}> = ({ card, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${cardClass} flex w-full items-center gap-4 p-4 text-left transition hover:bg-[var(--color-bg-secondary)] ${!card.use_yn ? "opacity-50 grayscale" : ""}`}
  >
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-bg-secondary)]">
      {icon ? (
        <IconRenderer providerType={icon.provider_type} providerKey={icon.provider_key} size={24} />
      ) : (
        <span className="text-xl">💳</span>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <span className="truncate font-semibold text-[var(--color-text-primary)]">
        {card.card_name}
      </span>
    </div>
    <span className="shrink-0 text-[var(--color-text-caption)]">›</span>
  </button>
);

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

const CardsPage: React.FC = () => {
  const navigate = useNavigate();
  const isOffline = !navigator.onLine;

  const cardsQuery = useQuery({
    queryKey: ["cards"],
    queryFn: () => cardApi.getCards(),
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

  const cards = cardsQuery.data?.data?.items ?? [];
  const isLoading = cardsQuery.isLoading;
  const isError = cardsQuery.isError || (cardsQuery.data && !cardsQuery.data.success);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">카드 관리</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              등록된 카드를 관리합니다.
            </p>
          </div>
          <Link
            to="/cards/new"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
          >
            등록
          </Link>
        </header>

        {isOffline && (
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[#FFF8E8] px-4 py-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              현재 오프라인 상태예요. 저장한 내용은 연결 후 동기화됩니다.
            </p>
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

        {!isLoading && !isError && cards.length === 0 && (
          <div className={`${cardClass} flex flex-col items-center px-6 py-12 text-center`}>
            <span className="text-5xl">🐾</span>
            <p className="mt-4 font-semibold text-[var(--color-text-primary)]">
              아직 등록된 카드가 없어요.
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              첫 카드를 등록해볼까요?
            </p>
            <Link
              to="/cards/new"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-6 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
            >
              카드 등록
            </Link>
          </div>
        )}

        {!isLoading && !isError && cards.length > 0 && (
          <div className="flex flex-col gap-3" aria-label="카드 목록">
            {cards.map((card) => (
              <CardRow
                key={card.card_id}
                card={card}
                icon={iconMap.get(card.icon_id)}
                onClick={() => navigate(`/cards/${card.card_id}/edit`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardsPage;
