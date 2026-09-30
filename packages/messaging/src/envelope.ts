import type { BroadcastMessage, Envelope, RequestMessage } from './types'

/**
 * Type guard: only accept messages from the same namespace, so messages from
 * third parties (other extensions) are ignored.
 */
export function isEnvelope(namespace: string) {
  return function check(value: unknown): value is Envelope {
    const msg = value as Partial<Envelope> | null
    return typeof msg === 'object' && msg !== null && msg.namespace === namespace
  }
}

/**
 * Build a request envelope.
 */
export function makeRequest(namespace: string, id: string, data?: unknown): RequestMessage {
  return { namespace, kind: 'request', id, data }
}

/**
 * Build a broadcast envelope.
 */
export function makeBroadcast<T>(namespace: string, id: string, data?: T): BroadcastMessage<T> {
  return { namespace, kind: 'broadcast', id, data }
}
