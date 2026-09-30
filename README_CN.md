[English](./README.md) · [简体中文](./README_CN.md)

# ext-kit

> Manifest V3 浏览器扩展的共享积木。

从 [`antfu-collective/vitesse-webext`](https://github.com/antfu-collective/vitesse-webext) 拆出来的一个小 monorepo，每个包独立发版、按需取用。

## 特性

- 📨 **Messaging** —— 扩展页面与后台 service worker 之间的命名空间隔离请求/响应与单向广播。
- 💾 **响应式存储** —— 同一个 `defineStorage()` 把 `chrome.storage.local` 和 IndexedDB 藏在同一个 Vue ref API 后面，跨上下文同步帮你搞定。
- 🛠 **Vite 配置** —— 一份共享配置同时产出 background（IIFE）、content script、MAIN world 注入脚本，并自带 HMR。
- 📜 **构建脚本** —— `writeManifest` 写动态 manifest，`stubViewHtml` 给 vite dev 用，再加上环境 / 路径 / 日志的小工具。
- 🧩 **Vue 运行时** —— `createExtensionApp` 挂载页面，`setupApp` 是插 Pinia / router / 埋点等副作用的统一入口。
- 🧱 **Adapter kit** —— 站点适配器与外部数据源的类型骨架，外加一个全局注册表。

## 包列表

| 包 | 提供的能力 |
| --- | --- |
| [`@ext-kit/messaging`](./packages/messaging) | 扩展页面 ↔ 后台 service worker 之间的跨上下文消息 |
| [`@ext-kit/storage`](./packages/storage) | 响应式跨上下文 KV 存储，自带 `chrome-storage` 与 `indexed-db` 后端 |
| [`@ext-kit/vite-config`](./packages/vite-config) | 共享 vite 配置工厂（background / content / injected 入口） |
| [`@ext-kit/scripts`](./packages/scripts) | 构建脚本：`writeManifest`、`stubViewHtml`、路径 / 环境 / 日志工具 |
| [`@ext-kit/vue-runtime`](./packages/vue-runtime) | Vue 扩展页面的 `createExtensionApp` + `setupApp` |
| [`@ext-kit/adapter-kit`](./packages/adapter-kit) | 站点适配器与外部数据源适配器的类型骨架 |

## 用法

每个包独立发布。下面这段展示最常见的三件套——messaging + storage + vite-config——组合成一个能跑的扩展后台。

````ts
// background.ts —— 运行在 MV3 service worker
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
// sidepanel/main.ts —— 运行在一个 Vue 页面
import { defineMessaging } from '@ext-kit/messaging'
import { defineStorage } from '@ext-kit/storage'

const m = defineMessaging({ namespace: 'my-ext' })
const notes = defineStorage<{ id: string, body: string }[]>({
  key: 'notes',
  defaultValue: [],
})
await notes.ready()
// 当后台调用 notes.set(...) 时，这里 notes.value 会自动更新
const count = await m.callBackground<number>('addNote', { id: 'n1', body: 'hi' })
````

````ts
// vite.config.ts —— 所有页面共用一份配置工厂
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

## 开发

```bash
pnpm install      # 安装依赖
pnpm stub          # 把所有包 link 到工作区（下游开发无需构建步骤）
pnpm test          # 运行单元测试
pnpm typecheck     # 全量类型检查
```

## 许可证

[MIT](./LICENSE)
