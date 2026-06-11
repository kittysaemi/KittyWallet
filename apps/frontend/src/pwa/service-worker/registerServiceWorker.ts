import { registerSW } from "virtual:pwa-register";
import { usePwaStore } from "../state/pwa.store";

export function registerServiceWorker(): () => void {
  const updateSW = registerSW({
    onRegistered() {
      usePwaStore.getState().setCacheStatus("cache_ready");
    },
    onRegisterError() {
      usePwaStore.getState().setCacheStatus("cache_error");
    },
    onNeedRefresh() {
      usePwaStore.getState().setUpdateStatus("update_available");
    },
    onOfflineReady() {
      usePwaStore.getState().setCacheStatus("cache_ready");
    },
  });

  return () => {
    updateSW(false);
  };
}

export function applyUpdate(): void {
  const updateSW = registerSW({ immediate: true });
  usePwaStore.getState().setUpdateStatus("updating");
  updateSW(true);
}
