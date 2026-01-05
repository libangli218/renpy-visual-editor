/**
 * useBlockStack Hook
 * 积木栈 Hook
 * 
 * Handles block stack operations - when dragging a block,
 * all blocks below it in the same container move together.
 * 
 * Requirements: 7.4
 * - Support dragging block stacks (block and all connected blocks below)
 */

import { useCallback } from 'react'
import { Block } from '../types'

/**
 * Block stack information
 */
export interface BlockStack {
  /** The top block being dragged */
  topBlockId: string
  /** All block IDs in the stack (including top block) */
  blockIds: string[]
  /** The blocks in the stack */
  blocks: Block[]
  /** Total height of the stack (for drag preview) */
  totalHeight?: number
}

/**
 * Options for useBlockStack hook
 */
export interface UseBlockStackOptions {
  /** The parent container's children */
  children?: Block[]
  /** Whether to enable stack dragging */
  enableStackDrag?: boolean
}

/**
 * Return type for useBlockStack hook
 */
export interface UseBlockStackReturn {
  /** Get the block stack starting from a given block */
  getBlockStack: (blockId: string) => BlockStack | null
  /** Get all block IDs below a given block (inclusive) */
  getBlocksBelow: (blockId: string) => string[]
  /** Check if a block is part of a stack being dragged */
  isInDraggedStack: (blockId: string, draggedStackIds: string[]) => boolean
  /** Calculate the visual offset for blocks in a dragged stack */
  getStackOffset: (blockId: string, draggedStackIds: string[]) => number
}

/**
 * useBlockStack - Hook for managing block stack operations
 */
export function useBlockStack(options: UseBlockStackOptions = {}): UseBlockStackReturn {
  const { children = [], enableStackDrag = true } = options

  /**
   * Get all block IDs below a given block (inclusive)
   */
  const getBlocksBelow = useCallback((blockId: string): string[] => {
    if (!enableStackDrag) {
      return [blockId]
    }

    const index = children.findIndex(child => child.id === blockId)
    if (index === -1) {
      return [blockId]
    }

    // Get all blocks from this index to the end
    return children.slice(index).map(block => block.id)
  }, [children, enableStackDrag])

  /**
   * Get the block stack starting from a given block
   */
  const getBlockStack = useCallback((blockId: string): BlockStack | null => {
    const index = children.findIndex(child => child.id === blockId)
    if (index === -1) {
      return null
    }

    const stackBlocks = children.slice(index)
    const blockIds = stackBlocks.map(block => block.id)

    return {
      topBlockId: blockId,
      blockIds,
      blocks: stackBlocks,
    }
  }, [children])

  /**
   * Check if a block is part of a stack being dragged
   */
  const isInDraggedStack = useCallback((blockId: string, draggedStackIds: string[]): boolean => {
    return draggedStackIds.includes(blockId)
  }, [])

  /**
   * Calculate the visual offset for blocks in a dragged stack
   * Returns the index within the stack (0 for top block)
   */
  const getStackOffset = useCallback((blockId: string, draggedStackIds: string[]): number => {
    const index = draggedStackIds.indexOf(blockId)
    return index >= 0 ? index : 0
  }, [])

  return {
    getBlockStack,
    getBlocksBelow,
    isInDraggedStack,
    getStackOffset,
  }
}

/**
 * Utility function to collect all descendant block IDs
 */
export function collectDescendantIds(block: Block): string[] {
  const ids: string[] = [block.id]
  
  if (block.children) {
    for (const child of block.children) {
      ids.push(...collectDescendantIds(child))
    }
  }
  
  return ids
}

/**
 * Utility function to find a block's siblings below it
 */
export function findSiblingsBelow(
  parentChildren: Block[],
  blockId: string
): Block[] {
  const index = parentChildren.findIndex(child => child.id === blockId)
  if (index === -1) {
    return []
  }
  return parentChildren.slice(index)
}

/**
 * Utility function to calculate total stack height from DOM elements
 */
export function calculateStackHeight(
  containerElement: HTMLElement,
  blockIds: string[]
): number {
  let totalHeight = 0
  
  for (const blockId of blockIds) {
    const blockElement = containerElement.querySelector(`[data-block-id="${blockId}"]`)
    if (blockElement) {
      const rect = blockElement.getBoundingClientRect()
      totalHeight += rect.height
    }
  }
  
  return totalHeight
}

export default useBlockStack
