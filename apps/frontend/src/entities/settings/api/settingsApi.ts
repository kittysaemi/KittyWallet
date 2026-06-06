import { apiClient } from "../../../shared/api/apiClient";
import type { SettingsResponse, UpdateSettingsRequest } from "../model/settings.types";

export const settingsApi = {
  getSettings: async (): Promise<SettingsResponse> => {
    const res = await apiClient.get<SettingsResponse>("/settings");
    return res.data;
  },

  updateSettings: async (data: UpdateSettingsRequest): Promise<SettingsResponse> => {
    const res = await apiClient.put<SettingsResponse>("/settings", data);
    return res.data;
  }
};
