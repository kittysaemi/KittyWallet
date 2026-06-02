import { apiClient } from "../../../shared/api/apiClient";
import type {
  ApiResponse,
  CategoryItem,
  CategoryListData,
  UpdateCategoryRequest
} from "../model/category.types";

export const categoryApi = {
  getCategories: async (show?: boolean): Promise<ApiResponse<CategoryListData>> => {
    const res = await apiClient.get<ApiResponse<CategoryListData>>("/categories", {
      params: show === undefined ? undefined : { show }
    });
    return res.data;
  },

  updateCategory: async (
    categoryId: number,
    data: UpdateCategoryRequest
  ): Promise<ApiResponse<Pick<CategoryItem, "category_id" | "show">>> => {
    const res = await apiClient.put<ApiResponse<Pick<CategoryItem, "category_id" | "show">>>(
      `/categories/${categoryId}`,
      data
    );
    return res.data;
  }
};
