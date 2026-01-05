/**
 * BlockTreeBuilder
 * 积木树构建器
 * 
 * Builds a block tree from AST nodes for the block editor mode.
 * This is a one-way transformation from AST to Block tree.
 */

import {
  Block,
  BlockType,
  BlockCategory,
  BlockSlot,
} from './types'
import { getDefaultSlots } from './constants/SlotDefinitions'
import { getBlockDefinition, isContainerBlockType } from './constants/BlockDefinitions'
import {
  ASTNode,
  LabelNode,
  DialogueNode,
  MenuNode,
  MenuChoice,
  SceneNode,
  ShowNode,
  HideNode,
  WithNode,
  JumpNode,
  CallNode,
  ReturnNode,
  IfNode,
  IfBranch,
  PythonNode,
  PlayNode,
  StopNode,
} from '../../types/ast'

/**
 * Generate a unique ID for blocks
 */
let blockIdCounter = 0
function generateBlockId(): string {
  return `block_${++blockIdCounter}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Reset the block ID counter (useful for testing)
 */
export function resetBlockIdCounter(): void {
  blockIdCounter = 0
}

/**
 * Gets the block category for a block type
 */
function getBlockCategory(type: BlockType): BlockCategory {
  const definition = getBlockDefinition(type)
  return definition?.category ?? 'advanced'
}

/**
 * BlockTreeBuilder class
 * Converts AST nodes to Block tree structure
 */
export class BlockTreeBuilder {
  /**
   * Build a block tree from a Label AST node
   * @param label - The Label AST node
   * @returns The root Block representing the label
   */
  buildFromLabel(label: LabelNode): Block {
    const slots = getDefaultSlots('label')
    
    // Set the label name in the slot
    const nameSlot = slots.find(s => s.name === 'name')
    if (nameSlot) {
      nameSlot.value = label.name
    }

    const children = label.body?.map(node => this.buildBlock(node)).filter(Boolean) as Block[] ?? []

    return {
      id: generateBlockId(),
      type: 'label',
      category: 'flow',
      astNodeId: label.id,
      slots,
      children,
      collapsed: false,
      selected: false,
      hasError: false,
    }
  }

  /**
   * Build a single block from an AST node
   * @param node - The AST node
   * @returns The Block, or null if the node type is not supported
   */
  buildBlock(node: ASTNode): Block | null {
    switch (node.type) {
      case 'dialogue':
        return this.buildDialogueBlock(node as DialogueNode)
      case 'scene':
        return this.buildSceneBlock(node as SceneNode)
      case 'show':
        return this.buildShowBlock(node as ShowNode)
      case 'hide':
        return this.buildHideBlock(node as HideNode)
      case 'with':
        return this.buildWithBlock(node as WithNode)
      case 'menu':
        return this.buildMenuBlock(node as MenuNode)
      case 'jump':
        return this.buildJumpBlock(node as JumpNode)
      case 'call':
        return this.buildCallBlock(node as CallNode)
      case 'return':
        return this.buildReturnBlock(node as ReturnNode)
      case 'if':
        return this.buildIfBlock(node as IfNode)
      case 'python':
        return this.buildPythonBlock(node as PythonNode)
      case 'play':
        return this.buildPlayBlock(node as PlayNode)
      case 'stop':
        return this.buildStopBlock(node as StopNode)
      default:
        // Unsupported node type - return a comment block with raw content
        return this.buildUnsupportedBlock(node)
    }
  }

  /**
   * Build a dialogue block
   */
  private buildDialogueBlock(node: DialogueNode): Block {
    const slots = getDefaultSlots('dialogue')
    
    const speakerSlot = slots.find(s => s.name === 'speaker')
    if (speakerSlot) {
      speakerSlot.value = node.speaker
    }
    
    const textSlot = slots.find(s => s.name === 'text')
    if (textSlot) {
      textSlot.value = node.text
    }

    return this.createBlock('dialogue', node.id, slots)
  }

  /**
   * Build a scene block
   */
  private buildSceneBlock(node: SceneNode): Block {
    const slots = getDefaultSlots('scene')
    
    const imageSlot = slots.find(s => s.name === 'image')
    if (imageSlot) {
      imageSlot.value = node.image
    }

    return this.createBlock('scene', node.id, slots)
  }

  /**
   * Build a show block
   */
  private buildShowBlock(node: ShowNode): Block {
    const slots = getDefaultSlots('show')
    
    const characterSlot = slots.find(s => s.name === 'character')
    if (characterSlot) {
      characterSlot.value = node.image
    }
    
    const positionSlot = slots.find(s => s.name === 'position')
    if (positionSlot && node.atPosition) {
      positionSlot.value = node.atPosition
    }
    
    // Handle expression from attributes
    const expressionSlot = slots.find(s => s.name === 'expression')
    if (expressionSlot && node.attributes && node.attributes.length > 0) {
      expressionSlot.value = node.attributes[0]
    }

    return this.createBlock('show', node.id, slots)
  }

  /**
   * Build a hide block
   */
  private buildHideBlock(node: HideNode): Block {
    const slots = getDefaultSlots('hide')
    
    const characterSlot = slots.find(s => s.name === 'character')
    if (characterSlot) {
      characterSlot.value = node.image
    }

    return this.createBlock('hide', node.id, slots)
  }

  /**
   * Build a with block
   */
  private buildWithBlock(node: WithNode): Block {
    const slots = getDefaultSlots('with')
    
    const transitionSlot = slots.find(s => s.name === 'transition')
    if (transitionSlot) {
      transitionSlot.value = node.transition
    }

    return this.createBlock('with', node.id, slots)
  }

  /**
   * Build a menu block with choice children
   */
  private buildMenuBlock(node: MenuNode): Block {
    const slots = getDefaultSlots('menu')
    
    // Build choice children
    const children = node.choices.map(choice => this.buildChoiceBlock(choice, node.id))

    return this.createBlock('menu', node.id, slots, children)
  }

  /**
   * Build a choice block from a MenuChoice
   */
  private buildChoiceBlock(choice: MenuChoice, parentAstId: string): Block {
    const slots = getDefaultSlots('choice')
    
    const textSlot = slots.find(s => s.name === 'text')
    if (textSlot) {
      textSlot.value = choice.text
    }
    
    const conditionSlot = slots.find(s => s.name === 'condition')
    if (conditionSlot && choice.condition) {
      conditionSlot.value = choice.condition
    }

    // Build children from choice body
    const children = choice.body?.map(node => this.buildBlock(node)).filter(Boolean) as Block[] ?? []

    return this.createBlock('choice', `${parentAstId}_choice_${choice.text}`, slots, children)
  }

  /**
   * Build a jump block
   */
  private buildJumpBlock(node: JumpNode): Block {
    const slots = getDefaultSlots('jump')
    
    const targetSlot = slots.find(s => s.name === 'target')
    if (targetSlot) {
      targetSlot.value = node.target
    }

    return this.createBlock('jump', node.id, slots)
  }

  /**
   * Build a call block
   */
  private buildCallBlock(node: CallNode): Block {
    const slots = getDefaultSlots('call')
    
    const targetSlot = slots.find(s => s.name === 'target')
    if (targetSlot) {
      targetSlot.value = node.target
    }

    return this.createBlock('call', node.id, slots)
  }

  /**
   * Build a return block
   */
  private buildReturnBlock(node: ReturnNode): Block {
    const slots = getDefaultSlots('return')
    return this.createBlock('return', node.id, slots)
  }

  /**
   * Build an if block with branch children
   */
  private buildIfBlock(node: IfNode): Block {
    const children: Block[] = []
    
    for (let i = 0; i < node.branches.length; i++) {
      const branch = node.branches[i]
      const branchBlock = this.buildBranchBlock(branch, node.id, i)
      children.push(branchBlock)
    }

    // The main if block has the condition from the first branch
    const slots = getDefaultSlots('if')
    const conditionSlot = slots.find(s => s.name === 'condition')
    if (conditionSlot && node.branches.length > 0 && node.branches[0].condition) {
      conditionSlot.value = node.branches[0].condition
    }

    // First branch's body becomes children of the if block itself
    // Additional branches (elif/else) become sibling children
    const firstBranchChildren = node.branches[0]?.body?.map(n => this.buildBlock(n)).filter(Boolean) as Block[] ?? []
    
    // Combine first branch children with elif/else blocks
    const allChildren = [
      ...firstBranchChildren,
      ...children.slice(1) // Skip the first branch as its children are already included
    ]

    return this.createBlock('if', node.id, slots, allChildren)
  }

  /**
   * Build a branch block (elif or else)
   */
  private buildBranchBlock(branch: IfBranch, parentAstId: string, index: number): Block {
    const isElse = branch.condition === null
    const type: BlockType = isElse ? 'else' : (index === 0 ? 'if' : 'elif')
    
    const slots = getDefaultSlots(type)
    
    if (!isElse) {
      const conditionSlot = slots.find(s => s.name === 'condition')
      if (conditionSlot) {
        conditionSlot.value = branch.condition
      }
    }

    const children = branch.body?.map(node => this.buildBlock(node)).filter(Boolean) as Block[] ?? []

    return this.createBlock(type, `${parentAstId}_branch_${index}`, slots, children)
  }

  /**
   * Build a python block
   */
  private buildPythonBlock(node: PythonNode): Block {
    const slots = getDefaultSlots('python')
    
    const codeSlot = slots.find(s => s.name === 'code')
    if (codeSlot) {
      codeSlot.value = node.code
    }

    return this.createBlock('python', node.id, slots)
  }

  /**
   * Build a play block (music or sound)
   */
  private buildPlayBlock(node: PlayNode): Block {
    const blockType: BlockType = node.channel === 'sound' ? 'play-sound' : 'play-music'
    const slots = getDefaultSlots(blockType)
    
    const fileSlot = slots.find(s => s.name === 'file')
    if (fileSlot) {
      fileSlot.value = node.file
    }
    
    if (blockType === 'play-music') {
      const fadeinSlot = slots.find(s => s.name === 'fadein')
      if (fadeinSlot && node.fadeIn !== undefined) {
        fadeinSlot.value = node.fadeIn
      }
      
      const loopSlot = slots.find(s => s.name === 'loop')
      if (loopSlot && node.loop !== undefined) {
        loopSlot.value = node.loop
      }
    }

    return this.createBlock(blockType, node.id, slots)
  }

  /**
   * Build a stop block
   */
  private buildStopBlock(node: StopNode): Block {
    const slots = getDefaultSlots('stop-music')
    
    const fadeoutSlot = slots.find(s => s.name === 'fadeout')
    if (fadeoutSlot && node.fadeOut !== undefined) {
      fadeoutSlot.value = node.fadeOut
    }

    return this.createBlock('stop-music', node.id, slots)
  }

  /**
   * Build a block for unsupported AST node types
   */
  private buildUnsupportedBlock(node: ASTNode): Block {
    const slots = getDefaultSlots('comment')
    
    const textSlot = slots.find(s => s.name === 'text')
    if (textSlot) {
      textSlot.value = `[Unsupported: ${node.type}] ${node.raw ?? ''}`
    }

    return this.createBlock('comment', node.id, slots)
  }

  /**
   * Create a block with common properties
   */
  private createBlock(
    type: BlockType,
    astNodeId: string,
    slots: BlockSlot[],
    children?: Block[]
  ): Block {
    const block: Block = {
      id: generateBlockId(),
      type,
      category: getBlockCategory(type),
      astNodeId,
      slots,
      collapsed: false,
      selected: false,
      hasError: false,
    }

    if (isContainerBlockType(type) || (children && children.length > 0)) {
      block.children = children ?? []
    }

    return block
  }
}

/**
 * Factory function to create a BlockTreeBuilder instance
 */
export function createBlockTreeBuilder(): BlockTreeBuilder {
  return new BlockTreeBuilder()
}

/**
 * Convenience function to build a block tree from a label
 */
export function buildBlockTreeFromLabel(label: LabelNode): Block {
  const builder = new BlockTreeBuilder()
  return builder.buildFromLabel(label)
}

/**
 * Convenience function to build a single block from an AST node
 */
export function buildBlockFromNode(node: ASTNode): Block | null {
  const builder = new BlockTreeBuilder()
  return builder.buildBlock(node)
}
