import type { UserConfig } from 'vite'
import type { SharedExtensionConfig } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'

/**
 * 注入到页面 MAIN world 的脚本 —— IIFE 格式。
 *
 * 与 content 的差别：
 *
 *  - MAIN world 里 `window.chrome` 不存在，必须挂载到 IIFE 的局部变量上。
 *  - 任何对 `chrome.*` 的访问都要走 import 进来的 webextension-polyfill
 *    或者 page world 中转 —— 这里只负责打包形态。
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
