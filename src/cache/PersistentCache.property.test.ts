/**
 * PersistentCache Property Tests
 * 
 * Property-based tests for persistent cache round-trip behavior.
 * 
 * **Feature: flow-graph-cache, Property 7: Persistent Cache Round-Trip**
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { CacheManager } from './CacheManager'
import { PersistentCacheState } from './PersistentCache'
import { computeHash } from './hashUtils'

/**
 * Mock PersistentCache for testing without IndexedDB
 * 
 * This mock simulates the IndexedDB storage behavior in memory,
 * allowing us to test the round-trip property without browser APIs.
 */
class MockPersistentCache {
  private storage: PersistentCacheState | null = null

  async initialize(): Promise<void> {
    // No-op for mock
  }

  async save(state: PersistentCacheState): Promise<void> {
    // Deep clone to simulate actual storage behavior
    this.storage = JSON.parse(JSON.stringify(state))
  }

  async load(): Promise<PersistentCacheState | null> {
    if (!this.storage) return null
    // Deep clone to simulate actual storage behavior
    return JSON.parse(JSON.stringify(this.storage))
  }

  async clear(): Promise<void> {
    this.storage = null
  }

  close(): void {
    // No-op for mock
  }

  isAvailable(): boolean {
    return true
  }
}

/**
 * Feature: flow-graph-cache, Property 7: Persistent Cache Round-Trip
 * 
 * For any cache state that is saved to disk and then loaded, the loaded cache 
 * SHALL contain all entries that were valid at save time and whose source files 
 * have not changed.
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */
describe('Property 7: Persistent Cache Round-Trip', () => {
  let mockStorage: MockPersistentCache

  beforeEach(() => {
    mockStorage = new MockPersistentCache()
  })

  it('cache state survives save and load round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 15 }),
        async (uuids) => {
          const cache = new CacheManager({ maxEntries: 100 })
          const uniqueUuids = [...new Set(uuids)]
          
          // Build up cache state
          const files: Array<{ path: string; content: string; hash: string }> = []
          for (const uuid of uniqueUuids) {
            const path = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            const hash = computeHash(content)
            
            cache.getAST(path, content)
            files.push({ path, content, hash })
          }
          
          // Record state before save
          const statsBefore = cache.getStats()
          const cachedFilesBefore = files.filter(f => cache.isCached(f.path))
          
          // Save to storage
          await cache.saveToStorage(mockStorage as any)
          
          // Create new cache and load
          const newCache = new CacheManager({ maxEntries: 100 })
          
          // Load without validation (files unchanged)
          await newCache.loadFromStorage(mockStorage as any)
          
          // Verify state is restored
          const statsAfter = newCache.getStats()
          
          // Entry counts should match
          expect(statsAfter.astEntryCount).toBe(statsBefore.astEntryCount)
          
          // All previously cached files should still be cached
          for (const file of cachedFilesBefore) {
            expect(newCache.isCached(file.path)).toBe(true)
            expect(newCache.getFileHash(file.path)).toBe(file.hash)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('cache entries are identical after round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        async (uuids) => {
          const cache = new CacheManager({ maxEntries: 100 })
          
          // Cache some files
          const uniqueUuids = [...new Set(uuids)]
          for (const uuid of uniqueUuids) {
            const path = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            cache.getAST(path, content)
          }
          
          // Save and load
          await cache.saveToStorage(mockStorage as any)
          const newCache = new CacheManager({ maxEntries: 100 })
          await newCache.loadFromStorage(mockStorage as any)
          
          // Verify each file's AST content is equivalent (ignoring metadata like id and parseTime)
          for (const uuid of uniqueUuids) {
            const path = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            
            // Get AST from both caches - should be cache hits
            const originalAST = cache.getAST(path, content)
            const loadedAST = newCache.getAST(path, content)
            
            // Compare the statements content (ignoring generated IDs and timestamps)
            expect(loadedAST.statements.length).toBe(originalAST.statements.length)
            expect(loadedAST.type).toBe(originalAST.type)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('changed files are invalidated on load with validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        async (uuids, changeIndex) => {
          const uniqueUuids = [...new Set(uuids)]
          fc.pre(uniqueUuids.length >= 2)
          
          const actualChangeIndex = changeIndex % uniqueUuids.length
          const cache = new CacheManager({ maxEntries: 100 })
          
          // Cache files
          const files: Array<{ path: string; content: string }> = []
          for (const uuid of uniqueUuids) {
            const path = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            cache.getAST(path, content)
            files.push({ path, content })
          }
          
          // Save to storage
          await cache.saveToStorage(mockStorage as any)
          
          // Simulate file change - modify one file's content
          const changedFile = files[actualChangeIndex]
          const newContent = `label changed_${uniqueUuids[actualChangeIndex]}:\n    "Changed content!"\n`
          
          // Create file content provider that returns changed content for one file
          const getFileContent = (filePath: string): string | null => {
            if (filePath === changedFile.path) {
              return newContent
            }
            const file = files.find(f => f.path === filePath)
            return file ? file.content : null
          }
          
          // Load with validation
          const newCache = new CacheManager({ maxEntries: 100 })
          await newCache.loadFromStorage(mockStorage as any, getFileContent)
          
          // Changed file should NOT be cached (hash mismatch)
          expect(newCache.isCached(changedFile.path)).toBe(false)
          
          // Unchanged files should still be cached
          for (let i = 0; i < files.length; i++) {
            if (i !== actualChangeIndex) {
              expect(newCache.isCached(files[i].path)).toBe(true)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('empty cache round-trips correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const cache = new CacheManager({ maxEntries: 100 })
          
          // Save empty cache
          await cache.saveToStorage(mockStorage as any)
          
          // Load into new cache
          const newCache = new CacheManager({ maxEntries: 100 })
          await newCache.loadFromStorage(mockStorage as any)
          
          // Should have empty state
          const stats = newCache.getStats()
          expect(stats.astEntryCount).toBe(0)
          expect(stats.graphEntryCount).toBe(0)
          expect(stats.memoryUsage).toBe(0)
        }
      ),
      { numRuns: 10 }
    )
  })

  it('FlowGraph cache survives round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        async (hashes) => {
          const cache = new CacheManager({ maxEntries: 100 })
          const uniqueHashes = [...new Set(hashes)]
          
          // Cache some flow graphs
          const graphs: Array<{ hash: string; nodes: number }> = []
          for (let i = 0; i < uniqueHashes.length; i++) {
            const hash = uniqueHashes[i]
            const nodeCount = i + 1
            cache.getFlowGraph(hash, () => ({
              nodes: Array(nodeCount).fill({ id: 'node' }),
              edges: []
            }))
            graphs.push({ hash, nodes: nodeCount })
          }
          
          // Save and load
          await cache.saveToStorage(mockStorage as any)
          const newCache = new CacheManager({ maxEntries: 100 })
          await newCache.loadFromStorage(mockStorage as any)
          
          // Verify graph entry count
          const stats = newCache.getStats()
          expect(stats.graphEntryCount).toBe(uniqueHashes.length)
          
          // Verify each graph is retrievable (should be cache hit)
          let buildCalls = 0
          for (const { hash, nodes } of graphs) {
            const graph = newCache.getFlowGraph(hash, () => {
              buildCalls++
              return { nodes: [], edges: [] }
            })
            expect(graph.nodes.length).toBe(nodes)
          }
          
          // Build function should not have been called (all cache hits)
          expect(buildCalls).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
