/**
 * ContextView Property Tests
 * 上下文对话视图属性测试
 * 
 * Property-based tests for context dialogue retrieval.
 * 
 * **Property 8: 上下文对话获取正确性**
 * *For any* 对话积木，获取的上下文应该包含正确的前后相邻对话
 * **Validates: Requirements 13.1**
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { buildDialogueContext, getAdjacentDialogues } from './ContextView'
import { Block, BlockSlot, BlockType, BlockCategory } from './types'

// ============================================================================
// Arbitrary Generators
// ============================================================================

let blockIdCounter = 0

/**
 * Generate a unique block ID
 */
const generateBlockId = () => `ctx_block_${++blockIdCounter}_${Date.now()}`

/**
 * Generate a valid identifier for speaker names
 */
const arbitrarySpeaker = fc.option(
  fc.stringMatching(/^[A-Za-z][A-Za-z0-9_]{0,10}$/),
  { nil: undefined }
)

/**
 * Generate simple dialogue text
 */
const arbitraryDialogueText = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?'),
  { minLength: 1, maxLength: 100 }
)

/**
 * Create a dialogue block with arbitrary values
 */
const arbitraryDialogueBlock: fc.Arbitrary<Block> = fc.record({
  text: arbitraryDialogueText,
  speaker: arbitrarySpeaker,
}).map(({ text, speaker }) => {
  const slots: BlockSlot[] = []
  if (speaker) {
    slots.push({ name: 'speaker', type: 'character', value: speaker, required: false })
  }
  slots.push({ name: 'text', type: 'multiline', value: text, required: true })
  return {
    id: generateBlockId(),
    type: 'dialogue' as BlockType,
    category: 'dialogue' as BlockCategory,
    astNodeId: `ast_${Date.now()}`,
    slots,
    collapsed: false,
    selected: false,
    hasError: false,
  }
})

/**
 * Create a non-dialogue block (scene, show, etc.)
 */
const arbitraryNonDialogueBlock: fc.Arbitrary<Block> = fc.constantFrom(
  'scene', 'show', 'hide', 'play-music'
).map(type => ({
  id: generateBlockId(),
  type: type as BlockType,
  category: (type === 'play-music' ? 'audio' : 'scene') as BlockCategory,
  astNodeId: `ast_${Date.now()}`,
  slots: [
    { name: 'dummy', type: 'text' as const, value: 'test', required: false },
  ],
  collapsed: false,
  selected: false,
  hasError: false,
}))

/**
 * Create a mixed sequence of blocks (dialogues and non-dialogues)
 */
const arbitraryMixedBlockSequence = (minDialogues: number, maxDialogues: number): fc.Arbitrary<Block[]> =>
  fc.tuple(
    fc.array(arbitraryDialogueBlock, { minLength: minDialogues, maxLength: maxDialogues }),
    fc.array(arbitraryNonDialogueBlock, { minLength: 0, maxLength: 3 })
  ).map(([dialogues, others]) => {
    // Interleave dialogues and other blocks
    const result: Block[] = []
    let dIdx = 0
    let oIdx = 0
    
    while (dIdx < dialogues.length || oIdx < others.length) {
      // Randomly decide whether to add dialogue or other
      if (dIdx < dialogues.length && (oIdx >= others.length || Math.random() > 0.3)) {
        result.push(dialogues[dIdx++])
      } else if (oIdx < others.length) {
        result.push(others[oIdx++])
      }
    }
    
    return result
  })

/**
 * Create a label block containing children
 */
const createLabelBlock = (children: Block[]): Block => ({
  id: generateBlockId(),
  type: 'label' as BlockType,
  category: 'flow' as BlockCategory,
  astNodeId: `ast_label_${Date.now()}`,
  slots: [
    { name: 'name', type: 'text' as const, value: 'test_label', required: true },
  ],
  children,
  collapsed: false,
  selected: false,
  hasError: false,
})

// ============================================================================
// Property Tests
// ============================================================================

/**
 * Feature: block-editor-mode, Property 8: 上下文对话获取正确性
 * 
 * For any dialogue block, the retrieved context should contain
 * the correct adjacent dialogues in the correct order.
 * 
 * **Validates: Requirements 13.1**
 */
