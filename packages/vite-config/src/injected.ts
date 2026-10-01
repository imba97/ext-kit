import type { UserConfig } from 'vite'
import type { SharedExtensionConfig } from './types'
import { defineIifeEntry } from './define-iife-entry'

/**
 * Script injected into the page's MAIN world — IIFE format.
 *
 * Differences from the content script:
 *
 *  - In the MAIN world `window.chrome` does not exist; it must be exposed
 *    via an IIFE local variable.
 *  - Any `chrome.*` access has to go through the imported
 *    webextension-polyfill or be relayed from the page world — this file
 *    only takes care of the bundling shape.
 */
export function defineInjectedScriptConfig(
  shared: SharedExtensionConfig,
  opts: { entry: string, outName?: string }
): UserConfig {
  return defineIifeEntry(shared, {
    entry: opts.entry,
    outName: opts.outName ?? 'injected.js'
  })
}
