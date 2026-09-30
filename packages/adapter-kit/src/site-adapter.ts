/**
 * 「站点适配器」骨架 —— offer-hunter 的 Boss / EleDuck / V2EX 与 btools-vitesse 的
 * 站点抓取实现都符合这套结构。
 *
 * 设计动机：两边抽象形态几乎一致；抽出骨架让每个站点只填实现、不重写声明。
 */

export interface SiteMatcher {
  /** 站点 host，例如 `www.zhipin.com` */
  host: string | RegExp
  /** 进一步匹配 path / querystring；不传表示匹配 host 即可 */
  pathPattern?: RegExp
}

export interface SiteDescriptor {
  id: string
  /** 展示名，例如「Boss直聘」 */
  name: string
  matcher: SiteMatcher
  /**
   * 默认的抓取入口 —— 由 content script 在匹配成功后调用。
   * 返回要写入 storage 的结构化数据。
   */
  scrape: () => unknown | Promise<unknown>
  /**
   * 把抓取结果渲染成表单字段 —— 不同站点的字段名差异巨大，调用方实现。
   * 通常是一个「从结构化数据映射到 form state」的纯函数。
   */
  toForm?: (data: unknown) => Record<string, unknown>
}

/**
 * 类型友好的工厂 —— 调用方不用写 `as SiteDescriptor`。
 */
export function defineSiteAdapter<T>(spec: SiteDescriptor & { scrape: () => T | Promise<T> }): SiteDescriptor {
  return spec
}
