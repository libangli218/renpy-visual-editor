/**
 * CollapsibleBlock Property Tests
 * 可折叠积木组件属性测试
 * 
 * Property-based tests for block collapse summary correctness.
 * 
 * **Property 9: 积木折叠摘要正确性**
 * *For any* 被折叠的容器积木，显示的摘要应该正确反映其内部积木的数量和类型
 * **Validates: Requirements 15.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { Block, BlockType, BlockCategory } from '../types'
import { calculateBlockSummary, getDetailedSummary, BlockSummary } from './CollapsibleBlock'
import { getBlockDefinition } from '../constants'

// ============================================================================
// Arbitrary Generators for Blocks
// ============================================================================

// Generate unique block ID
let blockIdCounter = 0
const generateBlockId = () => `test_block_${++blockIdCounter}_${Date.now()}`

// Available block types for testing
const BLOCK_TYPES: BlockType[] = [
  'dialogue', 'scene', 'show', 'hide', 'with',
  'menu', 'choice', 'jump', 'call', 'return',
  'if', 'elif', 'else',
  'play-music', 'stop-music', 'play-sound',
  'python', 'comment'
]

// Block type to category mapping
const TYPE_TO_CATEGORY: Record<BlockType, BlockCategory> = {
  'label': 'flow',
  'menu': 'flow',
  'choice': 'flow',
  'if': 'flow',
  'elif': 'flow',
  'else': 'flow',
  'dialogue': 'dialogue',
  'scene': 'scene',
  'show': 'scene',
  'hide': 'scene',
  'with': 'scene',
  'play-music': 'audio',
  'stop-music': 'audio',
  'play-sound': 'audio',
  'jump': 'flow',
  'call': 'flow',
  'return': 'flow',
  'python': 'advanced',
  'comment': 'advanced',
}

// Arbitrary block type
const arbitraryBlockType: fc.Arbitrary<BlockType> = fc.constantFrom(...BLOCK_TYPES)

// Arbitrary simple block (no children)
const arbitrarySimpleBlock: fc.Arbitrary<Block> = arbitraryBlockType.map(type => ({
  id: generateBlockId(),
  type,
  category: TYPE_TO_CATEGORY[type],
  astNodeId: `ast_${generateBlockId()}`,
  slots: [],
  collapsed: false,
  selected: false,
  hasError: false,
}))

// Arbitrary array of simple blocks
const arbitraryBlockArray = (minLength: number, maxLength: number): fc.Arbitrary<Block[]> =>
  fc.array(arbitrarySimpleBlock, { minLength, maxLength })

// Arbitrary container block with children
const arbitraryContainerBlock = (childrenGen: fc.Arbitrary<Block[]>): fc.Arbitrary<Block> =>
  fc.tuple(
    fc.constantFrom<BlockType>('label', 'menu', 'choice', 'if'),
    childrenGen
  ).map(([type, children]) => ({
    id: generateBlockId(),
    type,
    category: TYPE_TO_CATEGORY[type],
    astNodeId: `ast_${generateBlockId()}`,
    slots: [],
    children,
    collapsed: false,
    selected: false,
    hasError: false,
  }))

// ============================================================================
// Property Tests
// ============================================================================

/**
 * Feature: block-editor-mode, Property 9: 积木折叠摘要正确性
 * 
 * For any collapsed container block, the displayed summary should correctly
 * reflect the number and types of its internal blocks.
 * 
 * **Validates: Requirements 15.2**
 */
