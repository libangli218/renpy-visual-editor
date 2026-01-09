/**
 * Thumbnail Service
 * 
 * Provides thumbnail generation and caching for image resources.
 * Uses LRU cache for memory management and IndexedDB for persistence.
 * 
 * Implements Requirements:
 * - 1.1: Display thumbnail previews for images in Backgrounds section
 * - 1.2: Display thumbnail previews for images in Sprites section
 * - 1.7: Lazy loading - don't load thumbnails for collapsed sections
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Thumbnail entry stored in cache
 */
export interface ThumbnailEntry {
  /** Thumbnail as Data URL */
  dataUrl: string
  /** Original file modification time (for invalidation) */
  mtime: number
  /** Thumbnail size in pixels */
  size: number
}

/**
 * LRU Cache configuration
 */
export interface ThumbnailCacheConfig {
  /** Maximum number of thumbnails to cache in memory */
  maxSize: number
  /** Whether to persist to IndexedDB */
  persist: boolean
  /** IndexedDB database name */
  dbName: string
  /** IndexedDB store name */
  storeName: string
}

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: ThumbnailCacheConfig = {
  maxSize: 200,
  persist: true,
  dbName: 'renpy-editor-thumbnails',
  storeName: 'thumbnails',
}

// ============================================================================
// LRU Cache Implementation
// ============================================================================

/**
 * Simple LRU Cache implementation
 */
class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxSize: number

  constructor(maxSize: number) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    
    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      } else {
        break
      }
    }
    
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  keys(): IterableIterator<K> {
    return this.cache.keys()
  }
}

// ============================================================================
// Thumbnail Service
// ============================================================================

/**
 * Thumbnail Service class
 * 
 * Manages thumbnail generation, caching, and persistence.
 */
export class ThumbnailService {
  private memoryCache: LRUCache<string, ThumbnailEntry>
  private db: IDBDatabase | null = null
  private dbInitPromise: Promise<void> | null = null
  private config: ThumbnailCacheConfig

  constructor(config: Partial<ThumbnailCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.memoryCache = new LRUCache(this.config.maxSize)
    
    if (this.config.persist) {
      this.dbInitPromise = this.initIndexedDB()
    }
  }

  /**
   * Initialize IndexedDB for persistent storage
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve) => {
      // Check if IndexedDB is available
      if (typeof indexedDB === 'undefined') {
        console.warn('IndexedDB not available, using memory cache only')
        resolve()
        return
      }

      const request = indexedDB.open(this.config.dbName, 1)

      request.onerror = () => {
        console.warn('Failed to open IndexedDB, using memory cache only')
        resolve() // Don't reject, just use memory cache
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          db.createObjectStore(this.config.storeName)
        }
      }
    })
  }

  /**
   * Ensure IndexedDB is initialized
   */
  private async ensureDB(): Promise<void> {
    if (this.dbInitPromise) {
      await this.dbInitPromise
    }
  }

