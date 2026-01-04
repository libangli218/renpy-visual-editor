/**
 * Cache Module
 * 
 * Exports caching utilities for AST and FlowGraph.
 */

export { CacheManager, cacheManager } from './CacheManager'
export { computeHash, estimateSize, formatBytes } from './hashUtils'
export { PersistentCache, persistentCache } from './PersistentCache'
export type { CacheEntry, CacheStats, CacheConfig, ICacheManager } from './types'
export type { 
  SerializableCacheEntry, 
  FileHashEntry, 
  CacheMetadata, 
  PersistentCacheState 
} from './PersistentCache'
