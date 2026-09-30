import type { Plugin, UserConfig } from 'vite'
import type { ExtensionView, SharedExtensionConfig } from './types'
import { resolve } from 'node:path'
import process from 'node:process'

/**
 * Translate views into vite multi-page entries, and inject the dev HMR
 * `<script type="module" src="/@vite/client">` into every view — vite only
 * adds the vite client to the root `index.html` by default, so other html
 * files in a multi-page setup miss HMR.
 *
 * Implementation: a small `transformIndexHtml` plugin. Vite already supports
 * `build.rollupOptions.input = { name: 'path/to/index.html' }`, so we don't
 * need to copy html templates — this plugin only adds the HMR client and
 * minor `<meta>` patches.
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
        // Inject right before </head>.
        return html.replace('</head>', `${client}\n</head>`)
      }
    }
  }
}

/**
 * Attach the views entries to a shared config — call
 * `defineConfig(buildExtensionViews(shared))` to get a complete vite config
 * that runs multiple pages.
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
