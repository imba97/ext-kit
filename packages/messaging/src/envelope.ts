import type { BroadcastMessage, Envelope, RequestMessage } from './types'

/**
 * 类型守卫：只处理来自同一 namespace 的消息，避免误处理第三方来源。
 */
export function isEnvelope(namespace: string) {
  return function check(value: unknown): value is Envelope {
    const msg = value as Partial<Envelope> | null
    return typeof msg === 'object' && msg !== null && msg.namespace === namespace
  }
}

/**
 * 构造一个 request 信封。
 */
export function makeRequest(namespace: string, id: string, data?: unknown): RequestMessage {
  return { namespace, kind: 'request', id, data }
}

/**
 * 构造一个 broadcast 信封。
 */
export function makeBroadcast<T>(namespace: string, id: string, data?: T): BroadcastMessage<T> {
  return { namespace, kind: 'broadcast', id, data }
}
