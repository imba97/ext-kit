import type { Browser } from 'webextension-polyfill'
import { isEnvelope, makeBroadcast, makeRequest } from './envelope'

/**
 * 页面请求的处理函数。`data` 由各 handler 自己收窄。
 *
 * 抛错由 webextension-polyfill 转成 Error 抛回调用方，调用方 try/catch 照旧生效。
 */
export type BackgroundRequestHandler = (data: any) => unknown

export interface MessagingOptions {
  /**
   * 命名空间，必须全局唯一。
   *
   * 推荐使用项目名（如 `'offer-hunter'`、`'btools'`），浏览器扩展之间
   * runtime 消息是互通的，不加 namespace 会撞名。
   */
  namespace: string
}

export interface MessagingApi {
  /** 扩展页面 → 后台：发请求并等返回值 */
  callBackground: <T>(id: string, data?: unknown) => Promise<T>
  /** 后台：注册一批页面请求的处理函数（必须在 SW 顶层同步注册） */
  handleBackgroundRequests: (handlers: Record<string, BackgroundRequestHandler>) => void
  /** 后台 → 所有扩展页面：单向通知 */
  broadcastToPages: <T>(id: string, data?: T) => void
  /** 扩展页面：订阅后台广播，返回注销函数 */
  onPageBroadcast: <T>(id: string, callback: (data: T) => void) => () => void
}

/**
 * 构造一个命名空间隔离的消息通道。
 *
 * `browser` 来自 `webextension-polyfill`，由调用方注入。注入而非全局直接 `import`
 * 是为了：
 *  - 让本包能在测试里换 mock；
 *  - 让调用方决定要不要 polyfill；
 *  - 避免把 webextension-polyfill 引入到不需要的包。
 */
export function defineMessaging(opts: MessagingOptions): MessagingApi {
  const check = isEnvelope(opts.namespace)

  async function callBackground<T>(id: string, data?: unknown): Promise<T> {
    const message = makeRequest(opts.namespace, id, data)
    const browser = (globalThis as { browser?: Browser }).browser
    if (!browser)
      throw new Error('webextension-polyfill not available; call this from an extension context')
    const response = await browser.runtime.sendMessage(message) as T | undefined
    if (response === undefined)
      throw new Error(`后台没有响应「${id}」，请刷新页面或重新打开扩展页面后重试`)
    return response
  }

  function handleBackgroundRequests(handlers: Record<string, BackgroundRequestHandler>): void {
    const browser = (globalThis as { browser?: Browser }).browser
    if (!browser)
      throw new Error('webextension-polyfill not available; call this from an extension context')
    browser.runtime.onMessage.addListener((message: unknown) => {
      // 广播是单向通知，后台自己也会收到自己发的广播 —— 这里只处理请求
      if (!check(message) || message.kind !== 'request')
        return undefined

      const handler = handlers[message.id]
      if (!handler) {
        /*
          出现这个错误只有一种现实解释：**页面比后台新**。
          页面与后台是两个分开的构建产物，而且 MV3 的 service worker 不会跟着
          页面刷新一起换新 —— 页面按 F5 会重新读盘，SW 却要「重载扩展」才会换。
          症状因此很像 bug：界面上明明有某个按钮，点下去却说后台不认识它。
        */
        return Promise.reject(new Error(
          `后台没有注册消息：${message.id} —— 后台代码可能还是旧的，请到浏览器扩展管理页重新加载一次本扩展`
        ))
      }

      return Promise.resolve(handler(message.data))
    })
  }

  function broadcastToPages<T>(id: string, data?: T): void {
    const browser = (globalThis as { browser?: Browser }).browser
    if (!browser)
      return
    const message = makeBroadcast<T>(opts.namespace, id, data)
    browser.runtime.sendMessage(message).catch(() => {
      // 没有页面在听（侧边栏没打开）—— 推送本来就是尽力而为
    })
  }

  function onPageBroadcast<T>(id: string, callback: (data: T) => void): () => void {
    const browser = (globalThis as { browser?: Browser }).browser
    if (!browser)
      throw new Error('webextension-polyfill not available; call this from an extension context')
    const listener = (message: unknown): void => {
      if (check(message) && message.kind === 'broadcast' && message.id === id)
        callback(message.data as T)
    }
    browser.runtime.onMessage.addListener(listener)
    return () => browser.runtime.onMessage.removeListener(listener)
  }

  return {
    callBackground,
    handleBackgroundRequests,
    broadcastToPages,
    onPageBroadcast
  }
}
