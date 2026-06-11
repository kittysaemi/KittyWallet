import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { runSyncQueue } from "./syncQueue.service";
import { usePwaStore } from "../state/pwa.store";

export const PwaStatusBanner: React.FC = () => {
  const queryClient = useQueryClient();
  const networkStatus = usePwaStore((state) => state.networkStatus);
  const syncStatus = usePwaStore((state) => state.syncStatus);

  if (syncStatus === "sync_failed") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-safe">
        <div className="mx-auto mb-3 flex w-full max-w-[480px] items-center justify-between gap-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-bg-card)] px-4 py-3 shadow-lg">
          <div className="flex min-w-0 items-center gap-2">
            <CloudOff size={16} className="shrink-0 text-[var(--color-danger)]" />
            <p className="truncate text-sm font-medium text-[var(--color-danger)]">
              동기화에 실패했습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runSyncQueue(queryClient)}
            className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-danger)] px-3 text-sm font-semibold text-white"
          >
            <RefreshCw size={14} />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (networkStatus === "offline") {
    return (
      <div className="fixed inset-x-0 top-0 z-50 px-4 pt-safe">
        <div className="mx-auto mt-3 flex w-full max-w-[480px] items-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3 shadow-lg">
          <CloudOff size={16} className="shrink-0 text-[var(--color-text-secondary)]" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            현재 오프라인 상태예요. 저장한 내용은 연결 후 동기화됩니다.
          </p>
        </div>
      </div>
    );
  }

  if (syncStatus === "syncing") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-safe">
        <div className="mx-auto mb-3 flex w-full max-w-[480px] items-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3 shadow-lg">
          <RefreshCw
            size={16}
            className="shrink-0 animate-spin text-[var(--color-primary)]"
          />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">동기화 중</p>
        </div>
      </div>
    );
  }

  if (syncStatus === "pending_sync") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-safe">
        <div className="mx-auto mb-3 flex w-full max-w-[480px] items-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3 shadow-lg">
          <Cloud size={16} className="shrink-0 text-[var(--color-text-secondary)]" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            오프라인 저장됨
          </p>
        </div>
      </div>
    );
  }

  return null;
};
