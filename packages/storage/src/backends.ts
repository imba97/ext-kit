import type { StorageBackend } from './types'

// The idb backend is imported separately to avoid loading `idb` in tests
// or chrome-only environments.
import { createIndexedDbDriver } from './idb-backend'

/**
 * Backend base contract — `chrome-storage` and `memory` both implement this;
 * `indexed-db` uses the `idb` package, so it gets its own adapter.
 */
export interface BackendDriver<T> {
  /** Read the current value; return `undefined` if absent. */
  read: () => Promise<unknown | undefined>
  /** Write the current value; passing `undefined` is equivalent to deletion. */
  write: (value: T) => Promise<void>
  /** Remove the value at this key. */
  remove: () => Promise<void>
  /** Listen for writes from other contexts — a self-write must NOT re-trigger. */
  subscribe: (listener: (value: unknown) => void) => () => void
}

/**
 * Pull the entry relevant to the current key out of a `chrome.storage`
 * `onChanged` payload. `onChanged` is grouped by storageArea and maps
 * `key → { oldValue, newValue }`.
 */
function diffByKey(change: Record<string, { newValue?: unknown }>, key: string): unknown {
  return change[key]?.newValue
}

export function createChromeStorageDriver(key: string): BackendDriver<unknown> {
  return {
    async read() {
      const browser = (globalThis as { browser?: any }).browser
      if (!browser?.storage?.local)
        throw new Error('chrome.storage is not available — make sure you call this from an extension context')
      const got = await browser.storage.local.get(key)
      return got?.[key]
    },
    async write(value) {
      const browser = (globalThis as { browser?: any }).browser
      if (!browser?.storage?.local)
        throw new Error('chrome.storage is not available — make sure you call this from an extension context')
      await browser.storage.local.set({ [key]: value })
    },
    async remove() {
      const browser = (globalThis as { browser?: any }).browser
      if (!browser?.storage?.local)
        throw new Error('chrome.storage is not available — make sure you call this from an extension context')
      await browser.storage.local.remove(key)
    },
    subscribe(listener) {
      const browser = (globalThis as { browser?: any }).browser
      if (!browser?.storage?.onChanged)
        return () => {}
      const cb = (changes: Record<string, { newValue?: unknown }>, area: string) => {
        if (area !== 'local')
          return
        if (!(key in changes))
          return
        listener(diffByKey(changes, key))
      }
      browser.storage.onChanged.addListener(cb)
      return () => browser.storage.onChanged.removeListener(cb)
    }
  }
}

/**
 * In-memory backend — used by unit tests. `subscribe` is simulated with
 * `EventTarget`; cross-context sync obviously does not exist here.
 */
export function createMemoryDriver(initial: unknown): BackendDriver<unknown> & { __value: unknown } {
  let value = initial
  const bus = new EventTarget()
  const driver: BackendDriver<unknown> & { __value: unknown } = {
    get __value() { return value },
    async read() {
      return value
    },
    async write(next) {
      value = next
      bus.dispatchEvent(new CustomEvent('change'))
    },
    async remove() {
      value = undefined
      bus.dispatchEvent(new CustomEvent('change'))
    },
    subscribe(listener) {
      const cb = () => listener(value)
      bus.addEventListener('change', cb)
      return () => bus.removeEventListener('change', cb)
    }
  }
  return driver
}

/**
 * Factory: build the matching driver for a backend name.
 */
export function createBackendDriver(
  backend: StorageBackend,
  key: string,
  initialValue: unknown
): BackendDriver<unknown> {
  switch (backend) {
    case 'chrome-storage':
      return createChromeStorageDriver(key)
    case 'memory':
      return createMemoryDriver(initialValue)
    case 'indexed-db':
      // IDB async loading and listener implementation live in idb-backend.ts
      // to keep this module decoupled from the `idb` package.
      return createIndexedDbDriver(key, initialValue)
  }
}
