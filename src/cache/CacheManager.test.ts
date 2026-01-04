/**
 * CacheManager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CacheManager } from './CacheManager'
import { computeHash } from './hashUtils'

describe('CacheManager', () => {
  let cache: CacheManager

  beforeEach(() => {
    cache = new CacheManager({ maxEntries: 5 })
  })

  describe('computeHash', () => {
    it('should produce consistent hashes', () => {
      const content = 'label start:\n    "Hello, world!"'
      const hash1 = computeHash(content)
      const hash2 = computeHash(content)
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different content', () => {
      const hash1 = computeHash('content A')
      const hash2 = computeHash('content B')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('getAST', () => {
    it('should parse and cache AST', () => {
      const content = 'label start:\n    "Hello, world!"'
      const ast = cache.getAST('test.rpy', content)
      
      expect(ast).toBeDefined()
      expect(ast.statements.length).toBeGreaterThan(0)
      expect(cache.isCached('test.rpy')).toBe(true)
    })

    it('should return cached AST on second call', () => {
      const content = 'label start:\n    "Hello, world!"'
      
      const ast1 = cache.getAST('test.rpy', content)
      const ast2 = cache.getAST('test.rpy', content)
      
      // Should be the same object (cached)
      expect(ast1).toBe(ast2)
      
      const stats = cache.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
    })

    it('should re-parse when content changes', () => {
      const content1 = 'label start:\n    "Hello"'
      const content2 = 'label start:\n    "World"'
      
      const ast1 = cache.getAST('test.rpy', content1)
      const ast2 = cache.getAST('test.rpy', content2)
      
      // Should be different objects
      expect(ast1).not.toBe(ast2)
      
      const stats = cache.getStats()
      expect(stats.misses).toBe(2)
    })
  })

  describe('getFlowGraph', () => {
    it('should cache flow graph', () => {
      const hash = 'test-hash'
      let buildCount = 0
      
      const buildFn = () => {
        buildCount++
        return { nodes: [], edges: [] }
      }
      
      const graph1 = cache.getFlowGraph(hash, buildFn)
      const graph2 = cache.getFlowGraph(hash, buildFn)
      
      expect(graph1).toBe(graph2)
      expect(buildCount).toBe(1) // Only built once
    })
  })

  describe('invalidate', () => {
    it('should invalidate cache for a file', () => {
      const content = 'label start:\n    "Hello"'
      cache.getAST('test.rpy', content)
      
      expect(cache.isCached('test.rpy')).toBe(true)
      
      cache.invalidate('test.rpy')
      
      expect(cache.isCached('test.rpy')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should clear all caches', () => {
      cache.getAST('test1.rpy', 'label a:\n    "A"')
      cache.getAST('test2.rpy', 'label b:\n    "B"')
      
      const statsBefore = cache.getStats()
      expect(statsBefore.astEntryCount).toBe(2)
      
      cache.clear()
      
      const statsAfter = cache.getStats()
      expect(statsAfter.astEntryCount).toBe(0)
      expect(statsAfter.graphEntryCount).toBe(0)
    })
  })

  describe('LRU eviction', () => {
    it('should evict oldest entries when limit is reached', () => {
      // Cache has maxEntries = 5
      for (let i = 0; i < 7; i++) {
        cache.getAST(`test${i}.rpy`, `label l${i}:\n    "Content ${i}"`)
      }
      
      const stats = cache.getStats()
      expect(stats.astEntryCount).toBeLessThanOrEqual(5)
    })

    it('should keep recently accessed entries', () => {
      // Add 5 entries
      for (let i = 0; i < 5; i++) {
        cache.getAST(`test${i}.rpy`, `label l${i}:\n    "Content ${i}"`)
      }
      
      // Access the first entry again
      cache.getAST('test0.rpy', 'label l0:\n    "Content 0"')
      
      // Add 2 more entries (should evict test1 and test2)
      cache.getAST('test5.rpy', 'label l5:\n    "Content 5"')
      cache.getAST('test6.rpy', 'label l6:\n    "Content 6"')
      
      // test0 should still be cached (was recently accessed)
      expect(cache.isCached('test0.rpy')).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should track hit rate', () => {
      const content = 'label start:\n    "Hello"'
      
      // 1 miss
      cache.getAST('test.rpy', content)
      // 2 hits
      cache.getAST('test.rpy', content)
      cache.getAST('test.rpy', content)
      
      const stats = cache.getStats()
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(66.67, 0)
    })
  })
})
