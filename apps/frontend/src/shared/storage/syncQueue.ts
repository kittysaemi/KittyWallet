const DB_NAME = 'kittywallet';
const STORE_NAME = 'sync_queue';

export async function getPendingSyncCount(): Promise<number> {
  return new Promise((resolve) => {
    const openReq = indexedDB.open(DB_NAME);

    openReq.onerror = () => resolve(0);

    openReq.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        resolve(0);
        return;
      }

      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('status');
        const pendingReq = index.count(IDBKeyRange.only('pending'));
        const failedReq = index.count(IDBKeyRange.only('failed'));

        let pending = 0;
        let failed = 0;
        let done = 0;

        const finish = () => {
          done++;
          if (done === 2) {
            db.close();
            resolve(pending + failed);
          }
        };

        pendingReq.onsuccess = () => { pending = pendingReq.result; finish(); };
        pendingReq.onerror = () => finish();
        failedReq.onsuccess = () => { failed = failedReq.result; finish(); };
        failedReq.onerror = () => finish();
      } catch {
        db.close();
        resolve(0);
      }
    };
  });
}
