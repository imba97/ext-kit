/**
 * Runtime environment detection — only depends on standard globals, so the
 * same code can run at build time and inside the extension runtime.
 *
 * These two functions are byte-identical in both downstream projects:
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
 * Protocols / hosts where the extension must not run — chrome://, about:,
 * file://, edge://, etc.
 *
 * Historical pitfall: a naive `!url.startsWith('http')` misses schemes like
 * `moz-extension://` (the extension's own pages); `includes('://')` together
 * with the explicit scheme list covers file://, chrome://, edge://, about:.
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
