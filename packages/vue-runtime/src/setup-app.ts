import type { App } from 'vue'

/**
 * 扩展页面通用的 setup —— 替代两个下游项目 `src/logic/common-setup.ts` 里
 * 那个 byte-identical 的 setupApp。
 *
 * 业务通常会想插自己的副作用：Pinia 安装、router 初始化、telemetry 接入等。
 * 这里给出 `extraSetup` 钩子；如果完全够用，调用方连钩子都不用写。
 */
export interface SetupAppOptions {
  app: App
  /** 应用业务副作用；默认 noop */
  extraSetup?: (app: App) => void | Promise<void>
}

/**
 * 通用扩展 setup：
 *  - 默认注入 dev-only 的 `__VUE_PROD_DEVTOOLS__`、`__VUE_OPTIONS_API__` 等 define 由 vite 处理
 *  - `extraSetup` 是给调用方留的口子
 *
 * 设计动机：原本两边各自实现一遍，行为完全相同 —— 现在放进来共享。
 */
export async function setupApp(opts: SetupAppOptions): Promise<void> {
  if (opts.extraSetup)
    await opts.extraSetup(opts.app)
}
