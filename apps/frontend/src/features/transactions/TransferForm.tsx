import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, ChevronDown } from "lucide-react";
import { z } from "zod";
import { transactionApi } from "../../entities/transaction/api/transactionApi";
import { accountApi } from "../../entities/account/api/accountApi";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { useTimezone } from "../../shared/hooks/useTimezone";
import { getTodayInTimezone } from "../../shared/utils/date";
import { STALE_TIME } from "../../shared/constants/queryConfig";
import { toSupportErrorMessage } from "../../shared/api/apiError";

function createSchema(today: string) {
  return z
    .object({
      from_account_id: z.number().min(1, "보내는 계좌를 선택해주세요."),
      to_account_id: z.number().min(1, "받는 계좌를 선택해주세요."),
      amount: z
        .number({ invalid_type_error: "금액을 입력해주세요." })
        .min(1, "금액은 1원 이상이어야 합니다."),
      transaction_date: z
        .string()
        .min(1, "날짜를 선택해주세요.")
        .refine((v) => v <= today, "미래 날짜는 등록할 수 없습니다."),
      memo: z.string().max(200, "메모는 200자 이하여야 합니다.").optional()
    })
    .refine((d) => d.from_account_id !== d.to_account_id, {
      message: "보내는 계좌와 받는 계좌는 서로 달라야 합니다.",
      path: ["to_account_id"]
    });
}

export interface TransferFormInitialData {
  transfer_group_id: string;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  transaction_date: string;
  memo?: string | null;
}

interface TransferFormProps {
  onSuccess: () => void;
  initialData?: TransferFormInitialData;
  /** 지갑별 거래내역 화면에서 진입 시, 보내는 계좌를 고정하기 위한 값 */
  lockedFromAccountId?: number;
}

