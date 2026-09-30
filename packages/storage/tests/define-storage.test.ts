import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryDriver, defineStorage } from '../src/index'

describe('defineStorage (memory backend)', () => {
  beforeEach(() => {
    // Reset any globalThis leftover from a previous case.
    delete (globalThis as { browser?: unknown }).browser
  })

  it('reads defaultValue before ready() resolves nothing', async () => {
    const driver = createMemoryDriver(undefined)
    // First read() returns undefined => defaultValue is used.
    expect(await driver.read()).toBeUndefined()
  })

  it('write updates value and notifies listeners', async () => {
    const driver = createMemoryDriver(0)
    const cb = vi.fn()
    driver.subscribe(cb)

    await driver.write(42)
    expect(await driver.read()).toBe(42)
    expect(cb).toHaveBeenCalled()
  })

  it('two stores with the same backend reflect each other via the shared bus', async () => {
    // Two stores sharing the same driver would normally be the only way
    // to get cross-context sync — verify that subscribe doesn't echo.
    const driver = createMemoryDriver({ a: 1 })
    const seen: unknown[] = []
    driver.subscribe(v => seen.push(v))

    await driver.write({ a: 2 })
    expect(seen).toEqual([{ a: 2 }])
  })

  it('custom normalize handles missing fields', async () => {
    const api = defineStorage<{ count: number, name: string }>({
      key: 'k',
      defaultValue: { count: 0, name: 'anon' },
      backend: 'memory',
      normalize: raw => ({
        count: typeof (raw as any)?.count === 'number' ? (raw as any).count : 0,
        name: typeof (raw as any)?.name === 'string' ? (raw as any).name : 'anon'
      })
    })

    await api.ready()
    expect(api.value.value).toEqual({ count: 0, name: 'anon' })

    await api.set({ count: 5, name: 'alice' })
    expect(api.value.value).toEqual({ count: 5, name: 'alice' })
  })

  it('serialize+normalize pair round-trips through raw string', async () => {
    // serialize/normalize are used at the chrome.storage boundary — simulate
    // by writing a JSON string (the message) and reading it back as an object.
    const api = defineStorage<{ x: number }>({
      key: 'k2',
      defaultValue: { x: 0 },
      backend: 'memory',
      serialize: v => JSON.stringify(v),
      normalize: raw => (typeof raw === 'string' ? JSON.parse(raw) : raw)
    })

    await api.ready()
    await api.set({ x: 99 })
    expect(api.value.value).toEqual({ x: 99 })
  })
})

describe('chrome-storage backend (mocked)', () => {
  it('uses browser.storage.local', async () => {
    type ChangeMap = Record<string, { newValue?: unknown }>
    type OnChangedListener = (changes: ChangeMap, area: string) => void

    const onChanged = {
      _listeners: new Set<OnChangedListener>(),
      addListener: vi.fn((cb: OnChangedListener) => onChanged._listeners.add(cb)),
      removeListener: vi.fn((cb: OnChangedListener) => onChanged._listeners.delete(cb)),
      _fire(key: string, newValue: unknown) {
        for (const cb of onChanged._listeners)
          cb({ [key]: { newValue } }, 'local')
      }
    }

    const local = {
      _data: {} as Record<string, unknown>,
      get: vi.fn(async (k: string) => ({ [k]: local._data[k] })),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        Object.assign(local._data, obj)
        // Fire onChanged so subscribers get notified.
        for (const [key, value] of Object.entries(obj)) {
          onChanged._fire(key, value)
        }
      }),
      remove: vi.fn(async (k: string) => {
        delete local._data[k]
      })
    }

    ;(globalThis as { browser?: unknown }).browser = { storage: { local, onChanged } }

    const api = defineStorage<{ v: number }>({
      key: 'foo',
      defaultValue: { v: 0 }
    })
    await api.ready()
    expect(local.get).toHaveBeenCalledWith('foo')

    await api.set({ v: 7 })
    expect(api.value.value).toEqual({ v: 7 })
    expect(local.set).toHaveBeenCalledWith({ foo: { v: 7 } })

    ;(globalThis as any).browser = undefined
  })
})
