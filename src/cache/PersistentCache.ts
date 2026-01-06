/**
 * PersistentCache - IndexedDB-based persistent storage for cache
 * 
 * Provides persistence layer for the CacheManager to save and restore
 * cache state across sessions.
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

import { RenpyScript } from '../types/ast'
import { FlowGraph } from '../types/flowGraph'

/**
 * Database configuration
 */
const DB_NAME = 'renpy-visual-editor-cache'
const DB_VERSION = 1
const AST_STORE = 'astCache'
const GRAPH_STORE = 'graphCache'
const FILE_HASH_STORE = 'fileHashes'
const METADATA_STORE = 'metadata'

/**
 * Serializable cache entry for storage
 */
export interface SerializableCacheEntry<T> {
  hash: string
  data: T
  createdAt: number
  lastAccessedAt: number
  sizeEstimate: number
}

/**
 * File hash mapping entry
 */
export interface FileHashEntry {
  filePath: string
  hash: string
}

/**
 * Cache metadata for validation
 */
export interface CacheMetadata {
  version: number
  savedAt: number
  lruList: string[]
}

/**
 * Persistent cache state for save/load
 */
export interface PersistentCacheState {
  astEntries: Array<SerializableCacheEntry<RenpyScript>>
  graphEntries: Array<SerializableCacheEntry<FlowGraph>>
  fileHashes: FileHashEntry[]
  metadata: CacheMetadata
}

/**
 * PersistentCache class
 * 
 * Handles IndexedDB operations for cache persistence.
 */
export class PersistentCache {
  private db: IDBDatabase | null = null
  private isInitialized = false

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('[PersistentCache] Failed to open database:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(AST_STORE)) {
          db.createObjectStore(AST_STORE, { keyPath: 'hash' })
        }
        if (!db.objectStoreNames.contains(GRAPH_STORE)) {
          db.createObjectStore(GRAPH_STORE, { keyPath: 'hash' })
        }
        if (!db.objectStoreNames.contains(FILE_HASH_STORE)) {
          db.createObjectStore(FILE_HASH_STORE, { keyPath: 'filePath' })
        }
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'id' })
        }
      }
    })
  }

  /**
   * Save cache state to IndexedDB
   */
  async save(state: PersistentCacheState): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [AST_STORE, GRAPH_STORE, FILE_HASH_STORE, METADATA_STORE],
        'readwrite'
      )

      transaction.onerror = () => {
        console.error('[PersistentCache] Save transaction failed:', transaction.error)
        reject(transaction.error)
      }

      transaction.oncomplete = () => {
        resolve()
      }

      // Clear existing data and save new state
      const astStore = transaction.objectStore(AST_STORE)
      const graphStore = transaction.objectStore(GRAPH_STORE)
      const fileHashStore = transaction.objectStore(FILE_HASH_STORE)
      const metadataStore = transaction.objectStore(METADATA_STORE)

      // Clear stores
      astStore.clear()
      graphStore.clear()
      fileHashStore.clear()
      metadataStore.clear()

      // Save AST entries
      for (const entry of state.astEntries) {
        astStore.put(entry)
      }

      // Save graph entries
      for (const entry of state.graphEntries) {
        graphStore.put(entry)
      }

      // Save file hashes
      for (const entry of state.fileHashes) {
        fileHashStore.put(entry)
      }

      // Save metadata
      metadataStore.put({ id: 'main', ...state.metadata })
    })
  }

  /**
   * Load cache state from IndexedDB
   */
  async load(): Promise<PersistentCacheState | null> {
    if (!this.db) {
      await this.initialize()
    }

    if (!this.db) {
      return null
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [AST_STORE, GRAPH_STORE, FILE_HASH_STORE, METADATA_STORE],
        'readonly'
      )

      const astEntries: Array<SerializableCacheEntry<RenpyScript>> = []
      const graphEntries: Array<SerializableCacheEntry<FlowGraph>> = []
      const fileHashes: FileHashEntry[] = []
      let metadata: CacheMetadata | null = null

      transaction.onerror = () => {
        console.error('[PersistentCache] Load transaction failed:', transaction.error)
        reject(transaction.error)
      }

      transaction.oncomplete = () => {
        if (!metadata) {
          resolve(null)
          return
        }

        resolve({
          astEntries,
          graphEntries,
          fileHashes,
          metadata,
        })
      }

      // Load AST entries
      const astStore = transaction.objectStore(AST_STORE)
      const astRequest = astStore.getAll()
      astRequest.onsuccess = () => {
        astEntries.push(...astRequest.result)
      }

      // Load graph entries
      const graphStore = transaction.objectStore(GRAPH_STORE)
      const graphRequest = graphStore.getAll()
      graphRequest.onsuccess = () => {
        graphEntries.push(...graphRequest.result)
      }

      // Load file hashes
      const fileHashStore = transaction.objectStore(FILE_HASH_STORE)
      const fileHashRequest = fileHashStore.getAll()
      fileHashRequest.onsuccess = () => {
        fileHashes.push(...fileHashRequest.result)
      }

      // Load metadata
      const metadataStore = transaction.objectStore(METADATA_STORE)
      const metadataRequest = metadataStore.get('main')
      metadataRequest.onsuccess = () => {
        if (metadataRequest.result) {
          const { id, ...rest } = metadataRequest.result
          metadata = rest as CacheMetadata
        }
      }
    })
  }

  /**
   * Clear all persisted cache data
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }

    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [AST_STORE, GRAPH_STORE, FILE_HASH_STORE, METADATA_STORE],
        'readwrite'
      )

      transaction.onerror = () => {
        console.error('[PersistentCache] Clear transaction failed:', transaction.error)
        reject(transaction.error)
      }

      transaction.oncomplete = () => {
        resolve()
      }

      transaction.objectStore(AST_STORE).clear()
      transaction.objectStore(GRAPH_STORE).clear()
      transaction.objectStore(FILE_HASH_STORE).clear()
      transaction.objectStore(METADATA_STORE).clear()
    })
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.isInitialized = false
    }
  }

  /**
   * Check if database is available
   */
  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined'
  }
}

// Export singleton instance
export const persistentCache = new PersistentCache()
