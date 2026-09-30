import type { ExternalSourceDescriptor } from './external-source'
import type { SiteDescriptor } from './site-adapter'

/**
 * 通用注册表 —— 调用方可以一行代码把一组 adapter 注册到全局。
 *
 * 注意：本包不依赖任何运行时状态（pinia / chrome storage），只是单纯的
 * 列表 + 类型推导。
 */
export class AdapterRegistry<T extends { id: string }> {
  private map = new Map<string, T>()

  register(item: T): void {
    if (this.map.has(item.id))
      throw new Error(`Adapter ${item.id} already registered`)
    this.map.set(item.id, item)
  }

  get(id: string): T | undefined {
    return this.map.get(id)
  }

  list(): T[] {
    return Array.from(this.map.values())
  }

  remove(id: string): boolean {
    return this.map.delete(id)
  }
}

export const siteRegistry = new AdapterRegistry<SiteDescriptor>()
export const externalSourceRegistry = new AdapterRegistry<ExternalSourceDescriptor<any, any>>()
