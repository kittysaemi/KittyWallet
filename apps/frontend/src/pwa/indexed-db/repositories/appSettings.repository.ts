import type { AppSetting } from "../../types/indexedDb.types";
import { STORE_NAMES } from "../indexedDb.config";
import { withReadStore, withWriteStore } from "../indexedDb.client";

export async function getAppSetting(key: string): Promise<string | undefined> {
  const record = await withReadStore(STORE_NAMES.APP_SETTINGS, (store) =>
    store.get(key) as IDBRequest<AppSetting | undefined>
  );
  return record?.setting_value;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await withWriteStore(STORE_NAMES.APP_SETTINGS, (store) =>
    store.put({ setting_key: key, setting_value: value })
  );
}

export async function removeAppSetting(key: string): Promise<void> {
  await withWriteStore(STORE_NAMES.APP_SETTINGS, (store) => store.delete(key));
}
