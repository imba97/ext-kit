/**
 * 后端 —— 决定数据到底落在 `chrome.storage.local` 还是 `IndexedDB`。
 *
 * 选择决策见 offer-hunter/docs/shared-extraction-analysis.md 的「路由 C」。
 *
 *  - `chrome-storage`：默认、跨上下文同步由浏览器负责。适合小 KV（≤10MB）。
 *  - `indexed-db`：大对象 / 二进制。MV3 SW 内 IndexedDB 已可用。
 *  - `memory`：纯测试 / 不要求持久化场景。
 */
export type StorageBackend = 'chrome-storage' | 'indexed-db' | 'memory'

export interface DefineStorageOptions<T> {
  /** 后端，默认 `chrome-storage` */
  backend?: StorageBackend
  /** 业务键 —— 不同业务存不同的表，避免一把梭 */
  key: string
  /** 默认值 —— 首次读取或解析失败时返回 */
  defaultValue: T
  /**
   * 把后台写入的 raw string 解析成业务对象。
   *
   * 必须做防御：后台代码比前端新一点，旧版反序列化能力可能不一样；
   * 解析失败要回退到 defaultValue，否则应用直接卡死。
   */
  normalize?: (raw: unknown) => T
  /**
   * 把业务对象序列化成 raw string 后再交给 storage。
   *
   * `chrome.storage.local.set` 接受 JSON-serializable 值，这里主要做
   * 版本号、迁移、字段裁剪 —— 由调用方自己实现。
   */
  serialize?: (value: T) => unknown
}
