export interface IconItem {
  icon_id: number;
  icon_code: string;
  provider_type: string;
  provider_key: string;
  show: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface IconListData {
  items: IconItem[];
}

export interface IconOptionItem {
  icon_code: string;
  provider_type: string;
  provider_key: string;
}

export interface IconOptionListData {
  items: IconOptionItem[];
}

export interface CreateIconRequest {
  icon_code: string;
  show?: boolean;
}

export interface UpdateIconRequest {
  show?: boolean;
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
