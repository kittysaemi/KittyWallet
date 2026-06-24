import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "../../entities/settings/api/settingsApi";
import { normalizeAppSettings } from "../../entities/settings/model/theme";
import { STALE_TIME } from "../constants/queryConfig";

export function useTimezone(): string {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.getSettings,
    staleTime: STALE_TIME.MEDIUM
  });
  return normalizeAppSettings(data?.data?.settings).timezone;
}
