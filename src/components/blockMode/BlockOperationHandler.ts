/**
 * BlockOperationHandler
 * 积木操作处理器
 * 
 * Handles block operations (add, delete, move, update) and synchronizes
 * changes to the AST. Integrates with the existing ASTSynchronizer.
 * 
 * Implements Requirements:
 * - 8.1: 用户添加积木时在 AST 中创建对应的节点
 * - 8.2: 用户删除积木时从 AST 中移除对应的节点
 * - 8.3: 用户修改积木属性时更新 AST 中对应节点的属性
 * - 8.4: 用户重新排序积木时更新 AST 中节点的顺序
 * - 8.6: 支持撤销/重做操作
 * - 14.3: 支持复制/粘贴积木及积木栈
 */

import {
  Block,
  BlockType,
  BlockCategory,
  BlockClipboard,
} from './types'
import { getDefaultSlots } from './constants/SlotDefinitions'
import { getBlockDefinition, isContainerBlockType } from './constants/BlockDefinitions'
import {
  RenpyScript,
  ASTNode,
  LabelNode,
  DialogueNode,
  MenuNode,
  SceneNode,
  ShowNode,
  HideNode,
  WithNode,
  JumpNode,
  CallNode,
  ReturnNode,
  IfNode,
  PythonNode,
  PlayNode,
  StopNode,
} from '../../types/ast'

/**
 * Get block category from block type
 */
function getBlockCategory(type: BlockType): BlockCategory {
  const definition = getBlockDefinition(type)
  return definition?.category ?? 'advanced'
}

/**
 * Generate a unique ID for blocks
 */
