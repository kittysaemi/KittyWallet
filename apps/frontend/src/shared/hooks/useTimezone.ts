import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "../../entities/settings/api/settingsApi";
import { normalizeAppSettings } from "../../entities/settings/model/theme";

export function useTimezone(): string {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.getSettings,
    staleTime: 5 * 60 * 1000
  });
  return normalizeAppSettings(data?.data?.settings).timezone;
}
