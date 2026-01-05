/**
 * PreviewStateCalculator Unit Tests
 * 预览状态计算器单元测试
 * 
 * Tests for preview state calculation functionality.
 * 
 * Implements Requirements:
 * - 11.2: 修改场景设置积木时立即更新显示背景和角色
 * - 11.3: 修改对话积木时显示对话框和文本
 * - 11.4: 选中积木时显示该积木执行后的游戏状态
 * - 12.4: 提供单步执行功能（下一步/上一步）
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PreviewStateCalculator, createPreviewStateCalculator } from './PreviewStateCalculator'
import { Block, BlockSlot } from './types'

// ============================================================================
// Test Helpers
// ============================================================================

let blockIdCounter = 0

/**
 * Create a test block with specified properties
 */
function createTestBlock(
  type: Block['type'],
  slots: BlockSlot[],
  options?: Partial<Block>
): Block {
  return {
    id: `test_block_${++blockIdCounter}`,
    type,
    category: 'flow',
    astNodeId: `ast_${blockIdCounter}`,
    slots,
    collapsed: false,
    selected: false,
    hasError: false,
    ...options,
  }
}

/**
 * Create a scene block
 */
function createSceneBlock(image: string, transition?: string): Block {
  const slots: BlockSlot[] = [
    { name: 'image', type: 'image', value: image, required: true },
  ]
  if (transition) {
    slots.push({ name: 'transition', type: 'transition', value: transition, required: false })
  }
  return createTestBlock('scene', slots)
}

/**
 * Create a show block
 */
function createShowBlock(character: string, position?: string, expression?: string): Block {
  const slots: BlockSlot[] = [
    { name: 'character', type: 'character', value: character, required: true },
  ]
  if (position) {
    slots.push({ name: 'position', type: 'position', value: position, required: false })
  }
  if (expression) {
    slots.push({ name: 'expression', type: 'select', value: expression, required: false })
  }
  return createTestBlock('show', slots)
}

/**
 * Create a hide block
 */
function createHideBlock(character: string): Block {
  return createTestBlock('hide', [
    { name: 'character', type: 'character', value: character, required: true },
  ])
}

/**
 * Create a dialogue block
 */
function createDialogueBlock(text: string, speaker?: string): Block {
  const slots: BlockSlot[] = [
    { name: 'text', type: 'multiline', value: text, required: true },
  ]
  if (speaker !== undefined) {
    slots.unshift({ name: 'speaker', type: 'character', value: speaker, required: false })
  }
  return createTestBlock('dialogue', slots)
}

/**
 * Create a play-music block
 */
function createPlayMusicBlock(file: string): Block {
  return createTestBlock('play-music', [
    { name: 'file', type: 'audio', value: file, required: true },
  ])
}

/**
 * Create a stop-music block
 */
function createStopMusicBlock(): Block {
  return createTestBlock('stop-music', [])
}

/**
 * Create a with block
 */
function createWithBlock(transition: string): Block {
  return createTestBlock('with', [
    { name: 'transition', type: 'transition', value: transition, required: true },
  ])
}

/**
 * Create a menu block with choices
 */
function createMenuBlock(choices: Block[]): Block {
  return createTestBlock('menu', [], { children: choices })
}

/**
 * Create a choice block
 */
function createChoiceBlock(text: string, children?: Block[]): Block {
  return createTestBlock('choice', [
    { name: 'text', type: 'text', value: text, required: true },
  ], { children })
}

// ============================================================================
// Unit Tests
// ============================================================================

