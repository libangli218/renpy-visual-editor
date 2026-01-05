/**
 * DragDropContext
 * 拖拽上下文
 * 
 * Manages drag-drop state and provides drag event handling for the block editor.
 * Coordinates drag operations between BlockPalette, LabelContainer, and blocks.
 * 
 * Requirements: 7.1-7.6
 * - 7.1: Show snap preview indicator when dragging near valid snap points
 * - 7.2: Insert block at valid snap point on release
 * - 7.3: Remove block from original position when dragging away
 * - 7.4: Support dragging block stacks (block and all connected blocks below)
 * - 7.5: Return block to original position or delete when dropped on invalid position
 * - 7.6: Show semi-transparent drag preview
 */

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import { Block, BlockType } from './types'

/**
 * Drag source types
 */
export type DragSourceType = 'palette' | 'block'

/**
 * Drag data representing what is being dragged
 */
export interface DragData {
  /** Type of drag source */
  sourceType: DragSourceType
  /** Block type (for palette drags) */
  blockType?: BlockType
  /** Block ID (for existing block drags) */
  blockId?: string
  /** Source parent ID (for existing block drags) */
  sourceParentId?: string
  /** Source index within parent (for existing block drags) */
  sourceIndex?: number
  /** Whether dragging a block stack */
  isStack?: boolean
  /** IDs of blocks in the stack (including the dragged block) */
  stackBlockIds?: string[]
}

/**
 * Drop target information
 */
export interface DropTarget {
  /** Target container block ID */
  containerId: string
  /** Target index within container */
  index: number
  /** Y position for snap indicator */
  indicatorY: number
  /** Whether this is a valid drop target */
  isValid: boolean
}

/**
 * Drag-drop context state
 */
export interface DragDropState {
  /** Whether a drag operation is in progress */
  isDragging: boolean
  /** Current drag data */
  dragData: DragData | null
  /** Current drop target */
  dropTarget: DropTarget | null
  /** Current mouse/pointer position */
  pointerPosition: { x: number; y: number } | null
  /** Original position for potential rollback */
  originalPosition: { parentId: string; index: number } | null
}

/**
 * Drag-drop context actions
 */
export interface DragDropActions {
  /** Start a drag operation from the palette */
  startPaletteDrag: (blockType: BlockType) => void
  /** Start a drag operation from an existing block */
  startBlockDrag: (blockId: string, parentId: string, index: number, isStack?: boolean, stackBlockIds?: string[]) => void
  /** Update the current drop target */
  updateDropTarget: (target: DropTarget | null) => void
  /** Update pointer position */
  updatePointerPosition: (x: number, y: number) => void
  /** End the drag operation (drop or cancel) */
  endDrag: (dropped: boolean) => void
  /** Cancel the drag operation */
  cancelDrag: () => void
  /** Check if a drop target is valid */
  isValidDropTarget: (containerId: string, index: number) => boolean
}

/**
 * Combined context value
 */
export interface DragDropContextValue {
  state: DragDropState
  actions: DragDropActions
}

/**
 * Initial state
 */
const initialState: DragDropState = {
  isDragging: false,
  dragData: null,
  dropTarget: null,
  pointerPosition: null,
  originalPosition: null,
}

/**
 * Create the context
 */
const DragDropContext = createContext<DragDropContextValue | null>(null)

/**
 * Props for DragDropProvider
 */
export interface DragDropProviderProps {
  /** Child components */
  children: React.ReactNode
  /** Callback when a block is dropped from palette */
  onPaletteDrop?: (blockType: BlockType, containerId: string, index: number) => void
  /** Callback when an existing block is moved */
  onBlockMove?: (blockId: string, newParentId: string, newIndex: number) => void
  /** Callback when a block is dropped on invalid position */
  onInvalidDrop?: (blockId: string) => void
  /** Function to validate drop targets */
  validateDropTarget?: (dragData: DragData, containerId: string, index: number) => boolean
  /** The current block tree for validation */
  blockTree?: Block | null
}

/**
 * DragDropProvider - Provides drag-drop context to children
 */
