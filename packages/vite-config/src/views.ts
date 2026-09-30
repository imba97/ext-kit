import type { Plugin, UserConfig } from 'vite'
import type { ExtensionView, SharedExtensionConfig } from './types'
import { resolve } from 'node:path'
import process from 'node:process'

/**
 * 把 views 翻译成 vite 的 multi-page entries，并给每个 view 注入 dev HMR 用的
 * `<script type="module" src="/@vite/client">` —— 因为 vite 默认只在根 index.html
 * 加 vite client，多页面时其他 html 没有 HMR。
 *
 * 实现：返回一个简单的 `transformIndexHtml` 插件。Vite 自身已经支持
 * `build.rollupOptions.input = { name: 'path/to/index.html' }`，不需要再做 html
 * 模板的拷贝；这里只补 HMR client 和 `<meta>` 之类的小修补。
 */
export function extensionViewsPlugin(views: ExtensionView[]): Plugin {
  return {
    name: 'ext-kit:extension-views',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const view = views.find(v => resolve(v.html) === ctx.filename || ctx.filename.endsWith(v.html))
        if (!view)
          return html
        const client = process.env.NODE_ENV !== 'production'
          ? '<script type="module" src="/@vite/client"></script>'
          : ''
        // 注入在 </head> 前
        return html.replace('</head>', `${client}\n</head>`)
      }
    }
  }
}

/**
 * 给 shared config 装上 views 入口 —— 业务调 `defineConfig(buildExtensionViews(shared))`
 * 即可得到一份能跑多页面的完整 vite config。
 */
export function buildExtensionViews(shared: SharedExtensionConfig): UserConfig {
  return {
    root: shared.rootDir,
    plugins: [...shared.plugins, extensionViewsPlugin(shared.views)],
    build: {
      outDir: resolve(shared.rootDir, 'extension'),
      emptyOutDir: false,
      rollupOptions: {
        input: Object.fromEntries(
          shared.views.map(v => [v.name, resolve(shared.rootDir, v.html)])
        )
      }
    }
  }
}
