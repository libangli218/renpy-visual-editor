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
