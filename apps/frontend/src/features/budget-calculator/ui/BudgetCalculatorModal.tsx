import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, ChevronDown, Loader2, RefreshCw, WifiOff, X } from "lucide-react";
import { budgetCalculatorApi } from "../../../entities/dashboard/api/budgetCalculatorApi";
import type { BudgetCalculatorSource } from "../../../entities/dashboard/model/budgetCalculator.types";
import { accountApi } from "../../../entities/account/api/accountApi";
import { usePwaStore } from "../../../pwa/state/pwa.store";
import { useNumericFieldProps } from "../../../shared/hooks/useNumericFieldProps";
import { useTimezone } from "../../../shared/hooks/useTimezone";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { getMonthInTimezone, getTodayInTimezone } from "../../../shared/utils/date";
import {
  calculateBudget,
  getMonthRange,
  validateBudgetPeriod,
  type BudgetCalculationResult
} from "../lib/calculateBudget";

// 예산 계산기(화면정의.md "예산 계산기 버튼과 팝업 정책", 예산계산기정책.md).
// 입력값·결과는 이 컴포넌트의 local state로만 두고, 팝업을 닫으면 모두 폐기한다.
// Zustand·URL·설정·localStorage·IndexedDB·Cache Storage·Sync Queue에 저장하지 않는다.

export const BUDGET_CALCULATOR_SOURCE_QUERY_KEY = ["budget-calculator-source"] as const;

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function parseAmount(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : null;
}

function formatAmountInput(value: string): string {
  const amount = parseAmount(value);
  return amount === null ? "" : amount.toLocaleString("ko-KR");
}

const cardClass =
  "rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-[0_4px_16px_var(--color-card-shadow)]";

const selectClass =
  "w-full appearance-none min-h-11 rounded-xl border bg-[var(--color-bg-input)] px-3 py-2 pr-9 text-base text-[var(--color-text-primary)] transition focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-soft)] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--color-bg-secondary)]";

export const BudgetCalculatorButton: React.FC<{ disabled: boolean; onClick: () => void }> = ({
  disabled,
  onClick
}) => (
  <button
    type="button"
    aria-label="예산 계산기 열기"
    title={disabled ? "예산 계산기는 온라인에서 사용할 수 있습니다." : undefined}
    disabled={disabled}
    onClick={onClick}
    className={`${cardClass} flex w-14 shrink-0 items-center justify-center text-[var(--color-primary-hover)] transition hover:bg-[var(--color-bg-secondary)] active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40`}
  >
    <Calculator size={22} strokeWidth={1.8} />
  </button>
);

interface CalculationSnapshot {
  result: BudgetCalculationResult;
  startDate: string;
  endDate: string;
  balanceDate: string;
  minimumBalance: number;
}

interface FieldErrors {
  account?: string;
  expectedIncome?: string;
  cashFixedExpense?: string;
  minimumBalance?: string;
}

const ResultCard: React.FC<{
  title: string;
  amount: number;
  details: string[];
  note?: string;
}> = ({ title, amount, details, note }) => (
  <li className={`${cardClass} px-4 py-3`}>
    <p className="text-xs font-medium text-[var(--color-text-secondary)]">{title}</p>
    <p
      className={`mt-1 text-lg font-bold ${
        amount < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"
      }`}
    >
      {fmt(amount)}원
    </p>
    <p className="mt-1 text-xs text-[var(--color-text-caption)]">{details.join(" · ")}</p>
    {note && <p className="mt-1 text-xs text-[var(--color-text-caption)]">{note}</p>}
  </li>
);

