import type { Ref } from 'vue'
import type { DefineStorageOptions } from './types'
import { computed, ref } from 'vue'
import { createBackendDriver } from './backends'

/**
 * Reactive cross-context storage.
 *
 * Usage:
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
 * // records.value updates automatically when changed elsewhere
 * ```
 *
 * Cross-context sync:
 *
 *  - `chrome-storage` backend: the browser's native `storage.onChanged`
 *    handles sync automatically.
 *  - `indexed-db` backend: assembled manually with `BroadcastChannel`;
 *    works across tabs. Note that inside a service worker, BroadcastChannel
 *    cannot reach extension pages, but extension pages can still sync
 *    between themselves.
 *  - `memory` backend: single context only.
 *
 * Cross-SW/extension-page sync via the messaging package would be much more
 * involved (requires hooking `onPageBroadcast`), so we prefer the browser's
 * native channels here.
 */
export interface StorageApi<T> {
  /** Current snapshot — a reactive ref. May be `undefined` until `ready()` resolves on a missing key. */
  readonly value: Ref<T | undefined>
  /** Promise that resolves after first load completes. Until awaited, `.value` may still be the default. */
  ready: () => Promise<void>
  /** Write — applies locally and broadcasts to other contexts via the backend. */
  set: (next: T) => Promise<void>
  /** Explicitly reset to defaultValue. */
  reset: () => Promise<void>
}

export function defineStorage<T>(opts: DefineStorageOptions<T>): StorageApi<T> {
  const backend = opts.backend ?? 'chrome-storage'
  const driver = createBackendDriver(backend, opts.key, opts.defaultValue)

  // Vue's `ref<T | undefined>(...)` returns `Ref<UnwrapRef<T | undefined> | undefined>`,
  // which is structurally wider than `Ref<T | undefined>` for generic `T`
  // (UnwrapRef can collapse nested refs / unwrap Promises). We want a plain
  // `Ref<T | undefined>` for the public API, so we cast the storage cell.
  const state = ref<T | undefined>(opts.defaultValue) as Ref<T | undefined>
  let initialized = false
  let initPromise: Promise<void> | undefined

  async function doSet(next: T): Promise<void> {
    const serialized = opts.serialize ? opts.serialize(next) : next
    state.value = next
    await driver.write(serialized)
  }

  /**
   * Apply a raw value (as it sits in storage) to the reactive state.
   *
   * The browser may have older code than the page (MV3 SW does not refresh
   * alongside a page reload), so normalize must be defensive — on parse
   * failure we fall back to `defaultValue` rather than crash the app.
   */
  function applyRaw(raw: unknown): void {
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
          // Subscribe to writes from other contexts.
          driver.subscribe((rawValue) => {
            // Memory backend: avoid echo loops from our own writes.
            // chrome / idb backends: native channels do not echo.
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

  // computed compatibility — a convenience for code that prefers a getter.
  // We do NOT wrap `api.value` in a Proxy; keeping the explicit `.value`
  // access avoids surprising behavior when destructuring refs.

  return api
}

/**
 * Build a `computed` view of a storage — useful with Pinia or in templates
 * such as `:value="records.value.x"`.
 */
export function withComputed<T, R>(storage: StorageApi<T>, getter: (v: T | undefined) => R) {
  return computed(() => getter(storage.value.value))
}