describe('Property 9: 积木折叠摘要正确性 (Block Collapse Summary Correctness)', () => {

  /**
   * Property 9.1: Summary total count matches actual children count
   */
  it('summary total count matches actual children count', () => {
    fc.assert(
      fc.property(
        arbitraryContainerBlock(arbitraryBlockArray(0, 20)),
        (containerBlock) => {
          const summary = calculateBlockSummary(containerBlock)
          const actualCount = containerBlock.children?.length ?? 0
          
          // Total count should match actual children count
          expect(summary.totalCount).toBe(actualCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.2: Summary byType counts sum to total count
   */
  it('summary byType counts sum to total count', () => {
    fc.assert(
      fc.property(
        arbitraryContainerBlock(arbitraryBlockArray(0, 20)),
        (containerBlock) => {
          const summary = calculateBlockSummary(containerBlock)
          
          // Sum of all type counts should equal total count
          const sumOfTypeCounts = Object.values(summary.byType).reduce((a, b) => a + b, 0)
          expect(sumOfTypeCounts).toBe(summary.totalCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.3: Each type count in byType matches actual count of that type
   */
  it('each type count in byType matches actual count of that type', () => {
    fc.assert(
      fc.property(
        arbitraryContainerBlock(arbitraryBlockArray(1, 20)),
        (containerBlock) => {
          const summary = calculateBlockSummary(containerBlock)
          const children = containerBlock.children ?? []
          
          // For each type in summary, count should match actual
          for (const [type, count] of Object.entries(summary.byType)) {
            const actualCount = children.filter(c => c.type === type).length
            expect(count).toBe(actualCount)
          }
          
          // All types present in children should be in byType
          const childTypes = new Set(children.map(c => c.type))
          for (const type of childTypes) {
            expect(summary.byType[type]).toBeDefined()
            expect(summary.byType[type]).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.4: Empty container has correct summary
   */
  it('empty container has correct summary', () => {
    fc.assert(
      fc.property(
        arbitraryContainerBlock(fc.constant([])),
        (containerBlock) => {
          const summary = calculateBlockSummary(containerBlock)
          
          expect(summary.totalCount).toBe(0)
          expect(Object.keys(summary.byType).length).toBe(0)
          expect(summary.text).toBe('空')
          expect(summary.dominantType).toBeUndefined()
          // dominantCount is undefined for empty containers (no dominant type)
          expect(summary.dominantCount).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.5: Dominant type is the most common type
   */
  it('dominant type is the most common type', () => {
    fc.assert(
      fc.property(
        arbitraryContainerBlock(arbitraryBlockArray(1, 20)),
        (containerBlock) => {
          const summary = calculateBlockSummary(containerBlock)
          
          if (summary.totalCount > 0 && summary.dominantType) {
            // Dominant count should be the maximum count
            const maxCount = Math.max(...Object.values(summary.byType))
            expect(summary.dominantCount).toBe(maxCount)
            
            // Dominant type should have the dominant count
            expect(summary.byType[summary.dominantType]).toBe(summary.dominantCount)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.6: Summary text contains count information
   */
  it('summary text contains count information', () => {
    fc.assert(
      fc.property(
        arbitraryContainerBlock(arbitraryBlockArray(1, 20)),
        (containerBlock) => {
          const summary = calculateBlockSummary(containerBlock)
          
          // Summary text should not be empty for non-empty containers
          expect(summary.text.length).toBeGreaterThan(0)
          
          // Summary text should contain a number
          expect(summary.text).toMatch(/\d+/)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.7: Single type container shows type label in summary
   */
  it('single type container shows type label in summary', () => {
    // Generate container with all children of the same type
    const singleTypeContainer = fc.tuple(
      arbitraryBlockType,
      fc.integer({ min: 1, max: 10 })
    ).map(([type, count]) => {
      const children: Block[] = Array.from({ length: count }, () => ({
        id: generateBlockId(),
        type,
        category: TYPE_TO_CATEGORY[type],
        astNodeId: `ast_${generateBlockId()}`,
        slots: [],
        collapsed: false,
        selected: false,
        hasError: false,
      }))
      
      return {
        id: generateBlockId(),
        type: 'menu' as BlockType,
        category: 'flow' as BlockCategory,
        astNodeId: `ast_${generateBlockId()}`,
        slots: [],
        children,
        collapsed: false,
        selected: false,
        hasError: false,
      }
    })
    
    fc.assert(
      fc.property(singleTypeContainer, (containerBlock) => {
        const summary = calculateBlockSummary(containerBlock)
        const childType = containerBlock.children![0].type
        const def = getBlockDefinition(childType)
        
        // Summary should contain the type label
        if (def?.label) {
          expect(summary.text).toContain(def.label)
        }
        
        // Summary should contain the count
        expect(summary.text).toContain(String(containerBlock.children!.length))
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.8: Detailed summary contains all types
   */
  it('detailed summary contains all types present in children', () => {
    fc.assert(
      fc.property(
        arbitraryContainerBlock(arbitraryBlockArray(1, 20)),
        (containerBlock) => {
          const detailed = getDetailedSummary(containerBlock)
          const children = containerBlock.children ?? []
          
          // Get unique types from children
          const childTypes = new Set(children.map(c => c.type))
          
          // Detailed summary should have entry for each type
          expect(detailed.length).toBe(childTypes.size)
          
          // Each type should be represented
          const detailedTypes = new Set(detailed.map(d => d.type))
          for (const type of childTypes) {
            expect(detailedTypes.has(type)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.9: Detailed summary is sorted by count descending
   */
  it('detailed summary is sorted by count descending', () => {
    fc.assert(
      fc.property(
        arbitraryContainerBlock(arbitraryBlockArray(1, 20)),
        (containerBlock) => {
          const detailed = getDetailedSummary(containerBlock)
          
          // Check that counts are in descending order
          for (let i = 1; i < detailed.length; i++) {
            expect(detailed[i - 1].count).toBeGreaterThanOrEqual(detailed[i].count)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.10: Detailed summary counts match byType counts
   */
  it('detailed summary counts match byType counts', () => {
    fc.assert(
      fc.property(
        arbitraryContainerBlock(arbitraryBlockArray(1, 20)),
        (containerBlock) => {
          const summary = calculateBlockSummary(containerBlock)
          const detailed = getDetailedSummary(containerBlock)
          
          // Each detailed entry should match byType
          for (const entry of detailed) {
            expect(entry.count).toBe(summary.byType[entry.type])
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.11: Detailed summary has correct icons and labels
   */
  it('detailed summary has correct icons and labels from block definitions', () => {
    fc.assert(
      fc.property(
        arbitraryContainerBlock(arbitraryBlockArray(1, 20)),
        (containerBlock) => {
          const detailed = getDetailedSummary(containerBlock)
          
          for (const entry of detailed) {
            const def = getBlockDefinition(entry.type)
            
            // Icon should match definition or be default
            if (def?.icon) {
              expect(entry.icon).toBe(def.icon)
            } else {
              expect(entry.icon).toBe('📦')
            }
            
            // Label should match definition or be type name
            if (def?.label) {
              expect(entry.label).toBe(def.label)
            } else {
              expect(entry.label).toBe(entry.type)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.12: Block without children array returns empty summary
   */
  it('block without children array returns empty summary', () => {
    const blockWithoutChildren: Block = {
      id: 'test',
      type: 'dialogue',
      category: 'dialogue',
      astNodeId: 'ast_test',
      slots: [],
      // No children property
      collapsed: false,
      selected: false,
      hasError: false,
    }
    
    const summary = calculateBlockSummary(blockWithoutChildren)
    
    expect(summary.totalCount).toBe(0)
    expect(summary.text).toBe('空')
    expect(Object.keys(summary.byType).length).toBe(0)
  })
})
