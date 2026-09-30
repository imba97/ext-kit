import type { UserConfig } from 'vite'
import type { SharedExtensionConfig } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'

/**
 * Background entry (service worker) — IIFE format, single file.
 *
 * Note: MV3 service workers MUST be IIFE output. esbuild/rollup default to
 * ESM, so we must explicitly set `format: 'iife'` and
 * `inlineDynamicImports` here.
 */
export function defineBackgroundConfig(
  shared: SharedExtensionConfig,
  opts: { entry: string, outName?: string }
): UserConfig {
  const root = shared.rootDir
  return defineConfig({
    ...shared.userConfig,
    root,
    plugins: shared.plugins,
    define: {
      // Vite 8 does not write `process.env.NODE_ENV` by default under IIFE,
      // but background code often branches on it for dev-only logic — set
      // it explicitly.
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
          entryFileNames: opts.outName ?? 'background.js',
          inlineDynamicImports: true
        }
      }
    }
  })
}
