/**
 * Backend — decides whether data lives in `chrome.storage.local` or
 * `IndexedDB`.
 *
 * Selection rationale: see offer-hunter/docs/shared-extraction-analysis.md,
 * section "Route C".
 *
 *  - `chrome-storage`: the default. Cross-context sync is handled by the
 *    browser. Suitable for small KV (≤10MB).
 *  - `indexed-db`: large objects / binary. Available in MV3 service workers.
 *  - `memory`: pure tests / non-persistent scenarios.
 */
export type StorageBackend = 'chrome-storage' | 'indexed-db' | 'memory'

export interface DefineStorageOptions<T> {
  /** Backend, defaults to `chrome-storage`. */
  backend?: StorageBackend
  /** Business key — different businesses use different keys; avoid one big bucket. */
  key: string
  /** Default value — returned on first read or when parsing fails. */
  defaultValue: T
  /**
   * Parse a raw value (as written by the background) into the business object.
   *
   * Must be defensive: the background code may be newer than the page and
   * may produce shapes the current page cannot parse; on failure, fall back
   * to `defaultValue` rather than crashing the app.
   */
  normalize?: (raw: unknown) => T
  /**
   * Serialize the business object into a raw value before handing it to storage.
   *
   * `chrome.storage.local.set` accepts JSON-serializable values; this hook
   * mainly handles version stamping, migrations, and field pruning — the
   * caller implements the policy.
   */
  serialize?: (value: T) => unknown
}
