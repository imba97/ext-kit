import type { DefineStorageOptions } from './types'
import { computed, ref } from 'vue'
import { createBackendDriver } from './backends'

/**
 * 响应式跨上下文存储。
 *
 * 用法：
 *
 * ```ts
 * // background.ts
 * const records = defineStorage<MyType>({
 *   key: 'records',
 *   defaultValue: [],
 *   backend: 'indexed-db',
 * })
 * await records.ready()
 *
 * // sidepanel.vue
 * const records = defineStorage<MyType>({ key: 'records', defaultValue: [] })
 * await records.ready()
 * // records.value 在另一处被改时，这里会自动更新
 * ```
 *
 * 关于跨上下文同步：
 *
 *  - `chrome-storage` 后端：浏览器原生 `storage.onChanged`，自动同步。
 *  - `indexed-db` 后端：自己用 `BroadcastChannel` 拼，跨标签页生效；
 *    注意 service worker 里 BroadcastChannel 不能传值给扩展页面，扩展页面
 *    之间靠它同步没问题。
 *  - `memory` 后端：仅单上下文。
 *
 * 跨 SW 与扩展页面的同步如果用 messaging 包会复杂得多（要挂 onPageBroadcast），
 * 这里优先用浏览器原生通道。
 */
export interface StorageApi<T> {
  /** 当前快照 —— reactive ref */
  readonly value: ReturnType<typeof ref<T>>
  /** 首次加载完成的 promise —— 在调用方 `await` 之前 .value 可能是默认值 */
  ready: () => Promise<void>
  /** 写入 —— 同步生效，并通过后端向其他上下文推送 */
  set: (next: T) => Promise<void>
  /** 显式重置为 defaultValue */
  reset: () => Promise<void>
}

export function defineStorage<T>(opts: DefineStorageOptions<T>): StorageApi<T> {
  const backend = opts.backend ?? 'chrome-storage'
  const driver = createBackendDriver(backend, opts.key, opts.defaultValue)

  const state = ref<T>(opts.defaultValue)
  let initialized = false
  let initPromise: Promise<void> | undefined

  function applyRaw(raw: unknown): void {
    applySerialized(raw)
  }

  async function doSet(next: T): Promise<void> {
    const serialized = opts.serialize ? opts.serialize(next) : next
    state.value = next
    await driver.write(serialized)
  }

  function applySerialized(raw: unknown): void {
    // 如果调用方传了 serialize，相当于写出去是 raw，读回来时也得解析回去
    if (opts.serialize && opts.normalize) {
      try {
        state.value = opts.normalize(raw)
        return
      }
      catch {
        state.value = opts.defaultValue
        return
      }
    }
    if (opts.normalize) {
      try {
        state.value = opts.normalize(raw)
        return
      }
      catch {
        state.value = opts.defaultValue
        return
      }
    }
    state.value = raw === undefined ? opts.defaultValue : (raw as T)
  }

  const api: StorageApi<T> = {
    value: state,
    ready() {
      if (initialized)
        return Promise.resolve()
      if (!initPromise) {
        initPromise = (async () => {
          const raw = await driver.read()
          applyRaw(raw)
          // 订阅其他上下文的写入
          driver.subscribe((rawValue) => {
            // 内存后端：避免自身写入触发回环
            // chrome / idb 后端：浏览器原生通道不会回环
            if (backend === 'memory' && rawValue === state.value)
              return
            applyRaw(rawValue)
          })
          initialized = true
        })()
      }
      return initPromise
    },
    async set(next) {
      await doSet(next)
    },
    async reset() {
      await doSet(opts.defaultValue)
    }
  }

  // computed 兼容 —— 给老代码一个 getter 的便捷写法
  // 用 Proxy 包一层，外部访问 api.value 走的是 ref 的语义（用 .value 拿快照）
  // 这里不重写，保持显式 .value 调用以免和 ref 的解构行为混淆

  return api
}

/**
 * 给一个 storage 配 computed —— 配合 Pinia / 模板里 `:value="records.value.x"` 用。
 */
export function withComputed<T, R>(storage: StorageApi<T>, getter: (v: T) => R) {
  return computed(() => getter(storage.value.value as T))
}
