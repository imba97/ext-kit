/**
 * 「外部数据源」骨架 —— 来自 offer-hunter 的 ResumeSource 抽象。
 *
 * 常见实现：gist / paste / 本地文件 / 远程 API。
 * 各自负责把外部数据规整成统一的 Resume 数据格式，然后由 storage 统一收纳。
 */

export interface ExternalSourceFetchResult<TData> {
  /** 原始数据；后续 reconcile 用 */
  data: TData
  /** 来源 metadata —— 时间戳 / 作者 / hash 等，方便做缓存与冲突解决 */
  meta: Record<string, unknown>
}

export interface ExternalSourceDescriptor<TConfig, TData> {
  id: string
  /** 展示名 */
  name: string
  /** UI 上的简单描述 */
  description?: string
  /** 默认配置 —— UI 用它做表单初值 */
  defaultConfig: TConfig
  /** 抓取最新数据 */
  fetch: (config: TConfig) => Promise<ExternalSourceFetchResult<TData>>
  /**
   * 把外部数据规整成统一 Resume —— 决定字段归属、合并、丢弃。
   */
  normalize?: (data: TData, config: TConfig) => unknown
  /**
   * 校验配置是否合法 —— 比如 gist 模式下要校验 token 非空。
   * UI 上 disable fetch 按钮 / 后台拒绝请求都用它。
   */
  validate?: (config: TConfig) => true | string
}

export function defineExternalSource<TConfig, TData>(
  spec: ExternalSourceDescriptor<TConfig, TData>
): ExternalSourceDescriptor<TConfig, TData> {
  return spec
}
