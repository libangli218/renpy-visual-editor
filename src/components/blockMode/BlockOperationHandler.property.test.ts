/**
 * BlockOperationHandler Property Tests
 * 积木操作处理器属性测试
 * 
 * Property-based tests for cross-label block operations.
 * 
 * Feature: multi-label-view, Property 6: 跨 Label 移动积木的守恒性
 * 
 * For any block moved from Label A to Label B:
 * - A's block count decreases by 1
 * - B's block count increases by 1
 * - Total block count remains unchanged
 * 
 * Validates: Requirements 3.4
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import {
  BlockOperationHandler,
  CrossLabelOperationContext,
  resetBlockIdCounter,
} from './BlockOperationHandler'
import { Block, BlockType, BlockCategory, BlockSlot } from './types'
import { RenpyScript, LabelNode, DialogueNode, SceneNode, ASTNode } from '../../types/ast'

// ========================================
// Arbitrary Generators
// ========================================

// Generate a valid identifier for label names
const arbitraryIdentifier = fc.stringMatching(/^[a-z_][a-z0-9_]{0,9}$/)

// Generate a unique block ID
const arbitraryBlockId = fc.uuid()

// Generate a unique AST node ID
const arbitraryAstNodeId = fc.uuid()

// Generate a dialogue block slot
const arbitraryDialogueSlots: fc.Arbitrary<BlockSlot[]> = fc.record({
  speaker: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  text: fc.string({ minLength: 1, maxLength: 100 }),
}).map(({ speaker, text }) => [
  { name: 'speaker', type: 'character' as const, value: speaker, required: false },
  { name: 'text', type: 'multiline' as const, value: text, required: true },
])

// Generate a scene block slot
const arbitrarySceneSlots: fc.Arbitrary<BlockSlot[]> = fc.record({
  image: fc.string({ minLength: 1, maxLength: 50 }),
}).map(({ image }) => [
  { name: 'image', type: 'image' as const, value: image, required: true },
])

// Generate a simple block (dialogue or scene - non-container types)
const arbitrarySimpleBlock: fc.Arbitrary<Block> = fc.oneof(
  // Dialogue block
  fc.record({
    id: arbitraryBlockId,
    type: fc.constant('dialogue' as BlockType),
    category: fc.constant('dialogue' as BlockCategory),
    astNodeId: arbitraryAstNodeId,
    slots: arbitraryDialogueSlots,
    collapsed: fc.boolean(),
    selected: fc.constant(false),
    hasError: fc.constant(false),
  }),
  // Scene block
  fc.record({
    id: arbitraryBlockId,
    type: fc.constant('scene' as BlockType),
    category: fc.constant('scene' as BlockCategory),
    astNodeId: arbitraryAstNodeId,
    slots: arbitrarySceneSlots,
    collapsed: fc.boolean(),
    selected: fc.constant(false),
    hasError: fc.constant(false),
  })
)

// Generate a dialogue AST node
const arbitraryDialogueAstNode = (id: string, speaker: string | null, text: string): DialogueNode => ({
  id,
  type: 'dialogue',
  speaker,
  text,
})

// Generate a scene AST node
const arbitrarySceneAstNode = (id: string, image: string): SceneNode => ({
  id,
  type: 'scene',
  image,
})

// Generate AST node from block
function blockToAstNode(block: Block): ASTNode {
  if (block.type === 'dialogue') {
    const speakerSlot = block.slots.find(s => s.name === 'speaker')
    const textSlot = block.slots.find(s => s.name === 'text')
    return arbitraryDialogueAstNode(
      block.astNodeId,
      speakerSlot?.value as string | null ?? null,
      textSlot?.value as string ?? ''
    )
  } else {
    const imageSlot = block.slots.find(s => s.name === 'image')
    return arbitrarySceneAstNode(
      block.astNodeId,
      imageSlot?.value as string ?? ''
    )
  }
}

// Generate a label block tree with children
const arbitraryLabelBlockTree = (labelName: string, labelAstId: string): fc.Arbitrary<Block> =>
  fc.array(arbitrarySimpleBlock, { minLength: 1, maxLength: 10 }).map(children => ({
    id: `block_label_${labelName}`,
    type: 'label' as BlockType,
    category: 'flow' as BlockCategory,
    astNodeId: labelAstId,
    slots: [{ name: 'name', type: 'text' as const, value: labelName, required: true }],
    children,
    collapsed: false,
    selected: false,
    hasError: false,
  }))

// Generate a label AST node from block tree
function blockTreeToLabelNode(blockTree: Block, labelName: string): LabelNode {
  return {
    id: blockTree.astNodeId,
    type: 'label',
    name: labelName,
    body: (blockTree.children ?? []).map(blockToAstNode),
  }
}

// Generate two distinct label names
const arbitraryTwoDistinctLabelNames: fc.Arbitrary<[string, string]> = fc.tuple(
  arbitraryIdentifier,
  arbitraryIdentifier
).filter(([a, b]) => a !== b)

// Generate a cross-label operation context with two labels
const arbitraryCrossLabelContext: fc.Arbitrary<{
  sourceBlockTree: Block
  targetBlockTree: Block
  ast: RenpyScript
  sourceLabelName: string
  targetLabelName: string
  blockIndexToMove: number
}> = arbitraryTwoDistinctLabelNames.chain(([sourceLabelName, targetLabelName]) => {
  const sourceAstId = `label_${sourceLabelName}`
  const targetAstId = `label_${targetLabelName}`
  
  return fc.tuple(
    arbitraryLabelBlockTree(sourceLabelName, sourceAstId),
    arbitraryLabelBlockTree(targetLabelName, targetAstId)
  ).chain(([sourceBlockTree, targetBlockTree]) => {
    const sourceChildCount = sourceBlockTree.children?.length ?? 0
    
    return fc.record({
      sourceBlockTree: fc.constant(sourceBlockTree),
      targetBlockTree: fc.constant(targetBlockTree),
      sourceLabelName: fc.constant(sourceLabelName),
      targetLabelName: fc.constant(targetLabelName),
      blockIndexToMove: fc.integer({ min: 0, max: Math.max(0, sourceChildCount - 1) }),
    }).map(data => {
      // Build AST from block trees
      const ast: RenpyScript = {
        type: 'script',
        statements: [
          blockTreeToLabelNode(data.sourceBlockTree, data.sourceLabelName),
          blockTreeToLabelNode(data.targetBlockTree, data.targetLabelName),
        ],
        metadata: {
          filePath: 'test.rpy',
          parseTime: new Date(),
          version: '1.0',
        },
      }
      
      return {
        ...data,
        ast,
      }
    })
  })
})

// ========================================
// Helper Functions
// ========================================

/**
 * Count total blocks in a block tree (excluding the root label)
 */
