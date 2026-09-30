import type { UserConfig } from 'vite'

/**
 * 「页面 view」—— 侧边栏 / 弹窗 / 设置页 / 任意一个打开的独立页面。
 *
 * 之所以单独抽出来：viteserve 通过一个 html 模板承载多个 view，靠 manifest 里的
 * `chrome_url_overrides.newtab` 等字段决定该 html 在哪里被打开。
 */
export interface ExtensionView {
  /** 唯一 id，用于 vite `input` 字段 */
  name: string
  /** 相对于 src/ 的入口，例如 `sidepanel/main.ts` */
  entry: string
  /** 相对于根目录的 html 模板，例如 `sidepanel/index.html` */
  html: string
  /** 该 view 的 SPA 路由 hash 锚点 —— 用于无 history 路由时定位 */
  hash?: string
}

export interface SharedExtensionOptions {
  /** 业务 views（侧边栏 / 弹窗 / 设置页 / ...） */
  views: ExtensionView[]
  /**
   * UnoCSS 自动按需收集；开启后 `extraContentDirs` 与 `views` 内的 entry 都
   * 会纳入扫描。
   */
  unocss?: boolean
  /** 是否启用 Vue —— extension view 几乎都是 vue，不开 vue 用不上 */
  vue?: boolean
  /** 自定义 alias / plugin，由调用方合并进 vite config */
  userConfig?: UserConfig
}

/**
 * 把绝对路径解析成相对 import.meta.url 的路径，
 * 方便在 package 内 import 其他工程文件。
 */
export interface SharedExtensionConfig {
  rootDir: string
  views: ExtensionView[]
  plugins: any[]
  unocss: boolean
  vue: boolean
  userConfig: UserConfig
}
