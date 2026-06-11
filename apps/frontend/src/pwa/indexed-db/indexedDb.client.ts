import { DB_CONFIG } from "./indexedDb.config";
import { applySchema } from "./indexedDb.schema";

let dbInstance: IDBDatabase | null = null;

export async function getDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

    req.onupgradeneeded = (e) => applySchema(e);

    req.onsuccess = (e) => {
      dbInstance = (e.target as IDBOpenDBRequest).result;
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    req.onerror = () => reject(req.error);
  });
}

export function closeDb(): void {
  dbInstance?.close();
  dbInstance = null;
}

export function deleteDb(): Promise<void> {
  closeDb();
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_CONFIG.name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

export function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function withReadStore<T>(
  storeName: string,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await getDb();
  const tx = db.transaction(storeName, "readonly");
  return idbRequest(fn(tx.objectStore(storeName)));
}

export async function withWriteStore<T>(
  storeName: string,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await getDb();
  const tx = db.transaction(storeName, "readwrite");
  return idbRequest(fn(tx.objectStore(storeName)));
}
