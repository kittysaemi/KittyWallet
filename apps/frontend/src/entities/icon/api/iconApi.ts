import { apiClient } from "../../../shared/api/apiClient";
import type {
  ApiResponse,
  CreateIconRequest,
  DeleteUnusedIconsData,
  DeleteUnusedIconsRequest,
  IconCleanupCandidateListData,
  IconItem,
  IconListData,
  IconOptionListData,
  UpdateIconRequest
} from "../model/icon.types";

export const iconApi = {
  getIcons: async (show = true): Promise<ApiResponse<IconListData>> => {
    const res = await apiClient.get<ApiResponse<IconListData>>("/icons", {
      params: { show }
    });
    return res.data;
  },

  searchIconOptions: async (keyword: string): Promise<ApiResponse<IconOptionListData>> => {
    const res = await apiClient.get<ApiResponse<IconOptionListData>>("/icon-options", {
      params: { keyword }
    });
    return res.data;
  },

  createIcon: async (data: CreateIconRequest): Promise<ApiResponse<{ icon_id: number }>> => {
    const res = await apiClient.post<ApiResponse<{ icon_id: number }>>("/icons", data);
    return res.data;
  },

  updateIcon: async (
    iconId: number,
    data: UpdateIconRequest
  ): Promise<ApiResponse<Pick<IconItem, "icon_id" | "show">>> => {
    const res = await apiClient.put<ApiResponse<Pick<IconItem, "icon_id" | "show">>>(
      `/icons/${iconId}`,
      data
    );
    return res.data;
  },

  getCleanupCandidates: async (): Promise<ApiResponse<IconCleanupCandidateListData>> => {
    const res = await apiClient.get<ApiResponse<IconCleanupCandidateListData>>(
      "/icons/cleanup-candidates"
    );
    return res.data;
  },

  deleteUnusedIcons: async (
    data: DeleteUnusedIconsRequest
  ): Promise<ApiResponse<DeleteUnusedIconsData>> => {
    const res = await apiClient.delete<ApiResponse<DeleteUnusedIconsData>>("/icons/cleanup", {
      data
    });
    return res.data;
  }
};
