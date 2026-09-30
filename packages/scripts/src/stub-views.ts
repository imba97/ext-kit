import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

/**
 * 给 vite dev server 用的 view 占位 html。
 *
 * Vite dev server 只能在已有 html 的基础上响应多 entry；`extension/` 目录里的
 * `index.html` 模板在 dev 时会由 vite 编译，但 extension 页面通常还没运行
 * `build` 脚本生成。`stubViewHtml` 把 `views` 的 html 模板按相对路径复制到
 * `extension/`，让 dev server 能直接挂上。
 *
 * 为什么不全自动复制：因为业务里 `index.html` 经常依赖 `<script src="/src/...">`
 * 引用，复制后 vite 会自己处理 hash 路由。直接 cp 不够稳，所以留口子让业务方
 * 自定义 transform。
 */
export interface StubViewOptions {
  outDir: string
  views: { html: string }[]
  transform?: (html: string, view: { html: string }) => string
}

export async function stubViewHtml(opts: StubViewOptions): Promise<void> {
  for (const view of opts.views) {
    const src = resolve(opts.outDir, '..', view.html)
    const target = resolve(opts.outDir, view.html)
    const html = await readIfExists(src)
    if (html === null)
      continue
    const next = opts.transform ? opts.transform(html, view) : html
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, next, 'utf8')
  }
}

async function readIfExists(path: string): Promise<string | null> {
  try {
    const { readFile } = await import('node:fs/promises')
    return await readFile(path, 'utf8')
  }
  catch {
    return null
  }
}
