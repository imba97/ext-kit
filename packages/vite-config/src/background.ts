import type { UserConfig } from 'vite'
import type { SharedExtensionConfig } from './types'
import { defineIifeEntry } from './define-iife-entry'

/**
 * Background entry (service worker) — IIFE format, single file.
 *
 * Note: MV3 service workers MUST be IIFE output. esbuild/rollup default to
 * ESM, so `format: 'iife'` and `inlineDynamicImports` are set by the shared
 * IIFE builder.
 */
export function defineBackgroundConfig(
  shared: SharedExtensionConfig,
  opts: { entry: string, outName?: string }
): UserConfig {
  return defineIifeEntry(shared, {
    entry: opts.entry,
    outName: opts.outName ?? 'background.js'
  })
}
