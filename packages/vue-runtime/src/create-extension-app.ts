import type { Component } from 'vue'
import { createApp } from 'vue'
import { setupApp } from './setup-app'

/**
 * Build a Vue app and mount it into a given DOM node.
 *
 * Usage:
 *
 * ```ts
 * // sidepanel/main.ts
 * import App from './Sidepanel.vue'
 * createExtensionApp({
 *   rootComponent: App,
 *   mountTarget: '#app',
 * })
 * ```
 *
 * Note: extension pages usually mount into a `<div id="app"></div>` in the
 * sidepanel / popup / options page. Unlike a normal SPA, an MV3 page does
 * not always have a fully formed `document.documentElement`, so we don't
 * rely on it.
 */
export interface CreateExtensionAppOptions {
  rootComponent: Component
  /** DOM selector; defaults to `#app`. */
  mountTarget?: string
  /** Side-effect hook forwarded to `setupApp` — Pinia / router / telemetry / ... */
  setup?: (app: ReturnType<typeof createApp>) => void | Promise<void>
}

export async function createExtensionApp(opts: CreateExtensionAppOptions): Promise<void> {
  const app = createApp(opts.rootComponent)
  await setupApp({ app, extraSetup: opts.setup })
  app.mount(opts.mountTarget ?? '#app')
}
