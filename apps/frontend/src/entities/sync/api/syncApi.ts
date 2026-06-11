import { apiClient } from "../../../shared/api/apiClient";
import type { SyncUploadRequest, SyncUploadResponse } from "../model/sync.types";

export const syncApi = {
  upload: async (data: SyncUploadRequest): Promise<SyncUploadResponse> => {
    const res = await apiClient.post<SyncUploadResponse>("/sync/upload", data);
    return res.data;
  }
};
