import { apiClient } from "../../../shared/api/apiClient";
import type {
  ApiResponse,
  CalendarStatisticsData,
  CategoryStatisticsData,
  CategoryStatisticsParams,
  CategoryTopStatisticsData,
  MonthlyStatisticsData,
  MonthlyStatisticsParams,
  PeriodStatisticsData,
  PeriodStatisticsParams,
  SankeyStatisticsData,
  SummaryStatisticsData,
  VisualizationParams
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
  },

  getPeriodStatistics: async (
    params: PeriodStatisticsParams
  ): Promise<ApiResponse<PeriodStatisticsData>> => {
    const res = await apiClient.get<ApiResponse<PeriodStatisticsData>>("/statistics/period", {
      params
    });
    return res.data;
  },

  getSummaryStatistics: async (
    params?: VisualizationParams
  ): Promise<ApiResponse<SummaryStatisticsData>> => {
    const res = await apiClient.get<ApiResponse<SummaryStatisticsData>>("/statistics/summary", {
      params
    });
    return res.data;
  },

  getCategoryTopStatistics: async (
    params?: VisualizationParams
  ): Promise<ApiResponse<CategoryTopStatisticsData>> => {
    const res = await apiClient.get<ApiResponse<CategoryTopStatisticsData>>(
      "/statistics/category-top",
      { params }
    );
    return res.data;
  },

  getCalendarStatistics: async (
    params?: VisualizationParams
  ): Promise<ApiResponse<CalendarStatisticsData>> => {
    const res = await apiClient.get<ApiResponse<CalendarStatisticsData>>("/statistics/calendar", {
      params
    });
    return res.data;
  },

  getSankeyStatistics: async (
    params?: VisualizationParams
  ): Promise<ApiResponse<SankeyStatisticsData>> => {
    const res = await apiClient.get<ApiResponse<SankeyStatisticsData>>("/statistics/sankey", {
      params
    });
    return res.data;
  }
};
