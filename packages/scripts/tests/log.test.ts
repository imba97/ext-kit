import { describe, expect, it, vi } from 'vitest'
import { createLogger } from '../src/log'

describe('createLogger', () => {
  it('emits prefix-tagged lines', () => {
    const log = createLogger('demo')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    log.info('hello')
    expect(spy).toHaveBeenCalled()
    const arg = spy.mock.calls[0]?.[0] as string
    expect(arg).toContain('[demo]')
    expect(arg).toContain('hello')
    spy.mockRestore()
  })

  it('debug is silent without DEBUG', () => {
    delete process.env.DEBUG
    const log = createLogger('demo')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    log.debug('hidden')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('debug speaks when DEBUG set', () => {
    process.env.DEBUG = '1'
    const log = createLogger('demo')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    log.debug('visible')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    delete process.env.DEBUG
  })
})
