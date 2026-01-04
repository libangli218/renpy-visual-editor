/**
 * CacheManager - Flow Graph Cache System
 * 
 * Manages caching of parsed AST and built FlowGraph to avoid
 * re-parsing and rebuilding on every file access.
 * 
 * Design principles (inspired by Dan Abramov):
 * - Single source of truth: file content is the only truth
 * - Immutable data: cache entries are never modified
 * - Derived state: AST and FlowGraph are derived from content
 */

import { RenpyScript } from '../types/ast'
import { FlowGraph } from '../components/nodeMode/FlowGraphBuilder'
import { parse } from '../parser/renpyParser'
import { CacheEntry, CacheStats, CacheConfig, ICacheManager } from './types'
import { computeHash, estimateSize } from './hashUtils'

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: Required<CacheConfig> = {
  maxEntries: 50,
  maxMemoryBytes: 50 * 1024 * 1024, // 50MB
  debug: false,
}

/**
 * CacheManager class
 * 
 * Provides caching for AST and FlowGraph with LRU eviction.
 */
export class CacheManager implements ICacheManager {
  // Configuration
  private config: Required<CacheConfig>
  
  // Caches - keyed by content hash
  private astCache: Map<string, CacheEntry<RenpyScript>> = new Map()
  private graphCache: Map<string, CacheEntry<FlowGraph>> = new Map()
  
  // File path to hash mapping (for quick invalidation)
  private fileHashes: Map<string, string> = new Map()
  
  // LRU tracking - most recent at end
  private lruList: string[] = []
  
  // Statistics
  private hits = 0
  private misses = 0
  private memoryUsage = 0

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Get or compute AST for a file
   */
  getAST(filePath: string, content: string): RenpyScript {
    const hash = computeHash(content)
    
    // Check if we have a cached AST for this hash
    const cached = this.astCache.get(hash)
    if (cached) {
      this.hits++
      this.touchEntry(hash)
      cached.lastAccessedAt = Date.now()
      this.log(`AST cache hit for ${filePath} (hash: ${hash})`)
      return cached.data
    }
    
    // Cache miss - parse the file
    this.misses++
    this.log(`AST cache miss for ${filePath} (hash: ${hash})`)
    
    const parseResult = parse(content, filePath)
    const ast = parseResult.ast
    
    // Create cache entry
    const entry: CacheEntry<RenpyScript> = {
      hash,
      data: ast,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      sizeEstimate: estimateSize(ast),
    }
    
    // Store in cache
    this.astCache.set(hash, entry)
    this.fileHashes.set(filePath, hash)
    this.memoryUsage += entry.sizeEstimate
    this.addToLRU(hash)
    
    // Evict if needed
    this.evictIfNeeded()
    
    return ast
  }

  /**
   * Get or compute FlowGraph
   */
  getFlowGraph(contentHash: string, buildFn: () => FlowGraph): FlowGraph {
    // Check if we have a cached graph for this hash
    const cached = this.graphCache.get(contentHash)
    if (cached) {
      this.hits++
      this.touchEntry(contentHash)
      cached.lastAccessedAt = Date.now()
      this.log(`FlowGraph cache hit (hash: ${contentHash})`)
      return cached.data
    }
    
    // Cache miss - build the graph
    this.misses++
    this.log(`FlowGraph cache miss (hash: ${contentHash})`)
    
    const graph = buildFn()
    
    // Create cache entry
    const entry: CacheEntry<FlowGraph> = {
      hash: contentHash,
      data: graph,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      sizeEstimate: estimateSize(graph),
    }
    
    // Store in cache
    this.graphCache.set(contentHash, entry)
    this.memoryUsage += entry.sizeEstimate
    
    // Evict if needed
    this.evictIfNeeded()
    
    return graph
  }

  /**
   * Invalidate cache for a specific file
   */
  invalidate(filePath: string): void {
    const hash = this.fileHashes.get(filePath)
    if (hash) {
      this.removeEntry(hash)
      this.fileHashes.delete(filePath)
      this.log(`Invalidated cache for ${filePath}`)
    }
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.astCache.clear()
    this.graphCache.clear()
    this.fileHashes.clear()
    this.lruList = []
    this.memoryUsage = 0
    this.log('Cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      astEntryCount: this.astCache.size,
      graphEntryCount: this.graphCache.size,
      memoryUsage: this.memoryUsage,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
    }
  }

  /**
   * Check if a file is cached
   */
  isCached(filePath: string): boolean {
    const hash = this.fileHashes.get(filePath)
    return hash !== undefined && this.astCache.has(hash)
  }

  /**
   * Get the hash for a file path
   */
  getFileHash(filePath: string): string | undefined {
    return this.fileHashes.get(filePath)
  }

  /**
   * Touch an entry to mark it as recently used
   */
  private touchEntry(hash: string): void {
    const index = this.lruList.indexOf(hash)
    if (index !== -1) {
      // Remove from current position
      this.lruList.splice(index, 1)
    }
    // Add to end (most recent)
    this.lruList.push(hash)
  }

  /**
   * Add a new entry to LRU list
   */
  private addToLRU(hash: string): void {
    if (!this.lruList.includes(hash)) {
      this.lruList.push(hash)
    }
  }

  /**
   * Remove an entry from all caches
   */
  private removeEntry(hash: string): void {
    const astEntry = this.astCache.get(hash)
    const graphEntry = this.graphCache.get(hash)
    
    if (astEntry) {
      this.memoryUsage -= astEntry.sizeEstimate
      this.astCache.delete(hash)
    }
    
    if (graphEntry) {
      this.memoryUsage -= graphEntry.sizeEstimate
      this.graphCache.delete(hash)
    }
    
    const index = this.lruList.indexOf(hash)
    if (index !== -1) {
      this.lruList.splice(index, 1)
    }
  }

  /**
   * Evict entries if cache is over limits
   */
  private evictIfNeeded(): void {
    // Check entry count limit
    while (this.lruList.length > this.config.maxEntries) {
      const oldestHash = this.lruList.shift()
      if (oldestHash) {
        this.removeEntry(oldestHash)
        this.log(`Evicted entry (count limit): ${oldestHash}`)
      }
    }
    
    // Check memory limit
    while (this.memoryUsage > this.config.maxMemoryBytes && this.lruList.length > 0) {
      const oldestHash = this.lruList.shift()
      if (oldestHash) {
        this.removeEntry(oldestHash)
        this.log(`Evicted entry (memory limit): ${oldestHash}`)
      }
    }
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[CacheManager] ${message}`)
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager()
