import type { UserConfig } from 'vite'
import type { SharedExtensionConfig, SharedExtensionOptions } from './types'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 通用扩展配置 —— background / content / injected 都从这里派生。
 *
 * 返回值不是完整的 vite config（缺 build / plugins），需要再走
 * `defineBackgroundConfig` / `defineContentScriptConfig` / `defineInjectedScriptConfig`
 * 各自装上 entries。
 *
 * 调用方应该：
 *
 *   export default defineBackgroundConfig(
 *     defineSharedConfig({ views: [...] }),
 *     { entry: 'background/main.ts', outName: 'background.js' },
 *   )
 *
 * 这样三个 entry 共享一套 alias / autoImport / unocss 配置，避免重复。
 */
export async function defineSharedConfig(opts: SharedExtensionOptions): Promise<SharedExtensionConfig> {
  const userConfig = opts.userConfig ?? {}
  const plugins: any[] = []
  const rootDir = userConfig.root ?? dirname(fileURLToPath(import.meta.url))

  if (opts.vue !== false) {
    // Vue 是常用项；调用方需要关闭时显式 vue:false
    if ((userConfig as any).vue) {
      plugins.push((userConfig as any).vue)
    }
    else {
      const mod = await import('@vitejs/plugin-vue')
      plugins.push((mod as any).default ?? mod)
    }
  }

  if (opts.unocss !== false) {
    // UnoCSS：业务模板基本都用了 wind3 + attributify + icons
    if ((userConfig as any).unocss) {
      plugins.push((userConfig as any).unocss)
    }
    else {
      const mod = await import('unocss/vite')
      plugins.push((mod as any).default ?? mod)
    }
  }

  return {
    rootDir,
    views: opts.views,
    plugins,
    unocss: opts.unocss !== false,
    vue: opts.vue !== false,
    userConfig
  }
}

/**
 * 给 vite config 加 alias —— ~ → src —— 两个下游都用了。
 */
export function withSrcAlias<T extends UserConfig>(config: T, srcDir = 'src'): T {
  const alias = (config.resolve?.alias ?? {}) as Record<string, string>
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...alias,
        '~': resolve(config.root ?? '.', srcDir)
      }
    }
  }
}
