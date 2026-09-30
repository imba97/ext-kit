import type { DBSchema, IDBPDatabase } from 'idb'
import type { BackendDriver } from './backends'

interface ExtKitDb extends DBSchema {
  kv: {
    key: string
    value: unknown
  }
}

const DB_NAME = 'ext-kit'
const STORE = 'kv'
const DB_VERSION = 1

/**
 * Global singleton IDB connection — multiple `openDB` calls for the same
 * database version return the same underlying connection (the `idb` package
 * also caches internally), so this Map primarily exists to share the
 * connection across tests.
 */
const connCache = new Map<string, Promise<IDBPDatabase<ExtKitDb>>>()

async function openDb(databaseName: string): Promise<IDBPDatabase<ExtKitDb>> {
  let pending = connCache.get(databaseName)
  if (!pending) {
    // Dynamic import — environments without `idb` (e.g. chrome-storage-only
    // projects) won't fail to load this module.
    const { openDB } = await import('idb')
    pending = openDB<ExtKitDb>(databaseName, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE))
          db.createObjectStore(STORE)
      }
    })
    connCache.set(databaseName, pending)
  }
  return pending
}

/**
 * IndexedDB backend.
 *
 * IndexedDB is fully available inside the MV3 service worker.
 * Cross-tab / cross-extension-page sync uses `BroadcastChannel` — chrome.storage
 * has `onChanged` for free; here we assemble it ourselves.
 */
export function createIndexedDbDriver(key: string, initial: unknown): BackendDriver<unknown> {
  let dbPromise: Promise<IDBPDatabase<ExtKitDb>> | undefined

  function getDb(): Promise<IDBPDatabase<ExtKitDb>> {
    if (!dbPromise)
      dbPromise = openDb(DB_NAME)
    return dbPromise
  }

  // Use BroadcastChannel for cross-tab sync.
  // The channel name includes the key to prevent unrelated stores from syncing
  // into each other.
  const channelName = `${DB_NAME}:${key}`
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(channelName) : undefined
  const listeners = new Set<(value: unknown) => void>()

  channel?.addEventListener('message', (event) => {
    const payload = (event as MessageEvent).data as { key: string, value: unknown } | undefined
    if (payload && payload.key === key) {
      for (const l of listeners)
        l(payload.value)
    }
  })

  return {
    async read() {
      const db = await getDb()
      const value = await db.get(STORE, key)
      return value ?? initial
    },
    async write(value) {
      const db = await getDb()
      await db.put(STORE, value, key)
      channel?.postMessage({ key, value })
    },
    async remove() {
      const db = await getDb()
      await db.delete(STORE, key)
      channel?.postMessage({ key, value: undefined })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
