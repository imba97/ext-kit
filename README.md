[English](./README.md) · [简体中文](./README_CN.md)

# ext-kit

> Shared building blocks for Manifest V3 browser extensions.

Split out of [`antfu-collective/vitesse-webext`](https://github.com/antfu-collective/vitesse-webext) into a small monorepo of independently-versioned packages. Pick the ones you need — nothing forces you to take all of them.

## Features

- 📨 **Messaging** — namespace-isolated request/response and broadcast between extension pages and the background service worker.
- 💾 **Reactive storage** — a single `defineStorage()` that hides `chrome.storage.local` and IndexedDB behind the same Vue ref API, with cross-context sync handled for you.
- 🛠 **Vite configs** — one shared config produces the background (IIFE), content script, and page-world injected bundles with HMR.
- 📜 **Build scripts** — `writeManifest` for dynamic manifests, `stubViewHtml` for vite dev, plus small env / path / logger helpers.
- 🧩 **Vue runtime** — `createExtensionApp` mounts a page; `setupApp` is the shared place to plug in Pinia, router, telemetry, etc.
- 🧱 **Adapter kit** — type skeletons for site adapters and external data sources, with a global registry.

## Packages

| Package | What it provides |
| --- | --- |
| [`@ext-kit/messaging`](./packages/messaging) | Cross-context messaging between extension pages ↔ background service worker |
| [`@ext-kit/storage`](./packages/storage) | Reactive cross-context KV store with `chrome-storage` and `indexed-db` backends |
| [`@ext-kit/vite-config`](./packages/vite-config) | Shared vite config factory (background / content / injected entries) |
| [`@ext-kit/scripts`](./packages/scripts) | Build scripts: `writeManifest`, `stubViewHtml`, path / env / log utilities |
| [`@ext-kit/vue-runtime`](./packages/vue-runtime) | `createExtensionApp` + `setupApp` for Vue extension pages |
| [`@ext-kit/adapter-kit`](./packages/adapter-kit) | Type skeletons for site adapters and external source adapters |

## Usage

Each package is published independently. The snippet below shows the most common trio — messaging + storage + vite-config — composing into a working background script.

````ts
// background.ts — runs in the MV3 service worker
import { defineMessaging } from '@ext-kit/messaging'
import { defineStorage } from '@ext-kit/storage'

const m = defineMessaging({ namespace: 'my-ext' })
const notes = defineStorage<{ id: string, body: string }[]>({
  key: 'notes',
  defaultValue: [],
  backend: 'chrome-storage',
})

m.handleBackgroundRequests({
  listNotes: async () => (await notes.ready(), notes.value.value),
  addNote: async (raw) => {
    const next = [...notes.value.value, raw as { id: string, body: string }]
    await notes.set(next)
    return next.length
  },
})
````

````ts
// sidepanel/main.ts — runs in a Vue page
import { defineMessaging } from '@ext-kit/messaging'
import { defineStorage } from '@ext-kit/storage'

const m = defineMessaging({ namespace: 'my-ext' })
const notes = defineStorage<{ id: string, body: string }[]>({
  key: 'notes',
  defaultValue: [],
})
await notes.ready()
// notes.value auto-updates when the background calls notes.set(...)
const count = await m.callBackground<number>('addNote', { id: 'n1', body: 'hi' })
````

````ts
// vite.config.ts — pages share one config factory
import { defineConfig } from 'vite'
import {
  buildExtensionViews,
  defineBackgroundConfig,
  defineSharedConfig,
} from '@ext-kit/vite-config'

const shared = await defineSharedConfig({
  views: [
    { name: 'sidepanel', entry: 'sidepanel/main.ts', html: 'sidepanel/index.html' },
    { name: 'options', entry: 'options/main.ts', html: 'options/index.html' },
  ],
})

export default defineConfig([
  defineBackgroundConfig(shared, { entry: 'background/main.ts' }),
  buildExtensionViews(shared),
])
````

## Development

```bash
pnpm install      # install
pnpm stub          # link every package into the workspace (no build step needed)
pnpm test          # run unit tests
pnpm typecheck     # type-check everything
```

## License

[MIT](./LICENSE)
