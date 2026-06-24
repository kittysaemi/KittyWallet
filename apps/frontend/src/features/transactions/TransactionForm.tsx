import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Circle } from "lucide-react";
import { z } from "zod";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { invalidateTransactionCaches } from "../../pwa/cache/cacheInvalidation";
import { addOfflineTransaction } from "../../pwa/indexed-db/repositories/offlineTransaction.repository";
import { enqueueSyncItem } from "../../pwa/indexed-db/repositories/syncQueue.repository";
import { usePwaStore } from "../../pwa/state/pwa.store";
import { runSyncQueue } from "../../pwa/sync/syncQueue.service";
import type { TransactionItem } from "../../entities/transaction/model/transaction.types";
import { accountApi } from "../../entities/account/api/accountApi";
import { cardApi } from "../../entities/card/api/cardApi";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconRenderer } from "../../shared/ui/IconRenderer";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { useTimezone } from "../../shared/hooks/useTimezone";
import { getTodayInTimezone } from "../../shared/utils/date";
import { STALE_TIME } from "../../shared/constants/queryConfig";
import { formatSupportError, toSupportErrorMessage } from "../../shared/api/apiError";

function createSchema(today: string, skipFutureDateCheck = false) {
  const dateField = skipFutureDateCheck
    ? z.string().min(1, "날짜를 선택해주세요.")
    : z.string().min(1, "날짜를 선택해주세요.").refine((v) => v <= today, "미래 날짜는 등록할 수 없습니다.");

  return z
    .object({
      transaction_type: z.enum(["INCOME", "EXPENSE"]),
      wallet_type: z.enum(["ACCOUNT", "CARD"]),
      wallet_id: z.number().min(1, "지갑을 선택해주세요."),
      category_id: z.number().min(1, "카테고리를 선택해주세요."),
      amount: z
        .number({ invalid_type_error: "금액을 입력해주세요." })
        .min(1, "금액은 1원 이상이어야 합니다."),
      transaction_date: dateField,
      memo: z.string().max(200, "메모는 200자 이하여야 합니다.").optional()
    })
    .refine((d) => !(d.transaction_type === "INCOME" && d.wallet_type === "CARD"), {
      message: "카드로 수입 거래를 저장할 수 없습니다.",
      path: ["wallet_type"]
    });
}

// 아이콘 포함 드롭다운 컴포넌트
interface DropdownOption {
  id: number | string;
  label: string;
  sublabel?: string;
  iconId: number;
  group?: string;
  disabled?: boolean;
}

interface IconDropdownProps {
  options: DropdownOption[];
  value?: number | string;
  placeholder: string;
  onChange: (option: DropdownOption) => void;
  error?: string;
  iconMap: Map<number, IconItem>;
  disabled?: boolean;
}

const IconDropdown: React.FC<IconDropdownProps> = ({
  options,
  value,
  placeholder,
  onChange,
  error,
  iconMap,
  disabled
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const groups = Array.from(new Set(options.map((o) => o.group ?? ""))).filter(Boolean);
  const hasGroups = groups.length > 0;

  function renderIcon(iconId: number) {
    const icon = iconMap.get(iconId);
    if (!icon) return <Circle size={18} className="text-[var(--color-text-secondary)]" />;
    return (
      <IconRenderer
        providerType={icon.provider_type}
        providerKey={icon.provider_key}
        size={18}
        className="text-[var(--color-text-primary)]"
      />
    );
  }

  function renderOptions(items: DropdownOption[]) {
    return items.map((opt) => (
      <button
        key={opt.id}
        type="button"
        disabled={opt.disabled}
        onClick={() => {
          if (!opt.disabled) {
            onChange(opt);
            setOpen(false);
          }
        }}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
          opt.id === value
            ? "bg-[var(--color-primary-soft)] text-[var(--color-text-primary)]"
            : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
        } ${opt.disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
          {renderIcon(opt.iconId)}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium">{opt.label}</span>
          {opt.sublabel && (
            <span className="block text-xs text-[var(--color-text-secondary)]">{opt.sublabel}</span>
          )}
        </span>
        {opt.id === value && (
          <span className="text-xs font-semibold text-[var(--color-primary)]">✓</span>
        )}
      </button>
    ));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex w-full min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
          error
            ? "border-[var(--color-danger)]"
            : open
              ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary-soft)]"
              : "border-[var(--color-border-primary)]"
        } bg-[var(--color-bg-input)] ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {selected ? (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
              {renderIcon(selected.iconId)}
            </span>
            <span className="flex-1 text-sm text-[var(--color-text-primary)]">
              {selected.label}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-[var(--color-text-caption)]">{placeholder}</span>
        )}
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--color-text-secondary)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-y-auto rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] py-1 shadow-lg">
          {hasGroups
            ? groups.map((group) => {
                const groupItems = options.filter((o) => o.group === group);
                return (
                  <div key={group}>
                    <p className="px-4 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                      {group}
                    </p>
                    {renderOptions(groupItems)}
                  </div>
                );
              })
            : renderOptions(options)}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
};

