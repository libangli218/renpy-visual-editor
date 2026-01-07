/**
 * BlockTreeBuilder Property Tests
 * 积木树构建器属性测试
 * 
 * Property-based tests for block tree building.
 * 
 * **Property 2: 积木结构正确性**
 * *For any* 积木类型，其属性槽配置应该与对应的 AST 节点类型匹配
 * **Validates: Requirements 3.1, 4.1-4.6, 5.1-5.8, 6.1-6.4**
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { BlockTreeBuilder, resetBlockIdCounter } from './BlockTreeBuilder'
import { Block, BlockSlot } from './types'
import {
  LabelNode,
  DialogueNode,
  SceneNode,
  ShowNode,
  HideNode,
  WithNode,
  MenuNode,
  MenuChoice,
  JumpNode,
  CallNode,
  ReturnNode,
  IfNode,
  IfBranch,
  PythonNode,
  PlayNode,
  StopNode,
  ASTNode,
} from '../../types/ast'

// ============================================================================
// Arbitrary Generators for AST Nodes
// ============================================================================

// Generate valid identifiers
const arbitraryIdentifier = fc.stringMatching(/^[a-z_][a-z0-9_]{0,19}$/)

// Generate simple text (no special characters)
const arbitrarySimpleText = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-'),
  { minLength: 1, maxLength: 50 }
)

// Generate unique node ID
let nodeIdCounter = 0
const generateNodeId = () => `test_node_${++nodeIdCounter}_${Date.now()}`

// Arbitrary DialogueNode
const arbitraryDialogueNode: fc.Arbitrary<DialogueNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('dialogue' as const),
  speaker: fc.option(arbitraryIdentifier, { nil: null }),
  text: arbitrarySimpleText,
})

// Arbitrary SceneNode
const arbitrarySceneNode: fc.Arbitrary<SceneNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('scene' as const),
  image: arbitraryIdentifier,
})

// Arbitrary ShowNode
const arbitraryShowNode: fc.Arbitrary<ShowNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('show' as const),
  image: arbitraryIdentifier,
  atPosition: fc.option(fc.constantFrom('left', 'center', 'right', 'truecenter')),
  attributes: fc.option(fc.array(arbitraryIdentifier, { minLength: 0, maxLength: 3 })),
})

// Arbitrary HideNode
const arbitraryHideNode: fc.Arbitrary<HideNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('hide' as const),
  image: arbitraryIdentifier,
})

// Arbitrary WithNode
const arbitraryWithNode: fc.Arbitrary<WithNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('with' as const),
  transition: fc.constantFrom('dissolve', 'fade', 'pixellate', 'move'),
})

// Arbitrary JumpNode
const arbitraryJumpNode: fc.Arbitrary<JumpNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('jump' as const),
  target: arbitraryIdentifier,
})

// Arbitrary CallNode
const arbitraryCallNode: fc.Arbitrary<CallNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('call' as const),
  target: arbitraryIdentifier,
})

// Arbitrary ReturnNode
const arbitraryReturnNode: fc.Arbitrary<ReturnNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('return' as const),
})

// Arbitrary PythonNode
const arbitraryPythonNode: fc.Arbitrary<PythonNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('python' as const),
  code: arbitrarySimpleText,
})

// Arbitrary PlayNode (music)
const arbitraryPlayMusicNode: fc.Arbitrary<PlayNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('play' as const),
  channel: fc.constant('music' as const),
  file: arbitrarySimpleText.map(s => s.replace(/[^a-zA-Z0-9_]/g, '') + '.ogg'),
  fadeIn: fc.option(fc.float({ min: 0, max: 10, noNaN: true })),
  loop: fc.option(fc.boolean()),
})

// Arbitrary PlayNode (sound)
const arbitraryPlaySoundNode: fc.Arbitrary<PlayNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('play' as const),
  channel: fc.constant('sound' as const),
  file: arbitrarySimpleText.map(s => s.replace(/[^a-zA-Z0-9_]/g, '') + '.ogg'),
})

// Arbitrary StopNode
const arbitraryStopNode: fc.Arbitrary<StopNode> = fc.record({
  id: fc.constant('').map(() => generateNodeId()),
  type: fc.constant('stop' as const),
  channel: fc.constantFrom('music' as const, 'sound' as const, 'voice' as const),
  fadeOut: fc.option(fc.float({ min: 0, max: 10, noNaN: true })),
})

// Simple body nodes (non-recursive)
const arbitrarySimpleBodyNode: fc.Arbitrary<ASTNode> = fc.oneof(
  arbitraryDialogueNode,
  arbitrarySceneNode,
  arbitraryShowNode,
  arbitraryHideNode,
  arbitraryWithNode,
  arbitraryJumpNode,
  arbitraryCallNode,
  arbitraryReturnNode,
  arbitraryPythonNode,
  arbitraryPlayMusicNode,
  arbitraryPlaySoundNode,
  arbitraryStopNode
)

// Arbitrary MenuChoice
const arbitraryMenuChoice = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<MenuChoice> =>
  fc.record({
    text: arbitrarySimpleText,
    condition: fc.option(arbitraryIdentifier),
    body: bodyGen,
  })

// Arbitrary MenuNode
const arbitraryMenuNode = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<MenuNode> =>
  fc.record({
    id: fc.constant('').map(() => generateNodeId()),
    type: fc.constant('menu' as const),
    choices: fc.array(arbitraryMenuChoice(bodyGen), { minLength: 1, maxLength: 4 }),
  })

// Arbitrary IfBranch
const arbitraryIfBranch = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<IfBranch> =>
  fc.record({
    condition: fc.option(arbitraryIdentifier, { nil: null }),
    body: bodyGen,
  })

// Arbitrary IfNode
const arbitraryIfNode = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<IfNode> =>
  fc.record({
    id: fc.constant('').map(() => generateNodeId()),
    type: fc.constant('if' as const),
    branches: fc.array(arbitraryIfBranch(bodyGen), { minLength: 1, maxLength: 3 }),
  })

// Arbitrary LabelNode
const arbitraryLabelNode = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<LabelNode> =>
  fc.record({
    id: fc.constant('').map(() => generateNodeId()),
    type: fc.constant('label' as const),
    name: arbitraryIdentifier,
    body: bodyGen,
  })

// Simple body generator (no nesting)
const simpleBodyGen = fc.array(arbitrarySimpleBodyNode, { minLength: 0, maxLength: 5 })

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a block has a slot with the given name
 */
