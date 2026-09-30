import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@ext-kit/messaging': r('./packages/messaging/src/index.ts'),
      '@ext-kit/storage': r('./packages/storage/src/index.ts'),
      '@ext-kit/vite-config': r('./packages/vite-config/src/index.ts'),
      '@ext-kit/scripts': r('./packages/scripts/src/index.ts'),
      '@ext-kit/vue-runtime': r('./packages/vue-runtime/src/index.ts'),
      '@ext-kit/adapter-kit': r('./packages/adapter-kit/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true }
    }
  }
})
