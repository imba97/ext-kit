import { describe, expect, it } from 'vitest'
import {
  AdapterRegistry,
  defineExternalSource,
  defineSiteAdapter,
  externalSourceRegistry,
  siteRegistry
} from '../src/index'

describe('adapter-kit', () => {
  it('defineSiteAdapter keeps the spec verbatim', () => {
    const boss = defineSiteAdapter({
      id: 'boss',
      name: 'Boss Zhipin',
      matcher: { host: 'www.zhipin.com' },
      scrape: () => ({ title: 'engineer' })
    })
    expect(boss.id).toBe('boss')
    expect(boss.matcher.host).toBe('www.zhipin.com')
  })

  it('defineExternalSource keeps descriptor verbatim', () => {
    const gist = defineExternalSource({
      id: 'gist',
      name: 'GitHub Gist',
      defaultConfig: { token: '', gistId: '' },
      fetch: async cfg => ({ data: cfg, meta: { ts: 1 } }),
      validate: cfg => cfg.gistId ? true : 'gistId required'
    })
    expect(gist.id).toBe('gist')
    expect(gist.validate?.({ token: 't', gistId: '' })).toBe('gistId required')
  })

  it('adapterRegistry registers and lists', () => {
    const r = new AdapterRegistry<{ id: string, n: number }>()
    r.register({ id: 'a', n: 1 })
    r.register({ id: 'b', n: 2 })
    expect(r.list()).toHaveLength(2)
    expect(r.get('a')?.n).toBe(1)
    expect(() => r.register({ id: 'a', n: 99 })).toThrow(/already registered/)
    r.remove('a')
    expect(r.get('a')).toBeUndefined()
  })

  it('global registries are isolated singletons', () => {
    expect(siteRegistry).toBeDefined()
    expect(externalSourceRegistry).toBeDefined()
    expect(siteRegistry).not.toBe(externalSourceRegistry)
  })
})