function hasSlot(block: Block, slotName: string): boolean {
  return block.slots.some(s => s.name === slotName)
}

/**
 * Get slot value from a block
 */
function getSlotValue(block: Block, slotName: string): unknown {
  const slot = block.slots.find(s => s.name === slotName)
  return slot?.value
}

/**
 * Check if a slot is required
 */
function isSlotRequired(block: Block, slotName: string): boolean {
  const slot = block.slots.find(s => s.name === slotName)
  return slot?.required ?? false
}

// ============================================================================
// Property Tests
// ============================================================================

/**
 * Feature: block-editor-mode, Property 2: 积木结构正确性
 * 
 * For any block type, its slot configuration should match the corresponding
 * AST node type.
 * 
 * **Validates: Requirements 3.1, 4.1-4.6, 5.1-5.8, 6.1-6.4**
 */
describe('Property 2: 积木结构正确性 (Block Structure Correctness)', () => {
  let builder: BlockTreeBuilder

  beforeEach(() => {
    builder = new BlockTreeBuilder()
    resetBlockIdCounter()
    nodeIdCounter = 0
  })

  /**
   * Property 2.1: Dialogue blocks have correct slots
   * Validates: Requirements 3.1 (对话积木包含角色选择槽和对话文本输入槽)
   */
  it('dialogue blocks have speaker and text slots matching AST', () => {
    fc.assert(
      fc.property(arbitraryDialogueNode, (dialogueNode) => {
        const block = builder.buildBlock(dialogueNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('dialogue')
        
        // Must have speaker slot (Requirement 3.1)
        expect(hasSlot(block!, 'speaker')).toBe(true)
        expect(getSlotValue(block!, 'speaker')).toBe(dialogueNode.speaker)
        
        // Must have text slot (Requirement 3.1)
        expect(hasSlot(block!, 'text')).toBe(true)
        expect(getSlotValue(block!, 'text')).toBe(dialogueNode.text)
        
        // Text slot should be required
        expect(isSlotRequired(block!, 'text')).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.2: Scene blocks have correct slots
   * Validates: Requirements 4.1 (场景积木包含背景图片选择槽)
   */
  it('scene blocks have image slot matching AST', () => {
    fc.assert(
      fc.property(arbitrarySceneNode, (sceneNode) => {
        const block = builder.buildBlock(sceneNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('scene')
        expect(block!.category).toBe('scene')
        
        // Must have image slot (Requirement 4.1)
        expect(hasSlot(block!, 'image')).toBe(true)
        expect(getSlotValue(block!, 'image')).toBe(sceneNode.image)
        expect(isSlotRequired(block!, 'image')).toBe(true)
        
        // Should have optional transition slot (Requirement 4.2)
        expect(hasSlot(block!, 'transition')).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.3: Show blocks have correct slots
   * Validates: Requirements 4.3, 4.4 (显示角色积木包含角色图片、位置、表情槽)
   */
  it('show blocks have character, position, and expression slots matching AST', () => {
    fc.assert(
      fc.property(arbitraryShowNode, (showNode) => {
        const block = builder.buildBlock(showNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('show')
        expect(block!.category).toBe('scene')
        
        // Must have character slot (Requirement 4.3)
        expect(hasSlot(block!, 'character')).toBe(true)
        expect(getSlotValue(block!, 'character')).toBe(showNode.image)
        expect(isSlotRequired(block!, 'character')).toBe(true)
        
        // Must have position slot (Requirement 4.3)
        expect(hasSlot(block!, 'position')).toBe(true)
        if (showNode.atPosition) {
          expect(getSlotValue(block!, 'position')).toBe(showNode.atPosition)
        }
        
        // Must have expression slot (Requirement 4.4)
        expect(hasSlot(block!, 'expression')).toBe(true)
        if (showNode.attributes && showNode.attributes.length > 0) {
          // Expression slot contains all attributes joined with space
          expect(getSlotValue(block!, 'expression')).toBe(showNode.attributes.join(' '))
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.4: Hide blocks have correct slots
   * Validates: Requirements 4.6 (隐藏角色积木包含角色选择槽)
   */
  it('hide blocks have character slot matching AST', () => {
    fc.assert(
      fc.property(arbitraryHideNode, (hideNode) => {
        const block = builder.buildBlock(hideNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('hide')
        expect(block!.category).toBe('scene')
        
        // Must have character slot (Requirement 4.6)
        expect(hasSlot(block!, 'character')).toBe(true)
        expect(getSlotValue(block!, 'character')).toBe(hideNode.image)
        expect(isSlotRequired(block!, 'character')).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.5: With blocks have correct slots
   * Validates: Requirements 4.2 (过渡效果选择槽)
   */
  it('with blocks have transition slot matching AST', () => {
    fc.assert(
      fc.property(arbitraryWithNode, (withNode) => {
        const block = builder.buildBlock(withNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('with')
        expect(block!.category).toBe('scene')
        
        // Must have transition slot
        expect(hasSlot(block!, 'transition')).toBe(true)
        expect(getSlotValue(block!, 'transition')).toBe(withNode.transition)
        expect(isSlotRequired(block!, 'transition')).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.6: Jump blocks have correct slots
   * Validates: Requirements 5.5 (跳转积木包含目标Label选择槽)
   */
  it('jump blocks have target slot matching AST', () => {
    fc.assert(
      fc.property(arbitraryJumpNode, (jumpNode) => {
        const block = builder.buildBlock(jumpNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('jump')
        expect(block!.category).toBe('flow')
        
        // Must have target slot (Requirement 5.5)
        expect(hasSlot(block!, 'target')).toBe(true)
        expect(getSlotValue(block!, 'target')).toBe(jumpNode.target)
        expect(isSlotRequired(block!, 'target')).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.7: Call blocks have correct slots
   * Validates: Requirements 5.6 (调用积木包含目标Label选择槽)
   */
  it('call blocks have target slot matching AST', () => {
    fc.assert(
      fc.property(arbitraryCallNode, (callNode) => {
        const block = builder.buildBlock(callNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('call')
        expect(block!.category).toBe('flow')
        
        // Must have target slot (Requirement 5.6)
        expect(hasSlot(block!, 'target')).toBe(true)
        expect(getSlotValue(block!, 'target')).toBe(callNode.target)
        expect(isSlotRequired(block!, 'target')).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.8: Return blocks have no required slots
   * Validates: Requirements 5.7 (返回积木不包含子积木)
   */
  it('return blocks have no required slots', () => {
    fc.assert(
      fc.property(arbitraryReturnNode, (returnNode) => {
        const block = builder.buildBlock(returnNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('return')
        expect(block!.category).toBe('flow')
        
        // Return blocks should have no required slots
        const requiredSlots = block!.slots.filter(s => s.required)
        expect(requiredSlots.length).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.9: Play music blocks have correct slots
   * Validates: Requirements 6.1, 6.2 (播放音乐积木包含音乐文件选择槽和淡入时间槽)
   */
  it('play music blocks have file and fadein slots matching AST', () => {
    fc.assert(
      fc.property(arbitraryPlayMusicNode, (playNode) => {
        const block = builder.buildBlock(playNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('play-music')
        expect(block!.category).toBe('audio')
        
        // Must have file slot (Requirement 6.1)
        expect(hasSlot(block!, 'file')).toBe(true)
        expect(getSlotValue(block!, 'file')).toBe(playNode.file)
        expect(isSlotRequired(block!, 'file')).toBe(true)
        
        // Must have fadein slot (Requirement 6.2)
        expect(hasSlot(block!, 'fadein')).toBe(true)
        if (playNode.fadeIn !== undefined) {
          expect(getSlotValue(block!, 'fadein')).toBe(playNode.fadeIn)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.10: Play sound blocks have correct slots
   * Validates: Requirements 6.4 (播放音效积木包含音效文件选择槽)
   */
  it('play sound blocks have file slot matching AST', () => {
    fc.assert(
      fc.property(arbitraryPlaySoundNode, (playNode) => {
        const block = builder.buildBlock(playNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('play-sound')
        expect(block!.category).toBe('audio')
        
        // Must have file slot (Requirement 6.4)
        expect(hasSlot(block!, 'file')).toBe(true)
        expect(getSlotValue(block!, 'file')).toBe(playNode.file)
        expect(isSlotRequired(block!, 'file')).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.11: Stop music blocks have correct slots
   * Validates: Requirements 6.3 (停止音乐积木包含淡出时间槽)
   */
  it('stop music blocks have fadeout slot matching AST', () => {
    fc.assert(
      fc.property(arbitraryStopNode, (stopNode) => {
        const block = builder.buildBlock(stopNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('stop-music')
        expect(block!.category).toBe('audio')
        
        // Must have fadeout slot (Requirement 6.3)
        expect(hasSlot(block!, 'fadeout')).toBe(true)
        if (stopNode.fadeOut !== undefined) {
          expect(getSlotValue(block!, 'fadeout')).toBe(stopNode.fadeOut)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.12: Menu blocks are containers with choice children
   * Validates: Requirements 5.1, 5.2 (菜单积木作为容器，可包含多个选项子积木)
   */
  it('menu blocks contain choice children matching AST choices', () => {
    fc.assert(
      fc.property(arbitraryMenuNode(simpleBodyGen), (menuNode) => {
        const block = builder.buildBlock(menuNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('menu')
        expect(block!.category).toBe('flow')
        
        // Menu should be a container (Requirement 5.1)
        expect(block!.children).toBeDefined()
        
        // Number of children should match number of choices (Requirement 5.2)
        expect(block!.children!.length).toBe(menuNode.choices.length)
        
        // All children should be choice blocks
        block!.children!.forEach((child, index) => {
          expect(child.type).toBe('choice')
          
          // Choice text should match (Requirement 5.3)
          expect(getSlotValue(child, 'text')).toBe(menuNode.choices[index].text)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.13: Choice blocks have correct slots and can contain children
   * Validates: Requirements 5.3, 5.4 (选项积木包含选项文本槽和条件槽，可包含子积木)
   */
  it('choice blocks have text and condition slots, and contain children', () => {
    fc.assert(
      fc.property(arbitraryMenuNode(simpleBodyGen), (menuNode) => {
        const block = builder.buildBlock(menuNode)
        
        block!.children!.forEach((choiceBlock, index) => {
          const choice = menuNode.choices[index]
          
          // Must have text slot (Requirement 5.3)
          expect(hasSlot(choiceBlock, 'text')).toBe(true)
          expect(getSlotValue(choiceBlock, 'text')).toBe(choice.text)
          expect(isSlotRequired(choiceBlock, 'text')).toBe(true)
          
          // Must have condition slot (Requirement 5.3)
          expect(hasSlot(choiceBlock, 'condition')).toBe(true)
          if (choice.condition) {
            expect(getSlotValue(choiceBlock, 'condition')).toBe(choice.condition)
          }
          
          // Choice should be a container (Requirement 5.4)
          expect(choiceBlock.children).toBeDefined()
          expect(choiceBlock.children!.length).toBe(choice.body.length)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.14: If blocks have condition slot and contain branch children
   * Validates: Requirements 5.8 (条件分支积木包含条件槽和分支容器)
   */
  it('if blocks have condition slot and contain branch structure', () => {
    fc.assert(
      fc.property(arbitraryIfNode(simpleBodyGen), (ifNode) => {
        const block = builder.buildBlock(ifNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('if')
        expect(block!.category).toBe('flow')
        
        // Must have condition slot (Requirement 5.8)
        expect(hasSlot(block!, 'condition')).toBe(true)
        
        // First branch condition should be in the if block's condition slot
        if (ifNode.branches.length > 0 && ifNode.branches[0].condition) {
          expect(getSlotValue(block!, 'condition')).toBe(ifNode.branches[0].condition)
        }
        
        // If block should be a container
        expect(block!.children).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.15: Label blocks have name slot and contain body children
   * Validates: Requirements 2.1, 2.2 (Label容器显示名称，包含子积木)
   */
  it('label blocks have name slot and contain body children', () => {
    fc.assert(
      fc.property(arbitraryLabelNode(simpleBodyGen), (labelNode) => {
        const block = builder.buildFromLabel(labelNode)
        
        expect(block.type).toBe('label')
        expect(block.category).toBe('flow')
        
        // Must have name slot (Requirement 2.2)
        expect(hasSlot(block, 'name')).toBe(true)
        expect(getSlotValue(block, 'name')).toBe(labelNode.name)
        
        // Label should be a container (Requirement 2.1)
        expect(block.children).toBeDefined()
        
        // Number of children should match body length
        expect(block.children!.length).toBe(labelNode.body.length)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.16: All blocks have unique IDs
   */
  it('all blocks in a tree have unique IDs', () => {
    fc.assert(
      fc.property(arbitraryLabelNode(simpleBodyGen), (labelNode) => {
        const block = builder.buildFromLabel(labelNode)
        
        const collectIds = (b: Block): string[] => {
          const ids = [b.id]
          if (b.children) {
            b.children.forEach(child => {
              ids.push(...collectIds(child))
            })
          }
          return ids
        }
        
        const allIds = collectIds(block)
        const uniqueIds = new Set(allIds)
        
        // All IDs should be unique
        expect(uniqueIds.size).toBe(allIds.length)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.17: All blocks preserve AST node ID reference
   */
  it('all blocks preserve AST node ID reference', () => {
    fc.assert(
      fc.property(arbitrarySimpleBodyNode, (astNode) => {
        const block = builder.buildBlock(astNode)
        
        expect(block).not.toBeNull()
        expect(block!.astNodeId).toBe(astNode.id)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.18: Python blocks have code slot
   */
  it('python blocks have code slot matching AST', () => {
    fc.assert(
      fc.property(arbitraryPythonNode, (pythonNode) => {
        const block = builder.buildBlock(pythonNode)
        
        expect(block).not.toBeNull()
        expect(block!.type).toBe('python')
        expect(block!.category).toBe('advanced')
        
        // Must have code slot
        expect(hasSlot(block!, 'code')).toBe(true)
        expect(getSlotValue(block!, 'code')).toBe(pythonNode.code)
        expect(isSlotRequired(block!, 'code')).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
