import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createLogger } from './log'

/**
 * 把运行时构造的 manifest 写到 extension/manifest.json。
 *
 * 用法：
 *
 * ```ts
 * // scripts/manifest.ts
 * import { writeManifest } from '@ext-kit/scripts'
 * await writeManifest({
 *   outDir: r(import.meta.dirname, '..', 'extension'),
 *   manifest: () => buildManifest({ namespace: 'offer-hunter', isDev: process.env.NODE_ENV !== 'production' }),
 * })
 * ```
 *
 * 为什么给 manifest 一个函数而不是对象：
 *  - build-time 需要读取一些只在该阶段存在的状态（比如最新版本号）。
 *  - 函数能延迟到调用时才求值，避免「写文件时拿到过期对象」的隐患。
 */
export interface WriteManifestOptions {
  outDir: string
  /** 业务侧定义 manifest 的工厂函数 */
  manifest: () => Record<string, unknown> | Promise<Record<string, unknown>>
  /** 默认文件名 */
  fileName?: string
}

export async function writeManifest(opts: WriteManifestOptions): Promise<void> {
  const log = createLogger('manifest')
  const out = resolve(opts.outDir, opts.fileName ?? 'manifest.json')
  const obj = await opts.manifest()
  await writeFile(out, JSON.stringify(obj, null, 2), 'utf8')
  log.success(`wrote ${out}`)
}
