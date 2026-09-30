import type { Component } from 'vue'
import { createApp } from 'vue'
import { setupApp } from './setup-app'

/**
 * 构造一个挂载到指定 DOM 节点的 Vue 应用。
 *
 * 用法：
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
 * 注意：扩展页面的挂载点通常是侧边栏 / 弹窗 / 设置页 `<div id="app"></div>`，
 * MV3 页面不像普通 SPA 那样有完整 document，所以不依赖 document.documentElement。
 */
export interface CreateExtensionAppOptions {
  rootComponent: Component
  /** DOM 选择器；默认 `#app` */
  mountTarget?: string
  /** 传给 `setupApp` 的副作用钩子 —— Pinia / router / 等 */
  setup?: (app: ReturnType<typeof createApp>) => void | Promise<void>
}

export async function createExtensionApp(opts: CreateExtensionAppOptions): Promise<void> {
  const app = createApp(opts.rootComponent)
  await setupApp({ app, extraSetup: opts.setup })
  app.mount(opts.mountTarget ?? '#app')
}
