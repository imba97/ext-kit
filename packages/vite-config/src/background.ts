import type { UserConfig } from 'vite'
import type { SharedExtensionConfig } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'

/**
 * 后台入口（service worker）—— IIFE 格式、单文件。
 *
 * 注意：MV3 的 service worker 必须 IIFE 输出，esbuild / rollup 都默认 ESM，
 * 这里要显式 format:'iife' + inlineDynamicImports。
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
      // Vite 8 在 IIFE 下默认不写 process.env.NODE_ENV，但 background
      // 经常引用它做 dev-only 分支 —— 显式定义。
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
