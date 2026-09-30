import type { UserConfig } from 'vite'
import type { SharedExtensionConfig, SharedExtensionOptions } from './types'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Shared extension config — background / content / injected all derive from it.
 *
 * The return value is NOT a complete vite config (it lacks `build`/`plugins`
 * glue); call `defineBackgroundConfig` / `defineContentScriptConfig` /
 * `defineInjectedScriptConfig` to attach the actual entries.
 *
 * Typical caller pattern:
 *
 *   export default defineBackgroundConfig(
 *     defineSharedConfig({ views: [...] }),
 *     { entry: 'background/main.ts', outName: 'background.js' },
 *   )
 *
 * This way the three entries share the same alias / autoImport / unocss
 * configuration instead of duplicating it.
 */
export async function defineSharedConfig(opts: SharedExtensionOptions): Promise<SharedExtensionConfig> {
  const userConfig = opts.userConfig ?? {}
  const plugins: any[] = []
  const rootDir = userConfig.root ?? dirname(fileURLToPath(import.meta.url))

  if (opts.vue !== false) {
    // Vue is the common case; opt out explicitly with `vue: false`.
    if ((userConfig as any).vue) {
      plugins.push((userConfig as any).vue)
    }
    else {
      const mod = await import('@vitejs/plugin-vue')
      plugins.push((mod as any).default ?? mod)
    }
  }

  if (opts.unocss !== false) {
    // UnoCSS — downstream templates almost all use wind3 + attributify + icons.
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
 * Add the `~` → `src` alias to a vite config — both downstream projects use it.
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
