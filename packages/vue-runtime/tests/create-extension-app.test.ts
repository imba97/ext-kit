import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createExtensionApp } from '../src/index'

describe('createExtensionApp', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mounts the component into #app', async () => {
    document.body.innerHTML = '<div id="app"></div>'

    const Root = defineComponent({
      template: '<p data-testid="hello">hi</p>'
    })

    await createExtensionApp({ rootComponent: Root })
    expect(document.querySelector('[data-testid="hello"]')?.textContent).toBe('hi')
  })

  it('runs extraSetup before mount', async () => {
    document.body.innerHTML = '<div id="app"></div>'
    let called = 0

    const Root = defineComponent({
      template: '<p>x</p>'
    })

    await createExtensionApp({
      rootComponent: Root,
      setup: () => { called++ }
    })

    expect(called).toBe(1)
  })

  it('supports a custom mount target', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const Root = defineComponent({
      template: '<span>custom</span>'
    })

    await createExtensionApp({ rootComponent: Root, mountTarget: '#root' })
    expect(document.querySelector('#root')?.innerHTML).toContain('custom')
  })
})
