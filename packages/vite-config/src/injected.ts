import type { UserConfig } from 'vite'
import type { SharedExtensionConfig } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'

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
  const root = shared.rootDir
  return defineConfig({
    ...shared.userConfig,
    root,
    plugins: shared.plugins,
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      ...(shared.userConfig.define as Record<string, string> | undefined)
    },
    build: {
      target: 'esnext',
      minify: false,
      sourcemap: !!process.env.NODE_ENV && process.env.NODE_ENV !== 'production',
      outDir: resolve(root, 'extension'),
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(root, opts.entry),
        output: {
          format: 'iife',
          entryFileNames: opts.outName ?? 'injected.js',
          inlineDynamicImports: true
        }
      }
    }
  })
}
