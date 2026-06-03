import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { z } from "zod";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { AccountSelect } from "../accounts/AccountSelect";
import { CardSelect } from "../cards/CardSelect";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";

const today = new Date().toISOString().split("T")[0];

const schema = z
  .object({
    transaction_type: z.enum(["INCOME", "EXPENSE"]),
    wallet_type: z.enum(["ACCOUNT", "CARD"]),
    wallet_id: z.number().min(1, "결제수단을 선택해주세요."),
    category_id: z.number().min(1, "카테고리를 선택해주세요."),
    amount: z
      .number({ invalid_type_error: "금액을 입력해주세요." })
      .min(1, "금액은 1원 이상이어야 합니다."),
    transaction_date: z
      .string()
      .min(1, "날짜를 선택해주세요.")
      .refine((v) => v <= today, "미래 날짜는 등록할 수 없습니다."),
    memo: z.string().max(200, "메모는 200자 이하여야 합니다.").optional()
  })
  .refine(
    (d) => !(d.transaction_type === "INCOME" && d.wallet_type === "CARD"),
    { message: "카드로 수입 거래를 저장할 수 없습니다.", path: ["wallet_type"] }
  );

const API_ERRORS: Record<string, string> = {
  TX_001: "미래 날짜는 등록할 수 없습니다.",
  TX_002: "금액을 확인해주세요.",
  TX_003: "존재하지 않는 계좌입니다.",
  TX_004: "존재하지 않는 카드입니다.",
  TX_007: "카드로 수입 거래를 저장할 수 없습니다.",
  ACCOUNT_004: "잔액이 부족합니다. 지출 금액이 현재 잔액을 초과합니다."
};

