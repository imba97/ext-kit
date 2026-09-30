/**
 * "External data source" skeleton — derived from the ResumeSource abstraction
 * in offer-hunter.
 *
 * Common implementations: gist / paste / local file / remote API.
 * Each source is responsible for normalizing external data into the unified
 * Resume shape, after which the storage layer takes over.
 */

export interface ExternalSourceFetchResult<TData> {
  /** Raw data; consumed by reconciliation. */
  data: TData
  /** Source metadata — timestamp / author / hash etc., for caching and conflict resolution. */
  meta: Record<string, unknown>
}

export interface ExternalSourceDescriptor<TConfig, TData> {
  id: string
  /** Display name */
  name: string
  /** Short description shown in the UI */
  description?: string
  /** Default config — used by the UI as the form initial value */
  defaultConfig: TConfig
  /** Fetch the latest data */
  fetch: (config: TConfig) => Promise<ExternalSourceFetchResult<TData>>
  /**
   * Normalize external data into the unified Resume shape — decides field
   * ownership, merging, and what to drop.
   */
  normalize?: (data: TData, config: TConfig) => unknown
  /**
   * Validate the config — e.g. gist mode requires a non-empty token.
   * Used by the UI to disable the fetch button and by the background to
   * reject requests.
   */
  validate?: (config: TConfig) => true | string
}

export function defineExternalSource<TConfig, TData>(
  spec: ExternalSourceDescriptor<TConfig, TData>
): ExternalSourceDescriptor<TConfig, TData> {
  return spec
}
