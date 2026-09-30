/**
 * "Site adapter" skeleton — the scraping implementations for Boss / EleDuck /
 * V2EX in offer-hunter and the sites in btools-vitesse all conform to this shape.
 *
 * Motivation: the abstractions on both sides are nearly identical; pulling out
 * the skeleton lets each site fill in just the implementation instead of
 * rewriting the declaration.
 */

export interface SiteMatcher {
  /** Site host, e.g. `www.zhipin.com` */
  host: string | RegExp
  /** Further match path / querystring; omit to match on host alone */
  pathPattern?: RegExp
}

export interface SiteDescriptor {
  id: string
  /** Display name, e.g. "Boss Zhipin" / "LinkedIn" */
  name: string
  matcher: SiteMatcher
  /**
   * Default scrape entry — called by the content script after a successful match.
   * Returns the structured data to write into storage.
   */
  scrape: () => unknown | Promise<unknown>
  /**
   * Render scraped results into form fields — field names differ wildly
   * between sites, so callers implement this. Typically a pure
   * "structured data → form state" mapping.
   */
  toForm?: (data: unknown) => Record<string, unknown>
}

/**
 * Type-friendly factory — callers do not have to write `as SiteDescriptor`.
 */
export function defineSiteAdapter<T>(spec: SiteDescriptor & { scrape: () => T | Promise<T> }): SiteDescriptor {
  return spec
}
