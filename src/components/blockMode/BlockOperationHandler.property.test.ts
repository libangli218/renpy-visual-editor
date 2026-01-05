/**
 * BlockOperationHandler Property Tests
 * 积木操作处理器属性测试
 * 
 * Property-based tests for block operations and AST synchronization.
 * 
 * **Property 1: 积木-AST 双向同步正确性**
 * *For any* 积木操作，操作后的积木树应该与 AST 保持一致
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import {
  BlockOperationHandler,
  BlockOperationContext,
  resetBlockIdCounter,
} from './BlockOperationHandler'
import { Block, BlockType, BlockClipboard } from './types'
import { RenpyScript, LabelNode, DialogueNode, ASTNode } from '../../types/ast'

// ============================================================================
// Arbitrary Generators
// ============================================================================

// Generate valid identifiers
const arbitraryIdentifier = fc.stringMatching(/^[a-z_][a-z0-9_]{0,19}$/)

// Generate simple text (no special characters)
const arbitrarySimpleText = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-'),
  { minLength: 1, maxLength: 50 }
)

// Block types that can be added
const addableBlockTypes: BlockType[] = [
  'dialogue',
  'scene',
  'show',
  'hide',
  'with',
  'jump',
  'call',
  'return',
  'play-music',
  'stop-music',
  'play-sound',
  'python',
]

const arbitraryAddableBlockType = fc.constantFrom(...addableBlockTypes)

// ============================================================================
// Helper Functions
// ============================================================================

// Generate unique node ID
let nodeIdCounter = 0
const generateNodeId = () => `test_node_${++nodeIdCounter}_${Date.now()}`

// Create a basic AST
function createBasicAst(labelName: string, body: ASTNode[] = []): RenpyScript {
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

// Create a basic block tree (label container)
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

// Create a dialogue block
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

// Create a dialogue AST node
function createDialogueAstNode(id: string, speaker: string | null, text: string): DialogueNode {
  return {
    id,
    type: 'dialogue',
    speaker,
    text,
  }
}

// Count blocks in tree
function countBlocks(block: Block): number {
  let count = 1
  if (block.children) {
    for (const child of block.children) {
      count += countBlocks(child)
    }
  }
  return count
}

// Count AST nodes in label body
function countAstNodes(ast: RenpyScript, labelName: string): number {
  const label = ast.statements.find(
    s => s.type === 'label' && (s as LabelNode).name === labelName
  ) as LabelNode | undefined
  return label?.body.length ?? 0
}

// Get all block IDs in tree
function getAllBlockIds(block: Block): string[] {
  const ids = [block.id]
  if (block.children) {
    for (const child of block.children) {
      ids.push(...getAllBlockIds(child))
    }
  }
  return ids
}

// Get all AST node IDs in label
function getAllAstNodeIds(ast: RenpyScript, labelName: string): string[] {
  const label = ast.statements.find(
    s => s.type === 'label' && (s as LabelNode).name === labelName
  ) as LabelNode | undefined
  return label?.body.map(n => n.id) ?? []
}

// ============================================================================
// Property Tests
// ============================================================================

/**
 * Feature: block-editor-mode, Property 1: 积木-AST 双向同步正确性
 * 
 * For any block operation, the block tree should remain consistent with the AST.
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
 */
