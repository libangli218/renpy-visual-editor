/**
 * Hash Utilities Property Tests
 * 
 * Property-based tests for hash computation functions.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { computeHash, estimateSize } from './hashUtils'

/**
 * Feature: flow-graph-cache, Property 1: Hash Determinism
 * 
 * For any file content string, computing the hash multiple times 
 * SHALL always produce the same result.
 * 
 * **Validates: Requirements 1.1**
 */
describe('Property 1: Hash Determinism', () => {
  it('computing hash multiple times produces the same result', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 10000 }),
        (content) => {
          const hash1 = computeHash(content)
          const hash2 = computeHash(content)
          const hash3 = computeHash(content)
          
          expect(hash1).toBe(hash2)
          expect(hash2).toBe(hash3)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('hash is deterministic across different call contexts', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 5000 }),
        fc.integer({ min: 1, max: 10 }),
        (content, repeatCount) => {
          const hashes: string[] = []
          
          for (let i = 0; i < repeatCount; i++) {
            hashes.push(computeHash(content))
          }
          
          // All hashes should be identical
          const firstHash = hashes[0]
          expect(hashes.every(h => h === firstHash)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('hash produces valid hex string format', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 5000 }),
        (content) => {
          const hash = computeHash(content)
          
          // Hash should be 8 characters (32-bit hex)
          expect(hash.length).toBe(8)
          
          // Hash should only contain hex characters
          expect(/^[0-9a-f]{8}$/.test(hash)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('different content produces different hashes (collision resistance)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.string({ minLength: 1, maxLength: 1000 }),
        (content1, content2) => {
          // Skip if contents are the same
          fc.pre(content1 !== content2)
          
          const hash1 = computeHash(content1)
          const hash2 = computeHash(content2)
          
          // Different content should (almost always) produce different hashes
          // Note: This is a probabilistic property - collisions are possible
          // but extremely rare for a good hash function
          expect(hash1).not.toBe(hash2)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('estimateSize', () => {
  it('returns positive size for any object', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        (obj) => {
          const size = estimateSize(obj)
          expect(size).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
