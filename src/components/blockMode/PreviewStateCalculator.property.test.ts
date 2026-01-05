/**
 * PreviewStateCalculator Property Tests
 * 预览状态计算器属性测试
 * 
 * Property-based tests for preview state calculation.
 * 
 * **Property 4: 预览状态计算正确性**
 * *For any* 积木序列和目标积木，计算出的游戏状态应该正确反映执行到该积木后的场景状态
 * **Validates: Requirements 11.2, 11.3, 11.4**
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { PreviewStateCalculator } from './PreviewStateCalculator'
import { Block, BlockSlot, BlockType, BlockCategory } from './types'

// ============================================================================
// Arbitrary Generators
// ============================================================================

let blockIdCounter = 0

/**
 * Generate a unique block ID
 */
const generateBlockId = () => `prop_block_${++blockIdCounter}_${Date.now()}`

/**
 * Generate a valid identifier
 */
const arbitraryIdentifier = fc.stringMatching(/^[a-z_][a-z0-9_]{0,15}$/)

/**
 * Generate simple text
 */
const arbitrarySimpleText = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?'),
  { minLength: 1, maxLength: 50 }
)

/**
 * Generate a position value
 */
const arbitraryPosition = fc.constantFrom('left', 'center', 'right')

/**
 * Generate a transition value
 */
const arbitraryTransition = fc.constantFrom('dissolve', 'fade', 'pixellate', 'none')

/**
 * Create a scene block with arbitrary values
 */
const arbitrarySceneBlock: fc.Arbitrary<Block> = fc.record({
  image: arbitraryIdentifier,
  transition: fc.option(arbitraryTransition),
}).map(({ image, transition }) => {
  const slots: BlockSlot[] = [
    { name: 'image', type: 'image', value: image, required: true },
  ]
  if (transition) {
    slots.push({ name: 'transition', type: 'transition', value: transition, required: false })
  }
  return {
    id: generateBlockId(),
    type: 'scene' as BlockType,
    category: 'scene' as BlockCategory,
    astNodeId: `ast_${Date.now()}`,
    slots,
    collapsed: false,
    selected: false,
    hasError: false,
  }
})

/**
 * Create a show block with arbitrary values
 */
const arbitraryShowBlock: fc.Arbitrary<Block> = fc.record({
  character: arbitraryIdentifier,
  position: fc.option(arbitraryPosition),
  expression: fc.option(arbitraryIdentifier),
}).map(({ character, position, expression }) => {
  const slots: BlockSlot[] = [
    { name: 'character', type: 'character', value: character, required: true },
  ]
  if (position) {
    slots.push({ name: 'position', type: 'position', value: position, required: false })
  }
  if (expression) {
    slots.push({ name: 'expression', type: 'select', value: expression, required: false })
  }
  return {
    id: generateBlockId(),
    type: 'show' as BlockType,
    category: 'scene' as BlockCategory,
    astNodeId: `ast_${Date.now()}`,
    slots,
    collapsed: false,
    selected: false,
    hasError: false,
  }
})

/**
 * Create a hide block with arbitrary values
 */
const arbitraryHideBlock: fc.Arbitrary<Block> = arbitraryIdentifier.map(character => ({
  id: generateBlockId(),
  type: 'hide' as BlockType,
  category: 'scene' as BlockCategory,
  astNodeId: `ast_${Date.now()}`,
  slots: [
    { name: 'character', type: 'character', value: character, required: true },
  ],
  collapsed: false,
  selected: false,
  hasError: false,
}))

/**
 * Create a dialogue block with arbitrary values
 */