export const TransferForm: React.FC<TransferFormProps> = ({
  onSuccess,
  initialData,
  lockedFromAccountId
}) => {
  const isEditMode = !!initialData;
  const queryClient = useQueryClient();
  const timezone = useTimezone();
  const today = React.useMemo(() => getTodayInTimezone(timezone), [timezone]);
  const schema = React.useMemo(() => createSchema(today), [today]);

  const [fromAccountId, setFromAccountId] = React.useState<number>(
    initialData?.from_account_id ?? lockedFromAccountId ?? 0
  );
  const [toAccountId, setToAccountId] = React.useState<number>(initialData?.to_account_id ?? 0);
  const [amountStr, setAmountStr] = React.useState<string>(
    initialData ? initialData.amount.toLocaleString("ko-KR") : ""
  );
  const [date, setDate] = React.useState<string>(
    () => initialData?.transaction_date ?? getTodayInTimezone(timezone)
  );
  const [memo, setMemo] = React.useState<string>(initialData?.memo ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [apiError, setApiError] = React.useState<string>("");

  const isFromLocked = !isEditMode && !!lockedFromAccountId;

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.getAccounts({ include_balance: true }),
    staleTime: STALE_TIME.REALTIME,
    refetchOnMount: "always"
  });

  const accounts = accountsQuery.data?.data?.items ?? [];
  const toOptions = accounts.filter((a) => a.account_id !== fromAccountId);

  function handleSwap() {
    if (isFromLocked) return;
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
    setErrors({});
  }

  const invalidateAfterMutation = () => {
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    void queryClient.invalidateQueries({ queryKey: ["transactions-position"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    void queryClient.invalidateQueries({ queryKey: ["statistics"] });
  };

  const createMutation = useMutation({
    mutationFn: transactionApi.createTransfer,
    onSuccess: () => {
      invalidateAfterMutation();
      onSuccess();
    },
    onError: (error: unknown) => setApiError(toSupportErrorMessage(error))
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof transactionApi.updateTransfer>[1]) =>
      transactionApi.updateTransfer(initialData!.transfer_group_id, data),
    onSuccess: () => {
      invalidateAfterMutation();
      onSuccess();
    },
    onError: (error: unknown) => setApiError(toSupportErrorMessage(error))
  });

  const mutation = isEditMode ? updateMutation : createMutation;
  const isSaving = mutation.isPending;
  const isLoading = accountsQuery.isLoading;

  // 시점(날짜) 기준 잔액 검증은 백엔드 API(#389) 연동 후 서버 응답을 그대로 사용할 예정.
  // 백엔드가 준비되기 전까지는 "현재 잔액" 기준으로 근사 검증하여 등록 버튼을 막는다.
  const insufficientBalance = React.useMemo(() => {
    const acct = accounts.find((a) => a.account_id === fromAccountId);
    if (!acct || acct.current_balance === null) return false;
    const amount = amountStr ? parseInt(amountStr.replace(/,/g, ""), 10) : 0;
    if (amount <= 0) return false;
    const minAllowed = acct.allow_negative_balance ? -acct.negative_balance_limit : 0;
    const isEditingSameFrom = isEditMode && initialData?.from_account_id === acct.account_id;
    const initialDelta = isEditingSameFrom && initialData ? initialData.amount : 0;
    const baseBalance = acct.current_balance + initialDelta;
    const projectedBalance = baseBalance - amount;
    return projectedBalance < minAllowed;
  }, [accounts, fromAccountId, amountStr, isEditMode, initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    (document.activeElement as HTMLElement)?.blur();
    setApiError("");
    mutation.reset();

    const parsed = schema.safeParse({
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
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

    if (isEditMode) {
      updateMutation.mutate({
        from_account_id: parsed.data.from_account_id,
        to_account_id: parsed.data.to_account_id,
        amount: parsed.data.amount,
        transaction_date: parsed.data.transaction_date,
        memo: parsed.data.memo ?? null,
        timezone
      });
    } else {
      createMutation.mutate({ ...parsed.data, timezone });
    }
  }

  const canSubmit =
    !isSaving &&
    !isLoading &&
    !insufficientBalance &&
    fromAccountId > 0 &&
    toAccountId > 0 &&
    fromAccountId !== toAccountId &&
    !!amountStr;

  const selectedFromAccount = accounts.find((a) => a.account_id === fromAccountId);

  const selectClass =
    "w-full appearance-none min-h-11 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-3 py-2 pr-9 text-base text-[var(--color-text-primary)] transition focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-soft)] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--color-bg-secondary)]";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* 보내는 계좌 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">보내는 계좌</p>
        <div className="relative">
          <select
            value={fromAccountId || ""}
            disabled={isSaving || isLoading || isFromLocked}
            onChange={(e) => {
              const id = Number(e.target.value);
              setFromAccountId(id);
              if (toAccountId === id) setToAccountId(0);
              setErrors((err) => ({ ...err, from_account_id: "", to_account_id: "" }));
            }}
            className={selectClass}
          >
            <option value="">{isLoading ? "불러오는 중..." : "계좌 선택"}</option>
            {accounts.map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.account_name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
        </div>
        {isFromLocked && (
          <p className="text-xs text-[var(--color-text-secondary)]">
            이 지갑에서 진입해 보내는 계좌가 고정되어 있습니다.
          </p>
        )}
        {errors.from_account_id && (
          <p className="text-xs text-[var(--color-danger)]">{errors.from_account_id}</p>
        )}
      </div>

      {/* 방향 전환 */}
      <div className="-my-2 flex justify-center">
        <button
          type="button"
          onClick={handleSwap}
          disabled={isFromLocked || isSaving || !toAccountId}
          aria-label="보내는 계좌와 받는 계좌 서로 바꾸기"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowDownUp size={16} />
        </button>
      </div>

      {/* 받는 계좌 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">받는 계좌</p>
        <div className="relative">
          <select
            value={toAccountId || ""}
            disabled={isSaving || isLoading}
            onChange={(e) => {
              setToAccountId(Number(e.target.value));
              setErrors((err) => ({ ...err, to_account_id: "" }));
            }}
            className={selectClass}
          >
            <option value="">{isLoading ? "불러오는 중..." : "계좌 선택"}</option>
            {toOptions.map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.account_name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
        </div>
        {errors.to_account_id && (
          <p className="text-xs text-[var(--color-danger)]">{errors.to_account_id}</p>
        )}
      </div>

      {/* 금액 */}
      <Input
        label="이동 금액"
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

      {/* 예상 잔액 (보내는 계좌 기준) */}
      {selectedFromAccount && selectedFromAccount.current_balance !== null && (
        (() => {
          const amount = amountStr ? parseInt(amountStr.replace(/,/g, ""), 10) : 0;
          const isEditingSameFrom = isEditMode && initialData?.from_account_id === selectedFromAccount.account_id;
          const initialDelta = isEditingSameFrom && initialData ? initialData.amount : 0;
          const baseBalance = selectedFromAccount.current_balance + initialDelta;
          const projectedBalance = baseBalance - amount;
          const minAllowed = selectedFromAccount.allow_negative_balance
            ? -selectedFromAccount.negative_balance_limit
            : 0;
          const isInsufficient = amount > 0 && projectedBalance < minAllowed;
          const textColor = isInsufficient
            ? "text-[var(--color-danger)]"
            : "text-[var(--color-text-secondary)]";
          return (
            <p className={`-mt-3 text-xs ${textColor}`}>
              이동 후 보내는 계좌 예상 잔액: {projectedBalance.toLocaleString()}원
              {isInsufficient && " - 잔액/한도를 초과해서 등록할 수 없습니다"}
            </p>
          );
        })()
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
        disabled={isSaving}
      />

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

      {apiError && (
        <div
          className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]"
          role="alert"
        >
          {apiError}
        </div>
      )}

      <Button type="submit" disabled={!canSubmit} className="mt-2">
        {mutation.isPending ? "저장 중..." : isEditMode ? "수정 완료" : "계좌이동 등록"}
      </Button>
    </form>
  );
};
