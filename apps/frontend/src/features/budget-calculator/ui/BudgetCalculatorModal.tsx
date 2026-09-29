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
import { getMonthInTimezone } from "../../../shared/utils/date";
import {
  calculateBudget,
  formatMonthLabel,
  shiftMonth,
  type BudgetCalculationResult
} from "../lib/calculateBudget";

// 월간 예산 계산기(화면정의.md "예산 계산기 버튼과 팝업 정책", 예산계산기정책.md).
// 입력값·후보 선택·결과는 이 컴포넌트의 local state로만 두고, 팝업을 닫으면 모두 폐기한다.
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
  nextMonthLabel: string;
}

interface FieldErrors {
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
  // 처음 열면 현재 월을 기본 선택한다. 오늘(일)은 기간 경계를 정하지 않는다.
  const [baseMonth, setBaseMonth] = React.useState(currentMonth);
  const [baseAccountId, setBaseAccountId] = React.useState(0);
  const [minimumBalanceStr, setMinimumBalanceStr] = React.useState("");
  const [nextMonthIncomeStr, setNextMonthIncomeStr] = React.useState("");
  const [selectedCandidateIds, setSelectedCandidateIds] = React.useState<Set<string>>(() => new Set());
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

  const sourceQuery = useQuery({
    queryKey: [...BUDGET_CALCULATOR_SOURCE_QUERY_KEY, baseMonth],
    queryFn: () => budgetCalculatorApi.getSource(baseMonth),
    // 오프라인이면 캐시로 계산하지 않도록 조회하지 않는다.
    enabled: !isOffline,
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

  const walletNameOf = React.useCallback(
    (sourceType: "ACCOUNT" | "CARD", walletId: number) => {
      if (sourceType === "ACCOUNT") {
        return source?.accounts.find((a) => a.account_id === walletId)?.account_name ?? "계좌";
      }
      return source?.cards.find((c) => c.card_id === walletId)?.card_name ?? "카드";
    },
    [source]
  );

  function changeMonth(delta: number) {
    const next = shiftMonth(baseMonth, delta);
    if (next > currentMonth) return;
    setBaseMonth(next);
    // 후보는 기준 월마다 달라지므로 선택을 초기화한다.
    setSelectedCandidateIds(new Set());
  }

  function toggleCandidate(itemId: string) {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function handleCalculate() {
    if (isOffline || !source) return;
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
      nextMonthIncome,
      selectedCandidateIds
    });
    if (!result) return;
    // 재계산하면 기존 결과를 저장하지 않고 새 결과로 교체한다.
    setSnapshot({
      result,
      accountName: account.account_name,
      baseMonthLabel: formatMonthLabel(baseMonth),
      nextMonthLabel: `${source.next_period.year}년 ${source.next_period.month}월`
    });
  }

  const candidates = source?.next_period_items.candidates ?? [];
  const canCalculate = !isOffline && !!source;

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
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
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

            {source && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">
                  반영 후보 <span className="text-xs text-[var(--color-text-caption)]">(선택한 항목만 다음 달 예측에 반영)</span>
                </legend>
                {candidates.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-caption)]">반영 후보가 없습니다.</p>
                ) : (
                  candidates.map((c) => {
                    const name = c.memo?.trim() || c.category_name;
                    return (
                      <label
                        key={c.item_id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border-primary)] px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCandidateIds.has(c.item_id)}
                          onChange={() => toggleCandidate(c.item_id)}
                          className="mt-1 h-4 w-4 accent-[var(--color-primary-hover)]"
                          aria-label={`${name} 반영`}
                        />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="flex items-center justify-between gap-2 text-sm text-[var(--color-text-primary)]">
                            <span className="truncate">{name}</span>
                            <span className="shrink-0 font-semibold">{fmt(c.amount)}원</span>
                          </span>
                          <span className="text-xs text-[var(--color-text-caption)]">
                            {walletNameOf(c.source_type, c.wallet_id)} · {c.reason}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </fieldset>
            )}
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
                  details={[`기준 월 ${snapshot.baseMonthLabel}`]}
                  note="다른 계좌의 현금 고정지출도 기준 계좌 재원으로 충당한다고 가정한 추정값입니다."
                />
                <ResultCard
                  title="최소 유지금액을 지키기 위해 필요한 추가 예상 수입"
                  amount={snapshot.result.requiredAdditionalIncome}
                  details={[`기준 월 ${snapshot.baseMonthLabel}`]}
                />
                <ResultCard
                  title="다음 달 추가 카드 사용 여유"
                  amount={snapshot.result.nextMonthCardAllowance}
                  details={[
                    `다음 달 ${snapshot.nextMonthLabel}`,
                    `자동 반영 ${fmt(snapshot.result.breakdown.automaticTotal)}원`,
                    `선택 후보 ${fmt(snapshot.result.breakdown.selectedCandidateTotal)}원`
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