// 메인 폼
interface TransactionFormProps {
  onSuccess: () => void;
  onCreated?: (draft: { transaction_date: string; amount: number; memo?: string }) => void;
  initialData?: TransactionItem;
  transactionId?: number;
  readOnly?: boolean;
  futureInstallment?: boolean;
  receiptDraft?: { fields: { transactionDate?: { value: string }; totalAmount?: { value: number } }; items: Array<{ value: string }> };
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onSuccess,
  initialData,
  transactionId,
  readOnly = false,
  futureInstallment = false,
  receiptDraft,
  onCreated
}) => {
  const isEditMode = !!transactionId;
  const queryClient = useQueryClient();
  const timezone = useTimezone();
  const today = React.useMemo(() => getTodayInTimezone(timezone), [timezone]);
  const schema = React.useMemo(() => createSchema(today, futureInstallment), [today, futureInstallment]);

  const [txType, setTxType] = React.useState<"INCOME" | "EXPENSE">(
    initialData?.transaction_type ?? "EXPENSE"
  );
  const [walletId, setWalletId] = React.useState<number>(initialData?.wallet_id ?? 0);
  const [walletType, setWalletType] = React.useState<"ACCOUNT" | "CARD">(
    initialData?.wallet_type ?? "ACCOUNT"
  );
  const [walletKey, setWalletKey] = React.useState<string>(() => {
    if (!initialData) return "";
    return `${initialData.wallet_type}-${initialData.wallet_id}`;
  });
  const [categoryId, setCategoryId] = React.useState<number>(initialData?.category_id ?? 0);
  const [amountStr, setAmountStr] = React.useState<string>(
    initialData ? initialData.amount.toLocaleString("ko-KR") : ""
  );
  const [interestStr, setInterestStr] = React.useState<string>(() => {
    if (!initialData?.interest) return "";
    return initialData.interest.toLocaleString("ko-KR");
  });
  const [date, setDate] = React.useState<string>(() => initialData?.transaction_date ?? getTodayInTimezone(timezone));
  const [memo, setMemo] = React.useState<string>(initialData?.memo ?? "");
  const [installmentMonthsStr, setInstallmentMonthsStr] = React.useState<string>("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [apiError, setApiError] = React.useState<string>("");

  React.useEffect(() => {
    if (!receiptDraft || isEditMode) return;
    if (receiptDraft.fields.transactionDate?.value) setDate(receiptDraft.fields.transactionDate.value);
    if (receiptDraft.fields.totalAmount?.value) setAmountStr(receiptDraft.fields.totalAmount.value.toLocaleString("ko-KR"));
    if (receiptDraft.items.length) setMemo(receiptDraft.items.map((item) => item.value).join(", "));
  }, [receiptDraft, isEditMode]);

  const isInstallmentTx = !!initialData?.installment_id;

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.getAccounts({ include_balance: true }),
    staleTime: STALE_TIME.REALTIME,
    refetchOnMount: "always"
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

  const walletOptions: DropdownOption[] = React.useMemo(() => {
    const accounts = (accountsQuery.data?.data?.items ?? []).map((a) => ({
      id: `ACCOUNT-${a.account_id}`,
      label: a.account_name,
      sublabel: undefined,
      iconId: a.icon_id,
      group: "계좌",
      disabled: false,
    }));
    const cards = (cardsQuery.data?.data?.items ?? []).map((c) => ({
      id: `CARD-${c.card_id}`,
      label: c.card_name,
      iconId: c.icon_id,
      group: "카드",
      disabled: txType === "INCOME",
    }));
    return [...accounts, ...cards];
  }, [accountsQuery.data, cardsQuery.data, txType]);

  const categoryOptions: DropdownOption[] = React.useMemo(
    () =>
      (categoriesQuery.data?.data?.items ?? []).map((cat) => ({
        id: cat.category_id,
        label: cat.category_name,
        iconId: cat.icon_id
      })),
    [categoriesQuery.data]
  );

  const createMutation = useMutation({
    mutationFn: transactionApi.createTransaction,
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
      void invalidateTransactionCaches();
      onCreated?.({ transaction_date: variables.transaction_date, amount: variables.amount, ...(variables.memo ? { memo: variables.memo } : {}) });
      onSuccess();
    },
    onError: (error: unknown) => setApiError(toSupportErrorMessage(error))
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof transactionApi.updateTransaction>[1]) =>
      transactionApi.updateTransaction(transactionId!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
      void invalidateTransactionCaches();
      onSuccess();
    },
    onError: (error: unknown) => setApiError(toSupportErrorMessage(error))
  });

  const convertMutation = useMutation({
    mutationFn: (months: number) =>
      transactionApi.convertToInstallment(transactionId!, { installment_months: months, timezone }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
      void invalidateTransactionCaches();
      onSuccess();
    },
    onError: (error: unknown) => setApiError(toSupportErrorMessage(error))
  });

  const mutation = isEditMode ? updateMutation : createMutation;

  function handleTxTypeChange(type: "INCOME" | "EXPENSE") {
    setTxType(type);
    if (type === "INCOME" && walletType === "CARD") {
      setWalletId(0);
      setWalletKey("");
      setWalletType("ACCOUNT");
      setInstallmentMonthsStr("");
    }
    setErrors({});
  }

  function handleWalletSelect(option: DropdownOption) {
    const key = String(option.id);
    const newWalletType = key.startsWith("ACCOUNT") ? "ACCOUNT" : "CARD";
    const numericId = parseInt(key.split("-")[1], 10);
    if (walletType === "CARD" && newWalletType === "ACCOUNT") {
      setInstallmentMonthsStr("");
    }
    setWalletKey(key);
    setWalletId(numericId);
    setWalletType(newWalletType);
    setErrors((e) => ({ ...e, wallet_id: "", wallet_type: "" }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");
    mutation.reset();

    // 할부 수정: 이자만 전송
    if (isEditMode && isInstallmentTx) {
      const interestAmount = interestStr ? parseInt(interestStr.replace(/,/g, ""), 10) : 0;
      if (isNaN(interestAmount) || interestAmount < 0) {
        setErrors({ interest: "이자는 0원 이상이어야 합니다." });
        return;
      }
      setErrors({});
      if (!navigator.onLine) {
        void (async () => {
          try {
            const offline = await addOfflineTransaction({
              transaction_type: txType,
              wallet_type: walletType,
              wallet_id: walletId,
              category_id: categoryId,
              amount: initialData?.amount ?? 0,
              transaction_date: date,
              server_id: String(transactionId)
            });
            await enqueueSyncItem({
              local_id: offline.local_id,
              client_temp_id: offline.client_temp_id,
              server_id: String(transactionId),
              action: "UPDATE",
              payload: { interest: interestAmount }
            });
            usePwaStore.getState().setSyncStatus("pending_sync");
            void queryClient.invalidateQueries({ queryKey: ["transactions"] });
            onSuccess();
          } catch {
            setApiError(formatSupportError("OFFLINE_001"));
          }
        })();
        return;
      }
      updateMutation.mutate({ interest: interestAmount, memo: memo || undefined, timezone });
      return;
    }

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

    const installmentMonths =
      !isEditMode && walletType === "CARD" && txType === "EXPENSE" && installmentMonthsStr
        ? parseInt(installmentMonthsStr, 10)
        : undefined;

    setErrors({});
    // 1개월은 일시불과 동일 처리
    const installmentPayload =
      installmentMonths && installmentMonths >= 2
        ? { installment: { installment_months: installmentMonths } }
        : {};

    if (!navigator.onLine) {
      void (async () => {
        try {
          const offline = await addOfflineTransaction({
            ...parsed.data,
            ...(isEditMode && transactionId ? { server_id: String(transactionId) } : {})
          });
          await enqueueSyncItem({
            local_id: offline.local_id,
            client_temp_id: offline.client_temp_id,
            server_id: isEditMode && transactionId ? String(transactionId) : undefined,
            action: isEditMode ? "UPDATE" : "CREATE",
            payload: { ...parsed.data, ...installmentPayload }
          });
          usePwaStore.getState().setSyncStatus("pending_sync");
          void queryClient.invalidateQueries({ queryKey: ["transactions"] });
          void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          void queryClient.invalidateQueries({ queryKey: ["accounts"] });
          void queryClient.invalidateQueries({ queryKey: ["cards"] });
          void queryClient.invalidateQueries({ queryKey: ["statistics"] });
          onSuccess();
        } catch {
          setApiError(formatSupportError("OFFLINE_001"));
        }
      })();
      return;
    }
    if (isEditMode) {
      const convertMonths =
        !isInstallmentTx && walletType === "CARD" && txType === "EXPENSE" && installmentMonthsStr
          ? parseInt(installmentMonthsStr, 10)
          : undefined;
      if (convertMonths && convertMonths >= 2) {
        convertMutation.mutate(convertMonths);
        return;
      }
      updateMutation.mutate({
        transaction_type: parsed.data.transaction_type,
        wallet_type: parsed.data.wallet_type,
        wallet_id: parsed.data.wallet_id,
        category_id: parsed.data.category_id,
        amount: parsed.data.amount,
        memo: parsed.data.memo ?? null,
        transaction_date: parsed.data.transaction_date,
        timezone
      });
    } else {
      createMutation.mutate({ ...parsed.data, timezone, ...installmentPayload });
      void runSyncQueue(queryClient);
    }
  }

  const isSaving = mutation.isPending || convertMutation.isPending || readOnly;
  const isLoading = accountsQuery.isLoading || cardsQuery.isLoading || iconsQuery.isLoading;

  const insufficientBalance = React.useMemo(() => {
    if (txType !== "EXPENSE" || walletType !== "ACCOUNT") return false;
    const acct = accountsQuery.data?.data?.items.find((a) => a.account_id === walletId);
    if (!acct || acct.current_balance === null) return false;
    const amount = amountStr ? parseInt(amountStr.replace(/,/g, ""), 10) : 0;
    if (amount <= 0) return false;
    const minAllowed = acct.allow_negative_balance ? -acct.negative_balance_limit : 0;
    const isEditingSameAccount =
      isEditMode &&
      initialData?.wallet_type === "ACCOUNT" &&
      initialData.wallet_id === acct.account_id;
    const initialDelta =
      isEditingSameAccount && initialData
        ? initialData.transaction_type === "INCOME"
          ? initialData.amount
          : -initialData.amount
        : 0;
    const baseBalance = acct.current_balance - initialDelta;
    const projectedBalance = baseBalance - amount;
    return projectedBalance < minAllowed;
  }, [txType, walletType, walletId, amountStr, accountsQuery.data, isEditMode, initialData]);

  // 카드 지갑 선택 중이거나 카드 할부 거래일 때 수입 불가
  const incomeDisabled = walletType === "CARD" || isInstallmentTx;

  // 필수 필드가 모두 채워지고 잔액 문제가 없을 때만 제출 가능
  const canSubmit = isInstallmentTx
    ? !isSaving
    : !isSaving && !insufficientBalance && walletId > 0 && categoryId > 0 && !!amountStr;

  const toggleBase =
    "flex-1 min-h-11 rounded-xl text-sm font-semibold transition border focus:outline-none";
  const activeToggle =
    "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-text-primary)]";
  const inactiveToggle =
    "bg-[var(--color-bg-card)] border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]";
  const disabledToggle =
    "bg-[var(--color-bg-card)] border-[var(--color-border-primary)] text-[var(--color-text-caption)] opacity-40 cursor-not-allowed";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* 미래 할부 안내 */}
      {futureInstallment && (
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-4 py-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            미래 예정 할부 항목입니다. <span className="font-medium text-[var(--color-text-primary)]">이자와 메모만 수정</span>할 수 있습니다.
          </p>
        </div>
      )}

      {/* 거래 유형 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">거래 유형</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSaving || futureInstallment}
            className={`${toggleBase} ${futureInstallment || txType === "EXPENSE" ? activeToggle : inactiveToggle} ${futureInstallment ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => !futureInstallment && handleTxTypeChange("EXPENSE")}
          >
            지출
          </button>
          <button
            type="button"
            disabled={isSaving || incomeDisabled || futureInstallment}
            className={`${toggleBase} ${incomeDisabled || futureInstallment ? disabledToggle : txType === "INCOME" ? activeToggle : inactiveToggle}`}
            onClick={() => !incomeDisabled && !futureInstallment && handleTxTypeChange("INCOME")}
          >
            수입
          </button>
        </div>
      </div>

      {/* 금액 / 원금+이자 */}
      {isInstallmentTx ? (
        <>
          {/* 원금 — 읽기 전용 */}
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">원금 (월 납부)</p>
            <div className="flex min-h-11 items-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3 py-2 opacity-50 cursor-not-allowed">
              <span className="text-sm text-[var(--color-text-primary)]">
                {initialData ? initialData.amount.toLocaleString("ko-KR") : "0"}원
              </span>
            </div>
          </div>
          {/* 이자 — 편집 가능 */}
          <Input
            label="이자"
            name="interest"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={interestStr}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, "");
              setInterestStr(raw ? parseInt(raw, 10).toLocaleString("ko-KR") : "");
              setErrors((err) => ({ ...err, interest: "" }));
            }}
            onKeyDown={(e) => {
              if (e.key === "." || e.key === ",") e.preventDefault();
            }}
            error={errors.interest}
            disabled={isSaving}
            autoComplete="off"
          />
        </>
      ) : (
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
          onKeyDown={(e) => {
            if (e.key === "." || e.key === ",") e.preventDefault();
          }}
          error={errors.amount}
          disabled={isSaving}
          autoComplete="off"
        />
      )}

      {/* 카드할부 개월수 (등록 시 신규 / 편집 시 비할부 카드 지출만 전환 가능) */}
      {txType === "EXPENSE" && walletType === "CARD" && (!isEditMode || (!isInstallmentTx && isEditMode)) && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="installment_months"
            className="text-sm font-medium text-[var(--color-text-secondary)]"
          >
            할부 개월수
          </label>
          <div className="relative">
            <select
              id="installment_months"
              value={installmentMonthsStr}
              onChange={(e) => {
                setInstallmentMonthsStr(e.target.value);
                setErrors((err) => ({ ...err, installment_months: "" }));
              }}
              disabled={isSaving}
              className="w-full appearance-none min-h-11 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 pr-9 text-base text-[var(--color-text-primary)] transition focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-soft)] disabled:opacity-50"
            >
              <option value="">{isEditMode ? "할부 전환 안함" : "일시불"}</option>
              {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                <option key={n} value={String(n)}>
                  {n}개월
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
          </div>
          {errors.installment_months && (
            <p className="text-xs text-[var(--color-danger)]">{errors.installment_months}</p>
          )}
          {isEditMode && installmentMonthsStr && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              현재 거래가 {installmentMonthsStr}개월 할부로 전환됩니다. 원래 거래는 삭제됩니다.
            </p>
          )}
        </div>
      )}

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
        disabled={isSaving || isInstallmentTx}
      />

      {/* 지갑 드롭다운 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">지갑</p>
        {txType === "INCOME" && (
          <p className="text-xs text-[var(--color-text-secondary)]">
            수입 거래는 계좌만 선택 가능합니다.
          </p>
        )}
        <IconDropdown
          options={walletOptions}
          value={walletKey || undefined}
          placeholder={isLoading ? "불러오는 중..." : "지갑 선택"}
          onChange={handleWalletSelect}
          error={errors.wallet_id || errors.wallet_type}
          iconMap={iconMap}
          disabled={isSaving || isLoading || isInstallmentTx}
        />
        {isInstallmentTx && (
          <p className="text-xs text-[var(--color-text-secondary)]">
            할부 거래는 결제 수단을 변경할 수 없습니다. 전체 삭제 후 다시 등록해 주세요.
          </p>
        )}
        {walletType === "ACCOUNT" &&
          walletId > 0 &&
          (() => {
            const acct = accountsQuery.data?.data?.items?.find((a) => a.account_id === walletId);
            if (!acct && accountsQuery.isFetching) {
              return (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  현재 잔액을 새로 불러오는 중...
                </p>
              );
            }
            if (!acct || acct.current_balance === null) return null;
            const amount = amountStr ? parseInt(amountStr.replace(/,/g, ""), 10) : 0;
            const minAllowed = acct.allow_negative_balance ? -acct.negative_balance_limit : 0;
            const isEditingSameAccount =
              isEditMode &&
              initialData?.wallet_type === "ACCOUNT" &&
              initialData.wallet_id === acct.account_id;
            const initialDelta =
              isEditingSameAccount && initialData
                ? initialData.transaction_type === "INCOME"
                  ? initialData.amount
                  : -initialData.amount
                : 0;
            const baseBalance = acct.current_balance - initialDelta;
            const nextDelta = txType === "INCOME" ? amount : -amount;
            const projectedBalance = baseBalance + nextDelta;
            const isInsufficient =
              txType === "EXPENSE" && amount > 0 && projectedBalance < minAllowed;
            const remainingMinusLimit = acct.allow_negative_balance
              ? Math.max(0, acct.negative_balance_limit + Math.min(projectedBalance, 0))
              : null;
            const textColor = isInsufficient
              ? "text-[var(--color-danger)]"
              : "text-[var(--color-text-secondary)]";
            return (
              <div className="flex flex-col gap-0.5 mt-0.5">
                <p className={`text-xs ${textColor}`}>
                  현재 잔액: {projectedBalance.toLocaleString()}원
                  {accountsQuery.isFetching && " / 갱신 중"}
                  {isInsufficient && " - 잔액/한도를 초과합니다"}
                </p>
                {acct.allow_negative_balance && remainingMinusLimit !== null && (
                  <p className={`text-xs ${textColor}`}>
                    마이너스 한도: {remainingMinusLimit.toLocaleString()}원
                  </p>
                )}
              </div>
            );
          })()}
      </div>

      {/* 카테고리 드롭다운 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">카테고리</p>
        <IconDropdown
          options={categoryOptions}
          value={categoryId || undefined}
          placeholder={categoriesQuery.isLoading ? "불러오는 중..." : "카테고리 선택"}
          onChange={(opt) => {
            setCategoryId(Number(opt.id));
            setErrors((e) => ({ ...e, category_id: "" }));
          }}
          error={errors.category_id}
          iconMap={iconMap}
          disabled={isSaving || categoriesQuery.isLoading || isInstallmentTx}
        />
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

      {!readOnly && (
        <Button type="submit" disabled={!canSubmit} className="mt-2">
          {mutation.isPending ? "저장 중..." : isEditMode ? "수정 완료" : "거래 등록"}
        </Button>
      )}
    </form>
  );
};
