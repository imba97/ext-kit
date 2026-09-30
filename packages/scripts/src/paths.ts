import { resolve } from 'node:path'

/**
 * 「项目根目录」工具 —— Vite 的 `import.meta.url` 在 build 阶段也会变，所以
 * 这里只允许业务方显式传入项目根。脚本统一走 `r()` 而不是各处自己拼 `path.resolve`。
 *
 * 用法：
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
 * 一行解析：避免在每个文件里都 `resolve(__dirname, '..', p)`。
 * 默认项目根为调用文件所在目录的上一级（适合放在 scripts/ 子目录下）。
 */
export function r(rootDir: string, ...parts: string[]): string {
  return resolve(rootDir, ...parts)
}
