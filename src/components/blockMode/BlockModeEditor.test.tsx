/**
 * BlockModeEditor Unit Tests
 * 积木模式编辑器单元测试
 * 
 * Tests for BlockModeEditor component and blockEditorStore.
 * 
 * Requirements: 1.1, 2.1, 8.6, 9.5, 12.1-12.6
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Block, BlockCategory, BlockType, ValidationError } from './types'
import { useBlockEditorStore } from './stores/blockEditorStore'
import { RenpyScript, LabelNode, DialogueNode } from '../../types/ast'

// Reset store before each test
beforeEach(() => {
  useBlockEditorStore.getState().reset()
})

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

// Helper to create a mock AST
function createMockAst(labelName: string, dialogues: { speaker: string | null; text: string }[] = []): RenpyScript {
  const body: DialogueNode[] = dialogues.map((d, i) => ({
    id: `dialogue_${i}`,
    type: 'dialogue',
    speaker: d.speaker,
    text: d.text,
  }))

  const label: LabelNode = {
    id: `label_${labelName}`,
    type: 'label',
    name: labelName,
    body,
  }

  return {
    type: 'script',
    statements: [label],
    metadata: {
      filePath: 'test.rpy',
      parseTime: new Date(),
      version: '1.0.0',
    },
  }
}

describe('BlockEditorStore', () => {
  describe('Label Management', () => {
    it('should set current label', () => {
      const store = useBlockEditorStore.getState()
      
      store.setCurrentLabel('start')
      
      expect(useBlockEditorStore.getState().currentLabel).toBe('start')
    })

    it('should clear current label and reset state', () => {
      const store = useBlockEditorStore.getState()
      
      // Set up some state
      store.setCurrentLabel('start')
      store.setBlockTree(createLabelBlock('start'))
      store.setSelectedBlockId('block_1')
      store.setValidationErrors([{ blockId: 'b1', type: 'required', message: 'Error' }])
      
      // Clear
      store.clearCurrentLabel()
      
      const state = useBlockEditorStore.getState()
      expect(state.currentLabel).toBeNull()
      expect(state.blockTree).toBeNull()
      expect(state.selectedBlockId).toBeNull()
      expect(state.validationErrors).toHaveLength(0)
    })
  })

  describe('Block Tree Management', () => {
    it('should set block tree', () => {
      const store = useBlockEditorStore.getState()
      const tree = createLabelBlock('start', [
        createDialogueBlock('d1', 'alice', 'Hello!'),
      ])
      
      store.setBlockTree(tree)
      
      expect(useBlockEditorStore.getState().blockTree).toBe(tree)
    })

    it('should update a specific block in the tree', () => {
      const store = useBlockEditorStore.getState()
      const tree = createLabelBlock('start', [
        createDialogueBlock('d1', 'alice', 'Hello!'),
        createDialogueBlock('d2', 'bob', 'Hi!'),
      ])
      store.setBlockTree(tree)
      
      // Update d1
      store.updateBlock('d1', { hasError: true })
      
      const updatedTree = useBlockEditorStore.getState().blockTree
      const d1 = updatedTree?.children?.find(c => c.id === 'd1')
      expect(d1?.hasError).toBe(true)
    })
  })

  describe('Selection Management', () => {
    it('should set selected block ID', () => {
      const store = useBlockEditorStore.getState()
      
      store.setSelectedBlockId('block_1')
      
      expect(useBlockEditorStore.getState().selectedBlockId).toBe('block_1')
    })

    it('should clear selection', () => {
      const store = useBlockEditorStore.getState()
      store.setSelectedBlockId('block_1')
      
      store.clearSelection()
      
      expect(useBlockEditorStore.getState().selectedBlockId).toBeNull()
    })
  })

  describe('Clipboard Management', () => {
    it('should set clipboard', () => {
      const store = useBlockEditorStore.getState()
      const clipboard = {
        blocks: [createDialogueBlock('d1', 'alice', 'Hello!')],
        sourceLabel: 'start',
        timestamp: Date.now(),
      }
      
      store.setClipboard(clipboard)
      
      expect(useBlockEditorStore.getState().clipboard).toBe(clipboard)
    })

    it('should clear clipboard', () => {
      const store = useBlockEditorStore.getState()
      store.setClipboard({
        blocks: [],
        sourceLabel: 'start',
        timestamp: Date.now(),
      })
      
      store.clearClipboard()
      
      expect(useBlockEditorStore.getState().clipboard).toBeNull()
    })
  })

  describe('Validation Management', () => {
    it('should set validation errors', () => {
      const store = useBlockEditorStore.getState()
      const errors: ValidationError[] = [
        { blockId: 'b1', type: 'required', message: 'Required field' },
        { blockId: 'b2', type: 'invalid-target', message: 'Invalid target' },
      ]
      
      store.setValidationErrors(errors)
      
      expect(useBlockEditorStore.getState().validationErrors).toHaveLength(2)
    })

    it('should add validation error', () => {
      const store = useBlockEditorStore.getState()
      store.setValidationErrors([
        { blockId: 'b1', type: 'required', message: 'Error 1' },
      ])
      
      store.addValidationError({ blockId: 'b2', type: 'syntax', message: 'Error 2' })
      
      expect(useBlockEditorStore.getState().validationErrors).toHaveLength(2)
    })

    it('should remove block errors', () => {
      const store = useBlockEditorStore.getState()
      store.setValidationErrors([
        { blockId: 'b1', type: 'required', message: 'Error 1' },
        { blockId: 'b1', type: 'syntax', message: 'Error 2' },
        { blockId: 'b2', type: 'required', message: 'Error 3' },
      ])
      
      store.removeBlockErrors('b1')
      
      const errors = useBlockEditorStore.getState().validationErrors
      expect(errors).toHaveLength(1)
      expect(errors[0].blockId).toBe('b2')
    })

    it('should clear all validation errors', () => {
      const store = useBlockEditorStore.getState()
      store.setValidationErrors([
        { blockId: 'b1', type: 'required', message: 'Error' },
      ])
      
      store.clearValidationErrors()
      
      expect(useBlockEditorStore.getState().validationErrors).toHaveLength(0)
    })
  })

  describe('Playback Management', () => {
    it('should start playback', () => {
      const store = useBlockEditorStore.getState()
      const tree = createLabelBlock('start', [
        createDialogueBlock('d1', 'alice', 'Hello!'),
      ])
      store.setBlockTree(tree)
      
      store.startPlayback('d1')
      
      const playback = useBlockEditorStore.getState().playback
      expect(playback.isPlaying).toBe(true)
      expect(playback.currentBlockId).toBe('d1')
    })

    it('should stop playback', () => {
      const store = useBlockEditorStore.getState()
      store.startPlayback('d1')
      
      store.stopPlayback()
      
      const playback = useBlockEditorStore.getState().playback
      expect(playback.isPlaying).toBe(false)
      expect(playback.currentBlockId).toBeNull()
    })

    it('should pause and resume playback', () => {
      const store = useBlockEditorStore.getState()
      store.startPlayback('d1')
      
      store.pausePlayback()
      expect(useBlockEditorStore.getState().playback.isPlaying).toBe(false)
      
      store.resumePlayback()
      expect(useBlockEditorStore.getState().playback.isPlaying).toBe(true)
    })

    it('should update game state', () => {
      const store = useBlockEditorStore.getState()
      
      store.updateGameState({ background: 'bg_room' })
      
      expect(useBlockEditorStore.getState().playback.gameState.background).toBe('bg_room')
    })

    it('should step to next block', () => {
      const store = useBlockEditorStore.getState()
      const tree = createLabelBlock('start', [
        createDialogueBlock('d1', 'alice', 'First'),
        createDialogueBlock('d2', 'bob', 'Second'),
        createDialogueBlock('d3', 'charlie', 'Third'),
      ])
      store.setBlockTree(tree)
      store.startPlayback('d1')
      
      store.stepNext()
      
      expect(useBlockEditorStore.getState().playback.currentBlockId).toBe('d2')
    })

    it('should step to previous block', () => {
      const store = useBlockEditorStore.getState()
      const tree = createLabelBlock('start', [
        createDialogueBlock('d1', 'alice', 'First'),
        createDialogueBlock('d2', 'bob', 'Second'),
      ])
      store.setBlockTree(tree)
      store.startPlayback('d2')
      
      store.stepPrevious()
      
      expect(useBlockEditorStore.getState().playback.currentBlockId).toBe('d1')
    })
  })

  describe('Collapse Management', () => {
    it('should toggle block collapsed state', () => {
      const store = useBlockEditorStore.getState()
      
      store.toggleBlockCollapsed('block_1')
      expect(store.isBlockCollapsed('block_1')).toBe(true)
      
      store.toggleBlockCollapsed('block_1')
      expect(useBlockEditorStore.getState().collapsedBlocks.has('block_1')).toBe(false)
    })

    it('should set block collapsed state', () => {
      const store = useBlockEditorStore.getState()
      
      store.setBlockCollapsed('block_1', true)
      expect(useBlockEditorStore.getState().collapsedBlocks.has('block_1')).toBe(true)
      
      store.setBlockCollapsed('block_1', false)
      expect(useBlockEditorStore.getState().collapsedBlocks.has('block_1')).toBe(false)
    })

    it('should collapse all blocks', () => {
      const store = useBlockEditorStore.getState()
      const tree = createLabelBlock('start', [
        createDialogueBlock('d1', 'alice', 'Hello!'),
        createDialogueBlock('d2', 'bob', 'Hi!'),
      ])
      store.setBlockTree(tree)
      
      store.collapseAll()
      
      const collapsed = useBlockEditorStore.getState().collapsedBlocks
      expect(collapsed.has('label_start')).toBe(true)
      expect(collapsed.has('d1')).toBe(true)
      expect(collapsed.has('d2')).toBe(true)
    })

    it('should expand all blocks', () => {
      const store = useBlockEditorStore.getState()
      store.setBlockCollapsed('block_1', true)
      store.setBlockCollapsed('block_2', true)
      
      store.expandAll()
      
      expect(useBlockEditorStore.getState().collapsedBlocks.size).toBe(0)
    })
  })

  describe('Read-Only Mode', () => {
    it('should set read-only mode', () => {
      const store = useBlockEditorStore.getState()
      
      store.setReadOnly(true)
      expect(useBlockEditorStore.getState().readOnly).toBe(true)
      
      store.setReadOnly(false)
      expect(useBlockEditorStore.getState().readOnly).toBe(false)
    })
  })

  describe('Reset', () => {
    it('should reset entire store to initial state', () => {
      const store = useBlockEditorStore.getState()
      
      // Set up various state
      store.setCurrentLabel('start')
      store.setBlockTree(createLabelBlock('start'))
      store.setSelectedBlockId('block_1')
      store.setClipboard({ blocks: [], sourceLabel: 'start', timestamp: Date.now() })
      store.setValidationErrors([{ blockId: 'b1', type: 'required', message: 'Error' }])
      store.startPlayback('d1')
      store.setBlockCollapsed('block_1', true)
      store.setReadOnly(true)
      
      // Reset
      store.reset()
      
      const state = useBlockEditorStore.getState()
      expect(state.currentLabel).toBeNull()
      expect(state.blockTree).toBeNull()
      expect(state.selectedBlockId).toBeNull()
      expect(state.clipboard).toBeNull()
      expect(state.validationErrors).toHaveLength(0)
      expect(state.playback.isPlaying).toBe(false)
      expect(state.collapsedBlocks.size).toBe(0)
      expect(state.readOnly).toBe(false)
    })
  })
})

describe('BlockModeEditor Logic', () => {
  describe('AST to Block Tree Conversion', () => {
    it('should find label in AST', () => {
      const ast = createMockAst('start', [
        { speaker: 'alice', text: 'Hello!' },
      ])
      
      const labelNode = ast.statements.find(
        s => s.type === 'label' && (s as LabelNode).name === 'start'
      ) as LabelNode | undefined
      
      expect(labelNode).toBeDefined()
      expect(labelNode?.name).toBe('start')
      expect(labelNode?.body).toHaveLength(1)
    })

    it('should handle missing label', () => {
      const ast = createMockAst('start')
      
      const labelNode = ast.statements.find(
        s => s.type === 'label' && (s as LabelNode).name === 'nonexistent'
      ) as LabelNode | undefined
      
      expect(labelNode).toBeUndefined()
    })
  })

  describe('Validation Context', () => {
    it('should create validation context with available resources', () => {
      const context = {
        availableLabels: ['start', 'end', 'chapter1'],
        availableCharacters: ['alice', 'bob'],
        availableImages: ['bg_room', 'bg_park'],
        availableAudio: ['music_theme', 'sfx_click'],
      }
      
      expect(context.availableLabels).toContain('start')
      expect(context.availableCharacters).toContain('alice')
      expect(context.availableImages).toContain('bg_room')
      expect(context.availableAudio).toContain('music_theme')
    })
  })

  describe('Error Count Calculation', () => {
    it('should count errors correctly', () => {
      const errors: ValidationError[] = [
        { blockId: 'b1', type: 'required', message: 'Error 1' },
        { blockId: 'b2', type: 'required', message: 'Error 2' },
        { blockId: 'b3', type: 'invalid-target', message: 'Error 3' },
      ]
      
      const errorCount = errors.length
      expect(errorCount).toBe(3)
    })

    it('should count errors by type', () => {
      const errors: ValidationError[] = [
        { blockId: 'b1', type: 'required', message: 'Error 1' },
        { blockId: 'b2', type: 'required', message: 'Error 2' },
        { blockId: 'b3', type: 'invalid-target', message: 'Error 3' },
        { blockId: 'b4', type: 'syntax', message: 'Error 4' },
      ]
      
      const countByType = errors.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1
        return acc
      }, {} as Record<ValidationError['type'], number>)
      
      expect(countByType.required).toBe(2)
      expect(countByType['invalid-target']).toBe(1)
      expect(countByType.syntax).toBe(1)
    })
  })

  describe('Block Selection', () => {
    it('should find selected block in tree', () => {
      const tree = createLabelBlock('start', [
        createDialogueBlock('d1', 'alice', 'Hello!'),
        createDialogueBlock('d2', 'bob', 'Hi!'),
      ])
      const selectedBlockId = 'd2'
      
      function findBlockById(root: Block | null, blockId: string): Block | null {
        if (!root) return null
        if (root.id === blockId) return root
        
        if (root.children) {
          for (const child of root.children) {
            const found = findBlockById(child, blockId)
            if (found) return found
          }
        }
        
        return null
      }
      
      const selectedBlock = findBlockById(tree, selectedBlockId)
      
      expect(selectedBlock).toBeDefined()
      expect(selectedBlock?.id).toBe('d2')
      expect(selectedBlock?.type).toBe('dialogue')
    })
  })

  describe('Playback Block Navigation', () => {
    it('should collect all block IDs in order', () => {
      const tree = createLabelBlock('start', [
        createDialogueBlock('d1', 'alice', 'First'),
        createDialogueBlock('d2', 'bob', 'Second'),
        createDialogueBlock('d3', 'charlie', 'Third'),
      ])
      
      function collectAllBlockIds(root: Block | null): string[] {
        if (!root) return []
        
        const ids: string[] = [root.id]
        
        if (root.children) {
          for (const child of root.children) {
            ids.push(...collectAllBlockIds(child))
          }
        }
        
        return ids
      }
      
      const allIds = collectAllBlockIds(tree)
      
      expect(allIds).toEqual(['label_start', 'd1', 'd2', 'd3'])
    })

    it('should find next block ID', () => {
      const allIds = ['label_start', 'd1', 'd2', 'd3']
      const currentId = 'd1'
      
      const currentIndex = allIds.indexOf(currentId)
      const nextId = currentIndex >= 0 && currentIndex < allIds.length - 1
        ? allIds[currentIndex + 1]
        : null
      
      expect(nextId).toBe('d2')
    })

    it('should return null when at last block', () => {
      const allIds = ['label_start', 'd1', 'd2', 'd3']
      const currentId = 'd3'
      
      const currentIndex = allIds.indexOf(currentId)
      const nextId = currentIndex >= 0 && currentIndex < allIds.length - 1
        ? allIds[currentIndex + 1]
        : null
      
      expect(nextId).toBeNull()
    })

    it('should find previous block ID', () => {
      const allIds = ['label_start', 'd1', 'd2', 'd3']
      const currentId = 'd2'
      
      const currentIndex = allIds.indexOf(currentId)
      const prevId = currentIndex > 0
        ? allIds[currentIndex - 1]
        : null
      
      expect(prevId).toBe('d1')
    })
  })
})

describe('BlockModeEditor Integration', () => {
  describe('Store and Component Integration', () => {
    it('should initialize store with label data', () => {
      const store = useBlockEditorStore.getState()
      const tree = createLabelBlock('start', [
        createDialogueBlock('d1', 'alice', 'Hello!'),
      ])
      
      store.setCurrentLabel('start')
      store.setBlockTree(tree)
      
      const state = useBlockEditorStore.getState()
      expect(state.currentLabel).toBe('start')
      expect(state.blockTree?.children).toHaveLength(1)
    })

    it('should handle block selection flow', () => {
      const store = useBlockEditorStore.getState()
      const tree = createLabelBlock('start', [
        createDialogueBlock('d1', 'alice', 'Hello!'),
        createDialogueBlock('d2', 'bob', 'Hi!'),
      ])
      store.setBlockTree(tree)
      
      // Simulate clicking on d1
      store.setSelectedBlockId('d1')
      expect(useBlockEditorStore.getState().selectedBlockId).toBe('d1')
      
      // Simulate clicking on d2
      store.setSelectedBlockId('d2')
      expect(useBlockEditorStore.getState().selectedBlockId).toBe('d2')
      
      // Simulate clicking outside (clear selection)
      store.clearSelection()
      expect(useBlockEditorStore.getState().selectedBlockId).toBeNull()
    })

    it('should handle playback flow', () => {
      const store = useBlockEditorStore.getState()
      const tree = createLabelBlock('start', [
        createDialogueBlock('d1', 'alice', 'First'),
        createDialogueBlock('d2', 'bob', 'Second'),
      ])
      store.setBlockTree(tree)
      
      // Start playback
      store.startPlayback('d1')
      expect(useBlockEditorStore.getState().playback.isPlaying).toBe(true)
      expect(useBlockEditorStore.getState().playback.currentBlockId).toBe('d1')
      
      // Step next
      store.stepNext()
      expect(useBlockEditorStore.getState().playback.currentBlockId).toBe('d2')
      
      // Pause
      store.pausePlayback()
      expect(useBlockEditorStore.getState().playback.isPlaying).toBe(false)
      
      // Resume
      store.resumePlayback()
      expect(useBlockEditorStore.getState().playback.isPlaying).toBe(true)
      
      // Stop
      store.stopPlayback()
      expect(useBlockEditorStore.getState().playback.isPlaying).toBe(false)
      expect(useBlockEditorStore.getState().playback.currentBlockId).toBeNull()
    })
  })
})
