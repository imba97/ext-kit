/**
 * 运行时环境判定 —— 仅依赖标准库，方便在 build-time 与 extension-runtime 复用。
 *
 * 这两个函数两个下游项目里 byte-identical：
 *  - offer-hunter/src/env.ts
 *  - btools-vitesse/src/env.ts
 */

export function isFirefox(): boolean {
  if (typeof globalThis === 'undefined')
    return false
  const ua = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent
  return typeof ua === 'string' && /firefox/i.test(ua)
}

/**
 * 不允许扩展运行的协议 / host —— chrome://、about:、file://、edge:// 等。
 *
 * 历史踩坑：直接 `!url.startsWith('http')` 漏掉 moz-extension:// 这类自身扩展页面，
 * `includes('://')` 同时排除了 file://、chrome://、edge://、about:。
 */
export function isForbiddenUrl(url: string): boolean {
  return url.startsWith('chrome://')
    || url.startsWith('chrome-search://')
    || url.startsWith('edge://')
    || url.startsWith('about:')
    || url.startsWith('moz-extension://')
    || url.startsWith('chrome-extension://')
    || url.startsWith('file://')
    || !url.includes('://')
}
