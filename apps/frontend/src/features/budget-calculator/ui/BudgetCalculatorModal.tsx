import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, ChevronDown, ChevronLeft, ChevronRight, Loader2, RefreshCw, WifiOff, X } from "lucide-react";
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
  formatMonthLabel,
  shiftMonth,
  type BudgetCalculationResult
} from "../lib/calculateBudget";

// 월간 예산 계산기(화면정의.md "예산 계산기 버튼과 팝업 정책", 예산계산기정책.md).
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
  accountName: string;
  baseMonthLabel: string;
  balanceDate: string;
  nextMonthLabel: string;
  minimumBalance: number;
  nextMonthIncome: number;
}

interface FieldErrors {
  baseDate?: string;
  account?: string;
  minimumBalance?: string;
  nextMonthIncome?: string;
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

  const currentMonth = getMonthInTimezone(timezone);
  const lastMonth = shiftMonth(currentMonth, -1);
  const today = getTodayInTimezone(timezone);
  // 기준 월은 이번 달·지난달만 선택하며, 처음 열면 이번 달을 선택한다.
  const [baseMonth, setBaseMonth] = React.useState(currentMonth);
  // 잔액 기준일: 지난달일 때만 입력한다. 이번 달이면 서버가 오늘 기준 잔액을 쓴다.
  const [baseDate, setBaseDate] = React.useState("");
  const [baseAccountId, setBaseAccountId] = React.useState(0);
  const [minimumBalanceStr, setMinimumBalanceStr] = React.useState("");
  const [nextMonthIncomeStr, setNextMonthIncomeStr] = React.useState("");
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

  const isLastMonth = baseMonth !== currentMonth;
  const requestBaseDate = isLastMonth ? baseDate : undefined;
  // 지난달이면 오늘 이전(오늘 포함) 잔액 기준일이 있어야 조회한다.
  const isBaseDateReady = !isLastMonth || (!!baseDate && baseDate <= today);

