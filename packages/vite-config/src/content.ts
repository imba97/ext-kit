import type { UserConfig } from 'vite'
import type { SharedExtensionConfig } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'

/**
 * 内容脚本入口 —— 普通 ESM，多 entry。
 *
 * 注意：Vite 在 Vite 8 之前对 `format: 'iife'` 的 content script 不会自动定义
 * `process.env.NODE_ENV`，需要手动 `define` 一下（见 background 配置）；
 * content 脚本如果也用了同一套条件逻辑，就一并补上。
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
