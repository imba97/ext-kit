import type { UserConfig } from 'vite'
import type { SharedExtensionConfig } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'

/**
 * Build an MV3-compatible single-entry IIFE config (background / content /
 * injected). The three public `define*Config` functions only differ in their
 * default `entryFileNames`; everything else — format, inline dynamic imports,
 * the `process.env.NODE_ENV` define, outDir, sourcemap — is shared.
 */
export interface IifeEntryOptions {
  entry: string
  outName: string
}

export function defineIifeEntry(
  shared: SharedExtensionConfig,
  opts: IifeEntryOptions
): UserConfig {
  const root = shared.rootDir
  return defineConfig({
    ...shared.userConfig,
    root,
    plugins: shared.plugins,
    define: {
      // Vite 8 does not write `process.env.NODE_ENV` by default under IIFE,
      // but background / content / injected code often branches on it for
      // dev-only logic — set it uniformly.
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
          entryFileNames: opts.outName,
          inlineDynamicImports: true
        }
      }
    }
  })
}