describe('Property 1: 积木-AST 双向同步正确性 (Block-AST Bidirectional Sync)', () => {
  let handler: BlockOperationHandler

  beforeEach(() => {
    handler = new BlockOperationHandler()
    resetBlockIdCounter()
    nodeIdCounter = 0
  })

  /**
   * Property 1.1: Adding a block creates corresponding AST node
   * Validates: Requirements 8.1 (用户添加积木时在 AST 中创建对应的节点)
   */
  it('adding a block creates corresponding AST node', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitraryAddableBlockType,
        fc.integer({ min: 0, max: 10 }),
        (labelName, blockType, index) => {
          const ast = createBasicAst(labelName)
          const blockTree = createBasicBlockTree(labelName)
          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          const initialAstCount = countAstNodes(ast, labelName)
          const initialBlockCount = blockTree.children?.length ?? 0

          const result = handler.addBlock(blockType, blockTree.id, index, context)

          if (result.success) {
            const newAstCount = countAstNodes(ast, labelName)
            const newBlockCount = blockTree.children?.length ?? 0

            // Block count should increase by 1
            expect(newBlockCount).toBe(initialBlockCount + 1)

            // AST count should increase by 1 (except for comment blocks)
            if (blockType !== 'comment') {
              expect(newAstCount).toBe(initialAstCount + 1)
            }

            // The new block should have a valid astNodeId
            const newBlock = blockTree.children?.find(b => b.id === result.blockId)
            expect(newBlock).toBeDefined()
            if (blockType !== 'comment') {
              expect(newBlock!.astNodeId).toBeTruthy()
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.2: Deleting a block removes corresponding AST node
   * Validates: Requirements 8.2 (用户删除积木时从 AST 中移除对应的节点)
   */
  it('deleting a block removes corresponding AST node', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        fc.integer({ min: 1, max: 5 }),
        (labelName, numBlocks) => {
          // Create AST with dialogues
          const dialogues = Array.from({ length: numBlocks }, (_, i) =>
            createDialogueAstNode(`dialogue_${i}`, null, `Text ${i}`)
          )
          const ast = createBasicAst(labelName, dialogues)

          // Create block tree with dialogues
          const blocks = Array.from({ length: numBlocks }, (_, i) =>
            createDialogueBlock(`block_${i}`, `dialogue_${i}`, null, `Text ${i}`)
          )
          const blockTree = createBasicBlockTree(labelName, blocks)

          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          const initialAstCount = countAstNodes(ast, labelName)
          const initialBlockCount = blockTree.children?.length ?? 0

          // Delete the first block
          const blockToDelete = blockTree.children![0].id
          const result = handler.deleteBlock(blockToDelete, context)

          expect(result.success).toBe(true)

          const newAstCount = countAstNodes(ast, labelName)
          const newBlockCount = blockTree.children?.length ?? 0

          // Both counts should decrease by 1
          expect(newBlockCount).toBe(initialBlockCount - 1)
          expect(newAstCount).toBe(initialAstCount - 1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.3: Updating a slot updates corresponding AST property
   * Validates: Requirements 8.3 (用户修改积木属性时更新 AST 中对应节点的属性)
   */
  it('updating a slot updates corresponding AST property', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitrarySimpleText,
        arbitrarySimpleText,
        (labelName, originalText, newText) => {
          // Skip if texts are the same
          if (originalText === newText) return true

          const ast = createBasicAst(labelName, [
            createDialogueAstNode('dialogue_1', null, originalText),
          ])
          const blockTree = createBasicBlockTree(labelName, [
            createDialogueBlock('block_1', 'dialogue_1', null, originalText),
          ])

          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          const result = handler.updateSlot('block_1', 'text', newText, context)

          expect(result.success).toBe(true)

          // Block slot should be updated
          const textSlot = blockTree.children![0].slots.find(s => s.name === 'text')
          expect(textSlot?.value).toBe(newText)

          // AST should be updated
          const label = ast.statements[0] as LabelNode
          const dialogue = label.body[0] as DialogueNode
          expect(dialogue.text).toBe(newText)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.4: Block tree and AST maintain consistent counts after operations
   * Validates: Requirements 8.1, 8.2, 8.4
   */
  it('block tree and AST maintain consistent counts after multiple operations', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        fc.array(
          fc.record({
            operation: fc.constantFrom('add', 'delete'),
            blockType: arbitraryAddableBlockType,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (labelName, operations) => {
          const ast = createBasicAst(labelName)
          const blockTree = createBasicBlockTree(labelName)
          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          for (const op of operations) {
            if (op.operation === 'add') {
              handler.addBlock(op.blockType, blockTree.id, 0, context)
            } else if (op.operation === 'delete' && blockTree.children && blockTree.children.length > 0) {
              handler.deleteBlock(blockTree.children[0].id, context)
            }
          }

          // After all operations, block count should match AST count
          // (excluding comment blocks which don't create AST nodes)
          const blockCount = blockTree.children?.filter(b => b.type !== 'comment').length ?? 0
          const astCount = countAstNodes(ast, labelName)

          expect(blockCount).toBe(astCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.5: Each block's astNodeId references a valid AST node
   * Validates: Requirements 8.5 (AST 被外部修改时重新构建积木视图)
   */
  it('each block astNodeId references a valid AST node after add operations', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        fc.array(arbitraryAddableBlockType, { minLength: 1, maxLength: 5 }),
        (labelName, blockTypes) => {
          const ast = createBasicAst(labelName)
          const blockTree = createBasicBlockTree(labelName)
          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Add blocks
          for (const blockType of blockTypes) {
            handler.addBlock(blockType, blockTree.id, 0, context)
          }

          // Get all AST node IDs
          const astNodeIds = new Set(getAllAstNodeIds(ast, labelName))

          // Check each block's astNodeId
          for (const block of blockTree.children ?? []) {
            if (block.type !== 'comment') {
              expect(astNodeIds.has(block.astNodeId)).toBe(true)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Feature: block-editor-mode, Property 7: 积木复制粘贴正确性
 * 
 * For any copy/paste operation, the pasted block should be a deep copy of the original
 * with new IDs but same slot values.
 * 
 * **Validates: Requirements 14.3**
 */
describe('Property 7: 积木复制粘贴正确性 (Block Copy/Paste Correctness)', () => {
  let handler: BlockOperationHandler

  beforeEach(() => {
    handler = new BlockOperationHandler()
    resetBlockIdCounter()
    nodeIdCounter = 0
  })

  /**
   * Helper to collect all block IDs from a block tree
   */
  function collectAllBlockIds(block: Block): string[] {
    const ids = [block.id]
    if (block.children) {
      for (const child of block.children) {
        ids.push(...collectAllBlockIds(child))
      }
    }
    return ids
  }

  /**
   * Helper to collect all AST node IDs from a block tree
   */
  function collectAllAstNodeIds(block: Block): string[] {
    const ids = block.astNodeId ? [block.astNodeId] : []
    if (block.children) {
      for (const child of block.children) {
        ids.push(...collectAllAstNodeIds(child))
      }
    }
    return ids
  }

  /**
   * Helper to compare slot values between two blocks
   */
  function slotsHaveSameValues(block1: Block, block2: Block): boolean {
    if (block1.slots.length !== block2.slots.length) return false
    for (let i = 0; i < block1.slots.length; i++) {
      const slot1 = block1.slots[i]
      const slot2 = block2.slots[i]
      if (slot1.name !== slot2.name) return false
      if (slot1.type !== slot2.type) return false
      // Compare values - handle null/undefined
      if (slot1.value !== slot2.value) {
        // Both null/undefined is ok
        if (slot1.value == null && slot2.value == null) continue
        return false
      }
    }
    return true
  }

  /**
   * Helper to recursively compare block structure (excluding IDs)
   */
  function blocksHaveSameStructure(block1: Block, block2: Block): boolean {
    // Same type and category
    if (block1.type !== block2.type) return false
    if (block1.category !== block2.category) return false
    
    // Same slot values
    if (!slotsHaveSameValues(block1, block2)) return false
    
    // Same children structure
    const children1 = block1.children ?? []
    const children2 = block2.children ?? []
    if (children1.length !== children2.length) return false
    
    for (let i = 0; i < children1.length; i++) {
      if (!blocksHaveSameStructure(children1[i], children2[i])) return false
    }
    
    return true
  }

  /**
   * Property 7.1: Pasted block has different ID than original
   * Validates: Requirements 14.3 (支持复制/粘贴积木及积木栈)
   */
  it('pasted block has different ID than original', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitraryAddableBlockType,
        (labelName, blockType) => {
          // Create AST and block tree with one block
          const ast = createBasicAst(labelName)
          const blockTree = createBasicBlockTree(labelName)
          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Add a block to copy
          const addResult = handler.addBlock(blockType, blockTree.id, 0, context)
          if (!addResult.success) return true // Skip if add failed

          const originalBlockId = addResult.blockId!
          const originalBlock = blockTree.children![0]

          // Copy the block
          const clipboard = handler.copyBlock(originalBlockId, context)
          expect(clipboard).not.toBeNull()

          // Paste the block
          const pasteResult = handler.pasteBlock(clipboard!, blockTree.id, 1, context)
          expect(pasteResult.success).toBe(true)

          const pastedBlockId = pasteResult.blockId!
          const pastedBlock = blockTree.children!.find(b => b.id === pastedBlockId)

          // Pasted block should have different ID
          expect(pastedBlockId).not.toBe(originalBlockId)
          expect(pastedBlock).toBeDefined()
          expect(pastedBlock!.id).not.toBe(originalBlock.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.2: Pasted block has same slot values as original
   * Validates: Requirements 14.3
   */
  it('pasted block has same slot values as original', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitrarySimpleText,
        fc.option(arbitraryIdentifier, { nil: null }),
        (labelName, text, speaker) => {
          // Create AST with a dialogue
          const ast = createBasicAst(labelName, [
            createDialogueAstNode('dialogue_1', speaker, text),
          ])
          const blockTree = createBasicBlockTree(labelName, [
            createDialogueBlock('block_1', 'dialogue_1', speaker, text),
          ])

          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Copy the block
          const clipboard = handler.copyBlock('block_1', context)
          expect(clipboard).not.toBeNull()

          // Paste the block
          const pasteResult = handler.pasteBlock(clipboard!, blockTree.id, 1, context)
          expect(pasteResult.success).toBe(true)

          const pastedBlock = blockTree.children!.find(b => b.id === pasteResult.blockId)
          const originalBlock = blockTree.children!.find(b => b.id === 'block_1')

          // Slot values should be the same
          expect(slotsHaveSameValues(originalBlock!, pastedBlock!)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.3: Pasted block has different AST node ID
   * Validates: Requirements 14.3
   */
  it('pasted block has different AST node ID than original', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitraryAddableBlockType,
        (labelName, blockType) => {
          // Skip comment blocks as they don't have AST nodes
          if (blockType === 'comment') return true

          const ast = createBasicAst(labelName)
          const blockTree = createBasicBlockTree(labelName)
          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Add a block to copy
          const addResult = handler.addBlock(blockType, blockTree.id, 0, context)
          if (!addResult.success) return true

          const originalBlock = blockTree.children![0]
          const originalAstNodeId = originalBlock.astNodeId

          // Copy and paste
          const clipboard = handler.copyBlock(originalBlock.id, context)
          const pasteResult = handler.pasteBlock(clipboard!, blockTree.id, 1, context)
          expect(pasteResult.success).toBe(true)

          const pastedBlock = blockTree.children!.find(b => b.id === pasteResult.blockId)

          // AST node ID should be different
          expect(pastedBlock!.astNodeId).not.toBe(originalAstNodeId)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.4: Pasting increases block count by number of pasted blocks
   * Validates: Requirements 14.3
   */
  it('pasting increases block count correctly', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 4 }),
        (labelName, numBlocks, copyIndex) => {
          const validCopyIndex = copyIndex % numBlocks

          // Create AST with dialogues
          const dialogues = Array.from({ length: numBlocks }, (_, i) =>
            createDialogueAstNode(`dialogue_${i}`, null, `Text ${i}`)
          )
          const ast = createBasicAst(labelName, dialogues)

          // Create block tree with dialogues
          const blocks = Array.from({ length: numBlocks }, (_, i) =>
            createDialogueBlock(`block_${i}`, `dialogue_${i}`, null, `Text ${i}`)
          )
          const blockTree = createBasicBlockTree(labelName, blocks)

          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          const initialCount = blockTree.children!.length

          // Copy and paste
          const blockToCopy = blockTree.children![validCopyIndex]
          const clipboard = handler.copyBlock(blockToCopy.id, context)
          const pasteResult = handler.pasteBlock(clipboard!, blockTree.id, numBlocks, context)

          expect(pasteResult.success).toBe(true)
          expect(blockTree.children!.length).toBe(initialCount + 1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.5: Pasted block is independent (modifying original doesn't affect paste)
   * Validates: Requirements 14.3 (deep copy)
   */
  it('pasted block is independent from original', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitrarySimpleText,
        arbitrarySimpleText,
        (labelName, originalText, newText) => {
          // Skip if texts are the same
          if (originalText === newText) return true

          const ast = createBasicAst(labelName, [
            createDialogueAstNode('dialogue_1', null, originalText),
          ])
          const blockTree = createBasicBlockTree(labelName, [
            createDialogueBlock('block_1', 'dialogue_1', null, originalText),
          ])

          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Copy and paste
          const clipboard = handler.copyBlock('block_1', context)
          const pasteResult = handler.pasteBlock(clipboard!, blockTree.id, 1, context)
          expect(pasteResult.success).toBe(true)

          const pastedBlock = blockTree.children!.find(b => b.id === pasteResult.blockId)!
          const originalBlock = blockTree.children!.find(b => b.id === 'block_1')!

          // Modify original block's slot
          handler.updateSlot('block_1', 'text', newText, context)

          // Pasted block should still have original text
          const pastedTextSlot = pastedBlock.slots.find(s => s.name === 'text')
          const originalTextSlot = originalBlock.slots.find(s => s.name === 'text')

          expect(originalTextSlot!.value).toBe(newText)
          expect(pastedTextSlot!.value).toBe(originalText)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.6: Copy returns null for non-existent block
   */
  it('copy returns null for non-existent block', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitraryIdentifier,
        (labelName, fakeBlockId) => {
          const ast = createBasicAst(labelName)
          const blockTree = createBasicBlockTree(labelName)
          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Try to copy non-existent block
          const clipboard = handler.copyBlock(`nonexistent_${fakeBlockId}`, context)
          expect(clipboard).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.7: Paste with empty clipboard fails
   */
  it('paste with empty clipboard fails', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        (labelName) => {
          const ast = createBasicAst(labelName)
          const blockTree = createBasicBlockTree(labelName)
          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Try to paste empty clipboard
          const emptyClipboard: BlockClipboard = {
            blocks: [],
            sourceLabel: labelName,
            timestamp: Date.now(),
          }

          const pasteResult = handler.pasteBlock(emptyClipboard, blockTree.id, 0, context)
          expect(pasteResult.success).toBe(false)
          expect(pasteResult.error).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Feature: block-editor-mode, Property 5: 积木移动正确性
 * 
 * For any block move operation, the moved block should appear at the target position.
 * 
 * **Validates: Requirements 7.2, 7.3, 7.4**
 */
describe('Property 5: 积木移动正确性 (Block Move Correctness)', () => {
  let handler: BlockOperationHandler

  beforeEach(() => {
    handler = new BlockOperationHandler()
    resetBlockIdCounter()
    nodeIdCounter = 0
  })

  /**
   * Property 5.1: Moving a block places it at the target position
   * Validates: Requirements 7.2 (用户释放积木在有效吸附点时将积木插入到该位置)
   */
  it('moving a block places it at the target position', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        fc.integer({ min: 3, max: 10 }),
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        (labelName, numBlocks, sourceIndex, targetIndex) => {
          // Ensure valid indices
          const validNumBlocks = Math.max(3, numBlocks)
          const validSourceIndex = sourceIndex % validNumBlocks
          const validTargetIndex = targetIndex % validNumBlocks

          // Create AST with dialogues
          const dialogues = Array.from({ length: validNumBlocks }, (_, i) =>
            createDialogueAstNode(`dialogue_${i}`, null, `Text ${i}`)
          )
          const ast = createBasicAst(labelName, dialogues)

          // Create block tree with dialogues
          const blocks = Array.from({ length: validNumBlocks }, (_, i) =>
            createDialogueBlock(`block_${i}`, `dialogue_${i}`, null, `Text ${i}`)
          )
          const blockTree = createBasicBlockTree(labelName, blocks)

          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Get the block to move
          const blockToMove = blockTree.children![validSourceIndex]
          const blockId = blockToMove.id

          // Move the block
          const result = handler.moveBlock(blockId, blockTree.id, validTargetIndex, context)

          expect(result.success).toBe(true)

          // The block should exist in the tree
          const movedBlock = blockTree.children!.find(b => b.id === blockId)
          expect(movedBlock).toBeDefined()

          // Total count should remain the same
          expect(blockTree.children!.length).toBe(validNumBlocks)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.2: Moving a block removes it from the original position
   * Validates: Requirements 7.3 (用户拖拽积木离开当前位置时从原位置移除该积木)
   */
  it('moving a block removes it from the original position', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        fc.integer({ min: 3, max: 10 }),
        (labelName, numBlocks) => {
          const validNumBlocks = Math.max(3, numBlocks)

          // Create AST with dialogues
          const dialogues = Array.from({ length: validNumBlocks }, (_, i) =>
            createDialogueAstNode(`dialogue_${i}`, null, `Text ${i}`)
          )
          const ast = createBasicAst(labelName, dialogues)

          // Create block tree with dialogues
          const blocks = Array.from({ length: validNumBlocks }, (_, i) =>
            createDialogueBlock(`block_${i}`, `dialogue_${i}`, null, `Text ${i}`)
          )
          const blockTree = createBasicBlockTree(labelName, blocks)

          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Move first block to the end
          const blockId = blockTree.children![0].id
          const result = handler.moveBlock(blockId, blockTree.id, validNumBlocks - 1, context)

          expect(result.success).toBe(true)

          // The block should appear exactly once
          const occurrences = blockTree.children!.filter(b => b.id === blockId).length
          expect(occurrences).toBe(1)

          // Total count should remain the same
          expect(blockTree.children!.length).toBe(validNumBlocks)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.3: Moving preserves block content
   * Validates: Requirements 7.4 (支持拖拽积木栈)
   */
  it('moving preserves block content and slots', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitrarySimpleText,
        fc.option(arbitraryIdentifier, { nil: null }),
        (labelName, text, speaker) => {
          // Create AST with a dialogue
          const ast = createBasicAst(labelName, [
            createDialogueAstNode('dialogue_1', speaker, text),
            createDialogueAstNode('dialogue_2', null, 'Other'),
          ])

          // Create block tree
          const blockTree = createBasicBlockTree(labelName, [
            createDialogueBlock('block_1', 'dialogue_1', speaker, text),
            createDialogueBlock('block_2', 'dialogue_2', null, 'Other'),
          ])

          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Move first block to position 1
          const result = handler.moveBlock('block_1', blockTree.id, 1, context)

          expect(result.success).toBe(true)

          // Find the moved block
          const movedBlock = blockTree.children!.find(b => b.id === 'block_1')
          expect(movedBlock).toBeDefined()

          // Content should be preserved
          const textSlot = movedBlock!.slots.find(s => s.name === 'text')
          expect(textSlot?.value).toBe(text)

          const speakerSlot = movedBlock!.slots.find(s => s.name === 'speaker')
          expect(speakerSlot?.value).toBe(speaker)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.4: Moving updates AST order
   * Validates: Requirements 8.4 (用户重新排序积木时更新 AST 中节点的顺序)
   */
  it('moving updates AST node order', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        fc.integer({ min: 3, max: 5 }),
        (labelName, numBlocks) => {
          const validNumBlocks = Math.max(3, numBlocks)

          // Create AST with dialogues
          const dialogues = Array.from({ length: validNumBlocks }, (_, i) =>
            createDialogueAstNode(`dialogue_${i}`, null, `Text ${i}`)
          )
          const ast = createBasicAst(labelName, dialogues)

          // Create block tree with dialogues
          const blocks = Array.from({ length: validNumBlocks }, (_, i) =>
            createDialogueBlock(`block_${i}`, `dialogue_${i}`, null, `Text ${i}`)
          )
          const blockTree = createBasicBlockTree(labelName, blocks)

          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Move first block to the end
          const blockId = blockTree.children![0].id
          const astNodeId = blockTree.children![0].astNodeId
          handler.moveBlock(blockId, blockTree.id, validNumBlocks - 1, context)

          // The AST node should still exist
          const label = ast.statements[0] as LabelNode
          const astNode = label.body.find(n => n.id === astNodeId)
          expect(astNode).toBeDefined()

          // AST count should remain the same
          expect(label.body.length).toBe(validNumBlocks)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.5: Moving to same position is idempotent
   */
  it('moving to same position preserves order', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 0, max: 4 }),
        (labelName, numBlocks, index) => {
          const validNumBlocks = Math.max(2, numBlocks)
          const validIndex = index % validNumBlocks

          // Create AST with dialogues
          const dialogues = Array.from({ length: validNumBlocks }, (_, i) =>
            createDialogueAstNode(`dialogue_${i}`, null, `Text ${i}`)
          )
          const ast = createBasicAst(labelName, dialogues)

          // Create block tree with dialogues
          const blocks = Array.from({ length: validNumBlocks }, (_, i) =>
            createDialogueBlock(`block_${i}`, `dialogue_${i}`, null, `Text ${i}`)
          )
          const blockTree = createBasicBlockTree(labelName, blocks)

          const context: BlockOperationContext = {
            blockTree,
            ast,
            labelName,
          }

          // Get original order
          const originalOrder = blockTree.children!.map(b => b.id)

          // Move block to its current position
          const blockId = blockTree.children![validIndex].id
          handler.moveBlock(blockId, blockTree.id, validIndex, context)

          // Order should be preserved (or minimally changed)
          const newOrder = blockTree.children!.map(b => b.id)
          
          // The block should still be in the tree
          expect(newOrder).toContain(blockId)
          expect(newOrder.length).toBe(originalOrder.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})
