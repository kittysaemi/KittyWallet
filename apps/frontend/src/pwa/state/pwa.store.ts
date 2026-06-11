import { create } from "zustand";
import type {
  CacheStatus,
  InstallStatus,
  NetworkStatus,
  PwaState,
  SyncStatus,
  UpdateStatus,
} from "../types/pwa.types";

interface PwaActions {
  setInstallStatus: (status: InstallStatus) => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  setCacheStatus: (status: CacheStatus) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setUpdateStatus: (status: UpdateStatus | null) => void;
}

export const usePwaStore = create<PwaState & PwaActions>((set) => ({
  installStatus: "unsupported",
  networkStatus: navigator.onLine ? "online" : "offline",
  cacheStatus: "cache_loading",
  syncStatus: "synced",
  updateStatus: null,

  setInstallStatus: (status) => set({ installStatus: status }),
  setNetworkStatus: (status) => set({ networkStatus: status }),
  setCacheStatus: (status) => set({ cacheStatus: status }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setUpdateStatus: (status) => set({ updateStatus: status }),
}));