function countBlocks(blockTree: Block): number {
  return blockTree.children?.length ?? 0
}

/**
 * Count total AST nodes in a label
 */
function countAstNodes(ast: RenpyScript, labelName: string): number {
  const label = ast.statements.find(
    s => s.type === 'label' && (s as LabelNode).name === labelName
  ) as LabelNode | undefined
  return label?.body.length ?? 0
}

/**
 * Get total block count across all labels
 */
function getTotalBlockCount(sourceTree: Block, targetTree: Block): number {
  return countBlocks(sourceTree) + countBlocks(targetTree)
}

/**
 * Get total AST node count across all labels
 */
function getTotalAstNodeCount(ast: RenpyScript, sourceLabelName: string, targetLabelName: string): number {
  return countAstNodes(ast, sourceLabelName) + countAstNodes(ast, targetLabelName)
}

// ========================================
// Property Tests
// ========================================

describe('BlockOperationHandler Property Tests', () => {
  let handler: BlockOperationHandler

  beforeEach(() => {
    handler = new BlockOperationHandler()
    resetBlockIdCounter()
  })

  /**
   * Feature: multi-label-view, Property 6: 跨 Label 移动积木的守恒性
   * 
   * For any block moved from Label A to Label B:
   * - A's block count decreases by 1
   * - B's block count increases by 1
   * - Total block count remains unchanged
   * 
   * Validates: Requirements 3.4
   */
  describe('Property 6: Cross-Label Block Move Conservation', () => {
    it('moving a block from source to target preserves total block count', () => {
      fc.assert(
        fc.property(
          arbitraryCrossLabelContext,
          fc.integer({ min: 0, max: 100 }), // target index
          (contextData, rawTargetIndex) => {
            const { sourceBlockTree, targetBlockTree, ast, sourceLabelName, targetLabelName, blockIndexToMove } = contextData
            
            // Skip if source has no children
            if (!sourceBlockTree.children || sourceBlockTree.children.length === 0) {
              return true
            }
            
            // Get the block to move
            const blockToMove = sourceBlockTree.children[blockIndexToMove]
            if (!blockToMove) {
              return true
            }
            
            // Record counts before move
            const sourceCountBefore = countBlocks(sourceBlockTree)
            const targetCountBefore = countBlocks(targetBlockTree)
            const totalCountBefore = getTotalBlockCount(sourceBlockTree, targetBlockTree)
            const totalAstCountBefore = getTotalAstNodeCount(ast, sourceLabelName, targetLabelName)
            
            // Clamp target index to valid range
            const targetIndex = Math.min(rawTargetIndex, targetBlockTree.children?.length ?? 0)
            
            // Create cross-label context
            const context: CrossLabelOperationContext = {
              sourceBlockTree,
              targetBlockTree,
              ast,
              sourceLabelName,
              targetLabelName,
            }
            
            // Perform the move
            const result = handler.moveBlockAcrossLabels(blockToMove.id, targetIndex, context)
            
            // If move failed, counts should remain unchanged
            if (!result.success) {
              expect(countBlocks(sourceBlockTree)).toBe(sourceCountBefore)
              expect(countBlocks(targetBlockTree)).toBe(targetCountBefore)
              return true
            }
            
            // Verify conservation properties
            const sourceCountAfter = countBlocks(sourceBlockTree)
            const targetCountAfter = countBlocks(targetBlockTree)
            const totalCountAfter = getTotalBlockCount(sourceBlockTree, targetBlockTree)
            const totalAstCountAfter = getTotalAstNodeCount(ast, sourceLabelName, targetLabelName)
            
            // Source count should decrease by 1
            expect(sourceCountAfter).toBe(sourceCountBefore - 1)
            
            // Target count should increase by 1
            expect(targetCountAfter).toBe(targetCountBefore + 1)
            
            // Total count should remain unchanged
            expect(totalCountAfter).toBe(totalCountBefore)
            
            // AST node count should also be conserved
            expect(totalAstCountAfter).toBe(totalAstCountBefore)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('source label block count decreases by exactly 1 after move', () => {
      fc.assert(
        fc.property(
          arbitraryCrossLabelContext,
          fc.integer({ min: 0, max: 50 }),
          (contextData, rawTargetIndex) => {
            const { sourceBlockTree, targetBlockTree, ast, sourceLabelName, targetLabelName, blockIndexToMove } = contextData
            
            if (!sourceBlockTree.children || sourceBlockTree.children.length === 0) {
              return true
            }
            
            const blockToMove = sourceBlockTree.children[blockIndexToMove]
            if (!blockToMove) {
              return true
            }
            
            const sourceCountBefore = countBlocks(sourceBlockTree)
            const targetIndex = Math.min(rawTargetIndex, targetBlockTree.children?.length ?? 0)
            
            const context: CrossLabelOperationContext = {
              sourceBlockTree,
              targetBlockTree,
              ast,
              sourceLabelName,
              targetLabelName,
            }
            
            const result = handler.moveBlockAcrossLabels(blockToMove.id, targetIndex, context)
            
            if (result.success) {
              expect(countBlocks(sourceBlockTree)).toBe(sourceCountBefore - 1)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('target label block count increases by exactly 1 after move', () => {
      fc.assert(
        fc.property(
          arbitraryCrossLabelContext,
          fc.integer({ min: 0, max: 50 }),
          (contextData, rawTargetIndex) => {
            const { sourceBlockTree, targetBlockTree, ast, sourceLabelName, targetLabelName, blockIndexToMove } = contextData
            
            if (!sourceBlockTree.children || sourceBlockTree.children.length === 0) {
              return true
            }
            
            const blockToMove = sourceBlockTree.children[blockIndexToMove]
            if (!blockToMove) {
              return true
            }
            
            const targetCountBefore = countBlocks(targetBlockTree)
            const targetIndex = Math.min(rawTargetIndex, targetBlockTree.children?.length ?? 0)
            
            const context: CrossLabelOperationContext = {
              sourceBlockTree,
              targetBlockTree,
              ast,
              sourceLabelName,
              targetLabelName,
            }
            
            const result = handler.moveBlockAcrossLabels(blockToMove.id, targetIndex, context)
            
            if (result.success) {
              expect(countBlocks(targetBlockTree)).toBe(targetCountBefore + 1)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('AST nodes are conserved during cross-label move', () => {
      fc.assert(
        fc.property(
          arbitraryCrossLabelContext,
          fc.integer({ min: 0, max: 50 }),
          (contextData, rawTargetIndex) => {
            const { sourceBlockTree, targetBlockTree, ast, sourceLabelName, targetLabelName, blockIndexToMove } = contextData
            
            if (!sourceBlockTree.children || sourceBlockTree.children.length === 0) {
              return true
            }
            
            const blockToMove = sourceBlockTree.children[blockIndexToMove]
            if (!blockToMove) {
              return true
            }
            
            const sourceAstCountBefore = countAstNodes(ast, sourceLabelName)
            const targetAstCountBefore = countAstNodes(ast, targetLabelName)
            const totalAstCountBefore = sourceAstCountBefore + targetAstCountBefore
            
            const targetIndex = Math.min(rawTargetIndex, targetBlockTree.children?.length ?? 0)
            
            const context: CrossLabelOperationContext = {
              sourceBlockTree,
              targetBlockTree,
              ast,
              sourceLabelName,
              targetLabelName,
            }
            
            const result = handler.moveBlockAcrossLabels(blockToMove.id, targetIndex, context)
            
            if (result.success) {
              const sourceAstCountAfter = countAstNodes(ast, sourceLabelName)
              const targetAstCountAfter = countAstNodes(ast, targetLabelName)
              const totalAstCountAfter = sourceAstCountAfter + targetAstCountAfter
              
              // Source AST count decreases by 1
              expect(sourceAstCountAfter).toBe(sourceAstCountBefore - 1)
              
              // Target AST count increases by 1
              expect(targetAstCountAfter).toBe(targetAstCountBefore + 1)
              
              // Total AST count is conserved
              expect(totalAstCountAfter).toBe(totalAstCountBefore)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('moved block appears in target at correct position', () => {
      fc.assert(
        fc.property(
          arbitraryCrossLabelContext,
          fc.integer({ min: 0, max: 50 }),
          (contextData, rawTargetIndex) => {
            const { sourceBlockTree, targetBlockTree, ast, sourceLabelName, targetLabelName, blockIndexToMove } = contextData
            
            if (!sourceBlockTree.children || sourceBlockTree.children.length === 0) {
              return true
            }
            
            const blockToMove = sourceBlockTree.children[blockIndexToMove]
            if (!blockToMove) {
              return true
            }
            
            const blockId = blockToMove.id
            const targetChildrenLength = targetBlockTree.children?.length ?? 0
            const targetIndex = Math.min(rawTargetIndex, targetChildrenLength)
            
            const context: CrossLabelOperationContext = {
              sourceBlockTree,
              targetBlockTree,
              ast,
              sourceLabelName,
              targetLabelName,
            }
            
            const result = handler.moveBlockAcrossLabels(blockId, targetIndex, context)
            
            if (result.success) {
              // Block should no longer be in source
              const foundInSource = sourceBlockTree.children?.find(b => b.id === blockId)
              expect(foundInSource).toBeUndefined()
              
              // Block should be in target
              const foundInTarget = targetBlockTree.children?.find(b => b.id === blockId)
              expect(foundInTarget).toBeDefined()
              
              // Block should be at the correct position (clamped to valid range)
              const actualIndex = targetBlockTree.children?.findIndex(b => b.id === blockId) ?? -1
              expect(actualIndex).toBeGreaterThanOrEqual(0)
              expect(actualIndex).toBeLessThanOrEqual(targetChildrenLength)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
