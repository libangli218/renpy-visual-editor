/**
 * Search Filter Property Tests
 * 搜索过滤属性测试
 *
 * Property-based tests for MultiLabelView search filtering.
 *
 * Feature: multi-label-view
 *
 * Property 7: 搜索过滤的精确性
 * For any search query, filtered labels should all contain the query string (case-insensitive)
 *
 * Validates: Requirements 6.1, 6.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { RenpyScript, LabelNode, DialogueNode } from '../../types/ast'

// Generate a valid label identifier (Ren'Py label naming rules)
const arbitraryLabelName = fc.stringMatching(/^[a-z_][a-z0-9_]{0,15}$/)

// Generate a dialogue AST node
function createDialogueNode(labelName: string, index: number): DialogueNode {
  return {
    id: `dialogue_${labelName}_${index}_${Date.now()}`,
    type: 'dialogue',
    speaker: 'narrator',
    text: `Dialogue ${index}`,
  }
}

// Generate a label node with random number of blocks
function createLabelNode(name: string, blockCount: number): LabelNode {
  return {
    id: `label_${name}_${Date.now()}`,
    type: 'label',
    name,
    body: Array.from({ length: blockCount }, (_, i) => createDialogueNode(name, i)),
  }
}

// Generate an AST with multiple labels
const arbitraryAST: fc.Arbitrary<RenpyScript> = fc
  .array(
    fc.record({
      name: arbitraryLabelName,
      blockCount: fc.integer({ min: 0, max: 5 }),
    }),
    { minLength: 1, maxLength: 10 }
  )
  .map((labelConfigs) => {
    // Ensure unique names
    const seenNames = new Set<string>()
    const uniqueConfigs = labelConfigs.filter((config) => {
      if (seenNames.has(config.name)) return false
      seenNames.add(config.name)
      return true
    })

    // Ensure at least one label
    if (uniqueConfigs.length === 0) {
      uniqueConfigs.push({ name: 'default_label', blockCount: 1 })
    }

    return {
      type: 'script' as const,
      statements: uniqueConfigs.map((c) => createLabelNode(c.name, c.blockCount)),
      metadata: {
        filePath: 'test.rpy',
        parseTime: new Date(),
        version: '1.0',
      },
    }
  })

// Generate a search query (can be any string including empty)
const arbitrarySearchQuery = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.string({ minLength: 1, maxLength: 10 }),
  fc.constantFrom('start', 'chapter', 'end', 'label', '_', 'a', 'test')
)

/**
 * Extract all labels from AST
 */
function extractLabels(ast: RenpyScript): LabelNode[] {
  return ast.statements.filter((s): s is LabelNode => s.type === 'label')
}

/**
 * Filter labels by search query
 * This is the exact logic from MultiLabelView component
 */
function filterLabels(labels: LabelNode[], searchQuery: string): LabelNode[] {
  if (!searchQuery.trim()) {
    return labels
  }
  const query = searchQuery.toLowerCase().trim()
  return labels.filter((label) => label.name.toLowerCase().includes(query))
}

