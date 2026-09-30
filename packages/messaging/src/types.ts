/**
 * 跨上下文消息通道 —— 扩展页面（侧边栏 / 弹窗 / 设置页）↔ 后台 service worker。
 *
 * 设计动机（来自 offer-hunter 实测踩坑）：
 *
 *  1. **不要用 webext-bridge 跑这条链路**。
 *     webext-bridge 在后台用一张「端点名 → 端口」的表（connMap）做路由，而扩展
 *     页面的端点名是固定上下文名 —— 侧边栏没有 tabId 可拼，只能借用 `options`。
 *     多个扩展页面因此共享一个槽位，带来两类真实故障：
 *      - 后连上的页面把先连上的挤掉：响应被送错页面，当前页面永远等不到结果。
 *      - 其中一个页面关闭时后台按端点名删槽，另一个页面再发消息会在
 *        `connMap.get(名字).fingerprint` 上抛 undefined 读取错误，处理函数
 *        根本不会被调用。
 *
 *  2. **改用原生 `runtime.sendMessage`**：扩展页面与标签页无关，请求与响应天然
 *     配对、不存在共享槽位，上述故障都不可能出现。
 *
 *  3. **必须给消息打 namespace**：浏览器扩展之间消息互通，没命名空间会串号。
 *     默认使用 `defineMessaging` 调用方提供的 namespace，禁止硬编码。
 *
 * 内容脚本那条链路（需要按 tabId 路由）继续交给 webext-bridge，本包不重复造轮子。
 */

export interface RequestMessage {
  /** 调用方 namespace，区分多个扩展共存时的消息 */
  namespace: string
  /** 单向通知与请求-响应的区分 */
  kind: 'request'
  /** 业务消息 id（与 handler map 的 key 一致） */
  id: string
  /** 业务负载 —— 由各 handler 自己收窄 */
  data?: unknown
}

export interface BroadcastMessage<T = unknown> {
  namespace: string
  kind: 'broadcast'
  id: string
  data?: T
}

export type Envelope = RequestMessage | BroadcastMessage<unknown>
