/**
 * Cache Types
 * 
 * Type definitions for the flow graph caching system.
 */

import { RenpyScript } from '../types/ast'
import { FlowGraph } from '../components/nodeMode/FlowGraphBuilder'

/**
 * Cache entry wrapper with metadata
 */
export interface CacheEntry<T> {
  /** Content hash - the key for lookup */
  hash: string
  /** Cached data */
  data: T
  /** Creation timestamp */
  createdAt: number
  /** Last access timestamp (for LRU) */
  lastAccessedAt: number
  /** Size estimate in bytes */
  sizeEstimate: number
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /** Total cache hits */
  hits: number
  /** Total cache misses */
  misses: number
  /** Current number of AST entries */
  astEntryCount: number
  /** Current number of FlowGraph entries */
  graphEntryCount: number
  /** Estimated memory usage in bytes */
  memoryUsage: number
  /** Hit rate percentage */
  hitRate: number
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Maximum number of entries (default: 50) */
  maxEntries?: number
  /** Maximum memory usage in bytes (default: 50MB) */
  maxMemoryBytes?: number
  /** Enable debug logging (default: false) */
  debug?: boolean
}

/**
 * Cache manager interface
 */
export interface ICacheManager {
  /**
   * Get or compute AST for a file
   * Returns cached AST if hash matches, otherwise parses and caches
   */
  getAST(filePath: string, content: string): RenpyScript
  
  /**
   * Get or compute FlowGraph for an AST
   * Returns cached graph if AST hash matches, otherwise builds and caches
   */
  getFlowGraph(contentHash: string, buildFn: () => FlowGraph): FlowGraph
  
  /**
   * Invalidate cache for a specific file
   */
  invalidate(filePath: string): void
  
  /**
   * Clear all caches
   */
  clear(): void
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats
  
  /**
   * Check if a file is cached
   */
  isCached(filePath: string): boolean
  
  /**
   * Get the hash for a file path (if cached)
   */
  getFileHash(filePath: string): string | undefined
}
