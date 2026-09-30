import type { Browser } from 'webextension-polyfill'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineMessaging, isEnvelope, makeBroadcast, makeRequest } from '../src/index'

type Listener = (msg: unknown) => any

interface MockBrowser {
  runtime: {
    sendMessage: ReturnType<typeof vi.fn>
    onMessage: {
      addListener: ReturnType<typeof vi.fn>
      removeListener: ReturnType<typeof vi.fn>
    }
  }
}

function createMockBrowser(): { browser: Browser, mock: MockBrowser } {
  const messageListeners = new Set<Listener>()

  const onMessageAdd = vi.fn((l: Listener) => {
    messageListeners.add(l)
  })
  const onMessageRemove = vi.fn((l: Listener) => {
    messageListeners.delete(l)
  })

  const sendMessage = vi.fn(async (msg: unknown) => {
    // 模拟后台：把请求路由到所有监听器，第一个返回非 undefined 的是响应
    for (const l of messageListeners) {
      const result = await l(msg)
      if (result !== undefined && !(result instanceof Promise && result === undefined))
        return result
    }
    return undefined
  })

  const mock: MockBrowser = {
    runtime: {
      sendMessage,
      onMessage: {
        addListener: onMessageAdd,
        removeListener: onMessageRemove
      }
    }
  }

  const browser = mock as unknown as Browser
  ;(globalThis as { browser?: Browser }).browser = browser

  return { browser, mock }
}

describe('messaging envelope', () => {
  it('isEnvelope matches by namespace only', () => {
    const check = isEnvelope('my-ext')
    expect(check({ namespace: 'my-ext', kind: 'request', id: 'a' })).toBe(true)
    expect(check({ namespace: 'other-ext', kind: 'request', id: 'a' })).toBe(false)
    expect(check(null)).toBe(false)
    expect(check('string')).toBe(false)
  })

  it('makeRequest / makeBroadcast produce correct shape', () => {
    expect(makeRequest('my-ext', 'foo', { a: 1 })).toEqual({
      namespace: 'my-ext',
      kind: 'request',
      id: 'foo',
      data: { a: 1 }
    })
    expect(makeBroadcast('my-ext', 'bar', 42)).toEqual({
      namespace: 'my-ext',
      kind: 'broadcast',
      id: 'bar',
      data: 42
    })
  })
})

describe('defineMessaging', () => {
  let mock: MockBrowser
  let browser: Browser

  beforeEach(() => {
    const m = createMockBrowser()
    mock = m.mock
    browser = m.browser
  })

  it('callBackground throws when no listener responds', async () => {
    const m = defineMessaging({ namespace: 'test' })
    await expect(m.callBackground('no-handler')).rejects.toThrow(/后台没有响应「no-handler」/)
  })

  it('callBackground returns the handler result', async () => {
    const m = defineMessaging({ namespace: 'test' })
    m.handleBackgroundRequests({
      echo: data => ({ echoed: data })
    })

    const result = await m.callBackground<{ echoed: { x: number } }>('echo', { x: 42 })
    expect(result).toEqual({ echoed: { x: 42 } })
  })

  it('handleBackgroundRequests rejects when id is unknown', async () => {
    const m = defineMessaging({ namespace: 'test' })
    m.handleBackgroundRequests({})

    await expect(m.callBackground('unknown')).rejects.toThrow(/后台没有注册消息：unknown/)
  })

  it('handleBackgroundRequests ignores messages from other namespaces', async () => {
    const m = defineMessaging({ namespace: 'test' })
    let called = false
    m.handleBackgroundRequests({
      foo: () => {
        called = true
        return 'ok'
      }
    })

    // 直接触发一个伪造消息：来自别的 namespace
    const listener = mock.runtime.onMessage.addListener.mock.calls[0]?.[0] as Listener
    if (listener) {
      const result = await listener({ namespace: 'other', kind: 'request', id: 'foo' })
      expect(result).toBeUndefined()
      expect(called).toBe(false)
    }
  })

  it('onPageBroadcast returns unsubscribe function', () => {
    const m = defineMessaging({ namespace: 'test' })
    const cb = vi.fn()
    const unsub = m.onPageBroadcast('news', cb)
    expect(mock.runtime.onMessage.addListener).toHaveBeenCalledTimes(1)

    unsub()
    expect(mock.runtime.onMessage.removeListener).toHaveBeenCalledTimes(1)
  })

  it('broadcastToPages is fire-and-forget', () => {
    const m = defineMessaging({ namespace: 'test' })
    // 没有监听器 —— 不应抛
    expect(() => m.broadcastToPages('news', { hi: 1 })).not.toThrow()
    return Promise.resolve() // 让 catch 跑完
  })

  it('onPageBroadcast invokes callback only on matching id', async () => {
    const m = defineMessaging({ namespace: 'test' })
    const cbA = vi.fn()
    const cbB = vi.fn()
    m.onPageBroadcast('a', cbA)
    m.onPageBroadcast('b', cbB)

    // 取出注册的两个 listener（最后一个是 handleBackgroundRequests 之前的 onPageBroadcast，
    // 因此按注册顺序取出 cbA 与 cbB 的 listener）
    const calls = mock.runtime.onMessage.addListener.mock.calls.map(c => c[0]) as Listener[]
    const listenerA = calls[calls.length - 2]
    const listenerB = calls[calls.length - 1]
    if (!listenerA || !listenerB)
      throw new Error('listeners not registered')

    listenerA(makeBroadcast('test', 'a', { x: 1 }))
    listenerB(makeBroadcast('test', 'b', { x: 2 }))
    listenerA(makeBroadcast('test', 'c', { x: 3 }))
    listenerA(makeBroadcast('other', 'a', { x: 4 }))

    expect(cbA).toHaveBeenCalledWith({ x: 1 })
    expect(cbB).toHaveBeenCalledWith({ x: 2 })
    expect(cbA).toHaveBeenCalledTimes(1)
    expect(cbB).toHaveBeenCalledTimes(1)
  })

  it('browser global is required', async () => {
    ;(globalThis as { browser?: Browser }).browser = undefined
    const m = defineMessaging({ namespace: 'test' })
    await expect(m.callBackground('foo')).rejects.toThrow(/webextension-polyfill not available/)
    ;(globalThis as { browser?: Browser }).browser = browser
  })
})
