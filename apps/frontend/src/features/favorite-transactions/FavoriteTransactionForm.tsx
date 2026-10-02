import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { sortCategoriesByName } from "../../entities/category/lib/sortCategories";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import type {
  FavoriteTransactionItem,
  SaveFavoriteTransactionRequest
} from "../../entities/favorite-transaction/model/favoriteTransaction.types";
import { STALE_TIME } from "../../shared/constants/queryConfig";
import { KOREAN_TEXT_INPUT_PROPS } from "../../shared/constants/inputIme";
import { useNumericFieldProps } from "../../shared/hooks/useNumericFieldProps";
import { Button } from "../../shared/ui/Button";
import { IconDropdown, type DropdownOption } from "../../shared/ui/IconDropdown";
import { Input } from "../../shared/ui/Input";

// 거래 등록 폼과 같은 검증 기준(날짜 제외). 화면정의 §22
const schema = z
  .object({
    transaction_type: z.enum(["INCOME", "EXPENSE"]),
    wallet_type: z.enum(["ACCOUNT", "CARD"]),
    wallet_id: z.number().min(1, "지갑을 선택해주세요."),
    category_id: z.number().min(1, "카테고리를 선택해주세요."),
    amount: z
      .number({ invalid_type_error: "금액을 입력해주세요." })
      .min(1, "금액은 1원 이상이어야 합니다."),
    memo: z.string().max(200, "메모는 200자 이하여야 합니다.").optional()
  })
  .refine((d) => !(d.transaction_type === "INCOME" && d.wallet_type === "CARD"), {
    message: "카드로 수입 거래를 저장할 수 없습니다.",
    path: ["wallet_id"]
  });

interface FavoriteTransactionFormProps {
  initialData?: FavoriteTransactionItem;
  isSaving: boolean;
  disabled?: boolean;
  apiError?: string;
  onSubmit: (data: SaveFavoriteTransactionRequest) => void;
  onCancel: () => void;
}

