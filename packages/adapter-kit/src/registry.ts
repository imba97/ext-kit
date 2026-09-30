import type { ExternalSourceDescriptor } from './external-source'
import type { SiteDescriptor } from './site-adapter'

/**
 * Generic registry — lets callers register a set of adapters into a global
 * store with a single line.
 *
 * Note: this package has no runtime dependencies (no pinia, no chrome storage).
 * It is just a plain list with type inference.
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
