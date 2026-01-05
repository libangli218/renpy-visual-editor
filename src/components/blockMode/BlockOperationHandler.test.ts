/**
 * BlockOperationHandler Unit Tests
 * 积木操作处理器单元测试
 * 
 * Tests for block operations: add, delete, move, update, copy, paste.
 * 
 * Implements Requirements:
 * - 8.1: 用户添加积木时在 AST 中创建对应的节点
 * - 8.2: 用户删除积木时从 AST 中移除对应的节点
 * - 8.3: 用户修改积木属性时更新 AST 中对应节点的属性
 * - 8.4: 用户重新排序积木时更新 AST 中节点的顺序
 * - 8.6: 支持撤销/重做操作
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  BlockOperationHandler,
  BlockOperationContext,
  resetBlockIdCounter,
} from './BlockOperationHandler'
import { Block, BlockType } from './types'
import { RenpyScript, LabelNode, DialogueNode } from '../../types/ast'

// Helper to create a basic AST
function createBasicAst(labelName: string, body: any[] = []): RenpyScript {
  return {
    type: 'script',
    statements: [
      {
        id: `label_${labelName}`,
        type: 'label',
        name: labelName,
        body,
      } as LabelNode,
    ],
    metadata: {
      filePath: 'test.rpy',
      parseTime: new Date(),
      version: '1.0',
    },
  }
}

// Helper to create a basic block tree (label container)
function createBasicBlockTree(labelName: string, children: Block[] = []): Block {
  return {
    id: 'block_label_1',
    type: 'label',
    category: 'flow',
    astNodeId: `label_${labelName}`,
    slots: [{ name: 'name', type: 'text', value: labelName, required: true }],
    children,
    collapsed: false,
    selected: false,
    hasError: false,
  }
}

// Helper to create a dialogue block
function createDialogueBlock(id: string, astNodeId: string, speaker: string | null, text: string): Block {
  return {
    id,
    type: 'dialogue',
    category: 'dialogue',
    astNodeId,
    slots: [
      { name: 'speaker', type: 'character', value: speaker, required: false },
      { name: 'text', type: 'multiline', value: text, required: true },
    ],
    collapsed: false,
    selected: false,
    hasError: false,
  }
}

// Helper to create a dialogue AST node
function createDialogueAstNode(id: string, speaker: string | null, text: string): DialogueNode {
  return {
    id,
    type: 'dialogue',
    speaker,
    text,
  }
}

describe('BlockOperationHandler', () => {
  let handler: BlockOperationHandler

  beforeEach(() => {
    handler = new BlockOperationHandler()
    resetBlockIdCounter()
  })

  describe('addBlock', () => {
    it('should add a dialogue block to an empty label', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.addBlock('dialogue', blockTree.id, 0, context)

      expect(result.success).toBe(true)
      expect(result.blockId).toBeDefined()
      expect(blockTree.children).toHaveLength(1)
      expect(blockTree.children![0].type).toBe('dialogue')
    })

    it('should add a block at the correct index', () => {
      const ast = createBasicAst('start', [
        createDialogueAstNode('dialogue_1', 'alice', 'First'),
        createDialogueAstNode('dialogue_2', 'bob', 'Second'),
      ])
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'First'),
        createDialogueBlock('block_2', 'dialogue_2', 'bob', 'Second'),
      ])
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.addBlock('dialogue', blockTree.id, 1, context)

      expect(result.success).toBe(true)
      expect(blockTree.children).toHaveLength(3)
      expect(blockTree.children![1].type).toBe('dialogue')
    })

    it('should create corresponding AST node', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      handler.addBlock('dialogue', blockTree.id, 0, context)

      const label = ast.statements[0] as LabelNode
      expect(label.body).toHaveLength(1)
      expect(label.body[0].type).toBe('dialogue')
    })

    it('should fail when parent block is not found', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.addBlock('dialogue', 'non_existent_id', 0, context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Parent block not found')
    })

    it('should add scene block with correct AST node', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.addBlock('scene', blockTree.id, 0, context)

      expect(result.success).toBe(true)
      const label = ast.statements[0] as LabelNode
      expect(label.body[0].type).toBe('scene')
    })

    it('should add jump block with correct AST node', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.addBlock('jump', blockTree.id, 0, context)

      expect(result.success).toBe(true)
      const label = ast.statements[0] as LabelNode
      expect(label.body[0].type).toBe('jump')
    })
  })

  describe('deleteBlock', () => {
    it('should delete a block from the tree', () => {
      const ast = createBasicAst('start', [
        createDialogueAstNode('dialogue_1', 'alice', 'Hello'),
      ])
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'Hello'),
      ])
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.deleteBlock('block_1', context)

      expect(result.success).toBe(true)
      expect(blockTree.children).toHaveLength(0)
    })

    it('should remove corresponding AST node', () => {
      const ast = createBasicAst('start', [
        createDialogueAstNode('dialogue_1', 'alice', 'Hello'),
      ])
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'Hello'),
      ])
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      handler.deleteBlock('block_1', context)

      const label = ast.statements[0] as LabelNode
      expect(label.body).toHaveLength(0)
    })

    it('should fail when block is not found', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.deleteBlock('non_existent_id', context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Block not found')
    })

    it('should delete block and preserve other blocks', () => {
      const ast = createBasicAst('start', [
        createDialogueAstNode('dialogue_1', 'alice', 'First'),
        createDialogueAstNode('dialogue_2', 'bob', 'Second'),
        createDialogueAstNode('dialogue_3', 'charlie', 'Third'),
      ])
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'First'),
        createDialogueBlock('block_2', 'dialogue_2', 'bob', 'Second'),
        createDialogueBlock('block_3', 'dialogue_3', 'charlie', 'Third'),
      ])
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      handler.deleteBlock('block_2', context)

      expect(blockTree.children).toHaveLength(2)
      expect(blockTree.children![0].id).toBe('block_1')
      expect(blockTree.children![1].id).toBe('block_3')
    })
  })

  describe('moveBlock', () => {
    it('should move a block within the same parent', () => {
      const ast = createBasicAst('start', [
        createDialogueAstNode('dialogue_1', 'alice', 'First'),
        createDialogueAstNode('dialogue_2', 'bob', 'Second'),
        createDialogueAstNode('dialogue_3', 'charlie', 'Third'),
      ])
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'First'),
        createDialogueBlock('block_2', 'dialogue_2', 'bob', 'Second'),
        createDialogueBlock('block_3', 'dialogue_3', 'charlie', 'Third'),
      ])
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      // Move block_1 to position 2 (after block_2)
      const result = handler.moveBlock('block_1', blockTree.id, 2, context)

      expect(result.success).toBe(true)
      expect(blockTree.children![0].id).toBe('block_2')
      expect(blockTree.children![1].id).toBe('block_1')
      expect(blockTree.children![2].id).toBe('block_3')
    })

    it('should fail when block is not found', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.moveBlock('non_existent', blockTree.id, 0, context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Block not found')
    })

    it('should fail when new parent is not found', () => {
      const ast = createBasicAst('start', [
        createDialogueAstNode('dialogue_1', 'alice', 'Hello'),
      ])
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'Hello'),
      ])
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.moveBlock('block_1', 'non_existent_parent', 0, context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('New parent not found')
    })
  })

  describe('updateSlot', () => {
    it('should update dialogue text', () => {
      const ast = createBasicAst('start', [
        createDialogueAstNode('dialogue_1', 'alice', 'Original text'),
      ])
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'Original text'),
      ])
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.updateSlot('block_1', 'text', 'Updated text', context)

      expect(result.success).toBe(true)
      
      // Check block slot was updated
      const textSlot = blockTree.children![0].slots.find(s => s.name === 'text')
      expect(textSlot?.value).toBe('Updated text')
      
      // Check AST was updated
      const label = ast.statements[0] as LabelNode
      const dialogue = label.body[0] as DialogueNode
      expect(dialogue.text).toBe('Updated text')
    })

    it('should update dialogue speaker', () => {
      const ast = createBasicAst('start', [
        createDialogueAstNode('dialogue_1', 'alice', 'Hello'),
      ])
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'Hello'),
      ])
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.updateSlot('block_1', 'speaker', 'bob', context)

      expect(result.success).toBe(true)
      
      const label = ast.statements[0] as LabelNode
      const dialogue = label.body[0] as DialogueNode
      expect(dialogue.speaker).toBe('bob')
    })

    it('should fail when block is not found', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.updateSlot('non_existent', 'text', 'value', context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Block not found')
    })

    it('should fail when slot is not found', () => {
      const ast = createBasicAst('start', [
        createDialogueAstNode('dialogue_1', 'alice', 'Hello'),
      ])
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'Hello'),
      ])
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const result = handler.updateSlot('block_1', 'non_existent_slot', 'value', context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Slot not found')
    })
  })


  describe('copyBlock', () => {
    it('should copy a block to clipboard', () => {
      const ast = createBasicAst('start', [
        createDialogueAstNode('dialogue_1', 'alice', 'Hello'),
      ])
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'Hello'),
      ])
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const clipboard = handler.copyBlock('block_1', context)

      expect(clipboard).not.toBeNull()
      expect(clipboard!.blocks).toHaveLength(1)
      expect(clipboard!.blocks[0].type).toBe('dialogue')
      expect(clipboard!.sourceLabel).toBe('start')
      expect(clipboard!.timestamp).toBeDefined()
    })

    it('should return null when block is not found', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const clipboard = handler.copyBlock('non_existent', context)

      expect(clipboard).toBeNull()
    })

    it('should deep copy block slots', () => {
      const ast = createBasicAst('start', [
        createDialogueAstNode('dialogue_1', 'alice', 'Hello'),
      ])
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'Hello'),
      ])
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const clipboard = handler.copyBlock('block_1', context)

      // Modify original block
      blockTree.children![0].slots[1].value = 'Modified'

      // Clipboard should still have original value
      const textSlot = clipboard!.blocks[0].slots.find(s => s.name === 'text')
      expect(textSlot?.value).toBe('Hello')
    })
  })

  describe('pasteBlock', () => {
    it('should paste a block from clipboard', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const clipboard = {
        blocks: [createDialogueBlock('copied_block', 'copied_ast', 'alice', 'Copied text')],
        sourceLabel: 'other_label',
        timestamp: Date.now(),
      }

      const result = handler.pasteBlock(clipboard, blockTree.id, 0, context)

      expect(result.success).toBe(true)
      expect(blockTree.children).toHaveLength(1)
      expect(blockTree.children![0].type).toBe('dialogue')
    })

    it('should generate new IDs for pasted blocks', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const originalBlock = createDialogueBlock('original_id', 'original_ast', 'alice', 'Text')
      const clipboard = {
        blocks: [originalBlock],
        sourceLabel: 'start',
        timestamp: Date.now(),
      }

      handler.pasteBlock(clipboard, blockTree.id, 0, context)

      // Pasted block should have a different ID
      expect(blockTree.children![0].id).not.toBe('original_id')
    })

    it('should fail when clipboard is empty', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const clipboard = {
        blocks: [],
        sourceLabel: 'start',
        timestamp: Date.now(),
      }

      const result = handler.pasteBlock(clipboard, blockTree.id, 0, context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Clipboard is empty')
    })

    it('should fail when parent is not found', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      const clipboard = {
        blocks: [createDialogueBlock('block', 'ast', 'alice', 'Text')],
        sourceLabel: 'start',
        timestamp: Date.now(),
      }

      const result = handler.pasteBlock(clipboard, 'non_existent', 0, context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Parent block not found')
    })
  })

  describe('findBlockById', () => {
    it('should find a block by ID', () => {
      const blockTree = createBasicBlockTree('start', [
        createDialogueBlock('block_1', 'dialogue_1', 'alice', 'Hello'),
      ])

      const found = handler.findBlockById(blockTree, 'block_1')

      expect(found).not.toBeNull()
      expect(found!.id).toBe('block_1')
    })

    it('should find the root block', () => {
      const blockTree = createBasicBlockTree('start')

      const found = handler.findBlockById(blockTree, 'block_label_1')

      expect(found).not.toBeNull()
      expect(found!.type).toBe('label')
    })

    it('should return null when block is not found', () => {
      const blockTree = createBasicBlockTree('start')

      const found = handler.findBlockById(blockTree, 'non_existent')

      expect(found).toBeNull()
    })

    it('should find nested blocks', () => {
      const menuBlock: Block = {
        id: 'menu_block',
        type: 'menu',
        category: 'flow',
        astNodeId: 'menu_1',
        slots: [],
        children: [
          {
            id: 'choice_block',
            type: 'choice',
            category: 'flow',
            astNodeId: 'choice_1',
            slots: [{ name: 'text', type: 'text', value: 'Option', required: true }],
            children: [
              createDialogueBlock('nested_dialogue', 'dialogue_1', 'alice', 'Nested'),
            ],
          },
        ],
      }
      const blockTree = createBasicBlockTree('start', [menuBlock])

      const found = handler.findBlockById(blockTree, 'nested_dialogue')

      expect(found).not.toBeNull()
      expect(found!.id).toBe('nested_dialogue')
    })
  })

  describe('AST synchronization', () => {
    it('should maintain AST consistency after multiple operations', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      // Add three blocks
      handler.addBlock('dialogue', blockTree.id, 0, context)
      handler.addBlock('dialogue', blockTree.id, 1, context)
      handler.addBlock('dialogue', blockTree.id, 2, context)

      const label = ast.statements[0] as LabelNode
      expect(label.body).toHaveLength(3)
      expect(blockTree.children).toHaveLength(3)

      // Delete middle block
      const middleBlockId = blockTree.children![1].id
      handler.deleteBlock(middleBlockId, context)

      expect(label.body).toHaveLength(2)
      expect(blockTree.children).toHaveLength(2)
    })

    it('should link block to AST node correctly', () => {
      const ast = createBasicAst('start')
      const blockTree = createBasicBlockTree('start')
      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName: 'start',
      }

      handler.addBlock('dialogue', blockTree.id, 0, context)

      const block = blockTree.children![0]
      const label = ast.statements[0] as LabelNode
      const astNode = label.body[0]

      expect(block.astNodeId).toBe(astNode.id)
    })
  })
})
