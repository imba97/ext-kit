import type { StorageBackend } from './types'

// idb-backend 的实现单独 import，避免在测试或 chrome-only 环境里加载 idb
import { createIndexedDbDriver } from './idb-backend'

/**
 * 后端基类 —— `chrome-storage` / `memory` 都实现这套；
 * `indexed-db` 因为走 `idb` 包，单独一份适配。
 */
export interface BackendDriver<T> {
  /** 读取当前值，没有则返回 `undefined` */
  read: () => Promise<unknown | undefined>
  /** 写入当前值，传 `undefined` 等价于删除 */
  write: (value: T) => Promise<void>
  /** 删除该 key 下的值 */
  remove: () => Promise<void>
  /** 监听其他上下文写入 —— 自身写入不能再次触发 */
  subscribe: (listener: (value: unknown) => void) => () => void
}

/**
 * 把 `(chrome storage onChanged payload)` 里和当前 key 相关的项整理成 raw。
 * chrome.storage 的 onChanged 是按 storageArea 分组，把 key → { oldValue, newValue }。
 */
function diffByKey(change: Record<string, { newValue?: unknown }>, key: string): unknown {
  return change[key]?.newValue
}

export function createChromeStorageDriver(key: string): BackendDriver<unknown> {
  return {
    async read() {
      const browser = (globalThis as { browser?: any }).browser
      if (!browser?.storage?.local)
        throw new Error('chrome storage 不可用 —— 请确认你在扩展上下文中调用')
      const got = await browser.storage.local.get(key)
      return got?.[key]
    },
    async write(value) {
      const browser = (globalThis as { browser?: any }).browser
      if (!browser?.storage?.local)
        throw new Error('chrome storage 不可用 —— 请确认你在扩展上下文中调用')
      await browser.storage.local.set({ [key]: value })
    },
    async remove() {
      const browser = (globalThis as { browser?: any }).browser
      if (!browser?.storage?.local)
        throw new Error('chrome storage 不可用 —— 请确认你在扩展上下文中调用')
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
 * 内存后端 —— 单元测试时用。`subscribe` 用 `EventTarget` 模拟，跨上下文
 * 同步当然是不存在的。
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
 * 工厂：按 backend 名字构造对应 driver。
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
      // IDB 异步加载 + 监听器实现都在 idb-backend.ts，避免与 idb 包耦合
      return createIndexedDbDriver(key, initialValue)
  }
}