interface TransactionFormProps {
  onSuccess: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const [txType, setTxType] = React.useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [walletType, setWalletType] = React.useState<"ACCOUNT" | "CARD">("ACCOUNT");
  const [walletId, setWalletId] = React.useState<number>(0);
  const [walletName, setWalletName] = React.useState<string>("");
  const [categoryId, setCategoryId] = React.useState<number>(0);
  const [amountStr, setAmountStr] = React.useState<string>("");
  const [date, setDate] = React.useState<string>(today);
  const [memo, setMemo] = React.useState<string>("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [apiError, setApiError] = React.useState<string>("");

  const categoriesQuery = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoryApi.getCategories(true),
    staleTime: 5 * 60 * 1000
  });

  const mutation = useMutation({
    mutationFn: transactionApi.createTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onSuccess();
    },
    onError: (err: unknown) => {
      const code =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { code?: string } })?.error?.code
          : undefined;
      setApiError(code && API_ERRORS[code] ? API_ERRORS[code] : "거래 등록에 실패했습니다.");
    }
  });

  function handleTxTypeChange(type: "INCOME" | "EXPENSE") {
    setTxType(type);
    if (type === "INCOME" && walletType === "CARD") {
      setWalletType("ACCOUNT");
      setWalletId(0);
      setWalletName("");
    }
    setErrors({});
  }

  function handleWalletTypeChange(type: "ACCOUNT" | "CARD") {
    setWalletType(type);
    setWalletId(0);
    setWalletName("");
    setErrors((e) => ({ ...e, wallet_id: "", wallet_type: "" }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");

    const parsed = schema.safeParse({
      transaction_type: txType,
      wallet_type: walletType,
      wallet_id: walletId,
      category_id: categoryId,
      amount: amountStr ? parseInt(amountStr.replace(/,/g, ""), 10) : NaN,
      transaction_date: date,
      memo: memo || undefined
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    mutation.mutate(parsed.data);
  }

  const categories = categoriesQuery.data?.data?.items ?? [];
  const isSaving = mutation.isPending;

  const toggleBase =
    "flex-1 min-h-11 rounded-xl text-sm font-semibold transition border focus:outline-none";
  const activeToggle =
    "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-text-primary)]";
  const inactiveToggle =
    "bg-[var(--color-bg-card)] border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* 거래 유형 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">거래 유형</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`${toggleBase} ${txType === "EXPENSE" ? activeToggle : inactiveToggle}`}
            onClick={() => handleTxTypeChange("EXPENSE")}
          >
            지출
          </button>
          <button
            type="button"
            className={`${toggleBase} ${txType === "INCOME" ? activeToggle : inactiveToggle}`}
            onClick={() => handleTxTypeChange("INCOME")}
          >
            수입
          </button>
        </div>
      </div>

      {/* 금액 */}
      <div className="flex flex-col gap-1.5">
        <Input
          label="금액"
          name="amount"
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={amountStr}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, "");
            setAmountStr(raw ? parseInt(raw, 10).toLocaleString("ko-KR") : "");
            setErrors((err) => ({ ...err, amount: "" }));
          }}
          error={errors.amount}
          disabled={isSaving}
          autoComplete="off"
        />
      </div>

      {/* 날짜 */}
      <Input
        label="날짜"
        name="transaction_date"
        type="date"
        value={date}
        max={today}
        onChange={(e) => {
          setDate(e.target.value);
          setErrors((err) => ({ ...err, transaction_date: "" }));
        }}
        error={errors.transaction_date}
        disabled={isSaving}
      />

      {/* 결제수단 유형 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">결제수단</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`${toggleBase} ${walletType === "ACCOUNT" ? activeToggle : inactiveToggle}`}
            onClick={() => handleWalletTypeChange("ACCOUNT")}
          >
            계좌
          </button>
          <button
            type="button"
            disabled={txType === "INCOME"}
            className={`${toggleBase} ${walletType === "CARD" ? activeToggle : inactiveToggle} disabled:opacity-30`}
            onClick={() => handleWalletTypeChange("CARD")}
          >
            카드
          </button>
        </div>
        {errors.wallet_type && (
          <p className="text-xs text-[var(--color-danger)]">{errors.wallet_type}</p>
        )}
        {txType === "INCOME" && (
          <p className="text-xs text-[var(--color-text-secondary)]">
            수입 거래는 계좌만 선택 가능합니다.
          </p>
        )}
      </div>

      {/* 결제수단 선택 */}
      <div className="flex flex-col gap-1.5">
        {walletType === "ACCOUNT" ? (
          <AccountSelect
            selectedAccountId={walletId || undefined}
            onSelect={(acc) => {
              setWalletId(acc.account_id);
              setWalletName(acc.account_name);
              setErrors((e) => ({ ...e, wallet_id: "" }));
            }}
          />
        ) : (
          <CardSelect
            selectedCardId={walletId || undefined}
            onSelect={(card) => {
              setWalletId(card.card_id);
              setWalletName(card.card_name);
              setErrors((e) => ({ ...e, wallet_id: "" }));
            }}
          />
        )}
        {walletId > 0 && (
          <p className="text-xs text-[var(--color-text-secondary)]">선택됨: {walletName}</p>
        )}
        {errors.wallet_id && (
          <p className="text-xs text-[var(--color-danger)]">{errors.wallet_id}</p>
        )}
      </div>

      {/* 카테고리 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">카테고리</p>
        {categoriesQuery.isLoading && (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--color-bg-secondary)]" />
            ))}
          </div>
        )}
        {categories.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.category_id}
                type="button"
                aria-pressed={categoryId === cat.category_id}
                onClick={() => {
                  setCategoryId(cat.category_id);
                  setErrors((e) => ({ ...e, category_id: "" }));
                }}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs transition ${
                  categoryId === cat.category_id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] font-semibold text-[var(--color-text-primary)]"
                    : "border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
                }`}
              >
                <span className="text-lg leading-none">
                  {cat.category_name.slice(0, 1)}
                </span>
                <span className="line-clamp-1 w-full text-center">{cat.category_name}</span>
              </button>
            ))}
          </div>
        )}
        {errors.category_id && (
          <p className="text-xs text-[var(--color-danger)]">{errors.category_id}</p>
        )}
      </div>

      {/* 메모 */}
      <Input
        label="메모 (선택)"
        name="memo"
        type="text"
        placeholder="메모를 입력해주세요."
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        error={errors.memo}
        disabled={isSaving}
        maxLength={200}
      />

      {/* API 에러 */}
      {apiError && (
        <div
          className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]"
          role="alert"
        >
          {apiError}
        </div>
      )}

      <Button type="submit" disabled={isSaving} className="mt-2">
        {isSaving ? "저장 중..." : "거래 등록"}
      </Button>
    </form>
  );
};
