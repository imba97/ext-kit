import type { App } from 'vue'

/**
 * Shared setup for extension pages — replaces the byte-identical `setupApp`
 * that used to live in both downstream projects' `src/logic/common-setup.ts`.
 *
 * Callers usually want to plug in their own side effects: Pinia install,
 * router init, telemetry, etc. The `extraSetup` hook covers that; if you
 * don't need it, you don't even have to pass it.
 */
export interface SetupAppOptions {
  app: App
  /** Business side-effect hook; defaults to a no-op. */
  extraSetup?: (app: App) => void | Promise<void>
}

/**
 * Shared extension setup:
 *  - Dev-only `__VUE_PROD_DEVTOOLS__`, `__VUE_OPTIONS_API__` defines are
 *    handled by vite; nothing to do here.
 *  - `extraSetup` is the caller's hook.
 *
 * Motivation: both downstream projects used to ship identical
 * implementations — now they share this one.
 */
export async function setupApp(opts: SetupAppOptions): Promise<void> {
  if (opts.extraSetup)
    await opts.extraSetup(opts.app)
}