  const sourceQuery = useQuery({
    queryKey: [...BUDGET_CALCULATOR_SOURCE_QUERY_KEY, baseMonth, requestBaseDate ?? ""],
    queryFn: () => budgetCalculatorApi.getSource(baseMonth, requestBaseDate),
    // 오프라인이면 캐시로 계산하지 않도록 조회하지 않는다.
    enabled: !isOffline && isBaseDateReady,
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
  const isSourceLoading = !isOffline && sourceQuery.isFetching && !source;
  const isSourceError = !isOffline && !isSourceLoading && !source && (sourceQuery.isError || !!sourceQuery.data);

  const currentBalanceMap = React.useMemo(() => {
    const map = new Map<number, number | null>();
    accountsQuery.data?.data?.items.forEach((a) => map.set(a.account_id, a.current_balance));
    return map;
  }, [accountsQuery.data]);

  function changeMonth(delta: number) {
    const next = shiftMonth(baseMonth, delta);
    if (next > currentMonth || next < lastMonth) return;
    setBaseMonth(next);
    setErrors((prev) => ({ ...prev, baseDate: undefined }));
  }

  function changeBaseDate(value: string) {
    setBaseDate(value);
    setErrors((prev) => ({
      ...prev,
      baseDate: value > today ? "오늘 이후 날짜는 잔액 기준일로 선택할 수 없습니다." : undefined
    }));
  }

  function handleCalculate() {
    if (isOffline) return;
    if (!isBaseDateReady) {
      setErrors((prev) => ({
        ...prev,
        baseDate: baseDate
          ? "오늘 이후 날짜는 잔액 기준일로 선택할 수 없습니다."
          : "잔액 기준일을 입력해 주세요."
      }));
      return;
    }
    if (!source) return;
    const nextErrors: FieldErrors = {};
    const minimumBalance = parseAmount(minimumBalanceStr);
    const nextMonthIncome = parseAmount(nextMonthIncomeStr);
    const account = source.accounts.find((a) => a.account_id === baseAccountId);

    if (!baseAccountId) nextErrors.account = "기준 계좌를 선택해 주세요.";
    else if (!account) nextErrors.account = "선택한 계좌를 사용할 수 없습니다. 계좌를 다시 선택해 주세요.";
    if (minimumBalance === null) nextErrors.minimumBalance = "최소 유지금액을 입력해 주세요.";
    if (nextMonthIncome === null) nextErrors.nextMonthIncome = "다음 달 예상 수입을 입력해 주세요.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !account || minimumBalance === null || nextMonthIncome === null) {
      return;
    }

    const result = calculateBudget(source, {
      baseAccountId,
      minimumBalance,
      nextMonthIncome
    });
    if (!result) return;
    // 재계산하면 기존 결과를 저장하지 않고 새 결과로 교체한다.
    setSnapshot({
      result,
      accountName: account.account_name,
      baseMonthLabel: formatMonthLabel(baseMonth),
      balanceDate: source.balance_date,
      nextMonthLabel: `${source.next_period.year}년 ${source.next_period.month}월`,
      minimumBalance,
      nextMonthIncome
    });
  }

  // 지난달에 잔액 기준일이 없으면 계산하기에서 입력 안내를 표시한다.
  const canCalculate = !isOffline && (!!source || !isBaseDateReady);

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
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">계산 기준 월</p>
              <div className="flex min-h-11 items-center justify-between rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-input)] px-1">
                <button
                  type="button"
                  aria-label="이전 달"
                  onClick={() => changeMonth(-1)}
                  disabled={baseMonth <= lastMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-base font-semibold text-[var(--color-text-primary)]" aria-live="polite">
                  {formatMonthLabel(baseMonth)}
                </span>
                <button
                  type="button"
                  aria-label="다음 달"
                  onClick={() => changeMonth(1)}
                  disabled={baseMonth >= currentMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {isLastMonth && (
              <Input
                label="잔액 기준일"
                name="budget-base-date"
                type="date"
                value={baseDate}
                max={today}
                onChange={(e) => changeBaseDate(e.target.value)}
                error={errors.baseDate}
              />
            )}

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

            <Input
              label="다음 달 예상 수입"
              name="budget-next-month-income"
              type="text"
              placeholder="0"
              value={nextMonthIncomeStr}
              onChange={(e) => {
                setNextMonthIncomeStr(formatAmountInput(e.target.value));
                setErrors((prev) => ({ ...prev, nextMonthIncome: undefined }));
              }}
              error={errors.nextMonthIncome}
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
                  title={`다음 달 수입 전 ${snapshot.accountName} 예상 잔여금`}
                  amount={snapshot.result.remainingBalance}
                  details={[
                    `기준 월 ${snapshot.baseMonthLabel}`,
                    `기준 잔액(${snapshot.balanceDate}) ${fmt(snapshot.result.breakdown.baseBalance)}원`,
                    `현금 동일 사용 ${fmt(snapshot.result.breakdown.cashSameUseExpense)}원`,
                    `카드 사용액 ${fmt(snapshot.result.breakdown.baseCardExpense)}원`
                  ]}
                  note="다른 계좌의 현금 동일 사용 지출도 기준 계좌 재원으로 충당한다고 가정한 추정값입니다."
                />
                <ResultCard
                  title="최소 유지금액을 지키기 위해 필요한 추가 예상 수입"
                  amount={snapshot.result.requiredAdditionalIncome}
                  details={[
                    `최소 유지금액 ${fmt(snapshot.minimumBalance)}원`,
                    `1번 결과 ${fmt(snapshot.result.remainingBalance)}원`
                  ]}
                />
                <ResultCard
                  title="다음 달 추가 카드 사용 여유"
                  amount={snapshot.result.nextMonthCardAllowance}
                  details={[
                    `다음 달 ${snapshot.nextMonthLabel}`,
                    `예상 수입 ${fmt(snapshot.nextMonthIncome)}원`,
                    `현금 동일 사용 ${fmt(snapshot.result.breakdown.cashSameUseExpense)}원`,
                    `다음 달 할부 ${fmt(snapshot.result.breakdown.nextInstallment)}원`,
                    `카드 고정지출 ${fmt(snapshot.result.breakdown.cardFixedExpense)}원`
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
