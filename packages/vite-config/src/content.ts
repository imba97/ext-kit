import type { UserConfig } from 'vite'
import type { SharedExtensionConfig } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'

/**
 * Content script entry — regular ESM, multi-entry.
 *
 * Note: Prior to Vite 8, content scripts emitted as `format: 'iife'` did not
 * have `process.env.NODE_ENV` defined automatically; you had to set it
 * manually via `define` (see the background config). If your content
 * script uses the same conditional logic, add the define here too.
 */
export function defineContentScriptConfig(
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
          entryFileNames: opts.outName ?? 'content.js',
          inlineDynamicImports: true
        }
      }
    }
  })
}
