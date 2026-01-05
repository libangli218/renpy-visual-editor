/**
 * LabelContainer Unit Tests
 * Label 容器组件单元测试
 * 
 * Tests for LabelContainer component logic.
 * 
 * Requirements: 2.1-2.5
 */

import { describe, it, expect } from 'vitest'
import { Block, BlockCategory, BlockType } from './types'

// Helper to create a mock label block
function createLabelBlock(name: string, children: Block[] = []): Block {
  return {
    id: `label_${name}`,
    type: 'label' as BlockType,
    category: 'flow' as BlockCategory,
    astNodeId: `ast_label_${name}`,
    slots: [
      { name: 'name', type: 'text', value: name, required: true },
    ],
    children,
    collapsed: false,
    selected: false,
    hasError: false,
  }
}

// Helper to create a mock dialogue block
function createDialogueBlock(id: string, speaker: string | null, text: string): Block {
  return {
    id,
    type: 'dialogue' as BlockType,
    category: 'dialogue' as BlockCategory,
    astNodeId: `ast_${id}`,
    slots: [
      { name: 'speaker', type: 'character', value: speaker, required: false },
      { name: 'text', type: 'multiline', value: text, required: true },
    ],
    collapsed: false,
    selected: false,
    hasError: false,
  }
}

// Helper to create a mock scene block
function createSceneBlock(id: string, image: string): Block {
  return {
    id,
    type: 'scene' as BlockType,
    category: 'scene' as BlockCategory,
    astNodeId: `ast_${id}`,
    slots: [
      { name: 'image', type: 'image', value: image, required: true },
    ],
    collapsed: false,
    selected: false,
    hasError: false,
  }
}

