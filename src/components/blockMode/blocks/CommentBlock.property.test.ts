/**
 * CommentBlock Property Tests
 * 注释积木组件属性测试
 * 
 * Property-based tests for comment block code generation behavior.
 * 
 * **Property 10: 注释积木不生成代码**
 * *For any* 包含注释积木的积木树，生成的代码不应包含注释积木的内容
 * **Validates: Requirements 15.4**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { Block, BlockType, BlockCategory } from '../types'
import { 
  isCommentBlock, 
  shouldGenerateCode, 
  filterOutComments, 
  filterOutCommentsRecursive 
} from './CommentBlock'

// ============================================================================
// Arbitrary Generators for Blocks
// ============================================================================

// Generate unique block ID
let blockIdCounter = 0
const generateBlockId = () => `test_block_${++blockIdCounter}_${Date.now()}`

// Non-comment block types
const NON_COMMENT_TYPES: BlockType[] = [
  'dialogue', 'scene', 'show', 'hide', 'with',
  'menu', 'choice', 'jump', 'call', 'return',
  'if', 'elif', 'else',
  'play-music', 'stop-music', 'play-sound',
  'python'
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
  'set': 'advanced',
  'comment': 'advanced',
}

// Arbitrary non-comment block type
const arbitraryNonCommentType: fc.Arbitrary<BlockType> = fc.constantFrom(...NON_COMMENT_TYPES)

// Arbitrary comment text
const arbitraryCommentText = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-'),
  { minLength: 1, maxLength: 100 }
)

// Arbitrary comment block
const arbitraryCommentBlock: fc.Arbitrary<Block> = arbitraryCommentText.map(text => ({
  id: generateBlockId(),
  type: 'comment' as BlockType,
  category: 'advanced' as BlockCategory,
  astNodeId: `ast_${generateBlockId()}`,
  slots: [{ name: 'text', type: 'multiline' as const, value: text, required: false }],
  collapsed: false,
  selected: false,
  hasError: false,
}))

// Arbitrary non-comment block
const arbitraryNonCommentBlock: fc.Arbitrary<Block> = arbitraryNonCommentType.map(type => ({
  id: generateBlockId(),
  type,
  category: TYPE_TO_CATEGORY[type],
  astNodeId: `ast_${generateBlockId()}`,
  slots: [],
  collapsed: false,
  selected: false,
  hasError: false,
}))

// Arbitrary block (either comment or non-comment)
const arbitraryBlock: fc.Arbitrary<Block> = fc.oneof(
  { weight: 1, arbitrary: arbitraryCommentBlock },
  { weight: 3, arbitrary: arbitraryNonCommentBlock }
)

// Arbitrary array of blocks
const arbitraryBlockArray = (minLength: number, maxLength: number): fc.Arbitrary<Block[]> =>
  fc.array(arbitraryBlock, { minLength, maxLength })

// Arbitrary block tree (with nested children)
const arbitraryBlockTree = (depth: number): fc.Arbitrary<Block> => {
  if (depth <= 0) {
    return arbitraryBlock
  }
  
  return fc.oneof(
    // Leaf block (no children)
    arbitraryBlock,
    // Container block with children
    fc.tuple(
      fc.constantFrom<BlockType>('menu', 'choice', 'if', 'label'),
      fc.array(arbitraryBlockTree(depth - 1), { minLength: 0, maxLength: 3 })
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
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Count comment blocks in a block array
 */
function countCommentBlocks(blocks: Block[]): number {
  return blocks.filter(b => b.type === 'comment').length
}

/**
 * Count non-comment blocks in a block array
 */
function countNonCommentBlocks(blocks: Block[]): number {
  return blocks.filter(b => b.type !== 'comment').length
}

/**
 * Recursively count all blocks in a tree
 */
function countAllBlocks(block: Block): number {
  let count = 1
  if (block.children) {
    for (const child of block.children) {
      count += countAllBlocks(child)
    }
  }
  return count
}

/**
 * Recursively count comment blocks in a tree
 */
function countCommentBlocksInTree(block: Block): number {
  let count = block.type === 'comment' ? 1 : 0
  if (block.children) {
    for (const child of block.children) {
      count += countCommentBlocksInTree(child)
    }
  }
  return count
}

/**
 * Recursively count non-comment blocks in a tree
 */
function countNonCommentBlocksInTree(block: Block): number {
  let count = block.type !== 'comment' ? 1 : 0
  if (block.children) {
    for (const child of block.children) {
      count += countNonCommentBlocksInTree(child)
    }
  }
  return count
}

