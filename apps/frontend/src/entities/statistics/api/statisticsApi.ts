import { apiClient } from "../../../shared/api/apiClient";
import type {
  ApiResponse,
  CategoryStatisticsData,
  CategoryStatisticsParams,
  MonthlyStatisticsData,
  MonthlyStatisticsParams
} from "../model/statistics.types";

export const statisticsApi = {
  getMonthlyStatistics: async (
    params?: MonthlyStatisticsParams
  ): Promise<ApiResponse<MonthlyStatisticsData>> => {
    const res = await apiClient.get<ApiResponse<MonthlyStatisticsData>>("/statistics/monthly", {
      params
    });
    return res.data;
  },

  getCategoryStatistics: async (
    params: CategoryStatisticsParams
  ): Promise<ApiResponse<CategoryStatisticsData>> => {
    const res = await apiClient.get<ApiResponse<CategoryStatisticsData>>("/statistics/category", {
      params
    });
    return res.data;
  }
};
