import process from 'node:process'
import { blue, cyan, dim, green, magenta, red, yellow } from 'kolorist'

/**
 * 输出带 namespace 前缀的日志 —— 避免脚本之间互相串行时找不到出处。
 *
 * 设计动机：原来两个项目都用 kolorist.log 但各自实现一份，改成统一函数
 * 后两边都能复用。注意此处只用 kolorist，不用 console-style 转义 —— 已被
 * vite + esbuild 验证过兼容。
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