const arbitraryDialogueBlock: fc.Arbitrary<Block> = fc.record({
  text: arbitrarySimpleText,
  speaker: fc.option(arbitraryIdentifier),
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
 * Create a play-music block with arbitrary values
 */
const arbitraryPlayMusicBlock: fc.Arbitrary<Block> = arbitraryIdentifier.map(file => ({
  id: generateBlockId(),
  type: 'play-music' as BlockType,
  category: 'audio' as BlockCategory,
  astNodeId: `ast_${Date.now()}`,
  slots: [
    { name: 'file', type: 'audio', value: `${file}.ogg`, required: true },
  ],
  collapsed: false,
  selected: false,
  hasError: false,
}))

/**
 * Create a stop-music block
 */
const arbitraryStopMusicBlock: fc.Arbitrary<Block> = fc.constant(null).map(() => ({
  id: generateBlockId(),
  type: 'stop-music' as BlockType,
  category: 'audio' as BlockCategory,
  astNodeId: `ast_${Date.now()}`,
  slots: [],
  collapsed: false,
  selected: false,
  hasError: false,
}))

/**
 * Create any visual state-affecting block
 */
const arbitraryVisualBlock: fc.Arbitrary<Block> = fc.oneof(
  arbitrarySceneBlock,
  arbitraryShowBlock,
  arbitraryHideBlock,
  arbitraryDialogueBlock,
  arbitraryPlayMusicBlock,
  arbitraryStopMusicBlock
)

/**
 * Create a sequence of blocks
 */
const arbitraryBlockSequence = (minLength: number, maxLength: number): fc.Arbitrary<Block[]> =>
  fc.array(arbitraryVisualBlock, { minLength, maxLength })

// ============================================================================
// Property Tests
// ============================================================================

/**
 * Feature: block-editor-mode, Property 4: 预览状态计算正确性
 * 
 * For any block sequence and target block, the calculated game state
 * should correctly reflect the scene state after executing up to that block.
 * 
 * **Validates: Requirements 11.2, 11.3, 11.4**
 */
describe('Property 4: 预览状态计算正确性 (Preview State Calculation Correctness)', () => {
  let calculator: PreviewStateCalculator

  beforeEach(() => {
    calculator = new PreviewStateCalculator()
    blockIdCounter = 0
  })

  /**
   * Property 4.1: Scene block sets background correctly
   * Validates: Requirement 11.2
   */
  it('scene block always sets background to its image value', () => {
    fc.assert(
      fc.property(
        arbitrarySceneBlock,
        (sceneBlock) => {
          const state = calculator.calculateState([sceneBlock], sceneBlock.id)
          const imageSlot = sceneBlock.slots.find(s => s.name === 'image')
          
          expect(state.background).toBe(imageSlot?.value)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.2: Show block adds or updates character
   * Validates: Requirement 11.2
   */
  it('show block always results in character being present in state', () => {
    fc.assert(
      fc.property(
        arbitraryShowBlock,
        (showBlock) => {
          const state = calculator.calculateState([showBlock], showBlock.id)
          const characterSlot = showBlock.slots.find(s => s.name === 'character')
          const characterName = String(characterSlot?.value)
          
          const character = state.characters.find(c => c.name === characterName)
          expect(character).toBeDefined()
          expect(character?.name).toBe(characterName)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.3: Hide block removes character
   * Validates: Requirement 11.2
   */
  it('hide block always removes the specified character', () => {
    fc.assert(
      fc.property(
        arbitraryShowBlock,
        arbitraryHideBlock,
        (showBlock, hideBlock) => {
          // Ensure hide targets the same character as show
          const showCharSlot = showBlock.slots.find(s => s.name === 'character')
          const hideCharSlot = hideBlock.slots.find(s => s.name === 'character')
          hideCharSlot!.value = showCharSlot?.value
          
          const state = calculator.calculateState([showBlock, hideBlock], hideBlock.id)
          const characterName = String(showCharSlot?.value)
          
          const character = state.characters.find(c => c.name === characterName)
          expect(character).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.4: Dialogue block sets dialogue text correctly
   * Validates: Requirement 11.3
   */
  it('dialogue block always sets dialogue text to its value', () => {
    fc.assert(
      fc.property(
        arbitraryDialogueBlock,
        (dialogueBlock) => {
          const state = calculator.calculateState([dialogueBlock], dialogueBlock.id)
          const textSlot = dialogueBlock.slots.find(s => s.name === 'text')
          
          expect(state.dialogue?.text).toBe(textSlot?.value)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.5: Dialogue speaker is correctly set when present
   * Validates: Requirement 11.3
   */
  it('dialogue block sets speaker when present', () => {
    fc.assert(
      fc.property(
        arbitraryDialogueBlock,
        (dialogueBlock) => {
          const state = calculator.calculateState([dialogueBlock], dialogueBlock.id)
          const speakerSlot = dialogueBlock.slots.find(s => s.name === 'speaker')
          
          if (speakerSlot?.value) {
            expect(state.dialogue?.speaker).toBe(speakerSlot.value)
          } else {
            expect(state.dialogue?.speaker).toBeUndefined()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.6: Play-music block sets music
   * Validates: Requirement 11.2 (audio state)
   */
  it('play-music block always sets music to its file value', () => {
    fc.assert(
      fc.property(
        arbitraryPlayMusicBlock,
        (musicBlock) => {
          const state = calculator.calculateState([musicBlock], musicBlock.id)
          const fileSlot = musicBlock.slots.find(s => s.name === 'file')
          
          expect(state.music).toBe(fileSlot?.value)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.7: Stop-music block clears music
   */
  it('stop-music block always clears music', () => {
    fc.assert(
      fc.property(
        arbitraryPlayMusicBlock,
        arbitraryStopMusicBlock,
        (playBlock, stopBlock) => {
          const state = calculator.calculateState([playBlock, stopBlock], stopBlock.id)
          
          expect(state.music).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.8: State only includes effects up to target block
   * Validates: Requirement 11.4
   */
  it('state only includes effects from blocks up to and including target', () => {
    fc.assert(
      fc.property(
        arbitraryBlockSequence(2, 5),
        fc.integer({ min: 0, max: 4 }),
        (blocks, targetIndexRaw) => {
          if (blocks.length === 0) return
          
          const targetIndex = targetIndexRaw % blocks.length
          const targetBlock = blocks[targetIndex]
          
          const state = calculator.calculateState(blocks, targetBlock.id)
          
          // Check that blocks after target don't affect state
          // by verifying the last dialogue is from target or before
          const dialogueBlocks = blocks.slice(0, targetIndex + 1).filter(b => b.type === 'dialogue')
          
          if (dialogueBlocks.length > 0) {
            const lastDialogue = dialogueBlocks[dialogueBlocks.length - 1]
            const textSlot = lastDialogue.slots.find(s => s.name === 'text')
            
            if (state.dialogue) {
              expect(state.dialogue.text).toBe(textSlot?.value)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.9: Scene block clears all characters
   * Validates: Requirement 11.2
   */
  it('scene block clears all previously shown characters', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryShowBlock, { minLength: 1, maxLength: 3 }),
        arbitrarySceneBlock,
        (showBlocks, sceneBlock) => {
          const blocks = [...showBlocks, sceneBlock]
          const state = calculator.calculateState(blocks, sceneBlock.id)
          
          expect(state.characters).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.10: Multiple show blocks for same character updates position
   * Validates: Requirement 11.2
   */
  it('showing same character twice updates position instead of duplicating', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitraryPosition,
        arbitraryPosition,
        (characterName, pos1, pos2) => {
          const show1: Block = {
            id: generateBlockId(),
            type: 'show',
            category: 'scene',
            astNodeId: `ast_${Date.now()}`,
            slots: [
              { name: 'character', type: 'character', value: characterName, required: true },
              { name: 'position', type: 'position', value: pos1, required: false },
            ],
            collapsed: false,
            selected: false,
            hasError: false,
          }
          
          const show2: Block = {
            id: generateBlockId(),
            type: 'show',
            category: 'scene',
            astNodeId: `ast_${Date.now()}`,
            slots: [
              { name: 'character', type: 'character', value: characterName, required: true },
              { name: 'position', type: 'position', value: pos2, required: false },
            ],
            collapsed: false,
            selected: false,
            hasError: false,
          }
          
          const state = calculator.calculateState([show1, show2], show2.id)
          
          // Should have exactly one character
          expect(state.characters).toHaveLength(1)
          expect(state.characters[0].name).toBe(characterName)
          expect(state.characters[0].position).toBe(pos2)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.11: Navigation - getNextBlock returns correct next block
   * Validates: Requirement 12.4
   */
  it('getNextBlock returns the immediately following block', () => {
    fc.assert(
      fc.property(
        arbitraryBlockSequence(2, 5),
        fc.integer({ min: 0, max: 3 }),
        (blocks, indexRaw) => {
          if (blocks.length < 2) return
          
          const index = indexRaw % (blocks.length - 1) // Ensure not last
          const currentBlock = blocks[index]
          const expectedNext = blocks[index + 1]
          
          const nextId = calculator.getNextBlock(currentBlock.id, blocks)
          
          expect(nextId).toBe(expectedNext.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.12: Navigation - getPreviousBlock returns correct previous block
   * Validates: Requirement 12.4
   */
  it('getPreviousBlock returns the immediately preceding block', () => {
    fc.assert(
      fc.property(
        arbitraryBlockSequence(2, 5),
        fc.integer({ min: 1, max: 4 }),
        (blocks, indexRaw) => {
          if (blocks.length < 2) return
          
          const index = (indexRaw % (blocks.length - 1)) + 1 // Ensure not first
          const currentBlock = blocks[index]
          const expectedPrev = blocks[index - 1]
          
          const prevId = calculator.getPreviousBlock(currentBlock.id, blocks)
          
          expect(prevId).toBe(expectedPrev.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.13: Navigation - first block has no previous
   * Validates: Requirement 12.4
   */
  it('first block has no previous block', () => {
    fc.assert(
      fc.property(
        arbitraryBlockSequence(1, 5),
        (blocks) => {
          if (blocks.length === 0) return
          
          const firstBlock = blocks[0]
          const prevId = calculator.getPreviousBlock(firstBlock.id, blocks)
          
          expect(prevId).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.14: Navigation - last block has no next
   * Validates: Requirement 12.4
   */
  it('last block has no next block', () => {
    fc.assert(
      fc.property(
        arbitraryBlockSequence(1, 5),
        (blocks) => {
          if (blocks.length === 0) return
          
          const lastBlock = blocks[blocks.length - 1]
          const nextId = calculator.getNextBlock(lastBlock.id, blocks)
          
          expect(nextId).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.15: Block order is consistent
   */
  it('getBlockOrder returns all block IDs in traversal order', () => {
    fc.assert(
      fc.property(
        arbitraryBlockSequence(1, 5),
        (blocks) => {
          const order = calculator.getBlockOrder(blocks)
          
          // Should have same length as input
          expect(order).toHaveLength(blocks.length)
          
          // All IDs should be present
          for (const block of blocks) {
            expect(order).toContain(block.id)
          }
          
          // Order should match input order
          for (let i = 0; i < blocks.length; i++) {
            expect(order[i]).toBe(blocks[i].id)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.16: Empty block array returns empty state
   */
  it('empty block array returns initial empty state', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        (targetId) => {
          const state = calculator.calculateState([], targetId)
          
          expect(state.background).toBeUndefined()
          expect(state.characters).toHaveLength(0)
          expect(state.dialogue).toBeUndefined()
          expect(state.music).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.17: Non-existent target returns empty state
   */
  it('non-existent target block returns empty state', () => {
    fc.assert(
      fc.property(
        arbitraryBlockSequence(1, 3),
        (blocks) => {
          const state = calculator.calculateState(blocks, 'non_existent_id_xyz')
          
          expect(state.background).toBeUndefined()
          expect(state.characters).toHaveLength(0)
          expect(state.dialogue).toBeUndefined()
          expect(state.music).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })
})
