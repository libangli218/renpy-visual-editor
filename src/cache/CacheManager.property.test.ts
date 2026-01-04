/**
 * CacheManager Property Tests
 * 
 * Property-based tests for cache behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { CacheManager } from './CacheManager'
import { computeHash } from './hashUtils'

/**
 * Generate valid Ren'Py content for testing with unique identifiers
 */
const renpyContentArb = fc.uuid().map(uuid => 
  `label start_${uuid}:\n    "Hello, world ${uuid}!"\n`
)

/**
 * Generate unique file paths
 */
const filePathArb = fc.uuid().map(uuid => `test_${uuid}.rpy`)

/**
 * Feature: flow-graph-cache, Property 2: Cache Hit Consistency
 * 
 * For any file content that has been cached, requesting the same content 
 * again SHALL return the exact same cached object (reference equality).
 * 
 * **Validates: Requirements 1.2, 2.2, 3.2**
 */
describe('Property 2: Cache Hit Consistency', () => {
  let cache: CacheManager

  beforeEach(() => {
    cache = new CacheManager({ maxEntries: 100 })
  })

  it('getAST returns same object reference for same content', () => {
    fc.assert(
      fc.property(
        filePathArb,
        renpyContentArb,
        fc.integer({ min: 2, max: 5 }),
        (filePath, content, accessCount) => {
          // First access - cache miss
          const firstResult = cache.getAST(filePath, content)
          
          // Subsequent accesses - should return same object
          for (let i = 1; i < accessCount; i++) {
            const result = cache.getAST(filePath, content)
            expect(result).toBe(firstResult) // Reference equality
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('getFlowGraph returns same object reference for same hash', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // Use UUID for unique hash
        fc.integer({ min: 2, max: 5 }),
        (contentHash, accessCount) => {
          let buildCount = 0
          const buildFn = () => {
            buildCount++
            return { nodes: [], edges: [] }
          }
          
          // First access - cache miss
          const firstResult = cache.getFlowGraph(contentHash, buildFn)
          
          // Subsequent accesses - should return same object
          for (let i = 1; i < accessCount; i++) {
            const result = cache.getFlowGraph(contentHash, buildFn)
            expect(result).toBe(firstResult) // Reference equality
          }
          
          // Build function should only be called once
          expect(buildCount).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('same content from different file paths shares cached AST', () => {
    fc.assert(
      fc.property(
        fc.array(filePathArb, { minLength: 2, maxLength: 5 }),
        renpyContentArb,
        (filePaths, content) => {
          // Ensure unique file paths
          const uniquePaths = [...new Set(filePaths)]
          fc.pre(uniquePaths.length >= 2)
          
          // Access same content from different paths
          const results = uniquePaths.map(path => cache.getAST(path, content))
          
          // All should return the same cached object
          const firstResult = results[0]
          results.forEach(result => {
            expect(result).toBe(firstResult)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Feature: flow-graph-cache, Property 3: Cache Invalidation on Change
 * 
 * For any two different file contents, they SHALL produce different hashes,
 * and caching the second content SHALL replace the first in the cache.
 * 
 * **Validates: Requirements 1.3, 2.3, 3.3**
 */
describe('Property 3: Cache Invalidation on Change', () => {
  let cache: CacheManager

  beforeEach(() => {
    cache = new CacheManager({ maxEntries: 100 })
  })

  it('different content produces different hashes', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (uuid1, uuid2) => {
          // Skip if UUIDs are the same (extremely unlikely)
          fc.pre(uuid1 !== uuid2)
          
          const content1 = `content_${uuid1}`
          const content2 = `content_${uuid2}`
          
          const hash1 = computeHash(content1)
          const hash2 = computeHash(content2)
          
          // Different content should produce different hashes
          expect(hash1).not.toBe(hash2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('changing content updates the cached AST', () => {
    fc.assert(
      fc.property(
        filePathArb,
        fc.uuid(),
        fc.uuid(),
        (filePath, uuid1, uuid2) => {
          // Skip if UUIDs are the same
          fc.pre(uuid1 !== uuid2)
          
          const content1 = `label start_${uuid1}:\n    "Hello ${uuid1}!"\n`
          const content2 = `label start_${uuid2}:\n    "Hello ${uuid2}!"\n`
          
          // Cache first content
          const ast1 = cache.getAST(filePath, content1)
          const hash1 = cache.getFileHash(filePath)
          
          // Cache second content (should update file hash mapping)
          const ast2 = cache.getAST(filePath, content2)
          const hash2 = cache.getFileHash(filePath)
          
          // Hashes should be different
          expect(hash1).not.toBe(hash2)
          
          // AST objects should be different
          expect(ast1).not.toBe(ast2)
          
          // File should still be cached (with new content)
          expect(cache.isCached(filePath)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('changing content updates the cached FlowGraph', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (hash1, hash2) => {
          // Skip if hashes are the same
          fc.pre(hash1 !== hash2)
          
          let buildCount = 0
          const buildFn = () => {
            buildCount++
            return { nodes: [], edges: [] }
          }
          
          // Cache first graph
          const graph1 = cache.getFlowGraph(hash1, buildFn)
          
          // Cache second graph (different hash)
          const graph2 = cache.getFlowGraph(hash2, buildFn)
          
          // Both should have been built
          expect(buildCount).toBe(2)
          
          // Graphs should be different objects
          expect(graph1).not.toBe(graph2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('invalidate removes file from cache', () => {
    fc.assert(
      fc.property(
        filePathArb,
        renpyContentArb,
        (filePath, content) => {
          // Cache the content
          cache.getAST(filePath, content)
          expect(cache.isCached(filePath)).toBe(true)
          
          // Invalidate
          cache.invalidate(filePath)
          
          // Should no longer be cached
          expect(cache.isCached(filePath)).toBe(false)
          expect(cache.getFileHash(filePath)).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('re-caching after invalidation re-parses the content', () => {
    fc.assert(
      fc.property(
        filePathArb,
        renpyContentArb,
        (filePath, content) => {
          // Use a fresh cache for each test to ensure isolation
          const freshCache = new CacheManager({ maxEntries: 100 })
          
          // Cache the content - first miss
          freshCache.getAST(filePath, content)
          expect(freshCache.getStats().misses).toBe(1)
          
          // Invalidate
          freshCache.invalidate(filePath)
          
          // Re-cache same content - should be a cache miss (re-parse)
          freshCache.getAST(filePath, content)
          
          // Should have two misses total (original + re-parse after invalidation)
          expect(freshCache.getStats().misses).toBe(2)
          
          // File should be cached again
          expect(freshCache.isCached(filePath)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Feature: flow-graph-cache, Property 4: Entry Count Limit
 * 
 * For any sequence of cache operations, the number of cached entries 
 * SHALL never exceed the configured maximum.
 * 
 * **Validates: Requirements 4.1**
 */
describe('Property 4: Entry Count Limit', () => {
  it('cache entry count never exceeds maxEntries', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // maxEntries config
        fc.array(fc.uuid(), { minLength: 1, maxLength: 50 }), // file operations
        (maxEntries, uuids) => {
          const cache = new CacheManager({ maxEntries })
          
          // Perform cache operations
          for (const uuid of uuids) {
            const filePath = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            cache.getAST(filePath, content)
            
            // After each operation, entry count should not exceed limit
            const stats = cache.getStats()
            expect(stats.astEntryCount).toBeLessThanOrEqual(maxEntries)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('cache maintains limit after mixed operations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 8 }), // maxEntries config
        fc.array(
          fc.record({
            uuid: fc.uuid(),
            operation: fc.constantFrom('add', 'access', 'invalidate')
          }),
          { minLength: 5, maxLength: 30 }
        ),
        (maxEntries, operations) => {
          const cache = new CacheManager({ maxEntries })
          const addedFiles: string[] = []
          
          for (const op of operations) {
            const filePath = `test_${op.uuid}.rpy`
            const content = `label start_${op.uuid}:\n    "Hello ${op.uuid}!"\n`
            
            switch (op.operation) {
              case 'add':
                cache.getAST(filePath, content)
                if (!addedFiles.includes(filePath)) {
                  addedFiles.push(filePath)
                }
                break
              case 'access':
                // Access an existing file if any
                if (addedFiles.length > 0) {
                  const existingPath = addedFiles[0]
                  const existingUuid = existingPath.replace('test_', '').replace('.rpy', '')
                  const existingContent = `label start_${existingUuid}:\n    "Hello ${existingUuid}!"\n`
                  cache.getAST(existingPath, existingContent)
                }
                break
              case 'invalidate':
                cache.invalidate(filePath)
                break
            }
            
            // After each operation, entry count should not exceed limit
            const stats = cache.getStats()
            expect(stats.astEntryCount).toBeLessThanOrEqual(maxEntries)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Feature: flow-graph-cache, Property 5: LRU Eviction Order
 * 
 * For any cache that is full, adding a new entry SHALL evict the least 
 * recently accessed entry, not any recently accessed entries.
 * 
 * **Validates: Requirements 4.2**
 */
describe('Property 5: LRU Eviction Order', () => {
  it('recently accessed entries survive eviction', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }), // maxEntries
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 10 }), // access pattern indices
        (maxEntries, accessPattern) => {
          const cache = new CacheManager({ maxEntries })
          
          // Fill the cache to capacity
          const files: Array<{ path: string; content: string; uuid: string }> = []
          for (let i = 0; i < maxEntries; i++) {
            const uuid = `initial_${i}_${Date.now()}_${Math.random()}`
            const path = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            cache.getAST(path, content)
            files.push({ path, content, uuid })
          }
          
          // Access some entries to make them "recently used"
          // Pick the first entry to keep alive
          const keptFile = files[0]
          for (const idx of accessPattern) {
            // Always access the first file to keep it alive
            cache.getAST(keptFile.path, keptFile.content)
          }
          
          // Add fewer new entries than maxEntries to trigger eviction
          // but not evict all entries. Add maxEntries - 1 new entries
          // so the most recently accessed entry survives.
          const newEntries = maxEntries - 1
          for (let i = 0; i < newEntries; i++) {
            const uuid = `new_${i}_${Date.now()}_${Math.random()}`
            const path = `new_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            cache.getAST(path, content)
            
            // The recently accessed file should still be cached
            expect(cache.isCached(keptFile.path)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('least recently used entries are evicted first', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 6 }), // maxEntries
        (maxEntries) => {
          const cache = new CacheManager({ maxEntries })
          
          // Create files with known order
          const files: Array<{ path: string; content: string }> = []
          for (let i = 0; i < maxEntries; i++) {
            const uuid = `ordered_${i}_${Date.now()}_${Math.random()}`
            const path = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            cache.getAST(path, content)
            files.push({ path, content })
          }
          
          // Access files in reverse order (making first files least recently used)
          for (let i = files.length - 1; i >= 0; i--) {
            cache.getAST(files[i].path, files[i].content)
          }
          
          // Now files[0] is most recently used, files[maxEntries-1] is least recently used
          
          // Add a new entry to trigger eviction
          const newUuid = `trigger_${Date.now()}_${Math.random()}`
          const newPath = `trigger_${newUuid}.rpy`
          const newContent = `label start_${newUuid}:\n    "Hello ${newUuid}!"\n`
          cache.getAST(newPath, newContent)
          
          // The most recently accessed file (files[0]) should still be cached
          expect(cache.isCached(files[0].path)).toBe(true)
          
          // The least recently accessed file (files[maxEntries-1]) should be evicted
          expect(cache.isCached(files[maxEntries - 1].path)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('access order determines eviction order', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(
          [0, 1, 2, 3, 4],
          { minLength: 5, maxLength: 5 }
        ), // access order permutation
        (accessOrder) => {
          const maxEntries = 5
          const cache = new CacheManager({ maxEntries })
          
          // Create 5 files
          const files: Array<{ path: string; content: string }> = []
          for (let i = 0; i < maxEntries; i++) {
            const uuid = `perm_${i}_${Date.now()}_${Math.random()}`
            const path = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            cache.getAST(path, content)
            files.push({ path, content })
          }
          
          // Access files in the given order
          for (const idx of accessOrder) {
            cache.getAST(files[idx].path, files[idx].content)
          }
          
          // The last accessed file should survive eviction
          const lastAccessedIdx = accessOrder[accessOrder.length - 1]
          
          // Add new entries to trigger eviction
          for (let i = 0; i < 3; i++) {
            const uuid = `evict_${i}_${Date.now()}_${Math.random()}`
            const path = `evict_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            cache.getAST(path, content)
          }
          
          // The last accessed file should still be cached
          expect(cache.isCached(files[lastAccessedIdx].path)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Feature: flow-graph-cache, Property 6: Statistics Accuracy
 * 
 * For any sequence of cache operations with N hits and M misses, 
 * the statistics SHALL report exactly N hits and M misses.
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
describe('Property 6: Statistics Accuracy', () => {
  it('statistics accurately track hits and misses for AST operations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            uuid: fc.uuid(),
            isRepeat: fc.boolean()
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (operations) => {
          const cache = new CacheManager({ maxEntries: 100 })
          
          let expectedHits = 0
          let expectedMisses = 0
          const seenContent = new Set<string>()
          
          for (const op of operations) {
            const filePath = `test_${op.uuid}.rpy`
            const content = `label start_${op.uuid}:\n    "Hello ${op.uuid}!"\n`
            
            // Determine if this will be a hit or miss based on content hash
            const willBeHit = seenContent.has(content)
            
            cache.getAST(filePath, content)
            
            if (willBeHit) {
              expectedHits++
            } else {
              expectedMisses++
              seenContent.add(content)
            }
            
            // Verify statistics match expected values
            const stats = cache.getStats()
            expect(stats.hits).toBe(expectedHits)
            expect(stats.misses).toBe(expectedMisses)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('statistics accurately track hits and misses for FlowGraph operations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            hash: fc.uuid(),
            isRepeat: fc.boolean()
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (operations) => {
          const cache = new CacheManager({ maxEntries: 100 })
          
          let expectedHits = 0
          let expectedMisses = 0
          const seenHashes = new Set<string>()
          
          for (const op of operations) {
            const hash = op.hash
            const buildFn = () => ({ nodes: [], edges: [] })
            
            // Determine if this will be a hit or miss
            const willBeHit = seenHashes.has(hash)
            
            cache.getFlowGraph(hash, buildFn)
            
            if (willBeHit) {
              expectedHits++
            } else {
              expectedMisses++
              seenHashes.add(hash)
            }
            
            // Verify statistics match expected values
            const stats = cache.getStats()
            expect(stats.hits).toBe(expectedHits)
            expect(stats.misses).toBe(expectedMisses)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('hit rate calculation is accurate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // number of unique contents (at least 1)
        fc.integer({ min: 0, max: 20 }), // number of repeat accesses
        (uniqueCount, repeatCount) => {
          const cache = new CacheManager({ maxEntries: 100 })
          
          // Generate unique contents
          const contents: Array<{ path: string; content: string }> = []
          for (let i = 0; i < uniqueCount; i++) {
            const uuid = `unique_${i}_${Date.now()}_${Math.random()}`
            contents.push({
              path: `test_${uuid}.rpy`,
              content: `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            })
          }
          
          // First pass: all misses (unique contents)
          for (const { path, content } of contents) {
            cache.getAST(path, content)
          }
          
          // Second pass: all hits (repeat accesses)
          for (let i = 0; i < repeatCount; i++) {
            const idx = i % contents.length
            cache.getAST(contents[idx].path, contents[idx].content)
          }
          
          const stats = cache.getStats()
          const expectedMisses = uniqueCount
          const expectedHits = repeatCount
          const total = expectedHits + expectedMisses
          const expectedHitRate = total > 0 ? (expectedHits / total) * 100 : 0
          
          expect(stats.hits).toBe(expectedHits)
          expect(stats.misses).toBe(expectedMisses)
          expect(stats.hitRate).toBeCloseTo(expectedHitRate, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('entry counts are accurate after operations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
        (uuids) => {
          const cache = new CacheManager({ maxEntries: 100 })
          
          const uniqueContents = new Set<string>()
          
          for (const uuid of uuids) {
            const filePath = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            
            cache.getAST(filePath, content)
            uniqueContents.add(content)
            
            // AST entry count should match unique content count
            const stats = cache.getStats()
            expect(stats.astEntryCount).toBe(uniqueContents.size)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('memory usage is non-negative and increases with entries', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 15 }),
        (uuids) => {
          const cache = new CacheManager({ maxEntries: 100 })
          
          let previousMemory = 0
          const uniqueContents = new Set<string>()
          
          for (const uuid of uuids) {
            const filePath = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            
            const isNewContent = !uniqueContents.has(content)
            uniqueContents.add(content)
            
            cache.getAST(filePath, content)
            
            const stats = cache.getStats()
            
            // Memory should always be non-negative
            expect(stats.memoryUsage).toBeGreaterThanOrEqual(0)
            
            // Memory should increase when new content is added
            if (isNewContent) {
              expect(stats.memoryUsage).toBeGreaterThan(previousMemory)
            }
            
            previousMemory = stats.memoryUsage
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('isCached correctly reports cache status', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 15 }),
        (uuids) => {
          const cache = new CacheManager({ maxEntries: 100 })
          
          const cachedFiles = new Set<string>()
          
          for (const uuid of uuids) {
            const filePath = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            
            // Before caching, file should not be cached
            if (!cachedFiles.has(filePath)) {
              expect(cache.isCached(filePath)).toBe(false)
            }
            
            cache.getAST(filePath, content)
            cachedFiles.add(filePath)
            
            // After caching, file should be cached
            expect(cache.isCached(filePath)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('getFileHash returns correct hash for cached files', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 15 }),
        (uuids) => {
          const cache = new CacheManager({ maxEntries: 100 })
          
          for (const uuid of uuids) {
            const filePath = `test_${uuid}.rpy`
            const content = `label start_${uuid}:\n    "Hello ${uuid}!"\n`
            
            // Before caching, hash should be undefined
            expect(cache.getFileHash(filePath)).toBeUndefined()
            
            cache.getAST(filePath, content)
            
            // After caching, hash should be defined and consistent
            const hash = cache.getFileHash(filePath)
            expect(hash).toBeDefined()
            expect(typeof hash).toBe('string')
            expect(hash!.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