describe('LabelContainer', () => {
  describe('Block structure', () => {
    it('should create a label block with correct properties', () => {
      const block = createLabelBlock('start')
      
      expect(block.type).toBe('label')
      expect(block.category).toBe('flow')
      expect(block.children).toEqual([])
      
      const nameSlot = block.slots.find(s => s.name === 'name')
      expect(nameSlot?.value).toBe('start')
    })

    it('should create a label block with children', () => {
      const children = [
        createDialogueBlock('d1', 'alice', 'Hello!'),
        createDialogueBlock('d2', null, 'Narration'),
      ]
      const block = createLabelBlock('start', children)
      
      expect(block.children).toHaveLength(2)
      expect(block.children![0].type).toBe('dialogue')
      expect(block.children![1].type).toBe('dialogue')
    })
  })

  describe('Empty state detection', () => {
    it('should detect empty label', () => {
      const block = createLabelBlock('empty_label')
      const isEmpty = !block.children || block.children.length === 0
      
      expect(isEmpty).toBe(true)
    })

    it('should detect non-empty label', () => {
      const block = createLabelBlock('filled_label', [
        createDialogueBlock('d1', 'alice', 'Hello!'),
      ])
      const isEmpty = !block.children || block.children.length === 0
      
      expect(isEmpty).toBe(false)
    })
  })

  describe('Block count', () => {
    it('should count zero blocks for empty label', () => {
      const block = createLabelBlock('empty')
      const count = block.children?.length ?? 0
      
      expect(count).toBe(0)
    })

    it('should count blocks correctly', () => {
      const block = createLabelBlock('scene', [
        createSceneBlock('s1', 'bg_room'),
        createDialogueBlock('d1', 'alice', 'Hello!'),
        createDialogueBlock('d2', 'bob', 'Hi!'),
      ])
      const count = block.children?.length ?? 0
      
      expect(count).toBe(3)
    })
  })

  describe('Drag-drop reorder logic', () => {
    /**
     * Simulates the reorder logic from LabelContainer
     */
    function reorderBlocks(
      children: Block[],
      blockId: string,
      newIndex: number
    ): Block[] {
      const currentIndex = children.findIndex(c => c.id === blockId)
      if (currentIndex === -1) return children

      // Adjust index if moving down
      let adjustedIndex = newIndex
      if (currentIndex < newIndex) {
        adjustedIndex = Math.max(0, newIndex - 1)
      }

      // Don't reorder if position unchanged
      if (currentIndex === adjustedIndex) return children

      // Create new array with reordered blocks
      const result = [...children]
      const [removed] = result.splice(currentIndex, 1)
      result.splice(adjustedIndex, 0, removed)
      
      return result
    }

    it('should move block from first to last position', () => {
      const children = [
        createDialogueBlock('d1', 'alice', 'First'),
        createDialogueBlock('d2', 'bob', 'Second'),
        createDialogueBlock('d3', 'charlie', 'Third'),
      ]
      
      // Move d1 to end (index 3, adjusted to 2)
      const result = reorderBlocks(children, 'd1', 3)
      
      expect(result[0].id).toBe('d2')
      expect(result[1].id).toBe('d3')
      expect(result[2].id).toBe('d1')
    })

    it('should move block from last to first position', () => {
      const children = [
        createDialogueBlock('d1', 'alice', 'First'),
        createDialogueBlock('d2', 'bob', 'Second'),
        createDialogueBlock('d3', 'charlie', 'Third'),
      ]
      
      // Move d3 to beginning (index 0)
      const result = reorderBlocks(children, 'd3', 0)
      
      expect(result[0].id).toBe('d3')
      expect(result[1].id).toBe('d1')
      expect(result[2].id).toBe('d2')
    })

    it('should move block to middle position', () => {
      const children = [
        createDialogueBlock('d1', 'alice', 'First'),
        createDialogueBlock('d2', 'bob', 'Second'),
        createDialogueBlock('d3', 'charlie', 'Third'),
        createDialogueBlock('d4', 'dave', 'Fourth'),
      ]
      
      // Move d1 to position 2 (between d2 and d3)
      const result = reorderBlocks(children, 'd1', 2)
      
      expect(result[0].id).toBe('d2')
      expect(result[1].id).toBe('d1')
      expect(result[2].id).toBe('d3')
      expect(result[3].id).toBe('d4')
    })

    it('should not change order when moving to same position', () => {
      const children = [
        createDialogueBlock('d1', 'alice', 'First'),
        createDialogueBlock('d2', 'bob', 'Second'),
        createDialogueBlock('d3', 'charlie', 'Third'),
      ]
      
      // Move d2 to its current position (index 1)
      const result = reorderBlocks(children, 'd2', 1)
      
      expect(result[0].id).toBe('d1')
      expect(result[1].id).toBe('d2')
      expect(result[2].id).toBe('d3')
    })

    it('should handle moving non-existent block', () => {
      const children = [
        createDialogueBlock('d1', 'alice', 'First'),
        createDialogueBlock('d2', 'bob', 'Second'),
      ]
      
      // Try to move non-existent block
      const result = reorderBlocks(children, 'non_existent', 0)
      
      // Should return unchanged array
      expect(result).toEqual(children)
    })

    it('should handle single block', () => {
      const children = [
        createDialogueBlock('d1', 'alice', 'Only one'),
      ]
      
      // Try to move the only block
      const result = reorderBlocks(children, 'd1', 0)
      
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('d1')
    })
  })

  describe('Drop index calculation logic', () => {
    /**
     * Simulates drop index calculation based on block positions
     * In real component, this uses DOM measurements
     */
    function calculateDropIndex(
      blockPositions: { id: string; top: number; height: number }[],
      mouseY: number
    ): number {
      if (blockPositions.length === 0) {
        return 0
      }

      for (let i = 0; i < blockPositions.length; i++) {
        const block = blockPositions[i]
        const blockMiddle = block.top + block.height / 2

        if (mouseY < blockMiddle) {
          return i
        }
      }

      return blockPositions.length
    }

    it('should return 0 for empty container', () => {
      const index = calculateDropIndex([], 100)
      expect(index).toBe(0)
    })

    it('should return 0 when dropping above first block', () => {
      const positions = [
        { id: 'd1', top: 100, height: 50 },
        { id: 'd2', top: 160, height: 50 },
      ]
      
      // Mouse at y=80, above first block
      const index = calculateDropIndex(positions, 80)
      expect(index).toBe(0)
    })

    it('should return correct index when dropping between blocks', () => {
      const positions = [
        { id: 'd1', top: 100, height: 50 },  // middle at 125
        { id: 'd2', top: 160, height: 50 },  // middle at 185
        { id: 'd3', top: 220, height: 50 },  // middle at 245
      ]
      
      // Mouse at y=150, between d1 and d2
      const index = calculateDropIndex(positions, 150)
      expect(index).toBe(1)
      
      // Mouse at y=200, between d2 and d3
      const index2 = calculateDropIndex(positions, 200)
      expect(index2).toBe(2)
    })

    it('should return length when dropping below last block', () => {
      const positions = [
        { id: 'd1', top: 100, height: 50 },
        { id: 'd2', top: 160, height: 50 },
      ]
      
      // Mouse at y=300, below all blocks
      const index = calculateDropIndex(positions, 300)
      expect(index).toBe(2)
    })
  })

  describe('Block selection', () => {
    it('should identify selected block', () => {
      const children = [
        createDialogueBlock('d1', 'alice', 'First'),
        createDialogueBlock('d2', 'bob', 'Second'),
      ]
      const selectedBlockId = 'd2'
      
      const selectedBlock = children.find(c => c.id === selectedBlockId)
      
      expect(selectedBlock).toBeDefined()
      expect(selectedBlock?.id).toBe('d2')
    })

    it('should handle no selection', () => {
      const children = [
        createDialogueBlock('d1', 'alice', 'First'),
      ]
      const selectedBlockId: string | null = null
      
      const selectedBlock = selectedBlockId 
        ? children.find(c => c.id === selectedBlockId)
        : undefined
      
      expect(selectedBlock).toBeUndefined()
    })
  })

  describe('Block type detection for drops', () => {
    /**
     * Simulates detecting drop type from drag data
     */
    function getDropType(
      blockType: string | null,
      blockId: string | null,
      existingBlockIds: string[]
    ): 'new' | 'reorder' | 'move' | 'invalid' {
      if (blockType) {
        return 'new'
      }
      
      if (blockId) {
        if (existingBlockIds.includes(blockId)) {
          return 'reorder'
        }
        return 'move'
      }
      
      return 'invalid'
    }

    it('should detect new block drop from palette', () => {
      const type = getDropType('dialogue', null, ['d1', 'd2'])
      expect(type).toBe('new')
    })

    it('should detect reorder within same container', () => {
      const type = getDropType(null, 'd1', ['d1', 'd2'])
      expect(type).toBe('reorder')
    })

    it('should detect move from another container', () => {
      const type = getDropType(null, 'd3', ['d1', 'd2'])
      expect(type).toBe('move')
    })

    it('should detect invalid drop', () => {
      const type = getDropType(null, null, ['d1', 'd2'])
      expect(type).toBe('invalid')
    })
  })
})
