import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createLogger } from './log'

/**
 * Write a runtime-constructed manifest to `extension/manifest.json`.
 *
 * Usage:
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
 * Why a function instead of an object:
 *  - At build time you may need to read state that only exists then
 *    (e.g. the latest version number).
 *  - A function defers evaluation until the call site, avoiding the
 *    "writes a stale object to disk" trap.
 */
export interface WriteManifestOptions {
  outDir: string
  /** Caller-side factory that produces the manifest. */
  manifest: () => Record<string, unknown> | Promise<Record<string, unknown>>
  /** Default file name. */
  fileName?: string
}

export async function writeManifest(opts: WriteManifestOptions): Promise<void> {
  const log = createLogger('manifest')
  const out = resolve(opts.outDir, opts.fileName ?? 'manifest.json')
  const obj = await opts.manifest()
  await writeFile(out, JSON.stringify(obj, null, 2), 'utf8')
  log.success(`wrote ${out}`)
}
