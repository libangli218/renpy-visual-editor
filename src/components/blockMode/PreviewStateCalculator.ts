/**
 * PreviewStateCalculator
 * 预览状态计算器
 * 
 * Calculates game state for preview by traversing blocks and accumulating state.
 * 
 * Implements Requirements:
 * - 11.2: 修改场景设置积木时立即更新显示背景和角色
 * - 11.3: 修改对话积木时显示对话框和文本
 * - 11.4: 选中积木时显示该积木执行后的游戏状态
 * - 12.4: 提供单步执行功能（下一步/上一步）
 */

import { Block, GameState, CharacterState } from './types'

/**
 * PreviewStateCalculator class
 * Calculates game state by traversing blocks up to a target block
 */
export class PreviewStateCalculator {
  /**
   * Calculate game state by executing blocks up to and including the target block
   * @param blocks - Array of blocks to traverse (typically children of a label)
   * @param targetBlockId - ID of the target block to calculate state for
   * @returns GameState representing the state after executing up to the target block
   */
  calculateState(blocks: Block[], targetBlockId: string): GameState {
    const state: GameState = {
      characters: [],
    }

    // Flatten blocks for linear traversal
    const flatBlocks = this.flattenBlocks(blocks)
    
    // Find target block index
    const targetIndex = flatBlocks.findIndex(b => b.id === targetBlockId)
    if (targetIndex === -1) {
      return state
    }

    // Traverse blocks up to and including target
    for (let i = 0; i <= targetIndex; i++) {
      this.applyBlockToState(flatBlocks[i], state)
    }

    return state
  }

  /**
   * Apply a single block's effects to the game state
   * @param block - Block to apply
   * @param state - Current game state (mutated)
   */
  private applyBlockToState(block: Block, state: GameState): void {
    switch (block.type) {
      case 'scene':
        this.applySceneBlock(block, state)
        break
      case 'show':
        this.applyShowBlock(block, state)
        break
      case 'hide':
        this.applyHideBlock(block, state)
        break
      case 'with':
        this.applyWithBlock(block, state)
        break
      case 'dialogue':
        this.applyDialogueBlock(block, state)
        break
      case 'play-music':
        this.applyPlayMusicBlock(block, state)
        break
      case 'stop-music':
        this.applyStopMusicBlock(block, state)
        break
      // Other block types don't affect visual state
      default:
        break
    }
  }

  /**
   * Apply scene block - sets background and optionally clears characters
   */
  private applySceneBlock(block: Block, state: GameState): void {
    const imageSlot = block.slots.find(s => s.name === 'image')
    const transitionSlot = block.slots.find(s => s.name === 'transition')

    if (imageSlot?.value) {
      state.background = String(imageSlot.value)
      // Scene typically clears all characters
      state.characters = []
    }

    if (transitionSlot?.value) {
      state.transition = String(transitionSlot.value)
    }
  }

  /**
   * Apply show block - adds or updates a character
   */
  private applyShowBlock(block: Block, state: GameState): void {
    const characterSlot = block.slots.find(s => s.name === 'character')
    const positionSlot = block.slots.find(s => s.name === 'position')
    const expressionSlot = block.slots.find(s => s.name === 'expression')
    const imageSlot = block.slots.find(s => s.name === 'image')

    if (!characterSlot?.value) return

    const characterName = String(characterSlot.value)
    const position = positionSlot?.value ? String(positionSlot.value) : 'center'
    const expression = expressionSlot?.value ? String(expressionSlot.value) : undefined
    const image = imageSlot?.value ? String(imageSlot.value) : characterName

    // Find existing character or create new
    const existingIndex = state.characters.findIndex(c => c.name === characterName)
    const characterState: CharacterState = {
      name: characterName,
      image,
      position,
      expression,
    }

    if (existingIndex >= 0) {
      state.characters[existingIndex] = characterState
    } else {
      state.characters.push(characterState)
    }
  }

  /**
   * Apply hide block - removes a character
   */
  private applyHideBlock(block: Block, state: GameState): void {
    const characterSlot = block.slots.find(s => s.name === 'character')
    
    if (!characterSlot?.value) return

    const characterName = String(characterSlot.value)
    state.characters = state.characters.filter(c => c.name !== characterName)
  }