export const FavoriteTransactionForm: React.FC<FavoriteTransactionFormProps> = ({
  initialData,
  isSaving,
  disabled = false,
  apiError,
  onSubmit,
  onCancel
}) => {
  const numericFieldProps = useNumericFieldProps();
  const [txType, setTxType] = React.useState<"INCOME" | "EXPENSE">(
    initialData?.transaction_type ?? "EXPENSE"
  );
  const [walletKey, setWalletKey] = React.useState(
    initialData ? `${initialData.wallet_type}-${initialData.wallet_id}` : ""
  );
  const [categoryId, setCategoryId] = React.useState(initialData?.category_id ?? 0);
  const [amountStr, setAmountStr] = React.useState(
    initialData ? initialData.amount.toLocaleString("ko-KR") : ""
  );
  const [memo, setMemo] = React.useState(initialData?.memo ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.getAccounts({ include_balance: true }),
    staleTime: STALE_TIME.REALTIME
  });
  const cardsQuery = useQuery({
    queryKey: ["cards"],
    queryFn: () => cardApi.getCards(),
    staleTime: STALE_TIME.MINUTE
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoryApi.getCategories(true),
    staleTime: STALE_TIME.MEDIUM
  });
  const iconsQuery = useQuery({
    queryKey: ["icons", "select"],
    queryFn: () => iconApi.getIcons(true),
    staleTime: STALE_TIME.LONG
  });

  const iconMap = React.useMemo(() => {
    const map = new Map<number, IconItem>();
    iconsQuery.data?.data?.items.forEach((icon) => map.set(icon.icon_id, icon));
    return map;
  }, [iconsQuery.data]);

  // 선택 목록은 거래 등록 화면 기준과 같다: 사용 중인 계좌/카드, 표시 중인 카테고리(거래정책.md 11.1)
  const walletOptions: DropdownOption[] = React.useMemo(() => {
    const accounts = (accountsQuery.data?.data?.items ?? []).map((a) => ({
      id: `ACCOUNT-${a.account_id}`,
      label: a.account_name,
      iconId: a.icon_id,
      group: "계좌"
    }));
    const cards = (cardsQuery.data?.data?.items ?? [])
      .filter((c) => c.use_yn)
      .map((c) => ({
        id: `CARD-${c.card_id}`,
        label: c.card_name,
        iconId: c.icon_id,
        group: "카드",
        disabled: txType === "INCOME"
      }));
    return [...accounts, ...cards];
  }, [accountsQuery.data, cardsQuery.data, txType]);

  const categoryOptions: DropdownOption[] = React.useMemo(
    () =>
      sortCategoriesByName(categoriesQuery.data?.data?.items ?? []).map((cat) => ({
        id: cat.category_id,
        label: cat.category_name,
        iconId: cat.icon_id
      })),
    [categoriesQuery.data]
  );

  const isOptionsLoading =
    accountsQuery.isLoading || cardsQuery.isLoading || categoriesQuery.isLoading;
  // 수정 대상의 지갑·카테고리가 사용 불가이면 선택 목록에 없으므로 다시 골라야 한다.
  const walletSelectable = walletOptions.some((o) => o.id === walletKey && !o.disabled);
  const categorySelectable = categoryOptions.some((o) => o.id === categoryId);
  const walletType = walletKey.startsWith("CARD") ? "CARD" : "ACCOUNT";
  const isBusy = isSaving || disabled;

  function handleTxTypeChange(type: "INCOME" | "EXPENSE") {
    setTxType(type);
    if (type === "INCOME" && walletType === "CARD") setWalletKey("");
    setErrors({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};
    const parsed = schema.safeParse({
      transaction_type: txType,
      wallet_type: walletType,
      wallet_id: walletSelectable ? Number(walletKey.split("-")[1]) : 0,
      category_id: categorySelectable ? categoryId : 0,
      amount: amountStr ? parseInt(amountStr.replace(/,/g, ""), 10) : NaN,
      memo: memo || undefined
    });
    if (!parsed.success) {
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  const toggleBase =
    "flex-1 min-h-11 rounded-xl text-sm font-semibold transition border focus:outline-none";
  const activeToggle =
    "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-text-primary)]";
  const inactiveToggle =
    "bg-[var(--color-bg-card)] border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]";
  const disabledToggle =
    "bg-[var(--color-bg-card)] border-[var(--color-border-primary)] text-[var(--color-text-caption)] opacity-40 cursor-not-allowed";
  const incomeDisabled = walletType === "CARD" && walletKey !== "";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" aria-label="자주 쓰는 거래 입력">
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">거래 유형</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isBusy}
            aria-pressed={txType === "EXPENSE"}
            className={`${toggleBase} ${txType === "EXPENSE" ? activeToggle : inactiveToggle}`}
            onClick={() => handleTxTypeChange("EXPENSE")}
          >
            지출
          </button>
          <button
            type="button"
            disabled={isBusy || incomeDisabled}
            aria-pressed={txType === "INCOME"}
            className={`${toggleBase} ${incomeDisabled ? disabledToggle : txType === "INCOME" ? activeToggle : inactiveToggle}`}
            onClick={() => !incomeDisabled && handleTxTypeChange("INCOME")}
          >
            수입
          </button>
        </div>
      </div>

      <Input
        label="금액"
        name="amount"
        type="text"
        placeholder="0"
        value={amountStr}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          setAmountStr(raw ? parseInt(raw, 10).toLocaleString("ko-KR") : "");
          setErrors((err) => ({ ...err, amount: "" }));
        }}
        onKeyDown={(e) => {
          if (e.key === "." || e.key === ",") e.preventDefault();
        }}
        error={errors.amount}
        disabled={isBusy}
        {...numericFieldProps}
      />

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">지갑</p>
        {txType === "INCOME" && (
          <p className="text-xs text-[var(--color-text-secondary)]">
            수입 거래는 계좌만 선택 가능합니다.
          </p>
        )}
        <IconDropdown
          options={walletOptions}
          value={walletSelectable ? walletKey : undefined}
          placeholder={isOptionsLoading ? "불러오는 중..." : "지갑 선택"}
          onChange={(opt) => {
            setWalletKey(String(opt.id));
            setErrors((err) => ({ ...err, wallet_id: "" }));
          }}
          error={errors.wallet_id}
          iconMap={iconMap}
          disabled={isBusy || isOptionsLoading}
        />
        {initialData && walletKey && !isOptionsLoading && !walletSelectable && (
          <p className="text-xs text-[var(--color-danger)]">
            {initialData.wallet_name || "저장된 지갑"}은(는) 사용할 수 없습니다. 지갑을 다시 선택해주세요.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">카테고리</p>
        <IconDropdown
          options={categoryOptions}
          value={categorySelectable ? categoryId : undefined}
          placeholder={categoriesQuery.isLoading ? "불러오는 중..." : "카테고리 선택"}
          onChange={(opt) => {
            setCategoryId(Number(opt.id));
            setErrors((err) => ({ ...err, category_id: "" }));
          }}
          error={errors.category_id}
          iconMap={iconMap}
          disabled={isBusy || categoriesQuery.isLoading}
        />
        {initialData && categoryId > 0 && !categoriesQuery.isLoading && !categorySelectable && (
          <p className="text-xs text-[var(--color-danger)]">
            {initialData.category_name} 카테고리는 숨김 상태입니다. 카테고리를 다시 선택해주세요.
          </p>
        )}
      </div>

      <Input
        label="메모 (선택)"
        name="memo"
        type="text"
        placeholder="메모를 입력해주세요."
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        error={errors.memo}
        disabled={isBusy}
        maxLength={200}
        autoComplete="off"
        {...KOREAN_TEXT_INPUT_PROPS}
      />

      {apiError && (
        <div
          className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]"
          role="alert"
        >
          {apiError}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" fullWidth isLoading={isSaving} disabled={isBusy}>
          {initialData ? "수정 완료" : "등록"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
          취소
        </Button>
      </div>
    </form>
  );
};