export const BudgetCalculatorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const timezone = useTimezone();
  const numericFieldProps = useNumericFieldProps();
  const isOffline = usePwaStore((state) => state.networkStatus) === "offline";

  const today = getTodayInTimezone(timezone);
  // 계산 기간 기본값은 이번 달 1일~말일이다. 사용자가 바꾸기 전에는 시간대 설정이 늦게 로드되어도
  // 항상 현재 시간대의 이번 달을 따른다.
  const defaultRange = getMonthRange(getMonthInTimezone(timezone));
  const [startInput, setStartInput] = React.useState<string | null>(null);
  const [endInput, setEndInput] = React.useState<string | null>(null);
  const startDate = startInput ?? defaultRange.startDate;
  const endDate = endInput ?? defaultRange.endDate;
  const [baseAccountId, setBaseAccountId] = React.useState(0);
  const [expectedIncomeStr, setExpectedIncomeStr] = React.useState("");
  const [cashFixedExpenseStr, setCashFixedExpenseStr] = React.useState("");
  const [minimumBalanceStr, setMinimumBalanceStr] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [snapshot, setSnapshot] = React.useState<CalculationSnapshot | null>(null);

  // 배경 스크롤 잠금 + ESC 닫기
  React.useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // 팝업을 닫으면 원본 조회 결과도 메모리 캐시에서 제거한다.
  React.useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: BUDGET_CALCULATOR_SOURCE_QUERY_KEY });
    };
  }, [queryClient]);

  // 계산 기간이 유효할 때만 원본을 조회한다(시작일은 오늘까지, 시작일 ≤ 종료일).
  const periodError = validateBudgetPeriod(startDate, endDate, today);
  const isPeriodReady = !periodError;

  const sourceQuery = useQuery({
    queryKey: [...BUDGET_CALCULATOR_SOURCE_QUERY_KEY, startDate, endDate],
    queryFn: () => budgetCalculatorApi.getSource(startDate, endDate),
    // 오프라인이면 캐시로 계산하지 않도록 조회하지 않는다.
    enabled: !isOffline && isPeriodReady,
    staleTime: 0,
    gcTime: 0,
    retry: false
  });

  const accountsQuery = useQuery({
    queryKey: ["accounts", "active"],
    queryFn: () => accountApi.getAccounts({ include_balance: true }),
    enabled: !isOffline
  });

  const source: BudgetCalculatorSource | undefined =
    sourceQuery.data?.success && sourceQuery.data.data ? sourceQuery.data.data : undefined;
  const isSourceLoading = !isOffline && isPeriodReady && sourceQuery.isFetching && !source;
  const isSourceError =
    !isOffline && isPeriodReady && !isSourceLoading && !source && (sourceQuery.isError || !!sourceQuery.data);

  const currentBalanceMap = React.useMemo(() => {
    const map = new Map<number, number | null>();
    accountsQuery.data?.data?.items.forEach((a) => map.set(a.account_id, a.current_balance));
    return map;
  }, [accountsQuery.data]);

  function handleCalculate() {
    if (isOffline) return;
    // 기간 오류는 입력 영역에 이미 표시되어 있으므로 계산하지 않는다.
    if (!isPeriodReady || !source) return;
    const nextErrors: FieldErrors = {};
    const expectedIncome = parseAmount(expectedIncomeStr);
    const cashFixedExpense = parseAmount(cashFixedExpenseStr);
    const minimumBalance = parseAmount(minimumBalanceStr);
    const account = source.accounts.find((a) => a.account_id === baseAccountId);

    if (!baseAccountId) nextErrors.account = "기준 계좌를 선택해 주세요.";
    else if (!account) nextErrors.account = "선택한 계좌를 사용할 수 없습니다. 계좌를 다시 선택해 주세요.";
    if (expectedIncome === null) nextErrors.expectedIncome = "예상 수입을 입력해 주세요.";
    if (cashFixedExpense === null) nextErrors.cashFixedExpense = "현금 고정지출을 입력해 주세요.";
    if (minimumBalance === null) nextErrors.minimumBalance = "최소 유지금액을 입력해 주세요.";

    setErrors(nextErrors);
    if (
      Object.keys(nextErrors).length > 0 ||
      !account ||
      expectedIncome === null ||
      cashFixedExpense === null ||
      minimumBalance === null
    ) {
      return;
    }

    const result = calculateBudget(source, {
      baseAccountId,
      expectedIncome,
      cashFixedExpense,
      minimumBalance
    });
    if (!result) return;
    // 재계산하면 기존 결과를 저장하지 않고 새 결과로 교체한다.
    setSnapshot({
      result,
      startDate: source.period.start_date,
      endDate: source.period.end_date,
      balanceDate: source.balance_date,
      minimumBalance
    });
  }

  // 기간이 유효하지 않으면 계산하기에서 입력 안내를 보여 주므로 버튼은 막지 않는다.
  const canCalculate = !isOffline && (!!source || !isPeriodReady);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-calculator-title"
        className="flex max-h-[85vh] w-full max-w-[420px] flex-col rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <h2 id="budget-calculator-title" className="text-base font-bold text-[var(--color-text-primary)]">
            예산 계산기
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* ── 입력 영역 ── */}
          <div className="flex flex-col gap-4">
            <div role="group" aria-labelledby="budget-period-label" className="flex flex-col gap-1">
              <p id="budget-period-label" className="text-sm font-medium text-[var(--color-text-secondary)]">
                계산 기간
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="시작일"
                  name="budget-start-date"
                  type="date"
                  value={startDate}
                  max={today}
                  onChange={(e) => setStartInput(e.target.value)}
                />
                <Input
                  label="종료일"
                  name="budget-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndInput(e.target.value)}
                />
              </div>
              {periodError && <p className="text-xs text-[var(--color-danger)]">{periodError}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="budget-base-account" className="text-sm font-medium text-[var(--color-text-secondary)]">
                기준 계좌
              </label>
              <div className="relative">
                <select
                  id="budget-base-account"
                  value={baseAccountId || ""}
                  disabled={!source}
                  onChange={(e) => {
                    setBaseAccountId(Number(e.target.value));
                    setErrors((prev) => ({ ...prev, account: undefined }));
                  }}
                  className={`${selectClass} ${
                    errors.account ? "border-[var(--color-danger)]" : "border-[var(--color-border-primary)]"
                  }`}
                >
                  <option value="">{isSourceLoading ? "불러오는 중..." : "기준 계좌 선택"}</option>
                  {source?.accounts.map((a) => {
                    const balance = currentBalanceMap.get(a.account_id);
                    return (
                      <option key={a.account_id} value={a.account_id}>
                        {balance == null ? a.account_name : `${a.account_name} · ${fmt(balance)}원`}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                />
              </div>
              {errors.account && <p className="text-xs text-[var(--color-danger)]">{errors.account}</p>}
            </div>

            <Input
              label="예상 수입"
              name="budget-expected-income"
              type="text"
              placeholder="0"
              value={expectedIncomeStr}
              onChange={(e) => {
                setExpectedIncomeStr(formatAmountInput(e.target.value));
                setErrors((prev) => ({ ...prev, expectedIncome: undefined }));
              }}
              error={errors.expectedIncome}
              {...numericFieldProps}
            />

            <Input
              label="현금 고정지출"
              name="budget-cash-fixed-expense"
              type="text"
              placeholder="0"
              value={cashFixedExpenseStr}
              onChange={(e) => {
                setCashFixedExpenseStr(formatAmountInput(e.target.value));
                setErrors((prev) => ({ ...prev, cashFixedExpense: undefined }));
              }}
              error={errors.cashFixedExpense}
              {...numericFieldProps}
            />

            <Input
              label="최소 유지금액"
              name="budget-minimum-balance"
              type="text"
              placeholder="0"
              value={minimumBalanceStr}
              onChange={(e) => {
                setMinimumBalanceStr(formatAmountInput(e.target.value));
                setErrors((prev) => ({ ...prev, minimumBalance: undefined }));
              }}
              error={errors.minimumBalance}
              {...numericFieldProps}
            />
          </div>

          {/* ── 계산하기 ── */}
          <Button type="button" fullWidth className="mt-5" onClick={handleCalculate} disabled={!canCalculate}>
            계산하기
          </Button>

          {/* ── 결과 영역 ── */}
          <div className="mt-5" aria-live="polite">
            {isOffline ? (
              <div className="flex items-center gap-2 rounded-xl bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]" role="status">
                <WifiOff size={16} />
                <span>온라인에서 계산할 수 있습니다.</span>
              </div>
            ) : isSourceLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--color-text-secondary)]">
                <Loader2 size={18} className="animate-spin text-[var(--color-primary)]" />
                계산에 필요한 내역을 불러오는 중입니다.
              </div>
            ) : isSourceError ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center" role="alert">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  계산에 필요한 내역을 불러오지 못했습니다. 다시 시도해 주세요.
                </p>
                <button
                  type="button"
                  onClick={() => void sourceQuery.refetch()}
                  className="flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-primary-hover)]"
                >
                  <RefreshCw size={12} />
                  다시 시도
                </button>
              </div>
            ) : snapshot ? (
              <ol className="flex flex-col gap-2" aria-label="계산 결과">
                <ResultCard
                  title="남는 금액"
                  amount={snapshot.result.difference}
                  details={[
                    `계산 기간 ${snapshot.startDate} ~ ${snapshot.endDate}`,
                    `예산 ${fmt(snapshot.result.breakdown.budget)}원 (기준 잔액(${snapshot.balanceDate}) ${fmt(snapshot.result.breakdown.baseBalance)}원 + 예상 수입 ${fmt(snapshot.result.breakdown.expectedIncome)}원)`,
                    `지출 ${fmt(snapshot.result.breakdown.expense)}원 (카드 사용액 ${fmt(snapshot.result.breakdown.cardExpense)}원 + 현금 고정지출 ${fmt(snapshot.result.breakdown.cashFixedExpense)}원)`
                  ]}
                  note={snapshot.result.difference >= 0 ? "남는 돈" : "모자라는 돈"}
                />
                <ResultCard
                  title="추가로 필요한 금액"
                  amount={snapshot.result.requiredAmount}
                  details={[
                    `지출 ${fmt(snapshot.result.breakdown.expense)}원`,
                    `예산 ${fmt(snapshot.result.breakdown.budget)}원`
                  ]}
                />
                <ResultCard
                  title={`${fmt(snapshot.minimumBalance)}원을 유지하기 위해 필요한 금액`}
                  amount={snapshot.result.minimumBalanceShortfall}
                  details={[
                    `최소 유지금액 ${fmt(snapshot.minimumBalance)}원`,
                    `남는 금액 ${fmt(snapshot.result.difference)}원`
                  ]}
                />
              </ol>
            ) : (
              <p className="py-4 text-center text-sm text-[var(--color-text-caption)]">
                입력 후 계산하기를 누르면 결과가 표시됩니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