export const DragDropProvider: React.FC<DragDropProviderProps> = ({
  children,
  onPaletteDrop,
  onBlockMove,
  onInvalidDrop,
  validateDropTarget,
  blockTree,
}) => {
  const [state, setState] = useState<DragDropState>(initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  /**
   * Start a drag operation from the palette
   */
  const startPaletteDrag = useCallback((blockType: BlockType) => {
    setState({
      isDragging: true,
      dragData: {
        sourceType: 'palette',
        blockType,
      },
      dropTarget: null,
      pointerPosition: null,
      originalPosition: null,
    })
  }, [])

  /**
   * Start a drag operation from an existing block
   */
  const startBlockDrag = useCallback((
    blockId: string,
    parentId: string,
    index: number,
    isStack: boolean = false,
    stackBlockIds: string[] = []
  ) => {
    setState({
      isDragging: true,
      dragData: {
        sourceType: 'block',
        blockId,
        sourceParentId: parentId,
        sourceIndex: index,
        isStack,
        stackBlockIds: isStack ? stackBlockIds : [blockId],
      },
      dropTarget: null,
      pointerPosition: null,
      originalPosition: { parentId, index },
    })
  }, [])

  /**
   * Update the current drop target
   */
  const updateDropTarget = useCallback((target: DropTarget | null) => {
    setState(prev => ({
      ...prev,
      dropTarget: target,
    }))
  }, [])

  /**
   * Update pointer position
   */
  const updatePointerPosition = useCallback((x: number, y: number) => {
    setState(prev => ({
      ...prev,
      pointerPosition: { x, y },
    }))
  }, [])

  /**
   * Check if a container would create a circular reference
   */
  const wouldCreateCircularReference = useCallback((
    draggedBlockId: string,
    targetContainerId: string
  ): boolean => {
    if (!blockTree) return false
    
    // Find the dragged block
    const findBlock = (root: Block, id: string): Block | null => {
      if (root.id === id) return root
      if (root.children) {
        for (const child of root.children) {
          const found = findBlock(child, id)
          if (found) return found
        }
      }
      return null
    }

    const draggedBlock = findBlock(blockTree, draggedBlockId)
    if (!draggedBlock) return false

    // Check if target container is a descendant of the dragged block
    const isDescendant = (parent: Block, targetId: string): boolean => {
      if (parent.id === targetId) return true
      if (parent.children) {
        for (const child of parent.children) {
          if (isDescendant(child, targetId)) return true
        }
      }
      return false
    }

    return isDescendant(draggedBlock, targetContainerId)
  }, [blockTree])

  /**
   * Check if a drop target is valid
   */
  const isValidDropTarget = useCallback((containerId: string, index: number): boolean => {
    const currentState = stateRef.current
    if (!currentState.dragData) return false

    // Custom validation if provided
    if (validateDropTarget) {
      return validateDropTarget(currentState.dragData, containerId, index)
    }

    // Default validation
    const { dragData } = currentState

    // Palette drags are always valid to containers
    if (dragData.sourceType === 'palette') {
      return true
    }

    // Block drags need additional checks
    if (dragData.sourceType === 'block' && dragData.blockId) {
      // Can't drop on itself
      if (dragData.blockId === containerId) {
        return false
      }

      // Can't create circular reference
      if (wouldCreateCircularReference(dragData.blockId, containerId)) {
        return false
      }

      // Can't drop at the same position
      if (dragData.sourceParentId === containerId && dragData.sourceIndex === index) {
        return false
      }

      return true
    }

    return false
  }, [validateDropTarget, wouldCreateCircularReference])

  /**
   * End the drag operation
   */
  const endDrag = useCallback((dropped: boolean) => {
    const currentState = stateRef.current
    const { dragData, dropTarget } = currentState

    if (dropped && dragData && dropTarget && dropTarget.isValid) {
      // Handle successful drop
      if (dragData.sourceType === 'palette' && dragData.blockType) {
        onPaletteDrop?.(dragData.blockType, dropTarget.containerId, dropTarget.index)
      } else if (dragData.sourceType === 'block' && dragData.blockId) {
        onBlockMove?.(dragData.blockId, dropTarget.containerId, dropTarget.index)
      }
    } else if (!dropped && dragData?.sourceType === 'block' && dragData.blockId) {
      // Handle invalid drop - notify parent
      onInvalidDrop?.(dragData.blockId)
    }

    // Reset state
    setState(initialState)
  }, [onPaletteDrop, onBlockMove, onInvalidDrop])

  /**
   * Cancel the drag operation
   */
  const cancelDrag = useCallback(() => {
    setState(initialState)
  }, [])

  /**
   * Memoized context value
   */
  const contextValue = useMemo<DragDropContextValue>(() => ({
    state,
    actions: {
      startPaletteDrag,
      startBlockDrag,
      updateDropTarget,
      updatePointerPosition,
      endDrag,
      cancelDrag,
      isValidDropTarget,
    },
  }), [
    state,
    startPaletteDrag,
    startBlockDrag,
    updateDropTarget,
    updatePointerPosition,
    endDrag,
    cancelDrag,
    isValidDropTarget,
  ])

  return (
    <DragDropContext.Provider value={contextValue}>
      {children}
    </DragDropContext.Provider>
  )
}

/**
 * Hook to access drag-drop context
 */
export function useDragDropContext(): DragDropContextValue {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDropContext must be used within a DragDropProvider')
  }
  return context
}

/**
 * Hook to check if currently dragging
 */
export function useIsDragging(): boolean {
  const { state } = useDragDropContext()
  return state.isDragging
}

/**
 * Hook to get current drag data
 */
export function useDragData(): DragData | null {
  const { state } = useDragDropContext()
  return state.dragData
}

/**
 * Hook to get current drop target
 */
export function useDropTarget(): DropTarget | null {
  const { state } = useDragDropContext()
  return state.dropTarget
}

export default DragDropProvider
