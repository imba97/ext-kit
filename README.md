# ext-kit

Shared building blocks for Manifest V3 browser extensions.

The foundational template this builds on is
[`antfu-collective/vitesse-webext`](https://github.com/antfu-collective/vitesse-webext);
ext-kit splits that template's inline helpers into independently versioned
packages that can be consumed individually.

## Packages

| Package | What it provides |
| --- | --- |
| [`@ext-kit/messaging`](./packages/messaging) | Cross-context messaging between extension pages ↔ background service worker |
| [`@ext-kit/storage`](./packages/storage) | Reactive cross-context KV store with `chrome-storage` and `indexed-db` backends |
| [`@ext-kit/vite-config`](./packages/vite-config) | Shared vite config factory (background / content / injected entries) |
| [`@ext-kit/scripts`](./packages/scripts) | Build scripts: `writeManifest`, `stubViewHtml`, path / env / log utilities |
| [`@ext-kit/vue-runtime`](./packages/vue-runtime) | `createExtensionApp` + `setupApp` for Vue extension pages |
| [`@ext-kit/adapter-kit`](./packages/adapter-kit) | Type skeletons for site adapters and external source adapters |

## Development

```bash
# Install
pnpm install

# Stub all packages (no build step needed for downstream dev)
pnpm stub

# Run the unit tests
pnpm test

# Type-check everything
pnpm typecheck
```

## Consuming

Add `ext-kit` to your extension repo's `pnpm-workspace.yaml`:

```yaml
packages:
  - ../ext-kit
```

Then depend on whichever packages you need:

```json
{
  "dependencies": {
    "@ext-kit/messaging": "workspace:*",
    "@ext-kit/storage": "workspace:*"
  }
}
```
