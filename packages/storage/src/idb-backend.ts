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
 * 全局单例 IDB 连接 —— 同一个数据库版本下多次 `openDB` 都会拿到同一个
 * 内部连接（idb 包内部也缓存），所以这里的 Map 主要用来跨测试复用。
 */
const connCache = new Map<string, Promise<IDBPDatabase<ExtKitDb>>>()

async function openDb(databaseName: string): Promise<IDBPDatabase<ExtKitDb>> {
  let pending = connCache.get(databaseName)
  if (!pending) {
    // 动态 import —— 没装 idb 的环境（纯 chrome-storage-only 项目）不会报错
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
 * IndexedDB 后端。
 *
 * MV3 service worker 内 IndexedDB 完全可用。跨标签 / 跨扩展页面的同步靠
 * `BroadcastChannel` —— chrome.storage 的 onChanged 是浏览器原生，这里得自己拼。
 */
export function createIndexedDbDriver(key: string, initial: unknown): BackendDriver<unknown> {
  let dbPromise: Promise<IDBPDatabase<ExtKitDb>> | undefined

  function getDb(): Promise<IDBPDatabase<ExtKitDb>> {
    if (!dbPromise)
      dbPromise = openDb(DB_NAME)
    return dbPromise
  }

  // 用 BroadcastChannel 做跨标签同步
  // channel 名带 key 避免不同业务误同步
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