/**
 * Check if any block in tree is a comment
 */
function hasCommentInTree(block: Block): boolean {
  if (block.type === 'comment') return true
  if (block.children) {
    for (const child of block.children) {
      if (hasCommentInTree(child)) return true
    }
  }
  return false
}

/**
 * Get all block IDs in a tree
 */
function getAllBlockIds(block: Block): string[] {
  const ids = [block.id]
  if (block.children) {
    for (const child of block.children) {
      ids.push(...getAllBlockIds(child))
    }
  }
  return ids
}

// ============================================================================
// Property Tests
// ============================================================================

/**
 * Feature: block-editor-mode, Property 10: 注释积木不生成代码
 * 
 * For any block tree containing comment blocks, the generated code should
 * not include the content of comment blocks.
 * 
 * **Validates: Requirements 15.4**
 */
describe('Property 10: 注释积木不生成代码 (Comment Blocks Do Not Generate Code)', () => {

  /**
   * Property 10.1: isCommentBlock correctly identifies comment blocks
   */
  it('isCommentBlock correctly identifies comment blocks', () => {
    fc.assert(
      fc.property(arbitraryCommentBlock, (commentBlock) => {
        expect(isCommentBlock(commentBlock)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.2: isCommentBlock returns false for non-comment blocks
   */
  it('isCommentBlock returns false for non-comment blocks', () => {
    fc.assert(
      fc.property(arbitraryNonCommentBlock, (nonCommentBlock) => {
        expect(isCommentBlock(nonCommentBlock)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.3: shouldGenerateCode returns false for comment blocks
   */
  it('shouldGenerateCode returns false for comment blocks', () => {
    fc.assert(
      fc.property(arbitraryCommentBlock, (commentBlock) => {
        expect(shouldGenerateCode(commentBlock)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.4: shouldGenerateCode returns true for non-comment blocks
   */
  it('shouldGenerateCode returns true for non-comment blocks', () => {
    fc.assert(
      fc.property(arbitraryNonCommentBlock, (nonCommentBlock) => {
        expect(shouldGenerateCode(nonCommentBlock)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.5: filterOutComments removes all comment blocks from array
   */
  it('filterOutComments removes all comment blocks from array', () => {
    fc.assert(
      fc.property(arbitraryBlockArray(0, 20), (blocks) => {
        const filtered = filterOutComments(blocks)
        
        // No comment blocks in result
        expect(countCommentBlocks(filtered)).toBe(0)
        
        // All non-comment blocks preserved
        expect(filtered.length).toBe(countNonCommentBlocks(blocks))
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.6: filterOutComments preserves order of non-comment blocks
   */
  it('filterOutComments preserves order of non-comment blocks', () => {
    fc.assert(
      fc.property(arbitraryBlockArray(0, 20), (blocks) => {
        const filtered = filterOutComments(blocks)
        const originalNonComments = blocks.filter(b => b.type !== 'comment')
        
        // Order should be preserved
        expect(filtered.length).toBe(originalNonComments.length)
        for (let i = 0; i < filtered.length; i++) {
          expect(filtered[i].id).toBe(originalNonComments[i].id)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.7: filterOutComments returns empty array for all-comment input
   */
  it('filterOutComments returns empty array for all-comment input', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryCommentBlock, { minLength: 1, maxLength: 10 }),
        (commentBlocks) => {
          const filtered = filterOutComments(commentBlocks)
          expect(filtered.length).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.8: filterOutCommentsRecursive returns null for comment block
   */
  it('filterOutCommentsRecursive returns null for comment block', () => {
    fc.assert(
      fc.property(arbitraryCommentBlock, (commentBlock) => {
        const result = filterOutCommentsRecursive(commentBlock)
        expect(result).toBeNull()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.9: filterOutCommentsRecursive preserves non-comment blocks
   */
  it('filterOutCommentsRecursive preserves non-comment blocks without children', () => {
    fc.assert(
      fc.property(arbitraryNonCommentBlock, (nonCommentBlock) => {
        const result = filterOutCommentsRecursive(nonCommentBlock)
        
        expect(result).not.toBeNull()
        expect(result!.id).toBe(nonCommentBlock.id)
        expect(result!.type).toBe(nonCommentBlock.type)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.10: filterOutCommentsRecursive removes comment children
   */
  it('filterOutCommentsRecursive removes comment children from tree', () => {
    fc.assert(
      fc.property(arbitraryBlockTree(3), (blockTree) => {
        const result = filterOutCommentsRecursive(blockTree)
        
        if (blockTree.type === 'comment') {
          // Root is comment, result should be null
          expect(result).toBeNull()
        } else {
          // Root is not comment, result should exist
          expect(result).not.toBeNull()
          
          // No comments in result tree
          expect(countCommentBlocksInTree(result!)).toBe(0)
          
          // All non-comment blocks preserved
          const originalNonCommentCount = countNonCommentBlocksInTree(blockTree)
          const resultNonCommentCount = countNonCommentBlocksInTree(result!)
          expect(resultNonCommentCount).toBe(originalNonCommentCount)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.11: filterOutCommentsRecursive preserves tree structure
   */
  it('filterOutCommentsRecursive preserves tree structure for non-comment nodes', () => {
    // Create a tree with only non-comment blocks
    const nonCommentTree = fc.tuple(
      fc.constantFrom<BlockType>('menu', 'choice', 'if', 'label'),
      fc.array(arbitraryNonCommentBlock, { minLength: 0, maxLength: 5 })
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
    
    fc.assert(
      fc.property(nonCommentTree, (blockTree) => {
        const result = filterOutCommentsRecursive(blockTree)
        
        expect(result).not.toBeNull()
        expect(result!.id).toBe(blockTree.id)
        expect(result!.type).toBe(blockTree.type)
        expect(result!.children?.length).toBe(blockTree.children?.length)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.12: Comment block content is not in filtered result
   */
  it('comment block content is not accessible in filtered result', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          arbitraryCommentBlock,
          fc.array(arbitraryNonCommentBlock, { minLength: 1, maxLength: 5 })
        ),
        ([commentBlock, nonCommentBlocks]) => {
          const mixedBlocks = [...nonCommentBlocks, commentBlock]
          const filtered = filterOutComments(mixedBlocks)
          
          // Comment block ID should not be in filtered result
          const filteredIds = filtered.map(b => b.id)
          expect(filteredIds).not.toContain(commentBlock.id)
          
          // Comment block content should not be accessible
          const commentText = commentBlock.slots.find(s => s.name === 'text')?.value
          const allSlotValues = filtered.flatMap(b => b.slots.map(s => s.value))
          expect(allSlotValues).not.toContain(commentText)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.13: Empty array returns empty array
   */
  it('filterOutComments returns empty array for empty input', () => {
    const result = filterOutComments([])
    expect(result).toEqual([])
  })

  /**
   * Property 10.14: filterOutCommentsRecursive handles deeply nested comments
   */
  it('filterOutCommentsRecursive handles deeply nested comments', () => {
    // Create a deeply nested tree with comments at various levels
    const deepTree: Block = {
      id: 'root',
      type: 'label',
      category: 'flow',
      astNodeId: 'ast_root',
      slots: [],
      children: [
        {
          id: 'child1',
          type: 'dialogue',
          category: 'dialogue',
          astNodeId: 'ast_child1',
          slots: [],
        },
        {
          id: 'comment1',
          type: 'comment',
          category: 'advanced',
          astNodeId: 'ast_comment1',
          slots: [{ name: 'text', type: 'multiline', value: 'This is a comment', required: false }],
        },
        {
          id: 'menu1',
          type: 'menu',
          category: 'flow',
          astNodeId: 'ast_menu1',
          slots: [],
          children: [
            {
              id: 'choice1',
              type: 'choice',
              category: 'flow',
              astNodeId: 'ast_choice1',
              slots: [],
              children: [
                {
                  id: 'nested_comment',
                  type: 'comment',
                  category: 'advanced',
                  astNodeId: 'ast_nested_comment',
                  slots: [{ name: 'text', type: 'multiline', value: 'Nested comment', required: false }],
                },
                {
                  id: 'nested_dialogue',
                  type: 'dialogue',
                  category: 'dialogue',
                  astNodeId: 'ast_nested_dialogue',
                  slots: [],
                },
              ],
            },
          ],
        },
      ],
      collapsed: false,
      selected: false,
      hasError: false,
    }
    
    const result = filterOutCommentsRecursive(deepTree)
    
    expect(result).not.toBeNull()
    expect(countCommentBlocksInTree(result!)).toBe(0)
    
    // Original has 2 comments, result should have 0
    expect(countCommentBlocksInTree(deepTree)).toBe(2)
    
    // Non-comment count should be preserved
    expect(countNonCommentBlocksInTree(result!)).toBe(countNonCommentBlocksInTree(deepTree))
  })
})
