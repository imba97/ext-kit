import { resolve } from 'node:path'

/**
 * "Project root" utilities — Vite's `import.meta.url` changes during build,
 * so we require the caller to pass the project root explicitly. Scripts go
 * through `r()` instead of every site calling `path.resolve` on its own.
 *
 * Usage:
 * ```ts
 * // scripts/manifest.ts
 * const r = (p) => resolve(__dirname, '..', p)
 * ```
 */
export function paths(rootDir: string) {
  return {
    src: resolve(rootDir, 'src'),
    extension: resolve(rootDir, 'extension'),
    dist: resolve(rootDir, 'dist'),
    pkg: resolve(rootDir, 'package.json'),
    tsconfig: resolve(rootDir, 'tsconfig.json')
  }
}

/**
 * One-liner resolver: avoids `resolve(__dirname, '..', p)` at every callsite.
 * The default project root is one level above the calling file (convenient for
 * scripts that live in a `scripts/` subdirectory).
 */
export function r(rootDir: string, ...parts: string[]): string {
  return resolve(rootDir, ...parts)
}