  /**
   * Get thumbnail from IndexedDB
   */
  private async getFromIndexedDB(key: string): Promise<ThumbnailEntry | null> {
    await this.ensureDB()
    
    if (!this.db) {
      return null
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(this.config.storeName, 'readonly')
        const store = transaction.objectStore(this.config.storeName)
        const request = store.get(key)

        request.onsuccess = () => {
          resolve(request.result || null)
        }

        request.onerror = () => {
          resolve(null)
        }
      } catch {
        resolve(null)
      }
    })
  }

  /**
   * Save thumbnail to IndexedDB
   */
  private async saveToIndexedDB(key: string, entry: ThumbnailEntry): Promise<void> {
    await this.ensureDB()
    
    if (!this.db) {
      return
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(this.config.storeName, 'readwrite')
        const store = transaction.objectStore(this.config.storeName)
        store.put(entry, key)

        transaction.oncomplete = () => {
          resolve()
        }

        transaction.onerror = () => {
          resolve()
        }
      } catch {
        resolve()
      }
    })
  }

  /**
   * Delete thumbnail from IndexedDB
   */
  private async deleteFromIndexedDB(key: string): Promise<void> {
    await this.ensureDB()
    
    if (!this.db) {
      return
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(this.config.storeName, 'readwrite')
        const store = transaction.objectStore(this.config.storeName)
        store.delete(key)

        transaction.oncomplete = () => {
          resolve()
        }

        transaction.onerror = () => {
          resolve()
        }
      } catch {
        resolve()
      }
    })
  }

  /**
   * Get file modification time
   * Uses Electron's fs API if available, otherwise returns 0
   */
  async getFileMtime(imagePath: string): Promise<number> {
    try {
      // Check if we're in Electron environment
      if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: { getFileMtime?: (path: string) => Promise<number> } }).electronAPI?.getFileMtime) {
        return await (window as unknown as { electronAPI: { getFileMtime: (path: string) => Promise<number> } }).electronAPI.getFileMtime(imagePath)
      }
      
      // Fallback: return 0 (always regenerate)
      return 0
    } catch {
      return 0
    }
  }

  /**
   * Generate a cache key from image path and size
   */
  private getCacheKey(imagePath: string, size: number): string {
    return `${imagePath}:${size}`
  }

  /**
   * Get thumbnail for an image
   * 
   * @param imagePath - Full path to the image file
   * @param size - Thumbnail size in pixels
   * @returns Data URL of the thumbnail
   */
  async getThumbnail(imagePath: string, size: number): Promise<string> {
    const cacheKey = this.getCacheKey(imagePath, size)

    // 1. Check memory cache
    const cached = this.memoryCache.get(cacheKey)
    if (cached) {
      // Validate against file modification time
      const mtime = await this.getFileMtime(imagePath)
      if (mtime === 0 || mtime === cached.mtime) {
        return cached.dataUrl
      }
      // File was modified, invalidate cache
      this.memoryCache.delete(cacheKey)
    }

    // 2. Check IndexedDB
    if (this.config.persist) {
      const persisted = await this.getFromIndexedDB(cacheKey)
      if (persisted) {
        const mtime = await this.getFileMtime(imagePath)
        if (mtime === 0 || mtime === persisted.mtime) {
          // Add to memory cache
          this.memoryCache.set(cacheKey, persisted)
          return persisted.dataUrl
        }
        // File was modified, invalidate persisted cache
        await this.deleteFromIndexedDB(cacheKey)
      }
    }

    // 3. Generate new thumbnail
    const dataUrl = await this.generateThumbnail(imagePath, size)
    const mtime = await this.getFileMtime(imagePath)
    
    const entry: ThumbnailEntry = {
      dataUrl,
      mtime,
      size,
    }

    // 4. Save to caches
    this.memoryCache.set(cacheKey, entry)
    if (this.config.persist) {
      await this.saveToIndexedDB(cacheKey, entry)
    }

    return dataUrl
  }

  /**
   * Generate a thumbnail for an image
   * 
   * @param imagePath - Full path to the image file
   * @param size - Thumbnail size in pixels
   * @returns Data URL of the generated thumbnail
   */
  async generateThumbnail(imagePath: string, size: number): Promise<string> {
    // First, try to load the image using Electron's IPC API (most reliable)
    const electronAPI = typeof window !== 'undefined' 
      ? (window as unknown as { electronAPI?: { readFileAsBase64?: (path: string) => Promise<string | null> } }).electronAPI 
      : undefined
    
    if (electronAPI?.readFileAsBase64) {
      try {
        const dataUrl = await electronAPI.readFileAsBase64(imagePath)
        if (dataUrl) {
          // Now create thumbnail from the data URL
          return this.createThumbnailFromDataUrl(dataUrl, size)
        }
      } catch (error) {
        console.warn(`Failed to read image via IPC: ${imagePath}`, error)
      }
    }
    
    // Fallback: try using local-file:// protocol (registered in Electron main process)
    return this.loadImageAndCreateThumbnail(imagePath, size)
  }

  /**
   * Create a thumbnail from a data URL
   */
  private createThumbnailFromDataUrl(dataUrl: string, size: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Calculate scaling to cover the thumbnail area while maintaining aspect ratio
        const scale = Math.max(size / img.width, size / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        
        // Center the image
        const x = (size - scaledWidth) / 2
        const y = (size - scaledHeight) / 2

        // Clear canvas with transparent background
        ctx.clearRect(0, 0, size, size)
        
        // Draw the scaled image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
        
        resolve(canvas.toDataURL('image/png'))
      }

      img.onerror = () => {
        reject(new Error('Failed to load image from data URL'))
      }

      img.src = dataUrl
    })
  }

  /**
   * Load image using local-file protocol and create thumbnail
   */
  private loadImageAndCreateThumbnail(imagePath: string, size: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Calculate scaling to cover the thumbnail area while maintaining aspect ratio
        const scale = Math.max(size / img.width, size / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        
        // Center the image
        const x = (size - scaledWidth) / 2
        const y = (size - scaledHeight) / 2

        // Clear canvas with transparent background
        ctx.clearRect(0, 0, size, size)
        
        // Draw the scaled image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
        
        resolve(canvas.toDataURL('image/png'))
      }

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imagePath}`))
      }

      // Use local-file:// protocol (registered in Electron main process)
      // Format: local-file:///F:/path/to/file.jpg
      const normalizedPath = imagePath.replace(/\\/g, '/')
      img.src = `local-file:///${normalizedPath}`
    })
  }

  /**
   * Preload thumbnails for multiple images
   * 
   * @param imagePaths - Array of image paths
   * @param size - Thumbnail size in pixels
   * @returns Map of image path to thumbnail data URL
   */
  async preloadThumbnails(
    imagePaths: string[],
    size: number
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    
    // Process in parallel with concurrency limit
    const concurrency = 5
    const chunks: string[][] = []
    
    for (let i = 0; i < imagePaths.length; i += concurrency) {
      chunks.push(imagePaths.slice(i, i + concurrency))
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (path) => {
        try {
          const dataUrl = await this.getThumbnail(path, size)
          results.set(path, dataUrl)
        } catch (error) {
          console.warn(`Failed to generate thumbnail for ${path}:`, error)
        }
      })
      
      await Promise.all(promises)
    }

    return results
  }

  /**
   * Invalidate cache for a specific image
   * 
   * @param imagePath - Path to the image
   */
  async invalidate(imagePath: string): Promise<void> {
    // Remove all sizes from memory cache
    const keysToDelete: string[] = []
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`${imagePath}:`)) {
        keysToDelete.push(key)
      }
    }
    
    for (const key of keysToDelete) {
      this.memoryCache.delete(key)
      if (this.config.persist) {
        await this.deleteFromIndexedDB(key)
      }
    }
  }

  /**
   * Clear all cached thumbnails
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear()
    
    if (this.config.persist && this.db) {
      await this.ensureDB()
      
      return new Promise((resolve) => {
        try {
          const transaction = this.db!.transaction(this.config.storeName, 'readwrite')
          const store = transaction.objectStore(this.config.storeName)
          store.clear()

          transaction.oncomplete = () => {
            resolve()
          }

          transaction.onerror = () => {
            resolve()
          }
        } catch {
          resolve()
        }
      })
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { memorySize: number; maxSize: number } {
    return {
      memorySize: this.memoryCache.size,
      maxSize: this.config.maxSize,
    }
  }

  /**
   * Close the service and release resources
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.memoryCache.clear()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default thumbnail service instance
 */
export const thumbnailService = new ThumbnailService()

// ============================================================================
// Placeholder Image
// ============================================================================

/**
 * Generate a placeholder image for failed thumbnails
 * 
 * @param size - Size in pixels
 * @param text - Optional text to display
 * @returns Data URL of the placeholder
 */
export function generatePlaceholder(size: number, text: string = '?'): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    return ''
  }

  // Background
  ctx.fillStyle = '#3a3a3a'
  ctx.fillRect(0, 0, size, size)

  // Border
  ctx.strokeStyle = '#555555'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1)

  // Text
  ctx.fillStyle = '#888888'
  ctx.font = `${Math.floor(size / 2)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, size / 2, size / 2)

  return canvas.toDataURL('image/png')
}
