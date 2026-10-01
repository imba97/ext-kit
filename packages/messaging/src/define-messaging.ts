import type { Browser } from 'webextension-polyfill'
import { isEnvelope, makeBroadcast, makeRequest } from './envelope'

/**
 * Handler for page requests. `data` is narrowed by each handler.
 *
 * Errors thrown here are wrapped into a real Error by webextension-polyfill
 * and surface back to the caller, so existing try/catch keeps working.
 */
export type BackgroundRequestHandler = (data: any) => unknown

/**
 * Resolve the injected `browser` global. Centralizes the `globalThis` cast
 * that every messaging call site would otherwise repeat.
 *
 * `optional: true` lets `broadcastToPages` stay best-effort: if no browser
 * is available (e.g. the script ran outside an extension context), it
 * silently no-ops instead of throwing. The other three entry points keep
 * the strict "throw if no browser" semantics — they cannot be useful
 * without a real channel.
 */
function getBrowser(optional = false): Browser | undefined {
  const browser = (globalThis as { browser?: Browser }).browser
  if (!browser && !optional)
    throw new Error('webextension-polyfill not available; call this from an extension context')
  return browser
}

export interface MessagingOptions {
  /**
   * Namespace — must be globally unique.
   *
   * Recommended to use the project name (e.g. `'offer-hunter'`, `'btools'`).
   * Browser extensions share the runtime message channel; without a
   * namespace, messages from other extensions will collide with yours.
   */
  namespace: string
}

export interface MessagingApi {
  /** Extension page → background: send a request and await its return value. */
  callBackground: <T>(id: string, data?: unknown) => Promise<T>
  /** Background: register a batch of page request handlers (must run synchronously at the top level of the SW). */
  handleBackgroundRequests: (handlers: Record<string, BackgroundRequestHandler>) => void
  /** Background → all extension pages: one-way notification. */
  broadcastToPages: <T>(id: string, data?: T) => void
  /** Extension page: subscribe to background broadcasts; returns an unsubscribe function. */
  onPageBroadcast: <T>(id: string, callback: (data: T) => void) => () => void
}

/**
 * Build a namespace-isolated messaging channel.
 *
 * `browser` comes from `webextension-polyfill` and is injected by the caller.
 * Injection (rather than a global `import`) is intentional:
 *  - lets this package swap in mocks during testing;
 *  - lets the caller decide whether to polyfill at all;
 *  - keeps webextension-polyfill out of consumers that don't need it.
 */
export function defineMessaging(opts: MessagingOptions): MessagingApi {
  const check = isEnvelope(opts.namespace)

  async function callBackground<T>(id: string, data?: unknown): Promise<T> {
    const message = makeRequest(opts.namespace, id, data)
    const browser = getBrowser()
    const response = await browser!.runtime.sendMessage(message) as T | undefined
    if (response === undefined)
      throw new Error(`Background did not respond to "${id}" — try refreshing the page or reopening the extension view`)
    return response
  }

  function handleBackgroundRequests(handlers: Record<string, BackgroundRequestHandler>): void {
    const browser = getBrowser()
    browser!.runtime.onMessage.addListener((message: unknown) => {
      // Broadcasts are one-way; the background also receives its own broadcasts.
      // Only handle requests here.
      if (!check(message) || message.kind !== 'request')
        return undefined

      const handler = handlers[message.id]
      if (!handler) {
        /*
          This error has exactly one real-world explanation: **the page is newer
          than the background**. Pages and the background are two separate build
          artifacts, and the MV3 service worker does not refresh together with a
          page reload — pressing F5 reloads the page, but the SW only changes
          when you "Reload extension" on the extensions page. The symptom looks
          a lot like a bug: a button is clearly there in the UI, yet clicking it
          says the background doesn't know about it.
        */
        return Promise.reject(new Error(
          `Background has no handler for "${message.id}" — the background code may be stale; please reload the extension from the browser's extensions page`
        ))
      }

      return Promise.resolve(handler(message.data))
    })
  }

  function broadcastToPages<T>(id: string, data?: T): void {
    const browser = getBrowser(true)
    if (!browser)
      return
    const message = makeBroadcast<T>(opts.namespace, id, data)
    browser.runtime.sendMessage(message).catch(() => {
      // No page is listening (e.g. sidepanel is closed) — broadcasting is best-effort.
    })
  }

  function onPageBroadcast<T>(id: string, callback: (data: T) => void): () => void {
    const browser = getBrowser()
    const listener = (message: unknown): void => {
      if (check(message) && message.kind === 'broadcast' && message.id === id)
        callback(message.data as T)
    }
    browser!.runtime.onMessage.addListener(listener)
    return () => browser!.runtime.onMessage.removeListener(listener)
  }

  return {
    callBackground,
    handleBackgroundRequests,
    broadcastToPages,
    onPageBroadcast
  }
}
