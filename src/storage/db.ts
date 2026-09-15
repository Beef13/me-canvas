import { openDB } from 'idb'
import { DB_NAME, DB_STORE } from '../core/types'

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(DB_STORE)) {
      db.createObjectStore(DB_STORE)
    }
  },
})

/** Minimal async key-value over IndexedDB. Values must be structured-cloneable. */
export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await dbPromise
  return db.get(DB_STORE, key)
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await dbPromise
  await db.put(DB_STORE, value, key)
}

export async function kvDel(key: string): Promise<void> {
  const db = await dbPromise
  await db.delete(DB_STORE, key)
}
