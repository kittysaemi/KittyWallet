import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem, IconOptionItem } from "../../entities/icon/model/icon.types";
import { IconSelect } from "../../features/icons/IconSelect";
import { Button } from "../../shared/ui/Button";
import { IconRenderer } from "../../shared/ui/IconRenderer";

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 shadow-[0_4px_16px_var(--color-card-shadow)]";

const IconsPage: React.FC = () => {
  const [selectedIcon, setSelectedIcon] = useState<IconItem | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedOption, setSelectedOption] = useState<IconOptionItem>();
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

      const merged = [...visible.data.items, ...hidden.data.items]
        .filter(
          (icon, index, icons) => icons.findIndex((item) => item.icon_id === icon.icon_id) === index
        )
        .sort((left, right) => left.icon_id - right.icon_id);

      return {
        ...visible,
        data: {
          items: merged
        }
      };
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
      ? iconOptionsQuery.data.data.items.filter((option) => !existingIconCodes.has(option.icon_code))
      : [];
  const isError = iconsQuery.isError || (iconsQuery.data && !iconsQuery.data.success);

  const startRegistration = () => {
    setIsRegistering(true);
    setSearchText("");
    setSelectedOption(undefined);
  };

  const cancelRegistration = () => {
    setIsRegistering(false);
    setSearchText("");
    setSelectedOption(undefined);
  };

  const handleCreate = () => {
    if (selectedOption) {
      createMutation.mutate(selectedOption.icon_code);
    }
  };

  return (
    <div className="bg-[var(--color-bg-primary)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">아이콘 관리</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            계좌, 카드, 카테고리에서 사용할 아이콘을 관리합니다.
          </p>
        </header>

        <section className={cardClass}>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            공통 아이콘 선택
          </h2>
          <div className="mt-4">
            <IconSelect selectedIconId={selectedIcon?.icon_id} onSelect={setSelectedIcon} />
          </div>
        </section>

        <section className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              사용자 아이콘
            </h2>
            {!isRegistering && (
              <Button type="button" variant="secondary" onClick={startRegistration}>
                등록
              </Button>
            )}
          </div>

          {isRegistering && (
            <div className="mt-4 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4">
              <label
                htmlFor="icon-option-search"
                className="text-sm font-medium text-[var(--color-text-secondary)]"
              >
                아이콘 이름 검색
              </label>
              <input
                id="icon-option-search"
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
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
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  검색 중입니다.
                </p>
              )}

              {normalizedSearchText.length > 0 && !iconOptionsQuery.isLoading && searchResults.length === 0 && (
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
                        className={`flex h-16 items-center justify-center rounded-2xl border transition ${
                          selected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
                            : "border-[var(--color-border-secondary)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-card)]"
                        }`}
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
                  onClick={handleCreate}
                >
                  등록
                </Button>
                <Button type="button" variant="ghost" onClick={cancelRegistration}>
                  취소
                </Button>
              </div>
              {createMutation.isError && (
                <p className="mt-3 text-sm text-[var(--color-danger)]">
                  아이콘 등록에 실패했습니다.
                </p>
              )}
            </div>
          )}

          {iconsQuery.isLoading && (
            <div className="mt-4 grid grid-cols-4 gap-3" aria-label="아이콘 목록을 불러오는 중입니다.">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 rounded-2xl bg-[var(--color-bg-secondary)]"
                  aria-hidden="true"
                />
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
                  className={`flex h-16 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    icon.show
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
                      : "border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-500)]"
                  }`}
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
    </div>
  );
};

export default IconsPage;
