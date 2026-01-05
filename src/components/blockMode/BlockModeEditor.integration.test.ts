/**
 * BlockModeEditor Integration Tests
 * 积木模式编辑器集成测试
 * 
 * Tests for complete workflows:
 * - 完整工作流测试：打开 Label → 编辑积木 → 保存 → 重新打开
 * - 模式切换测试：流程图模式 ↔ 积木模式
 * - 预览播放测试：播放积木序列，验证预览正确
 * 
 * Requirements: All
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useBlockEditorStore } from './stores/blockEditorStore'
import { useEditorModeStore } from './stores/editorModeStore'
import { BlockTreeBuilder, resetBlockIdCounter as resetTreeBuilderCounter } from './BlockTreeBuilder'
import { BlockOperationHandler, resetBlockIdCounter as resetOperationCounter } from './BlockOperationHandler'
import { BlockValidator } from './BlockValidator'
import { ValidationContext } from './types'
import { PreviewStateCalculator } from './PreviewStateCalculator'
import { Block } from './types'
import { RenpyScript, LabelNode, DialogueNode, SceneNode, ShowNode, MenuNode } from '../../types/ast'

// Reset stores before each test
beforeEach(() => {
  useBlockEditorStore.getState().reset()
  useEditorModeStore.getState().reset()
  resetTreeBuilderCounter()
  resetOperationCounter()
})

// ========================================
// Helper Functions
// ========================================

function createMockAst(labels: { name: string; body: any[] }[]): RenpyScript {
  return {
    type: 'script',
    statements: labels.map(l => ({
      id: `label_${l.name}`,
      type: 'label',
      name: l.name,
      body: l.body,
    } as LabelNode)),
    metadata: {
      filePath: 'test.rpy',
      parseTime: new Date(),
      version: '1.0.0',
    },
  }
}


function createDialogueNode(id: string, speaker: string | null, text: string): DialogueNode {
  return { id, type: 'dialogue', speaker, text }
}

function createSceneNode(id: string, image: string): SceneNode {
  return { id, type: 'scene', image }
}

function createShowNode(id: string, image: string, position?: string): ShowNode {
  return { id, type: 'show', image, atPosition: position }
}

function createMenuNode(id: string, choices: { text: string; body: any[] }[]): MenuNode {
  return { id, type: 'menu', choices }
}

function createValidationContext(labels: string[] = [], characters: string[] = []): ValidationContext {
  return {
    availableLabels: labels,
    availableCharacters: characters,
    availableImages: ['bg_room', 'bg_park', 'alice', 'bob'],
    availableAudio: ['bgm_theme.ogg', 'sfx_click.ogg'],
  }
}

// ========================================
// Integration Test: Complete Workflow
// ========================================

describe('Integration: Complete Workflow', () => {
  describe('Open Label → Edit Blocks → Save → Reopen', () => {
    it('should complete full edit workflow with dialogue blocks', () => {
      // Step 1: Create initial AST with a label
      const ast = createMockAst([{
        name: 'start',
        body: [
          createDialogueNode('d1', 'alice', 'Hello!'),
          createDialogueNode('d2', 'bob', 'Hi there!'),
        ],
      }])

      // Step 2: Build block tree from AST
      const builder = new BlockTreeBuilder()
      const label = ast.statements[0] as LabelNode
      const blockTree = builder.buildFromLabel(label)

      // Step 3: Initialize stores
      useEditorModeStore.getState().enterBlockMode('start')
      useBlockEditorStore.getState().setCurrentLabel('start')
      useBlockEditorStore.getState().setBlockTree(blockTree)

      // Verify initial state
      expect(useEditorModeStore.getState().currentMode).toBe('block')
      expect(useEditorModeStore.getState().currentBlockLabel).toBe('start')
      expect(useBlockEditorStore.getState().blockTree?.children).toHaveLength(2)

      // Step 4: Edit a block (update dialogue text)
      const handler = new BlockOperationHandler()
      const dialogueBlock = useBlockEditorStore.getState().blockTree!.children![0]
      
      const updateResult = handler.updateSlot(
        dialogueBlock.id,
        'text',
        'Hello, world!',
        { blockTree: useBlockEditorStore.getState().blockTree!, ast, labelName: 'start' }
      )

      expect(updateResult.success).toBe(true)

      // Verify AST was updated
      const updatedDialogue = (ast.statements[0] as LabelNode).body[0] as DialogueNode
      expect(updatedDialogue.text).toBe('Hello, world!')

      // Step 5: Add a new block
      const currentTree = useBlockEditorStore.getState().blockTree!
      const addResult = handler.addBlock(
        'dialogue',
        currentTree.id,
        2,
        { blockTree: currentTree, ast, labelName: 'start' }
      )

      expect(addResult.success).toBe(true)
      expect(currentTree.children).toHaveLength(3)
      expect((ast.statements[0] as LabelNode).body).toHaveLength(3)

      // Step 6: Exit block mode
      useEditorModeStore.getState().exitBlockMode()
      expect(useEditorModeStore.getState().currentMode).toBe('flow')

      // Step 7: Re-enter block mode and verify state persisted
      useEditorModeStore.getState().enterBlockMode('start')
      
      // Rebuild block tree from AST (simulating reopen)
      const reopenedTree = builder.buildFromLabel(ast.statements[0] as LabelNode)
      useBlockEditorStore.getState().setBlockTree(reopenedTree)

      expect(useBlockEditorStore.getState().blockTree?.children).toHaveLength(3)
      
      // Verify the edited text persisted
      const firstDialogue = useBlockEditorStore.getState().blockTree!.children![0]
      const textSlot = firstDialogue.slots.find(s => s.name === 'text')
      expect(textSlot?.value).toBe('Hello, world!')
    })

    it('should handle adding and deleting blocks in sequence', () => {
      const ast = createMockAst([{ name: 'test', body: [] }])
      const builder = new BlockTreeBuilder()
      const handler = new BlockOperationHandler()
      
      const blockTree = builder.buildFromLabel(ast.statements[0] as LabelNode)
      const context = { blockTree, ast, labelName: 'test' }

      // Add 3 dialogue blocks
      handler.addBlock('dialogue', blockTree.id, 0, context)
      handler.addBlock('dialogue', blockTree.id, 1, context)
      handler.addBlock('dialogue', blockTree.id, 2, context)

      expect(blockTree.children).toHaveLength(3)
      expect((ast.statements[0] as LabelNode).body).toHaveLength(3)

      // Delete middle block
      const middleBlockId = blockTree.children![1].id
      handler.deleteBlock(middleBlockId, context)

      expect(blockTree.children).toHaveLength(2)
      expect((ast.statements[0] as LabelNode).body).toHaveLength(2)

      // Verify remaining blocks are correct
      expect(blockTree.children![0].id).not.toBe(middleBlockId)
      expect(blockTree.children![1].id).not.toBe(middleBlockId)
    })
  })
})


// ========================================
// Integration Test: Mode Switching
// ========================================

describe('Integration: Mode Switching', () => {
  describe('Flow Mode ↔ Block Mode', () => {
    it('should switch from flow mode to block mode', () => {
      // Initial state is flow mode
      expect(useEditorModeStore.getState().currentMode).toBe('flow')
      expect(useEditorModeStore.getState().currentBlockLabel).toBeNull()

      // Enter block mode for a label
      useEditorModeStore.getState().enterBlockMode('chapter1')

      expect(useEditorModeStore.getState().currentMode).toBe('block')
      expect(useEditorModeStore.getState().currentBlockLabel).toBe('chapter1')
    })

    it('should switch from block mode back to flow mode', () => {
      // Enter block mode
      useEditorModeStore.getState().enterBlockMode('start')
      expect(useEditorModeStore.getState().currentMode).toBe('block')

      // Exit block mode
      useEditorModeStore.getState().exitBlockMode()

      expect(useEditorModeStore.getState().currentMode).toBe('flow')
      expect(useEditorModeStore.getState().currentBlockLabel).toBeNull()
    })

    it('should preserve AST content during mode switch', () => {
      const ast = createMockAst([{
        name: 'start',
        body: [
          createDialogueNode('d1', 'alice', 'Original text'),
        ],
      }])

      const builder = new BlockTreeBuilder()
      const handler = new BlockOperationHandler()

      // Enter block mode
      useEditorModeStore.getState().enterBlockMode('start')
      const blockTree = builder.buildFromLabel(ast.statements[0] as LabelNode)
      useBlockEditorStore.getState().setBlockTree(blockTree)

      // Edit a block
      handler.updateSlot(
        blockTree.children![0].id,
        'text',
        'Modified text',
        { blockTree, ast, labelName: 'start' }
      )

      // Exit block mode
      useEditorModeStore.getState().exitBlockMode()

      // Verify AST still has the modification
      const dialogue = (ast.statements[0] as LabelNode).body[0] as DialogueNode
      expect(dialogue.text).toBe('Modified text')

      // Re-enter block mode
      useEditorModeStore.getState().enterBlockMode('start')
      const newBlockTree = builder.buildFromLabel(ast.statements[0] as LabelNode)

      // Verify the modification is visible
      const textSlot = newBlockTree.children![0].slots.find(s => s.name === 'text')
      expect(textSlot?.value).toBe('Modified text')
    })

    it('should track mode history for navigation', () => {
      // Navigate through multiple labels
      useEditorModeStore.getState().enterBlockMode('label1')
      useEditorModeStore.getState().exitBlockMode()
      useEditorModeStore.getState().enterBlockMode('label2')
      useEditorModeStore.getState().exitBlockMode()
      useEditorModeStore.getState().enterBlockMode('label3')

      expect(useEditorModeStore.getState().currentBlockLabel).toBe('label3')
      expect(useEditorModeStore.getState().modeHistory.length).toBeGreaterThan(0)

      // Navigate back
      useEditorModeStore.getState().navigateBack()
      expect(useEditorModeStore.getState().currentMode).toBe('flow')
    })

    it('should not re-enter same label if already editing', () => {
      useEditorModeStore.getState().enterBlockMode('start')
      const historyLengthBefore = useEditorModeStore.getState().modeHistory.length

      // Try to enter same label again
      useEditorModeStore.getState().enterBlockMode('start')

      // History should not change
      expect(useEditorModeStore.getState().modeHistory.length).toBe(historyLengthBefore)
      expect(useEditorModeStore.getState().currentBlockLabel).toBe('start')
    })
  })
})


// ========================================
// Integration Test: Preview Playback
// ========================================

describe('Integration: Preview Playback', () => {
  describe('Play Block Sequence', () => {
    it('should calculate correct game state during playback', () => {
      const ast = createMockAst([{
        name: 'start',
        body: [
          createSceneNode('scene1', 'bg_room'),
          createShowNode('show1', 'alice', 'left'),
          createDialogueNode('d1', 'alice', 'Hello!'),
          createDialogueNode('d2', 'bob', 'Hi there!'),
        ],
      }])

      const builder = new BlockTreeBuilder()
      const calculator = new PreviewStateCalculator()
      const blockTree = builder.buildFromLabel(ast.statements[0] as LabelNode)

      // Calculate state at dialogue block
      const dialogueBlock = blockTree.children![2]
      const state = calculator.calculateState(blockTree.children!, dialogueBlock.id)

      expect(state.background).toBe('bg_room')
      expect(state.characters).toHaveLength(1)
      expect(state.characters[0].name).toBe('alice')
      expect(state.characters[0].position).toBe('left')
      expect(state.dialogue?.speaker).toBe('alice')
      expect(state.dialogue?.text).toBe('Hello!')
    })

    it('should navigate through blocks correctly', () => {
      const ast = createMockAst([{
        name: 'start',
        body: [
          createDialogueNode('d1', 'alice', 'First'),
          createDialogueNode('d2', 'bob', 'Second'),
          createDialogueNode('d3', 'charlie', 'Third'),
        ],
      }])

      const builder = new BlockTreeBuilder()
      const calculator = new PreviewStateCalculator()
      const blockTree = builder.buildFromLabel(ast.statements[0] as LabelNode)
      const blocks = blockTree.children!

      // Get first block
      const firstBlockId = blocks[0].id
      
      // Navigate forward
      const secondBlockId = calculator.getNextBlock(firstBlockId, blocks)
      expect(secondBlockId).toBe(blocks[1].id)

      const thirdBlockId = calculator.getNextBlock(secondBlockId!, blocks)
      expect(thirdBlockId).toBe(blocks[2].id)

      // At end, should return null
      const afterLast = calculator.getNextBlock(thirdBlockId!, blocks)
      expect(afterLast).toBeNull()

      // Navigate backward
      const backToSecond = calculator.getPreviousBlock(thirdBlockId!, blocks)
      expect(backToSecond).toBe(blocks[1].id)

      const backToFirst = calculator.getPreviousBlock(backToSecond!, blocks)
      expect(backToFirst).toBe(blocks[0].id)

      // At start, should return null
      const beforeFirst = calculator.getPreviousBlock(backToFirst!, blocks)
      expect(beforeFirst).toBeNull()
    })

    it('should update game state progressively during playback', () => {
      const ast = createMockAst([{
        name: 'start',
        body: [
          createSceneNode('scene1', 'bg_park'),
          createShowNode('show1', 'alice', 'center'),
          createShowNode('show2', 'bob', 'right'),
          createDialogueNode('d1', 'alice', 'Nice day!'),
        ],
      }])

      const builder = new BlockTreeBuilder()
      const calculator = new PreviewStateCalculator()
      const blockTree = builder.buildFromLabel(ast.statements[0] as LabelNode)
      const blocks = blockTree.children!

      useBlockEditorStore.getState().setBlockTree(blockTree)

      // Start playback at first block
      useBlockEditorStore.getState().startPlayback(blocks[0].id)
      expect(useBlockEditorStore.getState().playback.isPlaying).toBe(true)
      expect(useBlockEditorStore.getState().playback.currentBlockId).toBe(blocks[0].id)

      // Calculate state at scene block
      let state = calculator.calculateState(blocks, blocks[0].id)
      expect(state.background).toBe('bg_park')
      expect(state.characters).toHaveLength(0) // Scene clears characters

      // Step to show alice
      useBlockEditorStore.getState().stepNext()
      state = calculator.calculateState(blocks, useBlockEditorStore.getState().playback.currentBlockId!)
      expect(state.characters).toHaveLength(1)
      expect(state.characters[0].name).toBe('alice')

      // Step to show bob
      useBlockEditorStore.getState().stepNext()
      state = calculator.calculateState(blocks, useBlockEditorStore.getState().playback.currentBlockId!)
      expect(state.characters).toHaveLength(2)

      // Step to dialogue
      useBlockEditorStore.getState().stepNext()
      state = calculator.calculateState(blocks, useBlockEditorStore.getState().playback.currentBlockId!)
      expect(state.dialogue?.text).toBe('Nice day!')
    })

    it('should handle playback pause and resume', () => {
      // Create simple block tree
      const mockBlock: Block = {
        id: 'label_1',
        type: 'label',
        category: 'flow',
        astNodeId: 'ast_label',
        slots: [],
        children: [
          {
            id: 'd1',
            type: 'dialogue',
            category: 'dialogue',
            astNodeId: 'ast_d1',
            slots: [
              { name: 'speaker', type: 'character', value: 'alice', required: false },
              { name: 'text', type: 'multiline', value: 'Hello', required: true },
            ],
          },
        ],
      }

      useBlockEditorStore.getState().setBlockTree(mockBlock)
      useBlockEditorStore.getState().startPlayback('d1')

      expect(useBlockEditorStore.getState().playback.isPlaying).toBe(true)

      // Pause
      useBlockEditorStore.getState().pausePlayback()
      expect(useBlockEditorStore.getState().playback.isPlaying).toBe(false)
      expect(useBlockEditorStore.getState().playback.currentBlockId).toBe('d1') // Position preserved

      // Resume
      useBlockEditorStore.getState().resumePlayback()
      expect(useBlockEditorStore.getState().playback.isPlaying).toBe(true)
      expect(useBlockEditorStore.getState().playback.currentBlockId).toBe('d1')

      // Stop
      useBlockEditorStore.getState().stopPlayback()
      expect(useBlockEditorStore.getState().playback.isPlaying).toBe(false)
      expect(useBlockEditorStore.getState().playback.currentBlockId).toBeNull()
    })
  })
})


// ========================================
// Integration Test: Validation
// ========================================

describe('Integration: Validation', () => {
  describe('Block Validation During Editing', () => {
    it('should validate blocks and report errors', () => {
      const ast = createMockAst([{
        name: 'start',
        body: [
          createDialogueNode('d1', 'alice', ''), // Empty text - error
          { id: 'j1', type: 'jump', target: 'nonexistent' }, // Invalid target
        ],
      }])

      const builder = new BlockTreeBuilder()
      const validator = new BlockValidator()
      const blockTree = builder.buildFromLabel(ast.statements[0] as LabelNode)
      const context = createValidationContext(['start', 'end'], ['alice', 'bob'])

      const errors = validator.validateTree(blockTree, context)

      // Should have errors for empty dialogue and invalid jump target
      expect(errors.length).toBeGreaterThan(0)
      
      const emptyTextError = errors.find(e => e.type === 'required')
      const invalidTargetError = errors.find(e => e.type === 'invalid-target')
      
      expect(emptyTextError).toBeDefined()
      expect(invalidTargetError).toBeDefined()
    })

    it('should update validation errors in store', () => {
      // Add some errors
      useBlockEditorStore.getState().setValidationErrors([
        { blockId: 'b1', type: 'required', message: 'Text is required' },
        { blockId: 'b2', type: 'invalid-target', message: 'Label not found' },
      ])

      expect(useBlockEditorStore.getState().validationErrors).toHaveLength(2)

      // Remove errors for one block
      useBlockEditorStore.getState().removeBlockErrors('b1')
      expect(useBlockEditorStore.getState().validationErrors).toHaveLength(1)
      expect(useBlockEditorStore.getState().validationErrors[0].blockId).toBe('b2')

      // Clear all errors
      useBlockEditorStore.getState().clearValidationErrors()
      expect(useBlockEditorStore.getState().validationErrors).toHaveLength(0)
    })

    it('should get error summary by type', () => {
      const validator = new BlockValidator()
      const errors = [
        { blockId: 'b1', type: 'required' as const, message: 'Error 1' },
        { blockId: 'b2', type: 'required' as const, message: 'Error 2' },
        { blockId: 'b3', type: 'invalid-target' as const, message: 'Error 3' },
        { blockId: 'b4', type: 'missing-resource' as const, message: 'Error 4' },
      ]

      const summary = validator.getErrorSummary(errors)

      expect(summary.byType.required).toBe(2)
      expect(summary.byType['invalid-target']).toBe(1)
      expect(summary.byType['missing-resource']).toBe(1)
      expect(summary.total).toBe(4)
    })
  })
})

// ========================================
// Integration Test: Copy/Paste
// ========================================

describe('Integration: Copy/Paste', () => {
  describe('Block Copy and Paste Operations', () => {
    it('should copy and paste a block', () => {
      const ast = createMockAst([{
        name: 'start',
        body: [
          createDialogueNode('d1', 'alice', 'Original'),
        ],
      }])

      const builder = new BlockTreeBuilder()
      const handler = new BlockOperationHandler()
      const blockTree = builder.buildFromLabel(ast.statements[0] as LabelNode)
      const context = { blockTree, ast, labelName: 'start' }

      // Copy the dialogue block
      const clipboard = handler.copyBlock(blockTree.children![0].id, context)
      expect(clipboard).not.toBeNull()
      expect(clipboard!.blocks).toHaveLength(1)

      // Paste the block
      const pasteResult = handler.pasteBlock(clipboard!, blockTree.id, 1, context)
      expect(pasteResult.success).toBe(true)

      // Should now have 2 dialogue blocks
      expect(blockTree.children).toHaveLength(2)
      expect((ast.statements[0] as LabelNode).body).toHaveLength(2)

      // Pasted block should have different ID
      expect(blockTree.children![1].id).not.toBe(blockTree.children![0].id)

      // But same content
      const originalText = blockTree.children![0].slots.find(s => s.name === 'text')?.value
      const pastedText = blockTree.children![1].slots.find(s => s.name === 'text')?.value
      expect(pastedText).toBe(originalText)
    })

    it('should deep copy block with children', () => {
      const ast = createMockAst([{
        name: 'start',
        body: [
          createMenuNode('m1', [
            { text: 'Option A', body: [createDialogueNode('d1', 'alice', 'Choice A')] },
            { text: 'Option B', body: [createDialogueNode('d2', 'bob', 'Choice B')] },
          ]),
        ],
      }])

      const builder = new BlockTreeBuilder()
      const handler = new BlockOperationHandler()
      const blockTree = builder.buildFromLabel(ast.statements[0] as LabelNode)
      const context = { blockTree, ast, labelName: 'start' }

      // Copy the menu block
      const clipboard = handler.copyBlock(blockTree.children![0].id, context)
      expect(clipboard).not.toBeNull()

      // Clipboard should contain the menu with its children
      const copiedMenu = clipboard!.blocks[0]
      expect(copiedMenu.type).toBe('menu')
      expect(copiedMenu.children).toHaveLength(2)
    })
  })
})


// ========================================
// Integration Test: Block Selection and Collapse
// ========================================

describe('Integration: Selection and Collapse', () => {
  describe('Block Selection', () => {
    it('should track selected block', () => {
      useBlockEditorStore.getState().setSelectedBlockId('block_1')
      expect(useBlockEditorStore.getState().selectedBlockId).toBe('block_1')

      useBlockEditorStore.getState().setSelectedBlockId('block_2')
      expect(useBlockEditorStore.getState().selectedBlockId).toBe('block_2')

      useBlockEditorStore.getState().clearSelection()
      expect(useBlockEditorStore.getState().selectedBlockId).toBeNull()
    })

    it('should update block properties', () => {
      const mockTree: Block = {
        id: 'label_1',
        type: 'label',
        category: 'flow',
        astNodeId: 'ast_1',
        slots: [],
        children: [
          {
            id: 'block_1',
            type: 'dialogue',
            category: 'dialogue',
            astNodeId: 'ast_d1',
            slots: [],
            hasError: false,
          },
        ],
      }

      useBlockEditorStore.getState().setBlockTree(mockTree)
      useBlockEditorStore.getState().updateBlock('block_1', { hasError: true, selected: true })

      const updatedBlock = useBlockEditorStore.getState().blockTree?.children?.find(c => c.id === 'block_1')
      expect(updatedBlock?.hasError).toBe(true)
      expect(updatedBlock?.selected).toBe(true)
    })
  })

  describe('Block Collapse', () => {
    it('should toggle block collapsed state', () => {
      expect(useBlockEditorStore.getState().isBlockCollapsed('block_1')).toBe(false)

      useBlockEditorStore.getState().toggleBlockCollapsed('block_1')
      expect(useBlockEditorStore.getState().isBlockCollapsed('block_1')).toBe(true)

      useBlockEditorStore.getState().toggleBlockCollapsed('block_1')
      expect(useBlockEditorStore.getState().isBlockCollapsed('block_1')).toBe(false)
    })

    it('should collapse and expand all blocks', () => {
      const mockTree: Block = {
        id: 'label_1',
        type: 'label',
        category: 'flow',
        astNodeId: 'ast_1',
        slots: [],
        children: [
          { id: 'b1', type: 'dialogue', category: 'dialogue', astNodeId: 'a1', slots: [] },
          { id: 'b2', type: 'dialogue', category: 'dialogue', astNodeId: 'a2', slots: [] },
          { id: 'b3', type: 'dialogue', category: 'dialogue', astNodeId: 'a3', slots: [] },
        ],
      }

      useBlockEditorStore.getState().setBlockTree(mockTree)
      useBlockEditorStore.getState().collapseAll()

      expect(useBlockEditorStore.getState().collapsedBlocks.size).toBe(4) // label + 3 children

      useBlockEditorStore.getState().expandAll()
      expect(useBlockEditorStore.getState().collapsedBlocks.size).toBe(0)
    })
  })
})

// ========================================
// Integration Test: End-to-End Scenario
// ========================================

describe('Integration: End-to-End Scenario', () => {
  it('should handle complete editing session', () => {
    // Simulate a complete editing session
    const ast = createMockAst([
      {
        name: 'start',
        body: [
          createSceneNode('s1', 'bg_room'),
          createDialogueNode('d1', 'alice', 'Welcome!'),
        ],
      },
      {
        name: 'chapter1',
        body: [
          createDialogueNode('d2', 'bob', 'Hello!'),
        ],
      },
    ])

    const builder = new BlockTreeBuilder()
    const handler = new BlockOperationHandler()
    const calculator = new PreviewStateCalculator()
    const validator = new BlockValidator()
    const context = createValidationContext(['start', 'chapter1'], ['alice', 'bob'])

    // 1. Start in flow mode
    expect(useEditorModeStore.getState().currentMode).toBe('flow')

    // 2. Enter block mode for 'start' label
    useEditorModeStore.getState().enterBlockMode('start')
    const startTree = builder.buildFromLabel(ast.statements[0] as LabelNode)
    useBlockEditorStore.getState().setCurrentLabel('start')
    useBlockEditorStore.getState().setBlockTree(startTree)

    expect(useEditorModeStore.getState().currentMode).toBe('block')
    expect(useBlockEditorStore.getState().currentLabel).toBe('start')

    // 3. Select a block
    useBlockEditorStore.getState().setSelectedBlockId(startTree.children![1].id)
    expect(useBlockEditorStore.getState().selectedBlockId).toBe(startTree.children![1].id)

    // 4. Preview the selected block
    const previewState = calculator.calculateState(
      startTree.children!,
      useBlockEditorStore.getState().selectedBlockId!
    )
    expect(previewState.background).toBe('bg_room')
    expect(previewState.dialogue?.text).toBe('Welcome!')

    // 5. Add a new dialogue block
    const addResult = handler.addBlock(
      'dialogue',
      startTree.id,
      2,
      { blockTree: startTree, ast, labelName: 'start' }
    )
    expect(addResult.success).toBe(true)

    // 6. Update the new block
    const newBlockId = addResult.blockId!
    handler.updateSlot(
      newBlockId,
      'text',
      'Nice to meet you!',
      { blockTree: startTree, ast, labelName: 'start' }
    )
    handler.updateSlot(
      newBlockId,
      'speaker',
      'alice',
      { blockTree: startTree, ast, labelName: 'start' }
    )

    // 7. Validate the tree
    const errors = validator.validateTree(startTree, context)
    useBlockEditorStore.getState().setValidationErrors(errors)

    // 8. Start playback
    useBlockEditorStore.getState().startPlayback(startTree.children![0].id)
    expect(useBlockEditorStore.getState().playback.isPlaying).toBe(true)

    // 9. Step through blocks
    useBlockEditorStore.getState().stepNext()
    useBlockEditorStore.getState().stepNext()
    expect(useBlockEditorStore.getState().playback.currentBlockId).toBe(startTree.children![2].id)

    // 10. Stop playback
    useBlockEditorStore.getState().stopPlayback()
    expect(useBlockEditorStore.getState().playback.isPlaying).toBe(false)

    // 11. Exit block mode
    useEditorModeStore.getState().exitBlockMode()
    expect(useEditorModeStore.getState().currentMode).toBe('flow')

    // 12. Verify AST was updated
    const updatedLabel = ast.statements[0] as LabelNode
    expect(updatedLabel.body).toHaveLength(3)
    expect((updatedLabel.body[2] as DialogueNode).text).toBe('Nice to meet you!')

    // 13. Switch to another label
    useEditorModeStore.getState().enterBlockMode('chapter1')
    const chapter1Tree = builder.buildFromLabel(ast.statements[1] as LabelNode)
    useBlockEditorStore.getState().setCurrentLabel('chapter1')
    useBlockEditorStore.getState().setBlockTree(chapter1Tree)

    expect(useBlockEditorStore.getState().currentLabel).toBe('chapter1')
    expect(useBlockEditorStore.getState().blockTree?.children).toHaveLength(1)
  })
})
