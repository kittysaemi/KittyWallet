export interface CategoryItem {
  category_id: number;
  category_name: string;
  icon_id: number;
  icon?: {
    icon_id: number;
    icon_code: string;
    provider_type: string;
    provider_key: string;
  };
  show: boolean;
  include_in_statistics: boolean;
  is_default: boolean;
  editable: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryListData {
  items: CategoryItem[];
}

export interface CreateCategoryRequest {
  category_name: string;
  icon_id: number;
  show?: boolean;
}

export interface UpdateCategoryRequest {
  category_name?: string;
  icon_id?: number;
  show?: boolean;
  include_in_statistics?: boolean;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}
