/**
 * Cross-context messaging channel — extension pages (sidepanel / popup /
 * options) ↔ background service worker.
 *
 * Motivation (lessons from production use in offer-hunter):
 *
 *  1. **Do NOT route this through webext-bridge.**
 *     webext-bridge keeps an "endpoint name → port" table (connMap) on the
 *     background. For extension pages, the endpoint name is a fixed context
 *     name — the sidepanel has no tabId to compose, so it borrows `options`.
 *     Multiple extension pages therefore share the same slot, which causes
 *     two real failure modes:
 *      - A page that connects later kicks out the earlier one; responses get
 *        sent to the wrong page and the original caller waits forever.
 *      - When one of the pages closes, the background removes the slot by
 *        endpoint name. Another page's next message then crashes inside
 *        `connMap.get(name).fingerprint` (undefined read) and the handler
 *        is never invoked.
 *
 *  2. **Use native `runtime.sendMessage` instead.** Extension pages are not
 *     tied to a tab, requests and responses are naturally paired, and there
 *     is no shared slot — none of the above failures can occur.
 *
 *  3. **Always set a namespace.** Browser extensions share the runtime
 *     message channel; without a namespace, messages from other extensions
 *     would collide with yours. The default namespace comes from the
 *     `defineMessaging` caller; hardcoding is forbidden.
 *
 * The content-script leg (which does need per-tabId routing) is left to
 * webext-bridge — this package doesn't reinvent that wheel.
 */

export interface RequestMessage {
  /** Caller namespace, distinguishes messages when multiple extensions coexist. */
  namespace: string
  /** Distinguishes one-way notifications from request/response. */
  kind: 'request'
  /** Business message id (matches the key in the handler map). */
  id: string
  /** Business payload — narrowed by each handler. */
  data?: unknown
}

export interface BroadcastMessage<T = unknown> {
  namespace: string
  kind: 'broadcast'
  id: string
  data?: T
}

export type Envelope = RequestMessage | BroadcastMessage<unknown>
