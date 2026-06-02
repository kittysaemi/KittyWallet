import { apiClient } from "../../../shared/api/apiClient";
import type {
  ApiResponse,
  CategoryItem,
  CategoryListData,
  CreateCategoryRequest,
  UpdateCategoryRequest
} from "../model/category.types";

export const categoryApi = {
  getCategories: async (show?: boolean): Promise<ApiResponse<CategoryListData>> => {
    const res = await apiClient.get<ApiResponse<CategoryListData>>("/categories", {
      params: show === undefined ? undefined : { show }
    });
    return res.data;
  },

  createCategory: async (
    data: CreateCategoryRequest
  ): Promise<ApiResponse<Pick<CategoryItem, "category_id">>> => {
    const res = await apiClient.post<ApiResponse<Pick<CategoryItem, "category_id">>>(
      "/categories",
      data
    );
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