let blockIdCounter = 0
function generateBlockId(): string {
  return `block_${++blockIdCounter}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generate a unique ID for AST nodes
 */
function generateAstId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Reset the block ID counter (useful for testing)
 */
export function resetBlockIdCounter(): void {
  blockIdCounter = 0
}


/**
 * Result of a block operation
 */
export interface BlockOperationResult {
  /** Whether the operation was successful */
  success: boolean
  /** The ID of the affected block (for add operations) */
  blockId?: string
  /** Error message if operation failed */
  error?: string
  /** The updated block tree */
  blockTree?: Block
  /** The updated AST */
  ast?: RenpyScript
}

/**
 * Context for cross-label block operations
 */
export interface CrossLabelOperationContext {
  /** The source label's block tree */
  sourceBlockTree: Block
  /** The target label's block tree */
  targetBlockTree: Block
  /** The current AST */
  ast: RenpyScript
  /** The source label name */
  sourceLabelName: string
  /** The target label name */
  targetLabelName: string
}

/**
 * Context for block operations
 */
export interface BlockOperationContext {
  /** The current block tree */
  blockTree: Block
  /** The current AST */
  ast: RenpyScript
  /** The current label name being edited */
  labelName: string
}

/**
 * BlockOperationHandler class
 * 
 * Coordinates block operations and AST synchronization.
 */
export class BlockOperationHandler {
  /**
   * Add a new block to the block tree and AST
   * 
   * @param type - The type of block to add
   * @param parentId - The ID of the parent block
   * @param index - The position to insert at
   * @param context - The operation context
   * @returns Operation result with new block ID
   */
  addBlock(
    type: BlockType,
    parentId: string,
    index: number,
    context: BlockOperationContext
  ): BlockOperationResult {
    const { blockTree, ast, labelName } = context

    // Find the parent block
    const parent = this.findBlockById(blockTree, parentId)
    if (!parent) {
      return { success: false, error: `Parent block not found: ${parentId}` }
    }

    // Ensure parent can have children
    if (!parent.children) {
      parent.children = []
    }

    // Create the new block
    const newBlock = this.createBlock(type)
    
    // Special handling for choice blocks - they are added to menu's choices array
    if (type === 'choice' && parent.type === 'menu') {
      return this.addChoiceToMenu(newBlock, parent, index, context)
    }
    
    // Special handling for elif/else blocks - they are added to if's branches
    if ((type === 'elif' || type === 'else') && parent.type === 'if') {
      return this.addBranchToIf(newBlock, parent, index, context)
    }
    
    // Create corresponding AST node
    const astNode = this.createAstNode(type, newBlock)
    if (!astNode) {
      return { success: false, error: `Failed to create AST node for type: ${type}` }
    }

    // Link block to AST node
    newBlock.astNodeId = astNode.id

    // Insert block into parent's children
    const insertIndex = Math.min(Math.max(0, index), parent.children.length)
    parent.children.splice(insertIndex, 0, newBlock)

    // Insert AST node into the appropriate location
    const astInsertResult = this.insertAstNode(astNode, parent, insertIndex, ast, labelName)
    if (!astInsertResult.success) {
      // Rollback block insertion
      parent.children.splice(insertIndex, 1)
      return { success: false, error: astInsertResult.error }
    }

    return {
      success: true,
      blockId: newBlock.id,
      blockTree,
      ast,
    }
  }

  /**
   * Add a choice block to a menu
   * 
   * @param choiceBlock - The choice block to add
   * @param menuBlock - The parent menu block
   * @param index - The position to insert at
   * @param context - The operation context
   * @returns Operation result with new block ID
   */
  private addChoiceToMenu(
    choiceBlock: Block,
    menuBlock: Block,
    index: number,
    context: BlockOperationContext
  ): BlockOperationResult {
    const { blockTree, ast, labelName } = context

    // Find the menu AST node
    const menuNode = this.findAstNodeById(ast, menuBlock.astNodeId) as MenuNode | null
    if (!menuNode || menuNode.type !== 'menu') {
      return { success: false, error: 'Menu AST node not found' }
    }

    // Get the choice text from the block's slot
    const textSlot = choiceBlock.slots.find(s => s.name === 'text')
    const choiceText = (textSlot?.value as string) || `选项 ${menuNode.choices.length + 1}`
    
    // Update the slot value if it was empty
    if (textSlot && !textSlot.value) {
      textSlot.value = choiceText
    }

    // Create the AST choice entry
    const astChoice = {
      text: choiceText,
      condition: undefined,
      body: [] as ASTNode[],
    }

    // Set the astNodeId for the choice block (synthetic ID based on menu + choice text)
    choiceBlock.astNodeId = `${menuBlock.astNodeId}_choice_${choiceText}`

    // Insert choice into menu's children
    const insertIndex = Math.min(Math.max(0, index), menuBlock.children?.length ?? 0)
    if (!menuBlock.children) {
      menuBlock.children = []
    }
    menuBlock.children.splice(insertIndex, 0, choiceBlock)

    // Insert choice into AST menu's choices array
    const astInsertIndex = Math.min(Math.max(0, index), menuNode.choices.length)
    menuNode.choices.splice(astInsertIndex, 0, astChoice)

    return {
      success: true,
      blockId: choiceBlock.id,
      blockTree,
      ast,
    }
  }

  /**
   * Add an elif/else branch block to an if block
   * 
   * @param branchBlock - The elif/else block to add
   * @param ifBlock - The parent if block
   * @param index - The position to insert at
   * @param context - The operation context
   * @returns Operation result with new block ID
   */
  private addBranchToIf(
    branchBlock: Block,
    ifBlock: Block,
    index: number,
    context: BlockOperationContext
  ): BlockOperationResult {
    const { blockTree, ast } = context

    // Find the if AST node
    const ifNode = this.findAstNodeById(ast, ifBlock.astNodeId) as IfNode | null
    if (!ifNode || ifNode.type !== 'if') {
      return { success: false, error: 'If AST node not found' }
    }

    // Get the condition from the block's slot (for elif)
    const conditionSlot = branchBlock.slots.find(s => s.name === 'condition')
    const condition = branchBlock.type === 'else' 
      ? null  // else has no condition
      : (conditionSlot?.value as string) || 'True'
    
    // Update the slot value if it was empty (for elif)
    if (branchBlock.type === 'elif' && conditionSlot && !conditionSlot.value) {
      conditionSlot.value = condition
    }

    // Create the AST branch entry
    const astBranch = {
      condition: condition,
      body: [] as ASTNode[],
    }

    // Determine the branch index in the AST
    // The first branch is the "true" branch of the if, subsequent branches are elif/else
    const branchIndex = ifNode.branches.length

    // Set the astNodeId for the branch block (synthetic ID based on if + branch index)
    branchBlock.astNodeId = `${ifBlock.astNodeId}_branch_${branchIndex}`

    // Insert branch block into if's children
    // elif/else blocks should be added after regular children (true branch content)
    if (!ifBlock.children) {
      ifBlock.children = []
    }
    
    // Find the correct position - elif/else should be at the end
    const insertIndex = ifBlock.children.length
    ifBlock.children.splice(insertIndex, 0, branchBlock)

    // Insert branch into AST if's branches array
    ifNode.branches.push(astBranch)

    return {
      success: true,
      blockId: branchBlock.id,
      blockTree,
      ast,
    }
  }

  /**
   * Delete a block from the block tree and AST
   * 
   * @param blockId - The ID of the block to delete
   * @param context - The operation context
   * @returns Operation result
   */
  deleteBlock(
    blockId: string,
    context: BlockOperationContext
  ): BlockOperationResult {
    const { blockTree, ast, labelName } = context

    // Find the block and its parent
    const { block, parent, index } = this.findBlockWithParent(blockTree, blockId)
    if (!block || !parent) {
      return { success: false, error: `Block not found: ${blockId}` }
    }

    // Special handling for choice blocks - they are removed from menu's choices array
    if (block.type === 'choice' && parent.type === 'menu') {
      return this.deleteChoiceFromMenu(block, parent, index, context)
    }

    // Collect all AST node IDs to remove (including children)
    const astNodeIds = this.collectAstNodeIds(block)

    // Remove block from parent
    if (parent.children) {
      parent.children.splice(index, 1)
    }

    // Remove AST nodes
    for (const astNodeId of astNodeIds) {
      this.removeAstNode(astNodeId, ast, labelName)
    }

    return {
      success: true,
      blockTree,
      ast,
    }
  }

  /**
   * Delete a choice block from a menu
   * 
   * @param choiceBlock - The choice block to delete
   * @param menuBlock - The parent menu block
   * @param index - The index of the choice in the menu
   * @param context - The operation context
   * @returns Operation result
   */
  private deleteChoiceFromMenu(
    choiceBlock: Block,
    menuBlock: Block,
    index: number,
    context: BlockOperationContext
  ): BlockOperationResult {
    const { blockTree, ast } = context

    // Find the menu AST node
    const menuNode = this.findAstNodeById(ast, menuBlock.astNodeId) as MenuNode | null
    if (!menuNode || menuNode.type !== 'menu') {
      return { success: false, error: 'Menu AST node not found' }
    }

    // Get the choice text to find the matching AST choice
    const textSlot = choiceBlock.slots.find(s => s.name === 'text')
    const choiceText = textSlot?.value as string

    // Find and remove the choice from AST menu's choices array
    const astChoiceIndex = menuNode.choices.findIndex(c => c.text === choiceText)
    if (astChoiceIndex !== -1) {
      menuNode.choices.splice(astChoiceIndex, 1)
    }

    // Remove choice block from menu's children
    if (menuBlock.children) {
      menuBlock.children.splice(index, 1)
    }

    return {
      success: true,
      blockTree,
      ast,
    }
  }

  /**
   * Move a block to a new position
   * 
   * @param blockId - The ID of the block to move
   * @param newParentId - The ID of the new parent block
   * @param newIndex - The new position within the parent
   * @param context - The operation context
   * @returns Operation result
   */
  moveBlock(
    blockId: string,
    newParentId: string,
    newIndex: number,
    context: BlockOperationContext
  ): BlockOperationResult {
    const { blockTree, ast, labelName } = context

    // Find the block and its current parent
    const { block, parent: oldParent, index: oldIndex } = this.findBlockWithParent(blockTree, blockId)
    if (!block || !oldParent) {
      return { success: false, error: `Block not found: ${blockId}` }
    }

    // Find the new parent
    const newParent = this.findBlockById(blockTree, newParentId)
    if (!newParent) {
      return { success: false, error: `New parent not found: ${newParentId}` }
    }

    // Ensure new parent can have children
    if (!newParent.children) {
      newParent.children = []
    }

    // Remove from old parent
    if (oldParent.children) {
      oldParent.children.splice(oldIndex, 1)
    }

    // Adjust index if moving within the same parent
    let adjustedIndex = newIndex
    if (oldParent.id === newParent.id && oldIndex < newIndex) {
      adjustedIndex = Math.max(0, newIndex - 1)
    }

    // Insert into new parent
    const insertIndex = Math.min(Math.max(0, adjustedIndex), newParent.children.length)
    newParent.children.splice(insertIndex, 0, block)

    // Update AST node positions
    const astMoveResult = this.moveAstNode(block.astNodeId, oldParent, newParent, insertIndex, ast, labelName)
    if (!astMoveResult.success) {
      // Rollback: move block back
      newParent.children.splice(insertIndex, 1)
      if (oldParent.children) {
        oldParent.children.splice(oldIndex, 0, block)
      }
      return { success: false, error: astMoveResult.error }
    }

    return {
      success: true,
      blockTree,
      ast,
    }
  }

  /**
   * Move a block from one label to another
   * 
   * Implements Requirements 3.4: 跨 Label 移动积木
   * 
   * @param blockId - The ID of the block to move
   * @param targetIndex - The position in the target label
   * @param context - The cross-label operation context
   * @returns Operation result
   */
  moveBlockAcrossLabels(
    blockId: string,
    targetIndex: number,
    context: CrossLabelOperationContext
  ): BlockOperationResult {
    const { sourceBlockTree, targetBlockTree, ast, sourceLabelName, targetLabelName } = context

    // Find the block and its parent in the source tree
    const { block, parent: sourceParent, index: sourceIndex } = this.findBlockWithParent(sourceBlockTree, blockId)
    if (!block || !sourceParent) {
      return { success: false, error: `Block not found in source label: ${blockId}` }
    }

    // Ensure target can have children
    if (!targetBlockTree.children) {
      targetBlockTree.children = []
    }

    // Store the AST node ID before removal
    const astNodeId = block.astNodeId

    // Remove block from source parent
    if (sourceParent.children) {
      sourceParent.children.splice(sourceIndex, 1)
    }

    // Insert block into target tree
    const insertIndex = Math.min(Math.max(0, targetIndex), targetBlockTree.children.length)
    targetBlockTree.children.splice(insertIndex, 0, block)

    // Move AST node from source label to target label
    const astMoveResult = this.moveAstNodeAcrossLabels(
      astNodeId,
      sourceParent,
      targetBlockTree,
      insertIndex,
      ast,
      sourceLabelName,
      targetLabelName
    )

    if (!astMoveResult.success) {
      // Rollback: move block back to source
      targetBlockTree.children.splice(insertIndex, 1)
      if (sourceParent.children) {
        sourceParent.children.splice(sourceIndex, 0, block)
      }
      return { success: false, error: astMoveResult.error }
    }

    return {
      success: true,
      blockId: block.id,
      ast,
    }
  }

  /**
   * Move an AST node from one label to another
   */
  private moveAstNodeAcrossLabels(
    astNodeId: string,
    _sourceParent: Block,
    targetParent: Block,
    targetIndex: number,
    ast: RenpyScript,
    sourceLabelName: string,
    targetLabelName: string
  ): { success: boolean; error?: string } {
    // Find the AST node
    const astNode = this.findAstNodeById(ast, astNodeId)
    if (!astNode) {
      return { success: false, error: `AST node not found: ${astNodeId}` }
    }

    // Remove from source label
    const removed = this.removeAstNode(astNodeId, ast, sourceLabelName)
    if (!removed) {
      return { success: false, error: `Failed to remove AST node from source label: ${sourceLabelName}` }
    }

    // Insert into target label
    return this.insertAstNode(astNode, targetParent, targetIndex, ast, targetLabelName)
  }

  /**
   * Update a slot value in a block
   * 
   * @param blockId - The ID of the block to update
   * @param slotName - The name of the slot to update
   * @param value - The new value
   * @param context - The operation context
   * @returns Operation result
   */
  updateSlot(
    blockId: string,
    slotName: string,
    value: unknown,
    context: BlockOperationContext
  ): BlockOperationResult {
    const { blockTree, ast, labelName } = context

    // Find the block
    const block = this.findBlockById(blockTree, blockId)
    if (!block) {
      return { success: false, error: `Block not found: ${blockId}` }
    }

    // Find the slot
    const slot = block.slots.find(s => s.name === slotName)
    if (!slot) {
      return { success: false, error: `Slot not found: ${slotName}` }
    }

    // Store old value for potential rollback
    const oldValue = slot.value

    // Update slot value
    slot.value = value

    // Update corresponding AST node
    const astUpdateResult = this.updateAstNodeProperty(block, slotName, value, ast, labelName)
    if (!astUpdateResult.success) {
      // Rollback
      slot.value = oldValue
      return { success: false, error: astUpdateResult.error }
    }

    // Create a new blockTree reference to trigger React re-renders
    // This is necessary because we modified the slot value in place
    const newBlockTree: Block = {
      ...blockTree,
      children: blockTree.children ? [...blockTree.children] : undefined,
    }

    return {
      success: true,
      blockTree: newBlockTree,
      ast,
    }
  }


  /**
   * Copy a block and its children to clipboard
   * 
   * @param blockId - The ID of the block to copy
   * @param context - The operation context
   * @returns Clipboard data
   */
  copyBlock(
    blockId: string,
    context: BlockOperationContext
  ): BlockClipboard | null {
    const { blockTree, labelName } = context

    // Find the block
    const block = this.findBlockById(blockTree, blockId)
    if (!block) {
      return null
    }

    // Deep copy the block and its children
    const copiedBlock = this.deepCopyBlock(block)

    return {
      blocks: [copiedBlock],
      sourceLabel: labelName,
      timestamp: Date.now(),
    }
  }

  /**
   * Paste blocks from clipboard
   * 
   * @param clipboard - The clipboard data
   * @param parentId - The ID of the parent block
   * @param index - The position to insert at
   * @param context - The operation context
   * @returns Operation result with new block ID
   */
  pasteBlock(
    clipboard: BlockClipboard,
    parentId: string,
    index: number,
    context: BlockOperationContext
  ): BlockOperationResult {
    const { blockTree, ast, labelName } = context

    if (!clipboard.blocks || clipboard.blocks.length === 0) {
      return { success: false, error: 'Clipboard is empty' }
    }

    // Find the parent block
    const parent = this.findBlockById(blockTree, parentId)
    if (!parent) {
      return { success: false, error: `Parent block not found: ${parentId}` }
    }

    // Ensure parent can have children
    if (!parent.children) {
      parent.children = []
    }

    // Paste each block from clipboard
    const pastedBlockIds: string[] = []
    let currentIndex = index

    for (const clipboardBlock of clipboard.blocks) {
      // Create a new copy with fresh IDs
      const newBlock = this.deepCopyBlockWithNewIds(clipboardBlock)
      
      // Create corresponding AST nodes
      const astNodes = this.createAstNodesForBlock(newBlock)
      
      // Insert block into parent's children
      const insertIndex = Math.min(Math.max(0, currentIndex), parent.children.length)
      parent.children.splice(insertIndex, 0, newBlock)

      // Insert AST nodes
      for (const astNode of astNodes) {
        this.insertAstNode(astNode, parent, insertIndex, ast, labelName)
      }

      pastedBlockIds.push(newBlock.id)
      currentIndex++
    }

    return {
      success: true,
      blockId: pastedBlockIds[0],
      blockTree,
      ast,
    }
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Find a block by ID in the block tree
   */
  findBlockById(root: Block, blockId: string): Block | null {
    if (root.id === blockId) {
      return root
    }

    if (root.children) {
      for (const child of root.children) {
        const found = this.findBlockById(child, blockId)
        if (found) {
          return found
        }
      }
    }

    return null
  }

  /**
   * Find a block and its parent
   */
  private findBlockWithParent(
    root: Block,
    blockId: string,
    parent: Block | null = null
  ): { block: Block | null; parent: Block | null; index: number } {
    if (root.id === blockId) {
      return { block: root, parent, index: -1 }
    }

    if (root.children) {
      for (let i = 0; i < root.children.length; i++) {
        const child = root.children[i]
        if (child.id === blockId) {
          return { block: child, parent: root, index: i }
        }
        const found = this.findBlockWithParent(child, blockId, child)
        if (found.block) {
          return found
        }
      }
    }

    return { block: null, parent: null, index: -1 }
  }

  /**
   * Create a new block with default slots
   */
  private createBlock(type: BlockType): Block {
    const slots = getDefaultSlots(type)
    const category = getBlockCategory(type)

    const block: Block = {
      id: generateBlockId(),
      type,
      category,
      astNodeId: '', // Will be set after AST node creation
      slots,
      collapsed: false,
      selected: false,
      hasError: false,
    }

    if (isContainerBlockType(type)) {
      block.children = []
    }

    return block
  }

  /**
   * Create an AST node for a block type
   */
  private createAstNode(type: BlockType, block: Block): ASTNode | null {
    const id = generateAstId(type)

    switch (type) {
      case 'dialogue':
        return this.createDialogueNode(id, block)
      case 'scene':
        return this.createSceneNode(id, block)
      case 'show':
        return this.createShowNode(id, block)
      case 'hide':
        return this.createHideNode(id, block)
      case 'with':
        return this.createWithNode(id, block)
      case 'menu':
        return this.createMenuNode(id, block)
      case 'jump':
        return this.createJumpNode(id, block)
      case 'call':
        return this.createCallNode(id, block)
      case 'return':
        return this.createReturnNode(id)
      case 'if':
        return this.createIfNode(id, block)
      case 'python':
        return this.createPythonNode(id, block)
      case 'play-music':
        return this.createPlayMusicNode(id, block)
      case 'stop-music':
        return this.createStopMusicNode(id, block)
      case 'play-sound':
        return this.createPlaySoundNode(id, block)
      case 'choice':
        // Choice is handled as part of menu
        return null
      case 'elif':
      case 'else':
        // These are handled as part of if
        return null
      case 'label':
        // Label is the root container, not created via addBlock
        return null
      case 'comment':
        // Comments don't generate AST nodes
        return null
      default:
        return null
    }
  }

  private createDialogueNode(id: string, block: Block): DialogueNode {
    const speakerSlot = block.slots.find(s => s.name === 'speaker')
    const textSlot = block.slots.find(s => s.name === 'text')
    
    return {
      id,
      type: 'dialogue',
      speaker: speakerSlot?.value as string | null ?? null,
      text: textSlot?.value as string ?? '',
    }
  }

  private createSceneNode(id: string, block: Block): SceneNode {
    const imageSlot = block.slots.find(s => s.name === 'image')
    
    return {
      id,
      type: 'scene',
      image: imageSlot?.value as string ?? '',
    }
  }

  private createShowNode(id: string, block: Block): ShowNode {
    const characterSlot = block.slots.find(s => s.name === 'character')
    const positionSlot = block.slots.find(s => s.name === 'position')
    const expressionSlot = block.slots.find(s => s.name === 'expression')
    
    const node: ShowNode = {
      id,
      type: 'show',
      image: characterSlot?.value as string ?? '',
    }

    if (positionSlot?.value) {
      node.atPosition = positionSlot.value as string
    }

    if (expressionSlot?.value) {
      // Split expression back into individual attributes
      // e.g., "green normal" → ["green", "normal"]
      const expressionValue = expressionSlot.value as string
      node.attributes = expressionValue.split(' ').filter(s => s.length > 0)
    }

    return node
  }

  private createHideNode(id: string, block: Block): HideNode {
    const characterSlot = block.slots.find(s => s.name === 'character')
    
    return {
      id,
      type: 'hide',
      image: characterSlot?.value as string ?? '',
    }
  }

  private createWithNode(id: string, block: Block): WithNode {
    const transitionSlot = block.slots.find(s => s.name === 'transition')
    
    return {
      id,
      type: 'with',
      transition: transitionSlot?.value as string ?? 'dissolve',
    }
  }

  private createMenuNode(id: string, _block: Block): MenuNode {
    return {
      id,
      type: 'menu',
      choices: [],
    }
  }

  private createJumpNode(id: string, block: Block): JumpNode {
    const targetSlot = block.slots.find(s => s.name === 'target')
    
    return {
      id,
      type: 'jump',
      target: targetSlot?.value as string ?? '',
    }
  }

  private createCallNode(id: string, block: Block): CallNode {
    const targetSlot = block.slots.find(s => s.name === 'target')
    
    return {
      id,
      type: 'call',
      target: targetSlot?.value as string ?? '',
    }
  }

  private createReturnNode(id: string): ReturnNode {
    return {
      id,
      type: 'return',
    }
  }

  private createIfNode(id: string, block: Block): IfNode {
    const conditionSlot = block.slots.find(s => s.name === 'condition')
    
    return {
      id,
      type: 'if',
      branches: [{
        condition: conditionSlot?.value as string ?? 'True',
        body: [],
      }],
    }
  }

  private createPythonNode(id: string, block: Block): PythonNode {
    const codeSlot = block.slots.find(s => s.name === 'code')
    
    return {
      id,
      type: 'python',
      code: codeSlot?.value as string ?? '',
    }
  }

  private createPlayMusicNode(id: string, block: Block): PlayNode {
    const fileSlot = block.slots.find(s => s.name === 'file')
    const fadeinSlot = block.slots.find(s => s.name === 'fadein')
    const loopSlot = block.slots.find(s => s.name === 'loop')
    
    const node: PlayNode = {
      id,
      type: 'play',
      channel: 'music',
      file: fileSlot?.value as string ?? '',
    }

    if (fadeinSlot?.value !== null && fadeinSlot?.value !== undefined) {
      node.fadeIn = fadeinSlot.value as number
    }

    if (loopSlot?.value !== null && loopSlot?.value !== undefined) {
      node.loop = loopSlot.value === 'true' || loopSlot.value === true
    }

    return node
  }

  private createStopMusicNode(id: string, block: Block): StopNode {
    const fadeoutSlot = block.slots.find(s => s.name === 'fadeout')
    
    const node: StopNode = {
      id,
      type: 'stop',
      channel: 'music',
    }

    if (fadeoutSlot?.value !== null && fadeoutSlot?.value !== undefined) {
      node.fadeOut = fadeoutSlot.value as number
    }

    return node
  }

  private createPlaySoundNode(id: string, block: Block): PlayNode {
    const fileSlot = block.slots.find(s => s.name === 'file')
    
    return {
      id,
      type: 'play',
      channel: 'sound',
      file: fileSlot?.value as string ?? '',
    }
  }


  /**
   * Insert an AST node into the appropriate location
   */
  private insertAstNode(
    astNode: ASTNode,
    parentBlock: Block,
    index: number,
    ast: RenpyScript,
    labelName: string
  ): { success: boolean; error?: string } {
    // Find the label in the AST
    let label = ast.statements.find(
      s => s.type === 'label' && (s as LabelNode).name === labelName
    ) as LabelNode | undefined

    // If label doesn't exist in AST, create it (for new empty labels)
    if (!label) {
      const newLabel: LabelNode = {
        id: generateAstId('label'),
        type: 'label',
        name: labelName,
        body: [],
      }
      ast.statements.push(newLabel)
      label = newLabel
    }

    // Determine where to insert based on parent block type
    if (parentBlock.type === 'label') {
      // Insert directly into label body
      const insertIndex = Math.min(Math.max(0, index), label.body.length)
      label.body.splice(insertIndex, 0, astNode)
      return { success: true }
    }

    if (parentBlock.type === 'menu') {
      // For menu, we need to handle choice insertion differently
      // This is handled by the choice block creation
      return { success: true }
    }

    if (parentBlock.type === 'choice') {
      // Find the menu and choice in AST
      const menuNode = this.findAstNodeById(ast, parentBlock.astNodeId) as MenuNode | null
      if (!menuNode || menuNode.type !== 'menu') {
        // The choice's astNodeId might point to a synthetic ID
        // Try to find the parent menu through the block tree
        return this.insertIntoChoiceBody(astNode, parentBlock, index, ast, labelName)
      }
      return { success: true }
    }

    if (parentBlock.type === 'if' || parentBlock.type === 'elif' || parentBlock.type === 'else') {
      // Find the if node and appropriate branch
      return this.insertIntoIfBranch(astNode, parentBlock, index, ast)
    }

    // For other container types, insert into label body after the parent's AST node
    const parentAstNode = this.findAstNodeById(ast, parentBlock.astNodeId)
    if (parentAstNode) {
      const parentIndex = label.body.findIndex(n => n.id === parentAstNode.id)
      if (parentIndex !== -1) {
        label.body.splice(parentIndex + 1 + index, 0, astNode)
        return { success: true }
      }
    }

    // Fallback: insert at the end of label body
    label.body.push(astNode)
    return { success: true }
  }

  /**
   * Insert AST node into a choice body
   */
  private insertIntoChoiceBody(
    astNode: ASTNode,
    choiceBlock: Block,
    index: number,
    ast: RenpyScript,
    labelName: string
  ): { success: boolean; error?: string } {
    // Find the label
    const label = ast.statements.find(
      s => s.type === 'label' && (s as LabelNode).name === labelName
    ) as LabelNode | undefined

    if (!label) {
      return { success: false, error: `Label not found: ${labelName}` }
    }

    // Find menu nodes in the label body
    for (const node of label.body) {
      if (node.type === 'menu') {
        const menu = node as MenuNode
        // Find the choice by matching text
        const textSlot = choiceBlock.slots.find(s => s.name === 'text')
        const choiceText = textSlot?.value as string
        
        const choice = menu.choices.find(c => c.text === choiceText)
        if (choice) {
          const insertIndex = Math.min(Math.max(0, index), choice.body.length)
          choice.body.splice(insertIndex, 0, astNode)
          return { success: true }
        }
      }
    }

    return { success: false, error: 'Choice not found in AST' }
  }

  /**
   * Insert AST node into an if branch
   */
  private insertIntoIfBranch(
    astNode: ASTNode,
    branchBlock: Block,
    index: number,
    ast: RenpyScript
  ): { success: boolean; error?: string } {
    // Find the if node
    const ifNode = this.findIfNodeForBranch(branchBlock, ast)
    if (!ifNode) {
      return { success: false, error: 'If node not found' }
    }

    // Determine which branch based on block type
    let branchIndex = 0
    if (branchBlock.type === 'elif') {
      // Find the elif index from the astNodeId
      const match = branchBlock.astNodeId.match(/_branch_(\d+)$/)
      if (match) {
        branchIndex = parseInt(match[1], 10)
      }
    } else if (branchBlock.type === 'else') {
      branchIndex = ifNode.branches.length - 1
    }

    if (branchIndex >= 0 && branchIndex < ifNode.branches.length) {
      const branch = ifNode.branches[branchIndex]
      const insertIndex = Math.min(Math.max(0, index), branch.body.length)
      branch.body.splice(insertIndex, 0, astNode)
      return { success: true }
    }

    return { success: false, error: 'Branch not found' }
  }

  /**
   * Find the if node for a branch block
   */
  private findIfNodeForBranch(branchBlock: Block, ast: RenpyScript): IfNode | null {
    // Extract the if node ID from the branch's astNodeId
    const match = branchBlock.astNodeId.match(/^(.+)_branch_\d+$/)
    const ifNodeId = match ? match[1] : branchBlock.astNodeId

    return this.findAstNodeById(ast, ifNodeId) as IfNode | null
  }

  /**
   * Remove an AST node by ID
   */
  private removeAstNode(
    astNodeId: string,
    ast: RenpyScript,
    labelName: string
  ): boolean {
    // Find the label
    const label = ast.statements.find(
      s => s.type === 'label' && (s as LabelNode).name === labelName
    ) as LabelNode | undefined

    if (!label) {
      return false
    }

    // Try to remove from label body
    const index = label.body.findIndex(n => n.id === astNodeId)
    if (index !== -1) {
      label.body.splice(index, 1)
      return true
    }

    // Try to remove from nested structures
    return this.removeFromNestedBody(label.body, astNodeId)
  }

  /**
   * Remove AST node from nested body structures
   */
  private removeFromNestedBody(body: ASTNode[], astNodeId: string): boolean {
    for (let i = 0; i < body.length; i++) {
      const node = body[i]

      if (node.type === 'menu') {
        const menu = node as MenuNode
        for (const choice of menu.choices) {
          const choiceIndex = choice.body.findIndex(n => n.id === astNodeId)
          if (choiceIndex !== -1) {
            choice.body.splice(choiceIndex, 1)
            return true
          }
          if (this.removeFromNestedBody(choice.body, astNodeId)) {
            return true
          }
        }
      } else if (node.type === 'if') {
        const ifNode = node as IfNode
        for (const branch of ifNode.branches) {
          const branchIndex = branch.body.findIndex(n => n.id === astNodeId)
          if (branchIndex !== -1) {
            branch.body.splice(branchIndex, 1)
            return true
          }
          if (this.removeFromNestedBody(branch.body, astNodeId)) {
            return true
          }
        }
      }
    }

    return false
  }

  /**
   * Move an AST node to a new position
   */
  private moveAstNode(
    astNodeId: string,
    _oldParent: Block,
    newParent: Block,
    newIndex: number,
    ast: RenpyScript,
    labelName: string
  ): { success: boolean; error?: string } {
    // Find the AST node
    const astNode = this.findAstNodeById(ast, astNodeId)
    if (!astNode) {
      return { success: false, error: `AST node not found: ${astNodeId}` }
    }

    // Remove from old location
    this.removeAstNode(astNodeId, ast, labelName)

    // Insert at new location
    return this.insertAstNode(astNode, newParent, newIndex, ast, labelName)
  }

  /**
   * Update an AST node property based on slot change
   */
  private updateAstNodeProperty(
    block: Block,
    slotName: string,
    value: unknown,
    ast: RenpyScript,
    _labelName: string
  ): { success: boolean; error?: string } {
    const astNode = this.findAstNodeById(ast, block.astNodeId)
    if (!astNode) {
      // For comment blocks, there's no AST node
      if (block.type === 'comment') {
        return { success: true }
      }
      return { success: false, error: `AST node not found: ${block.astNodeId}` }
    }

    // Update based on block type and slot name
    switch (block.type) {
      case 'dialogue':
        return this.updateDialogueProperty(astNode as DialogueNode, slotName, value)
      case 'scene':
        return this.updateSceneProperty(astNode as SceneNode, slotName, value)
      case 'show':
        return this.updateShowProperty(astNode as ShowNode, slotName, value)
      case 'hide':
        return this.updateHideProperty(astNode as HideNode, slotName, value)
      case 'with':
        return this.updateWithProperty(astNode as WithNode, slotName, value)
      case 'jump':
        return this.updateJumpProperty(astNode as JumpNode, slotName, value)
      case 'call':
        return this.updateCallProperty(astNode as CallNode, slotName, value)
      case 'if':
      case 'elif':
        return this.updateIfProperty(astNode as IfNode, slotName, value)
      case 'python':
        return this.updatePythonProperty(astNode as PythonNode, slotName, value)
      case 'play-music':
        return this.updatePlayMusicProperty(astNode as PlayNode, slotName, value)
      case 'stop-music':
        return this.updateStopMusicProperty(astNode as StopNode, slotName, value)
      case 'play-sound':
        return this.updatePlaySoundProperty(astNode as PlayNode, slotName, value)
      case 'choice':
        return this.updateChoiceProperty(block, slotName, value, ast)
      default:
        return { success: true }
    }
  }

  private updateDialogueProperty(node: DialogueNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'speaker') {
      node.speaker = value as string | null
    } else if (slotName === 'text') {
      node.text = value as string
    }
    return { success: true }
  }

  private updateSceneProperty(node: SceneNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'image') {
      node.image = value as string
    }
    return { success: true }
  }

  private updateShowProperty(node: ShowNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'character') {
      node.image = value as string
    } else if (slotName === 'position') {
      node.atPosition = value as string
    } else if (slotName === 'expression') {
      node.attributes = value ? [value as string] : undefined
    }
    return { success: true }
  }

  private updateHideProperty(node: HideNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'character') {
      node.image = value as string
    }
    return { success: true }
  }

  private updateWithProperty(node: WithNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'transition') {
      node.transition = value as string
    }
    return { success: true }
  }

  private updateJumpProperty(node: JumpNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'target') {
      node.target = value as string
    }
    return { success: true }
  }

  private updateCallProperty(node: CallNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'target') {
      node.target = value as string
    }
    return { success: true }
  }

  private updateIfProperty(node: IfNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'condition' && node.branches.length > 0) {
      node.branches[0].condition = value as string
    }
    return { success: true }
  }

  private updatePythonProperty(node: PythonNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'code') {
      node.code = value as string
    }
    return { success: true }
  }

  private updatePlayMusicProperty(node: PlayNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'file') {
      node.file = value as string
    } else if (slotName === 'fadein') {
      node.fadeIn = value as number | undefined
    } else if (slotName === 'loop') {
      node.loop = value === 'true' || value === true
    }
    return { success: true }
  }

  private updateStopMusicProperty(node: StopNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'fadeout') {
      node.fadeOut = value as number | undefined
    }
    return { success: true }
  }

  private updatePlaySoundProperty(node: PlayNode, slotName: string, value: unknown): { success: boolean; error?: string } {
    if (slotName === 'file') {
      node.file = value as string
    }
    return { success: true }
  }

  private updateChoiceProperty(
    block: Block,
    slotName: string,
    value: unknown,
    ast: RenpyScript
  ): { success: boolean; error?: string } {
    // Find the menu containing this choice
    const menuNode = this.findMenuForChoice(block, ast)
    if (!menuNode) {
      return { success: false, error: 'Menu not found for choice' }
    }

    // For text changes, we need to find the choice by the OLD text (from astNodeId)
    // because the slot value has already been updated
    let choice
    if (slotName === 'text') {
      // Extract old text from astNodeId: {menuId}_choice_{oldText}
      const match = block.astNodeId.match(/_choice_(.+)$/)
      const oldText = match ? match[1] : null
      choice = oldText ? menuNode.choices.find(c => c.text === oldText) : null
      
      // Update the astNodeId with the new text
      if (choice) {
        const menuIdMatch = block.astNodeId.match(/^(.+)_choice_/)
        if (menuIdMatch) {
          block.astNodeId = `${menuIdMatch[1]}_choice_${value as string}`
        }
      }
    } else {
      // For other properties, find by current text
      const textSlot = block.slots.find(s => s.name === 'text')
      const currentText = textSlot?.value as string
      choice = menuNode.choices.find(c => c.text === currentText)
    }
    
    if (!choice) {
      return { success: false, error: 'Choice not found in menu' }
    }

    if (slotName === 'text') {
      choice.text = value as string
    } else if (slotName === 'condition') {
      choice.condition = value as string | undefined
    }

    return { success: true }
  }

  /**
   * Find the menu node containing a choice block
   */
  private findMenuForChoice(choiceBlock: Block, ast: RenpyScript): MenuNode | null {
    // The choice's astNodeId format is typically: {menuId}_choice_{text}
    const match = choiceBlock.astNodeId.match(/^(.+)_choice_/)
    if (match) {
      const menuId = match[1]
      return this.findAstNodeById(ast, menuId) as MenuNode | null
    }
    return null
  }

  /**
   * Find an AST node by ID
   */
  private findAstNodeById(ast: RenpyScript, nodeId: string): ASTNode | null {
    for (const statement of ast.statements) {
      const found = this.findNodeInTree(statement, nodeId)
      if (found) {
        return found
      }
    }
    return null
  }

  /**
   * Recursively find a node in an AST subtree
   */
  private findNodeInTree(node: ASTNode, id: string): ASTNode | null {
    if (node.id === id) {
      return node
    }

    if (node.type === 'label') {
      const label = node as LabelNode
      for (const child of label.body) {
        const found = this.findNodeInTree(child, id)
        if (found) return found
      }
    } else if (node.type === 'menu') {
      const menu = node as MenuNode
      for (const choice of menu.choices) {
        for (const child of choice.body) {
          const found = this.findNodeInTree(child, id)
          if (found) return found
        }
      }
    } else if (node.type === 'if') {
      const ifNode = node as IfNode
      for (const branch of ifNode.branches) {
        for (const child of branch.body) {
          const found = this.findNodeInTree(child, id)
          if (found) return found
        }
      }
    }

    return null
  }

  /**
   * Collect all AST node IDs from a block and its children
   */
  private collectAstNodeIds(block: Block): string[] {
    const ids: string[] = []
    
    if (block.astNodeId) {
      ids.push(block.astNodeId)
    }

    if (block.children) {
      for (const child of block.children) {
        ids.push(...this.collectAstNodeIds(child))
      }
    }

    return ids
  }

  /**
   * Deep copy a block and its children
   */
  private deepCopyBlock(block: Block): Block {
    const copy: Block = {
      ...block,
      slots: block.slots.map(slot => ({ ...slot })),
    }

    if (block.children) {
      copy.children = block.children.map(child => this.deepCopyBlock(child))
    }

    return copy
  }

  /**
   * Deep copy a block with new IDs
   */
  private deepCopyBlockWithNewIds(block: Block): Block {
    const newId = generateBlockId()
    const newAstId = generateAstId(block.type)

    const copy: Block = {
      ...block,
      id: newId,
      astNodeId: newAstId,
      slots: block.slots.map(slot => ({ ...slot })),
      selected: false,
    }

    if (block.children) {
      copy.children = block.children.map(child => this.deepCopyBlockWithNewIds(child))
    }

    return copy
  }

  /**
   * Create AST nodes for a block and its children
   */
  private createAstNodesForBlock(block: Block): ASTNode[] {
    const nodes: ASTNode[] = []

    const astNode = this.createAstNode(block.type, block)
    if (astNode) {
      block.astNodeId = astNode.id
      nodes.push(astNode)
    }

    if (block.children) {
      for (const child of block.children) {
        nodes.push(...this.createAstNodesForBlock(child))
      }
    }

    return nodes
  }
}

/**
 * Factory function to create a BlockOperationHandler instance
 */
export function createBlockOperationHandler(): BlockOperationHandler {
  return new BlockOperationHandler()
}
