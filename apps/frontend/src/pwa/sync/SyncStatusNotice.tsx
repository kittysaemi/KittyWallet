import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { runSyncQueue } from "./syncQueue.service";
import { usePwaStore } from "../state/pwa.store";

export const SyncStatusNotice: React.FC = () => {
  const queryClient = useQueryClient();
  const syncStatus = usePwaStore((state) => state.syncStatus);

  if (syncStatus !== "sync_failed") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-safe">
      <div className="mx-auto mb-3 flex w-full max-w-[480px] items-center justify-between gap-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-bg-card)] px-4 py-3 shadow-lg">
        <p className="text-sm font-medium text-[var(--color-danger)]">
          동기화에 실패했습니다.
        </p>
        <button
          type="button"
          onClick={() => void runSyncQueue(queryClient)}
          className="min-h-9 shrink-0 rounded-lg bg-[var(--color-danger)] px-3 text-sm font-semibold text-white"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
};
