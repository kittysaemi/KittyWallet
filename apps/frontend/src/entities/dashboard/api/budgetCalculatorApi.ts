import { apiClient } from "../../../shared/api/apiClient";
import type { ApiResponse } from "../model/dashboard.types";
import type { BudgetCalculatorSource } from "../model/budgetCalculator.types";

// 예산 계산기 원본 조회. 입력값·후보 선택·결과는 요청에 넣지 않는다(기준 월만 전달).
export const budgetCalculatorApi = {
  getSource: async (baseMonth: string): Promise<ApiResponse<BudgetCalculatorSource>> => {
    const res = await apiClient.get<ApiResponse<BudgetCalculatorSource>>(
      "/dashboard/budget-calculator-source",
      { params: { base_month: baseMonth } }
    );
    return res.data;
  }
};
