import process from 'node:process'
import { blue, cyan, dim, green, magenta, red, yellow } from 'kolorist'

/**
 * Logger that emits a namespace-prefixed line — when scripts run in series
 * you can still tell where each line came from.
 *
 * Motivation: both downstream projects used to roll their own
 * `kolorist.log` calls. Unifying them into one function lets both projects
 * share the implementation. Only `kolorist` is used here (no console-style
 * escapes) — verified compatible with vite + esbuild.
 */
export function createLogger(tag: string) {
  const prefix = (color: (s: string) => string) => (msg: string) => `${color(`[${tag}]`)} ${msg}`

  return {
    info: (msg: string) => console.log(prefix(cyan)(msg)),
    success: (msg: string) => console.log(prefix(green)(msg)),
    warn: (msg: string) => console.warn(prefix(yellow)(msg)),
    error: (msg: string) => console.error(prefix(red)(msg)),
    log: (msg: string) => console.log(prefix(dim)(msg)),
    debug: (msg: string) => {
      if (process.env.DEBUG)
        console.log(prefix(magenta)(msg))
    },
    blue: (msg: string) => console.log(prefix(blue)(msg))
  }
}