describe('PreviewStateCalculator', () => {
  let calculator: PreviewStateCalculator

  beforeEach(() => {
    calculator = new PreviewStateCalculator()
    blockIdCounter = 0
  })

  describe('calculateState', () => {
    describe('Scene Block (Requirement 11.2)', () => {
      it('should set background from scene block', () => {
        const sceneBlock = createSceneBlock('bg_room')
        const state = calculator.calculateState([sceneBlock], sceneBlock.id)

        expect(state.background).toBe('bg_room')
      })

      it('should set transition from scene block', () => {
        const sceneBlock = createSceneBlock('bg_forest', 'dissolve')
        const state = calculator.calculateState([sceneBlock], sceneBlock.id)

        expect(state.background).toBe('bg_forest')
        expect(state.transition).toBe('dissolve')
      })

      it('should clear characters when scene changes', () => {
        const showBlock = createShowBlock('alice', 'left')
        const sceneBlock = createSceneBlock('bg_new')
        
        const state = calculator.calculateState([showBlock, sceneBlock], sceneBlock.id)

        expect(state.background).toBe('bg_new')
        expect(state.characters).toHaveLength(0)
      })
    })

    describe('Show Block (Requirement 11.2)', () => {
      it('should add character to state', () => {
        const showBlock = createShowBlock('alice', 'left')
        const state = calculator.calculateState([showBlock], showBlock.id)

        expect(state.characters).toHaveLength(1)
        expect(state.characters[0].name).toBe('alice')
        expect(state.characters[0].position).toBe('left')
      })

      it('should use default position when not specified', () => {
        const showBlock = createShowBlock('bob')
        const state = calculator.calculateState([showBlock], showBlock.id)

        expect(state.characters[0].position).toBe('center')
      })

      it('should set expression when specified', () => {
        const showBlock = createShowBlock('alice', 'right', 'happy')
        const state = calculator.calculateState([showBlock], showBlock.id)

        expect(state.characters[0].expression).toBe('happy')
      })

      it('should update existing character position', () => {
        const show1 = createShowBlock('alice', 'left')
        const show2 = createShowBlock('alice', 'right')
        
        const state = calculator.calculateState([show1, show2], show2.id)

        expect(state.characters).toHaveLength(1)
        expect(state.characters[0].position).toBe('right')
      })

      it('should handle multiple characters', () => {
        const show1 = createShowBlock('alice', 'left')
        const show2 = createShowBlock('bob', 'right')
        
        const state = calculator.calculateState([show1, show2], show2.id)

        expect(state.characters).toHaveLength(2)
        expect(state.characters.find(c => c.name === 'alice')?.position).toBe('left')
        expect(state.characters.find(c => c.name === 'bob')?.position).toBe('right')
      })
    })

    describe('Hide Block (Requirement 11.2)', () => {
      it('should remove character from state', () => {
        const showBlock = createShowBlock('alice', 'left')
        const hideBlock = createHideBlock('alice')
        
        const state = calculator.calculateState([showBlock, hideBlock], hideBlock.id)

        expect(state.characters).toHaveLength(0)
      })

      it('should only remove specified character', () => {
        const show1 = createShowBlock('alice', 'left')
        const show2 = createShowBlock('bob', 'right')
        const hideBlock = createHideBlock('alice')
        
        const state = calculator.calculateState([show1, show2, hideBlock], hideBlock.id)

        expect(state.characters).toHaveLength(1)
        expect(state.characters[0].name).toBe('bob')
      })
    })

    describe('Dialogue Block (Requirement 11.3)', () => {
      it('should set dialogue text', () => {
        const dialogueBlock = createDialogueBlock('Hello, world!')
        const state = calculator.calculateState([dialogueBlock], dialogueBlock.id)

        expect(state.dialogue?.text).toBe('Hello, world!')
      })

      it('should set dialogue speaker', () => {
        const dialogueBlock = createDialogueBlock('Hello!', 'alice')
        const state = calculator.calculateState([dialogueBlock], dialogueBlock.id)

        expect(state.dialogue?.speaker).toBe('alice')
        expect(state.dialogue?.text).toBe('Hello!')
      })

      it('should handle narration (no speaker)', () => {
        const dialogueBlock = createDialogueBlock('The sun was setting.')
        const state = calculator.calculateState([dialogueBlock], dialogueBlock.id)

        expect(state.dialogue?.speaker).toBeUndefined()
        expect(state.dialogue?.text).toBe('The sun was setting.')
      })

      it('should update dialogue with latest block', () => {
        const dialogue1 = createDialogueBlock('First line', 'alice')
        const dialogue2 = createDialogueBlock('Second line', 'bob')
        
        const state = calculator.calculateState([dialogue1, dialogue2], dialogue2.id)

        expect(state.dialogue?.speaker).toBe('bob')
        expect(state.dialogue?.text).toBe('Second line')
      })
    })

    describe('Audio Blocks', () => {
      it('should set music from play-music block', () => {
        const musicBlock = createPlayMusicBlock('bgm_theme.ogg')
        const state = calculator.calculateState([musicBlock], musicBlock.id)

        expect(state.music).toBe('bgm_theme.ogg')
      })

      it('should clear music from stop-music block', () => {
        const playBlock = createPlayMusicBlock('bgm_theme.ogg')
        const stopBlock = createStopMusicBlock()
        
        const state = calculator.calculateState([playBlock, stopBlock], stopBlock.id)

        expect(state.music).toBeUndefined()
      })
    })

    describe('With Block', () => {
      it('should set transition effect', () => {
        const withBlock = createWithBlock('fade')
        const state = calculator.calculateState([withBlock], withBlock.id)

        expect(state.transition).toBe('fade')
      })
    })

    describe('State Accumulation (Requirement 11.4)', () => {
      it('should accumulate state up to target block', () => {
        const scene = createSceneBlock('bg_room')
        const show = createShowBlock('alice', 'left')
        const dialogue = createDialogueBlock('Hello!', 'alice')
        const music = createPlayMusicBlock('bgm_calm.ogg')

        const state = calculator.calculateState([scene, show, dialogue, music], dialogue.id)

        expect(state.background).toBe('bg_room')
        expect(state.characters).toHaveLength(1)
        expect(state.dialogue?.text).toBe('Hello!')
        expect(state.music).toBeUndefined() // Music block is after target
      })

      it('should return empty state for non-existent target', () => {
        const scene = createSceneBlock('bg_room')
        const state = calculator.calculateState([scene], 'non_existent_id')

        expect(state.background).toBeUndefined()
        expect(state.characters).toHaveLength(0)
      })

      it('should handle empty block array', () => {
        const state = calculator.calculateState([], 'any_id')

        expect(state.background).toBeUndefined()
        expect(state.characters).toHaveLength(0)
        expect(state.dialogue).toBeUndefined()
      })
    })

    describe('Nested Blocks', () => {
      it('should traverse nested menu/choice blocks', () => {
        const scene = createSceneBlock('bg_room')
        const dialogue1 = createDialogueBlock('Before menu', 'alice')
        const choiceDialogue = createDialogueBlock('Choice selected!', 'bob')
        const choice = createChoiceBlock('Option A', [choiceDialogue])
        const menu = createMenuBlock([choice])

        const state = calculator.calculateState([scene, dialogue1, menu], choiceDialogue.id)

        expect(state.background).toBe('bg_room')
        expect(state.dialogue?.text).toBe('Choice selected!')
        expect(state.dialogue?.speaker).toBe('bob')
      })

      it('should handle deeply nested structures', () => {
        const innerDialogue = createDialogueBlock('Deep inside', 'alice')
        const innerChoice = createChoiceBlock('Inner', [innerDialogue])
        const innerMenu = createMenuBlock([innerChoice])
        const outerChoice = createChoiceBlock('Outer', [innerMenu])
        const outerMenu = createMenuBlock([outerChoice])

        const state = calculator.calculateState([outerMenu], innerDialogue.id)

        expect(state.dialogue?.text).toBe('Deep inside')
      })
    })
  })

  describe('getNextBlock (Requirement 12.4)', () => {
    it('should return next block in sequence', () => {
      const block1 = createDialogueBlock('First')
      const block2 = createDialogueBlock('Second')
      const block3 = createDialogueBlock('Third')

      const nextId = calculator.getNextBlock(block1.id, [block1, block2, block3])

      expect(nextId).toBe(block2.id)
    })

    it('should return null for last block', () => {
      const block1 = createDialogueBlock('First')
      const block2 = createDialogueBlock('Second')

      const nextId = calculator.getNextBlock(block2.id, [block1, block2])

      expect(nextId).toBeNull()
    })

    it('should return null for non-existent block', () => {
      const block1 = createDialogueBlock('First')

      const nextId = calculator.getNextBlock('non_existent', [block1])

      expect(nextId).toBeNull()
    })

    it('should navigate into nested blocks', () => {
      const dialogue = createDialogueBlock('Before')
      const nestedDialogue = createDialogueBlock('Inside')
      const choice = createChoiceBlock('Option', [nestedDialogue])
      const menu = createMenuBlock([choice])

      const nextId = calculator.getNextBlock(menu.id, [dialogue, menu])

      expect(nextId).toBe(choice.id)
    })

    it('should navigate out of nested blocks', () => {
      const nestedDialogue = createDialogueBlock('Inside')
      const choice = createChoiceBlock('Option', [nestedDialogue])
      const menu = createMenuBlock([choice])
      const afterMenu = createDialogueBlock('After')

      const nextId = calculator.getNextBlock(nestedDialogue.id, [menu, afterMenu])

      expect(nextId).toBe(afterMenu.id)
    })
  })

  describe('getPreviousBlock (Requirement 12.4)', () => {
    it('should return previous block in sequence', () => {
      const block1 = createDialogueBlock('First')
      const block2 = createDialogueBlock('Second')
      const block3 = createDialogueBlock('Third')

      const prevId = calculator.getPreviousBlock(block3.id, [block1, block2, block3])

      expect(prevId).toBe(block2.id)
    })

    it('should return null for first block', () => {
      const block1 = createDialogueBlock('First')
      const block2 = createDialogueBlock('Second')

      const prevId = calculator.getPreviousBlock(block1.id, [block1, block2])

      expect(prevId).toBeNull()
    })

    it('should return null for non-existent block', () => {
      const block1 = createDialogueBlock('First')

      const prevId = calculator.getPreviousBlock('non_existent', [block1])

      expect(prevId).toBeNull()
    })

    it('should navigate from nested to parent level', () => {
      const dialogue = createDialogueBlock('Before')
      const nestedDialogue = createDialogueBlock('Inside')
      const choice = createChoiceBlock('Option', [nestedDialogue])
      const menu = createMenuBlock([choice])

      const prevId = calculator.getPreviousBlock(nestedDialogue.id, [dialogue, menu])

      expect(prevId).toBe(choice.id)
    })
  })

  describe('getBlockOrder', () => {
    it('should return all block IDs in order', () => {
      const block1 = createDialogueBlock('First')
      const block2 = createDialogueBlock('Second')
      const block3 = createDialogueBlock('Third')

      const order = calculator.getBlockOrder([block1, block2, block3])

      expect(order).toEqual([block1.id, block2.id, block3.id])
    })

    it('should include nested block IDs', () => {
      const nested = createDialogueBlock('Nested')
      const choice = createChoiceBlock('Option', [nested])
      const menu = createMenuBlock([choice])

      const order = calculator.getBlockOrder([menu])

      expect(order).toContain(menu.id)
      expect(order).toContain(choice.id)
      expect(order).toContain(nested.id)
    })
  })

  describe('isFirstBlock', () => {
    it('should return true for first block', () => {
      const block1 = createDialogueBlock('First')
      const block2 = createDialogueBlock('Second')

      expect(calculator.isFirstBlock(block1.id, [block1, block2])).toBe(true)
    })

    it('should return false for non-first block', () => {
      const block1 = createDialogueBlock('First')
      const block2 = createDialogueBlock('Second')

      expect(calculator.isFirstBlock(block2.id, [block1, block2])).toBe(false)
    })
  })

  describe('isLastBlock', () => {
    it('should return true for last block', () => {
      const block1 = createDialogueBlock('First')
      const block2 = createDialogueBlock('Second')

      expect(calculator.isLastBlock(block2.id, [block1, block2])).toBe(true)
    })

    it('should return false for non-last block', () => {
      const block1 = createDialogueBlock('First')
      const block2 = createDialogueBlock('Second')

      expect(calculator.isLastBlock(block1.id, [block1, block2])).toBe(false)
    })

    it('should consider nested blocks for last position', () => {
      const nested = createDialogueBlock('Nested')
      const choice = createChoiceBlock('Option', [nested])
      const menu = createMenuBlock([choice])

      expect(calculator.isLastBlock(nested.id, [menu])).toBe(true)
      expect(calculator.isLastBlock(menu.id, [menu])).toBe(false)
    })
  })

  describe('Factory Functions', () => {
    it('createPreviewStateCalculator should return a PreviewStateCalculator instance', () => {
      const calc = createPreviewStateCalculator()
      expect(calc).toBeInstanceOf(PreviewStateCalculator)
    })
  })
})
