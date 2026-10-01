import { apiClient } from "../../../shared/api/apiClient";
import type { ApiResponse } from "../model/dashboard.types";
import type { BudgetCalculatorSource } from "../model/budgetCalculator.types";

// 예산 계산기 원본 조회. 입력값·결과는 요청에 넣지 않는다(기준 월과 지난달의 잔액 기준일만 전달).
export const budgetCalculatorApi = {
  getSource: async (
    baseMonth: string,
    baseDate?: string
  ): Promise<ApiResponse<BudgetCalculatorSource>> => {
    const res = await apiClient.get<ApiResponse<BudgetCalculatorSource>>(
      "/dashboard/budget-calculator-source",
      { params: baseDate ? { base_month: baseMonth, base_date: baseDate } : { base_month: baseMonth } }
    );
    return res.data;
  }
};