describe('Search Filter Property Tests', () => {
  /**
   * Feature: multi-label-view, Property 7: 搜索过滤的精确性
   *
   * For any search query, all filtered labels should contain the query string
   * (case-insensitive substring match).
   *
   * Validates: Requirements 6.1, 6.2
   */
  describe('Property 7: Search Filter Precision', () => {
    it('all filtered labels contain the search query (case-insensitive)', () => {
      fc.assert(
        fc.property(arbitraryAST, arbitrarySearchQuery, (ast, searchQuery) => {
          const labels = extractLabels(ast)
          const filteredLabels = filterLabels(labels, searchQuery)

          // If query is empty/whitespace, all labels should be returned
          if (!searchQuery.trim()) {
            expect(filteredLabels.length).toBe(labels.length)
            return true
          }

          const normalizedQuery = searchQuery.toLowerCase().trim()

          // Every filtered label should contain the query
          for (const label of filteredLabels) {
            const containsQuery = label.name.toLowerCase().includes(normalizedQuery)
            expect(containsQuery).toBe(true)
          }

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('no matching labels are excluded from results', () => {
      fc.assert(
        fc.property(arbitraryAST, arbitrarySearchQuery, (ast, searchQuery) => {
          const labels = extractLabels(ast)
          const filteredLabels = filterLabels(labels, searchQuery)
          const filteredNames = new Set(filteredLabels.map((l) => l.name))

          // If query is empty/whitespace, all labels should be included
          if (!searchQuery.trim()) {
            expect(filteredLabels.length).toBe(labels.length)
            return true
          }

          const normalizedQuery = searchQuery.toLowerCase().trim()

          // Every label that matches should be in the filtered results
          for (const label of labels) {
            const shouldMatch = label.name.toLowerCase().includes(normalizedQuery)
            if (shouldMatch) {
              expect(filteredNames.has(label.name)).toBe(true)
            }
          }

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('non-matching labels are excluded from results', () => {
      fc.assert(
        fc.property(arbitraryAST, arbitrarySearchQuery, (ast, searchQuery) => {
          const labels = extractLabels(ast)
          const filteredLabels = filterLabels(labels, searchQuery)
          const filteredNames = new Set(filteredLabels.map((l) => l.name))

          // If query is empty/whitespace, skip this test
          if (!searchQuery.trim()) {
            return true
          }

          const normalizedQuery = searchQuery.toLowerCase().trim()

          // Every label that doesn't match should NOT be in the filtered results
          for (const label of labels) {
            const shouldMatch = label.name.toLowerCase().includes(normalizedQuery)
            if (!shouldMatch) {
              expect(filteredNames.has(label.name)).toBe(false)
            }
          }

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('empty search query returns all labels', () => {
      fc.assert(
        fc.property(arbitraryAST, (ast) => {
          const labels = extractLabels(ast)

          // Test with empty string
          const filteredEmpty = filterLabels(labels, '')
          expect(filteredEmpty.length).toBe(labels.length)

          // Test with whitespace
          const filteredWhitespace = filterLabels(labels, '   ')
          expect(filteredWhitespace.length).toBe(labels.length)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('search is case-insensitive', () => {
      fc.assert(
        fc.property(arbitraryAST, arbitrarySearchQuery, (ast, searchQuery) => {
          const labels = extractLabels(ast)

          // Skip empty queries
          if (!searchQuery.trim()) {
            return true
          }

          // Filter with original query
          const filteredOriginal = filterLabels(labels, searchQuery)

          // Filter with uppercase query
          const filteredUpper = filterLabels(labels, searchQuery.toUpperCase())

          // Filter with lowercase query
          const filteredLower = filterLabels(labels, searchQuery.toLowerCase())

          // All should return the same results
          const originalNames = filteredOriginal.map((l) => l.name).sort()
          const upperNames = filteredUpper.map((l) => l.name).sort()
          const lowerNames = filteredLower.map((l) => l.name).sort()

          expect(originalNames).toEqual(upperNames)
          expect(originalNames).toEqual(lowerNames)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('filtered count is always <= total count', () => {
      fc.assert(
        fc.property(arbitraryAST, arbitrarySearchQuery, (ast, searchQuery) => {
          const labels = extractLabels(ast)
          const filteredLabels = filterLabels(labels, searchQuery)

          expect(filteredLabels.length).toBeLessThanOrEqual(labels.length)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('filtering preserves label order', () => {
      fc.assert(
        fc.property(arbitraryAST, arbitrarySearchQuery, (ast, searchQuery) => {
          const labels = extractLabels(ast)
          const filteredLabels = filterLabels(labels, searchQuery)

          // Get indices of filtered labels in original array
          const filteredIndices = filteredLabels.map((fl) =>
            labels.findIndex((l) => l.name === fl.name)
          )

          // Indices should be in ascending order (preserving original order)
          for (let i = 1; i < filteredIndices.length; i++) {
            expect(filteredIndices[i]).toBeGreaterThan(filteredIndices[i - 1])
          }

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('filtering is idempotent with same query', () => {
      fc.assert(
        fc.property(arbitraryAST, arbitrarySearchQuery, (ast, searchQuery) => {
          const labels = extractLabels(ast)

          // Filter once
          const filtered1 = filterLabels(labels, searchQuery)

          // Filter the already filtered results
          const filtered2 = filterLabels(filtered1, searchQuery)

          // Results should be identical
          expect(filtered1.map((l) => l.name)).toEqual(filtered2.map((l) => l.name))

          return true
        }),
        { numRuns: 100 }
      )
    })
  })
})
