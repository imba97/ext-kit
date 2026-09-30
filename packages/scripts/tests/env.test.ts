import { afterEach, describe, expect, it } from 'vitest'
import { isFirefox, isForbiddenUrl } from '../src/env'

function setUA(ua: string) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: ua },
    configurable: true,
    writable: true
  })
}

describe('isFirefox', () => {
  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      configurable: true,
      writable: true
    })
  })

  it('matches firefox UA', () => {
    setUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0')
    expect(isFirefox()).toBe(true)
  })

  it('returns false for chrome', () => {
    setUA('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36')
    expect(isFirefox()).toBe(false)
  })
})

describe('isForbiddenUrl', () => {
  it.each([
    ['chrome://settings'],
    ['chrome-search://local-ntp/local-ntp.html'],
    ['edge://settings/'],
    ['about:blank'],
    ['moz-extension://abcd/options.html'],
    ['chrome-extension://abcd/options.html'],
    ['file:///c:/Users/x/Desktop'],
    ['relative/path']
  ])('blocks %s', (url) => {
    expect(isForbiddenUrl(url)).toBe(true)
  })

  it.each([
    ['https://example.com/'],
    ['http://example.com/path?q=1'],
    ['https://www.bilibili.com/video/BV1xx'],
    ['https://www.zhipin.com/job_detail/...']
  ])('allows %s', (url) => {
    expect(isForbiddenUrl(url)).toBe(false)
  })
})
