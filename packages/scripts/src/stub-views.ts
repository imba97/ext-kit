import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

/**
 * Stub HTML files for the vite dev server.
 *
 * Vite's dev server can only serve multiple entries on top of existing HTML.
 * The `extension/` directory's `index.html` template is compiled by vite in
 * dev, but extension pages typically haven't been produced by the `build`
 * step yet. `stubViewHtml` copies each view's html template (by relative path)
 * into `extension/`, so the dev server can mount them directly.
 *
 * Why not auto-copy everything: business `index.html` files often contain
 * `<script src="/src/...">` references, and vite handles hash routing after
 * the copy. A naive `cp` isn't robust, so we leave a hook for the caller to
 * provide a custom transform.
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