  /**
   * Apply with block - sets transition effect
   */
  private applyWithBlock(block: Block, state: GameState): void {
    const transitionSlot = block.slots.find(s => s.name === 'transition')
    
    if (transitionSlot?.value) {
      state.transition = String(transitionSlot.value)
    }
  }

  /**
   * Apply dialogue block - sets current dialogue
   */
  private applyDialogueBlock(block: Block, state: GameState): void {
    const speakerSlot = block.slots.find(s => s.name === 'speaker')
    const textSlot = block.slots.find(s => s.name === 'text')

    const text = textSlot?.value ? String(textSlot.value) : ''
    const speaker = speakerSlot?.value ? String(speakerSlot.value) : undefined

    state.dialogue = {
      speaker,
      text,
    }
  }

  /**
   * Apply play-music block - sets current music
   */
  private applyPlayMusicBlock(block: Block, state: GameState): void {
    const fileSlot = block.slots.find(s => s.name === 'file')
    
    if (fileSlot?.value) {
      state.music = String(fileSlot.value)
    }
  }

  /**
   * Apply stop-music block - clears current music
   */
  private applyStopMusicBlock(_block: Block, state: GameState): void {
    state.music = undefined
  }

  /**
   * Flatten nested blocks into a linear array for traversal
   * Handles menu/choice/if structures by including their children
   * @param blocks - Array of blocks (may contain nested children)
   * @returns Flattened array of blocks in execution order
   */
  private flattenBlocks(blocks: Block[]): Block[] {
    const result: Block[] = []

    for (const block of blocks) {
      result.push(block)
      
      // Recursively flatten children for container blocks
      if (block.children && block.children.length > 0) {
        result.push(...this.flattenBlocks(block.children))
      }
    }

    return result
  }

  /**
   * Get the next block in sequence
   * @param currentBlockId - Current block ID
   * @param blocks - Array of blocks to search
   * @returns Next block ID or null if at end
   */
  getNextBlock(currentBlockId: string, blocks: Block[]): string | null {
    const flatBlocks = this.flattenBlocks(blocks)
    const currentIndex = flatBlocks.findIndex(b => b.id === currentBlockId)
    
    if (currentIndex === -1 || currentIndex >= flatBlocks.length - 1) {
      return null
    }

    return flatBlocks[currentIndex + 1].id
  }

  /**
   * Get the previous block in sequence
   * @param currentBlockId - Current block ID
   * @param blocks - Array of blocks to search
   * @returns Previous block ID or null if at start
   */
  getPreviousBlock(currentBlockId: string, blocks: Block[]): string | null {
    const flatBlocks = this.flattenBlocks(blocks)
    const currentIndex = flatBlocks.findIndex(b => b.id === currentBlockId)
    
    if (currentIndex <= 0) {
      return null
    }

    return flatBlocks[currentIndex - 1].id
  }

  /**
   * Get all block IDs in execution order
   * @param blocks - Array of blocks
   * @returns Array of block IDs in execution order
   */
  getBlockOrder(blocks: Block[]): string[] {
    return this.flattenBlocks(blocks).map(b => b.id)
  }

  /**
   * Check if a block is the first in the sequence
   * @param blockId - Block ID to check
   * @param blocks - Array of blocks
   * @returns True if block is first
   */
  isFirstBlock(blockId: string, blocks: Block[]): boolean {
    const flatBlocks = this.flattenBlocks(blocks)
    return flatBlocks.length > 0 && flatBlocks[0].id === blockId
  }

  /**
   * Check if a block is the last in the sequence
   * @param blockId - Block ID to check
   * @param blocks - Array of blocks
   * @returns True if block is last
   */
  isLastBlock(blockId: string, blocks: Block[]): boolean {
    const flatBlocks = this.flattenBlocks(blocks)
    return flatBlocks.length > 0 && flatBlocks[flatBlocks.length - 1].id === blockId
  }
}

/**
 * Factory function to create a PreviewStateCalculator instance
 */
export function createPreviewStateCalculator(): PreviewStateCalculator {
  return new PreviewStateCalculator()
}
