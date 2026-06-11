import { getSyncQueuePendingCount } from "../../pwa/indexed-db/repositories/syncQueue.repository";

export async function getPendingSyncCount(): Promise<number> {
  try {
    return await getSyncQueuePendingCount();
  } catch {
    return 0;
  }
}
