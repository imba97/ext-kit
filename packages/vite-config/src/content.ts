import type { UserConfig } from 'vite'
import type { SharedExtensionConfig } from './types'
import { defineIifeEntry } from './define-iife-entry'

/**
 * Content script entry — IIFE format, single file.
 *
 * Note: Prior to Vite 8, content scripts emitted as `format: 'iife'` did not
 * have `process.env.NODE_ENV` defined automatically; you had to set it
 * manually via `define`. The shared IIFE builder handles that uniformly.
 */
export function defineContentScriptConfig(
  shared: SharedExtensionConfig,
  opts: { entry: string, outName?: string }
): UserConfig {
  return defineIifeEntry(shared, {
    entry: opts.entry,
    outName: opts.outName ?? 'content.js'
  })
}
