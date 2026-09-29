// 예산 계산기 반복 판별 기준값(예산계산기정책.md 6.3).
// 기준값은 코드에 고정하지 않고 환경변수로만 받는다. 값이 없거나 형식이 잘못되면
// 모듈 초기화 시점에 오류를 내서 서버가 잘못된 기준으로 동작하지 않게 한다.

export const BUDGET_CALCULATOR_CONFIG = Symbol("BUDGET_CALCULATOR_CONFIG");

export interface BudgetCalculatorConfig {
  /** 반복 판별 관찰 기간(기준 월 직전 완료 달력 월 수) */
  observationMonths: number;
  /** 자동 반영 최소 발생 횟수 */
  automaticMinOccurrences: number;
  /** 반영 후보 최소 발생 횟수 */
  candidateMinOccurrences: number;
  /** 간격 허용 오차(간격 중앙값 대비 %) */
  intervalTolerancePercent: number;
  /** 간격 허용 오차 최소 일수 */
  intervalToleranceMinDays: number;
  /** 금액 허용 오차(가장 최근 금액 대비 %) */
  amountTolerancePercent: number;
  /** 반영 후보 표시 기간(기준 월 포함 최근 개월 수) */
  candidateRecentMonths: number;
}

export const BUDGET_CALCULATOR_ENV_KEYS: Record<keyof BudgetCalculatorConfig, string> = {
  observationMonths: "BUDGET_RECURRING_OBSERVATION_MONTHS",
  automaticMinOccurrences: "BUDGET_RECURRING_AUTOMATIC_MIN_OCCURRENCES",
  candidateMinOccurrences: "BUDGET_RECURRING_CANDIDATE_MIN_OCCURRENCES",
  intervalTolerancePercent: "BUDGET_RECURRING_INTERVAL_TOLERANCE_PERCENT",
  intervalToleranceMinDays: "BUDGET_RECURRING_INTERVAL_TOLERANCE_MIN_DAYS",
  amountTolerancePercent: "BUDGET_RECURRING_AMOUNT_TOLERANCE_PERCENT",
  candidateRecentMonths: "BUDGET_CANDIDATE_RECENT_MONTHS"
};

export function loadBudgetCalculatorConfig(
  readEnv: (key: string) => string | undefined
): BudgetCalculatorConfig {
  const errors: string[] = [];
  const values = {} as BudgetCalculatorConfig;

  for (const [field, envKey] of Object.entries(BUDGET_CALCULATOR_ENV_KEYS) as Array<
    [keyof BudgetCalculatorConfig, string]
  >) {
    const raw = readEnv(envKey)?.trim();
    if (!raw || !/^\d+$/.test(raw)) {
      errors.push(`${envKey}는 0 이상의 정수여야 합니다. (현재: ${raw ?? "미설정"})`);
      continue;
    }
    values[field] = Number(raw);
  }

  if (errors.length === 0) {
    if (values.observationMonths < 1) {
      errors.push(`${BUDGET_CALCULATOR_ENV_KEYS.observationMonths}는 1 이상이어야 합니다.`);
    }
    if (values.candidateRecentMonths < 1) {
      errors.push(`${BUDGET_CALCULATOR_ENV_KEYS.candidateRecentMonths}는 1 이상이어야 합니다.`);
    }
    // 간격을 계산하려면 최소 2회가 필요하다.
    if (values.candidateMinOccurrences < 2) {
      errors.push(`${BUDGET_CALCULATOR_ENV_KEYS.candidateMinOccurrences}는 2 이상이어야 합니다.`);
    }
    if (values.automaticMinOccurrences < values.candidateMinOccurrences) {
      errors.push(
        `${BUDGET_CALCULATOR_ENV_KEYS.automaticMinOccurrences}는 ${BUDGET_CALCULATOR_ENV_KEYS.candidateMinOccurrences} 이상이어야 합니다.`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`예산 계산기 설정 오류:\n- ${errors.join("\n- ")}`);
  }
  return values;
}
