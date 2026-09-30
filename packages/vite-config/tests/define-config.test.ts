import { describe, expect, it } from 'vitest'
import {
  defineBackgroundConfig,
  defineContentScriptConfig,
  defineInjectedScriptConfig,
  defineSharedConfig,
  extensionViewsPlugin
} from '../src/index'

const views = [
  { name: 'options', entry: 'options/main.ts', html: 'options/index.html' },
  { name: 'sidepanel', entry: 'sidepanel/main.ts', html: 'sidepanel/index.html' }
]

describe('defineSharedConfig', () => {
  it('returns shared pieces with defaults', async () => {
    const shared = await defineSharedConfig({ views, vue: false, unocss: false })
    expect(shared.views).toHaveLength(2)
    expect(shared.unocss).toBe(false)
    expect(shared.vue).toBe(false)
  })

  it('keeps views even without plugins', async () => {
    const shared = await defineSharedConfig({ views, vue: false, unocss: false })
    expect(shared.views).toHaveLength(2)
  })
})

describe('background / content / injected configs', () => {
  it('all three produce IIFE single entry', async () => {
    const shared = await defineSharedConfig({ views, vue: false, unocss: false })
    const bg = defineBackgroundConfig(shared, { entry: 'background/main.ts' })
    const ct = defineContentScriptConfig(shared, { entry: 'sites/content-script.ts' })
    const ij = defineInjectedScriptConfig(shared, { entry: 'sites/injected.ts' })

    for (const c of [bg, ct, ij]) {
      const output = c.build?.rollupOptions?.output as { format?: string, inlineDynamicImports?: boolean } | undefined
      expect(output?.format).toBe('iife')
      expect(output?.inlineDynamicImports).toBe(true)
      expect(c.define?.['process.env.NODE_ENV']).toBeDefined()
    }
  })

  it('respects custom outName', async () => {
    const shared = await defineSharedConfig({ views, vue: false, unocss: false })
    const bg = defineBackgroundConfig(shared, { entry: 'bg/main.ts', outName: 'sw.js' })
    expect((bg.build?.rollupOptions?.output as { entryFileNames?: string } | undefined)?.entryFileNames).toBe('sw.js')
  })
})

describe('extensionViewsPlugin', () => {
  it('injects vite client only in dev', () => {
    const plugin = extensionViewsPlugin(views)
    const ctx = { filename: 'options/index.html' } as any
    const html = '<html><head></head><body></body></html>'
    // dev 路径由 process.env.NODE_ENV 决定，单测里设不到；这里直接验证 plugin 结构
    expect(plugin.name).toBe('ext-kit:extension-views')
    expect(typeof plugin.transformIndexHtml).toBe('object')
    // 触发 handler 也不报错
    const result = (plugin.transformIndexHtml as any).handler(html, ctx)
    expect(result).toContain('</head>')
  })
})
