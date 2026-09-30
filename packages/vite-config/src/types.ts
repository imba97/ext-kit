import type { UserConfig } from 'vite'

/**
 * "Page view" — sidepanel / popup / options page / any other standalone
 * page that the extension can open.
 *
 * Why we have this concept: vitesse-style serving uses a single html template
 * to host multiple views, and the manifest's `chrome_url_overrides.newtab`
 * (and similar) decides where that html is opened.
 */
export interface ExtensionView {
  /** Unique id, used as the key for vite's `input` field. */
  name: string
  /** Entry relative to `src/`, e.g. `sidepanel/main.ts`. */
  entry: string
  /** HTML template relative to project root, e.g. `sidepanel/index.html`. */
  html: string
  /** SPA hash anchor for this view — used to route when there is no history API. */
  hash?: string
}

export interface SharedExtensionOptions {
  /** Business views (sidepanel / popup / options / ...). */
  views: ExtensionView[]
  /**
   * Whether UnoCSS auto-collects on demand; when enabled, `extraContentDirs`
   * and the entries inside `views` are scanned.
   */
  unocss?: boolean
  /** Whether to enable Vue — extension views are almost always Vue, so this is rarely disabled. */
  vue?: boolean
  /** Custom aliases / plugins, merged into the vite config by the caller. */
  userConfig?: UserConfig
}

/**
 * Resolve an absolute path into a path relative to `import.meta.url`,
 * so a package can `import` other project files.
 */
export interface SharedExtensionConfig {
  rootDir: string
  views: ExtensionView[]
  plugins: any[]
  unocss: boolean
  vue: boolean
  userConfig: UserConfig
}