describe('Property 8: 上下文对话获取正确性 (Context Dialogue Retrieval Correctness)', () => {
  beforeEach(() => {
    blockIdCounter = 0
  })

  /**
   * Property 8.1: Context includes correct number of previous dialogues
   * Validates: Requirement 13.1
   */
  it('context includes up to contextBefore previous dialogues', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryDialogueBlock, { minLength: 5, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 2, max: 4 }),
        (dialogues, contextBefore, targetIndexOffset) => {
          const blockTree = createLabelBlock(dialogues)
          const targetIndex = Math.min(targetIndexOffset, dialogues.length - 1)
          const targetBlockId = dialogues[targetIndex].id
          
          const context = buildDialogueContext(blockTree, targetBlockId, contextBefore, 2)
          
          // Count items before current
          const itemsBefore = context.filter(item => item.position < 0)
          const expectedBefore = Math.min(contextBefore, targetIndex)
          
          expect(itemsBefore.length).toBe(expectedBefore)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8.2: Context includes correct number of following dialogues
   * Validates: Requirement 13.1
   */
  it('context includes up to contextAfter following dialogues', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryDialogueBlock, { minLength: 5, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 3 }),
        (dialogues, contextAfter, targetIndexOffset) => {
          const blockTree = createLabelBlock(dialogues)
          const targetIndex = Math.min(targetIndexOffset, dialogues.length - 1)
          const targetBlockId = dialogues[targetIndex].id
          
          const context = buildDialogueContext(blockTree, targetBlockId, 2, contextAfter)
          
          // Count items after current
          const itemsAfter = context.filter(item => item.position > 0)
          const expectedAfter = Math.min(contextAfter, dialogues.length - 1 - targetIndex)
          
          expect(itemsAfter.length).toBe(expectedAfter)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8.3: Current dialogue is always included and marked
   * Validates: Requirement 13.1
   */
  it('current dialogue is always included and marked as current', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryDialogueBlock, { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 0, max: 7 }),
        (dialogues, targetIndexRaw) => {
          const blockTree = createLabelBlock(dialogues)
          const targetIndex = targetIndexRaw % dialogues.length
          const targetBlockId = dialogues[targetIndex].id
          
          const context = buildDialogueContext(blockTree, targetBlockId, 3, 3)
          
          // Find current item
          const currentItem = context.find(item => item.isCurrent)
          
          expect(currentItem).toBeDefined()
          expect(currentItem?.blockId).toBe(targetBlockId)
          expect(currentItem?.position).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8.4: Context items are in correct order
   * Validates: Requirement 13.1
   */
  it('context items are in correct sequential order', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryDialogueBlock, { minLength: 3, maxLength: 10 }),
        fc.integer({ min: 1, max: 8 }),
        (dialogues, targetIndexRaw) => {
          const blockTree = createLabelBlock(dialogues)
          const targetIndex = targetIndexRaw % dialogues.length
          const targetBlockId = dialogues[targetIndex].id
          
          const context = buildDialogueContext(blockTree, targetBlockId, 3, 3)
          
          // Verify positions are sequential
          for (let i = 1; i < context.length; i++) {
            expect(context[i].position).toBe(context[i - 1].position + 1)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8.5: Context only includes dialogue blocks
   * Validates: Requirement 13.1
   */
  it('context only includes dialogue blocks, not other block types', () => {
    fc.assert(
      fc.property(
        arbitraryMixedBlockSequence(3, 8),
        (blocks) => {
          const dialogueBlocks = blocks.filter(b => b.type === 'dialogue')
          if (dialogueBlocks.length === 0) return // Skip if no dialogues
          
          const blockTree = createLabelBlock(blocks)
          const targetBlockId = dialogueBlocks[Math.floor(dialogueBlocks.length / 2)].id
          
          const context = buildDialogueContext(blockTree, targetBlockId, 5, 5)
          
          // All context items should correspond to dialogue blocks
          for (const item of context) {
            const block = blocks.find(b => b.id === item.blockId)
            expect(block?.type).toBe('dialogue')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8.6: Non-dialogue block returns empty context
   * Validates: Requirement 13.1
   */
  it('non-dialogue block returns empty context', () => {
    fc.assert(
      fc.property(
        arbitraryMixedBlockSequence(2, 5),
        (blocks) => {
          const nonDialogueBlocks = blocks.filter(b => b.type !== 'dialogue')
          if (nonDialogueBlocks.length === 0) return // Skip if no non-dialogues
          
          const blockTree = createLabelBlock(blocks)
          const targetBlockId = nonDialogueBlocks[0].id
          
          const context = buildDialogueContext(blockTree, targetBlockId, 3, 3)
          
          expect(context).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8.7: getAdjacentDialogues returns correct before/after counts
   * Validates: Requirement 13.1
   */
  it('getAdjacentDialogues returns correct adjacent dialogues', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryDialogueBlock, { minLength: 5, maxLength: 10 }),
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 1, max: 4 }),
        (dialogues, targetIndexRaw, count) => {
          const blockTree = createLabelBlock(dialogues)
          const targetIndex = targetIndexRaw % dialogues.length
          const targetBlockId = dialogues[targetIndex].id
          
          const { before, after } = getAdjacentDialogues(blockTree, targetBlockId, count)
          
          // Verify before count
          const expectedBeforeCount = Math.min(count, targetIndex)
          expect(before.length).toBe(expectedBeforeCount)
          
          // Verify after count
          const expectedAfterCount = Math.min(count, dialogues.length - 1 - targetIndex)
          expect(after.length).toBe(expectedAfterCount)
          
          // Verify before blocks are correct
          for (let i = 0; i < before.length; i++) {
            const expectedIndex = targetIndex - before.length + i
            expect(before[i].id).toBe(dialogues[expectedIndex].id)
          }
          
          // Verify after blocks are correct
          for (let i = 0; i < after.length; i++) {
            expect(after[i].id).toBe(dialogues[targetIndex + 1 + i].id)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8.8: Context text matches original block text
   * Validates: Requirement 13.1
   */
  it('context dialogue text matches original block text', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryDialogueBlock, { minLength: 3, maxLength: 8 }),
        fc.integer({ min: 0, max: 7 }),
        (dialogues, targetIndexRaw) => {
          const blockTree = createLabelBlock(dialogues)
          const targetIndex = targetIndexRaw % dialogues.length
          const targetBlockId = dialogues[targetIndex].id
          
          const context = buildDialogueContext(blockTree, targetBlockId, 3, 3)
          
          // Verify each context item's text matches the original
          for (const item of context) {
            const originalBlock = dialogues.find(b => b.id === item.blockId)
            const textSlot = originalBlock?.slots.find(s => s.name === 'text')
            
            expect(item.text).toBe(textSlot?.value || '')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8.9: Context speaker matches original block speaker
   * Validates: Requirement 13.1
   */
  it('context dialogue speaker matches original block speaker', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryDialogueBlock, { minLength: 3, maxLength: 8 }),
        fc.integer({ min: 0, max: 7 }),
        (dialogues, targetIndexRaw) => {
          const blockTree = createLabelBlock(dialogues)
          const targetIndex = targetIndexRaw % dialogues.length
          const targetBlockId = dialogues[targetIndex].id
          
          const context = buildDialogueContext(blockTree, targetBlockId, 3, 3)
          
          // Verify each context item's speaker matches the original
          for (const item of context) {
            const originalBlock = dialogues.find(b => b.id === item.blockId)
            const speakerSlot = originalBlock?.slots.find(s => s.name === 'speaker')
            
            expect(item.speaker).toBe(speakerSlot?.value || undefined)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8.10: Empty block tree returns empty context
   */
  it('empty or null block tree returns empty context', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined),
        fc.string(),
        (blockTree, targetId) => {
          const context = buildDialogueContext(blockTree as Block | null, targetId, 3, 3)
          expect(context).toHaveLength(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property 8.11: Non-existent target returns empty context
   */
  it('non-existent target block returns empty context', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryDialogueBlock, { minLength: 1, maxLength: 5 }),
        (dialogues) => {
          const blockTree = createLabelBlock(dialogues)
          
          const context = buildDialogueContext(blockTree, 'non_existent_id_xyz', 3, 3)
          
          expect(context).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8.12: First dialogue has no previous context
   */
  it('first dialogue has no previous dialogues in context', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryDialogueBlock, { minLength: 2, maxLength: 8 }),
        (dialogues) => {
          const blockTree = createLabelBlock(dialogues)
          const firstDialogueId = dialogues[0].id
          
          const context = buildDialogueContext(blockTree, firstDialogueId, 5, 3)
          
          // No items should have negative position
          const itemsBefore = context.filter(item => item.position < 0)
          expect(itemsBefore).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8.13: Last dialogue has no following context
   */
  it('last dialogue has no following dialogues in context', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryDialogueBlock, { minLength: 2, maxLength: 8 }),
        (dialogues) => {
          const blockTree = createLabelBlock(dialogues)
          const lastDialogueId = dialogues[dialogues.length - 1].id
          
          const context = buildDialogueContext(blockTree, lastDialogueId, 3, 5)
          
          // No items should have positive position
          const itemsAfter = context.filter(item => item.position > 0)
          expect(itemsAfter).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
