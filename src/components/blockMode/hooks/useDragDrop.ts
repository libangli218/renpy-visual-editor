/**
 * useDragDrop Hook
 * 拖拽 Hook
 * 
 * Handles drag start, move, and end events.
 * Calculates snap points for block placement.
 * 
 * Requirements: 7.1-7.6
 * - 7.1: Show snap preview indicator when dragging near valid snap points
 * - 7.2: Insert block at valid snap point on release
 * - 7.3: Remove block from original position when dragging away
 * - 7.4: Support dragging block stacks
 * - 7.5: Return block to original position or delete when dropped on invalid position
 * - 7.6: Show semi-transparent drag preview
 */

import { useCallback, useRef, useEffect } from 'react'
import { useDragDropContext, DragData, DropTarget } from '../DragDropContext'
import { Block, BlockType } from '../types'

/**
 * Snap point information
 */
export interface SnapPoint {
  /** Container block ID */
  containerId: string
  /** Index within container */
  index: number
  /** Y position of the snap point */
  y: number
  /** Height of the snap zone */
  height: number
}

/**
 * Options for useDragDrop hook
 */
export interface UseDragDropOptions {
  /** The container element ref for calculating snap points */
  containerRef?: React.RefObject<HTMLElement>
  /** The container block ID */
  containerId?: string
  /** Child blocks for calculating snap points */
  children?: Block[]
  /** Callback when drag enters the container */
  onDragEnter?: () => void
  /** Callback when drag leaves the container */
  onDragLeave?: () => void
  /** Snap threshold in pixels */
  snapThreshold?: number
}

/**
 * Return type for useDragDrop hook
 */
export interface UseDragDropReturn {
  /** Whether currently dragging */
  isDragging: boolean
  /** Current drag data */
  dragData: DragData | null
  /** Current drop target */
  dropTarget: DropTarget | null
  /** Start dragging from palette */
  startPaletteDrag: (blockType: BlockType, event: React.DragEvent) => void
  /** Start dragging an existing block */
  startBlockDrag: (blockId: string, parentId: string, index: number, event: React.DragEvent, isStack?: boolean, stackBlockIds?: string[]) => void
  /** Handle drag over event */
  handleDragOver: (event: React.DragEvent) => void
  /** Handle drag enter event */
  handleDragEnter: (event: React.DragEvent) => void
  /** Handle drag leave event */
  handleDragLeave: (event: React.DragEvent) => void
  /** Handle drop event */
  handleDrop: (event: React.DragEvent) => void
  /** Handle drag end event */
  handleDragEnd: (event: React.DragEvent) => void
  /** Calculate snap points for the container */
  calculateSnapPoints: () => SnapPoint[]
  /** Find the nearest snap point to a Y position */
  findNearestSnapPoint: (clientY: number) => SnapPoint | null
}

/**
 * Default snap threshold in pixels
 */
const DEFAULT_SNAP_THRESHOLD = 20

/**
 * useDragDrop - Hook for handling drag-drop operations
 */
export function useDragDrop(options: UseDragDropOptions = {}): UseDragDropReturn {
  const {
    containerRef,
    containerId,
    children = [],
    onDragEnter,
    onDragLeave,
    snapThreshold = DEFAULT_SNAP_THRESHOLD,
  } = options

  const { state, actions } = useDragDropContext()
  const { isDragging, dragData, dropTarget } = state
  const {
    startPaletteDrag: contextStartPaletteDrag,
    startBlockDrag: contextStartBlockDrag,
    updateDropTarget,
    updatePointerPosition,
    endDrag,
    isValidDropTarget,
  } = actions

  // Track whether we're inside the container
  const isInsideRef = useRef(false)
  const snapPointsRef = useRef<SnapPoint[]>([])

  /**
   * Calculate snap points based on child blocks
   */
  const calculateSnapPoints = useCallback((): SnapPoint[] => {
    if (!containerRef?.current || !containerId) {
      return []
    }

    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    const blockElements = container.querySelectorAll('[data-block-id]')
    const snapPoints: SnapPoint[] = []

    // Add snap point at the beginning
    if (blockElements.length === 0) {
      // Empty container - single snap point in the middle
      snapPoints.push({
        containerId,
        index: 0,
        y: containerRect.top + containerRect.height / 2,
        height: containerRect.height,
      })
    } else {
      // Add snap point before first block
      const firstBlock = blockElements[0]
      const firstRect = firstBlock.getBoundingClientRect()
      snapPoints.push({
        containerId,
        index: 0,
        y: firstRect.top,
        height: snapThreshold * 2,
      })

      // Add snap points between blocks
      for (let i = 0; i < blockElements.length; i++) {
        const blockRect = blockElements[i].getBoundingClientRect()
        
        if (i < blockElements.length - 1) {
          const nextRect = blockElements[i + 1].getBoundingClientRect()
          const midY = (blockRect.bottom + nextRect.top) / 2
          snapPoints.push({
            containerId,
            index: i + 1,
            y: midY,
            height: nextRect.top - blockRect.bottom + snapThreshold * 2,
          })
        }
      }

      // Add snap point after last block
      const lastBlock = blockElements[blockElements.length - 1]
      const lastRect = lastBlock.getBoundingClientRect()
      snapPoints.push({
        containerId,
        index: blockElements.length,
        y: lastRect.bottom,
        height: snapThreshold * 2,
      })
    }

    snapPointsRef.current = snapPoints
    return snapPoints
  }, [containerRef, containerId, snapThreshold])

  /**
   * Find the nearest snap point to a Y position
   */
  const findNearestSnapPoint = useCallback((clientY: number): SnapPoint | null => {
    const snapPoints = calculateSnapPoints()
    if (snapPoints.length === 0) return null

    let nearestPoint: SnapPoint | null = null
    let minDistance = Infinity

    for (const point of snapPoints) {
      const distance = Math.abs(clientY - point.y)
      if (distance < minDistance && distance < point.height / 2 + snapThreshold) {
        minDistance = distance
        nearestPoint = point
      }
    }

    return nearestPoint
  }, [calculateSnapPoints, snapThreshold])

  /**
   * Start dragging from palette
   */
  const startPaletteDrag = useCallback((blockType: BlockType, event: React.DragEvent) => {
    // Set drag data
    event.dataTransfer.setData('application/x-block-type', blockType)
    event.dataTransfer.setData('text/plain', blockType)
    event.dataTransfer.effectAllowed = 'copy'

    // Update context
    contextStartPaletteDrag(blockType)
  }, [contextStartPaletteDrag])

  /**
   * Start dragging an existing block
   */
  const startBlockDrag = useCallback((
    blockId: string,
    parentId: string,
    index: number,
    event: React.DragEvent,
    isStack: boolean = false,
    stackBlockIds: string[] = []
  ) => {
    // Set drag data
    event.dataTransfer.setData('application/x-block-id', blockId)
    event.dataTransfer.setData('application/x-source-parent', parentId)
    event.dataTransfer.setData('application/x-source-index', String(index))
    event.dataTransfer.setData('text/plain', blockId)
    event.dataTransfer.effectAllowed = 'move'

    // Create drag image
    const target = event.currentTarget as HTMLElement
    if (target) {
      // Clone the element for drag preview
      const clone = target.cloneNode(true) as HTMLElement
      clone.style.opacity = '0.7'
      clone.style.position = 'absolute'
      clone.style.top = '-1000px'
      clone.style.left = '-1000px'
      document.body.appendChild(clone)
      event.dataTransfer.setDragImage(clone, 20, 20)
      
      // Clean up after drag starts
      setTimeout(() => {
        document.body.removeChild(clone)
      }, 0)
    }

    // Update context
    contextStartBlockDrag(blockId, parentId, index, isStack, stackBlockIds)
  }, [contextStartBlockDrag])

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    // Update pointer position
    updatePointerPosition(event.clientX, event.clientY)

    // Find nearest snap point
    const snapPoint = findNearestSnapPoint(event.clientY)
    
    if (snapPoint && containerId) {
      const isValid = isValidDropTarget(snapPoint.containerId, snapPoint.index)
      
      // Adjust index if dragging within same container
      let adjustedIndex = snapPoint.index
      if (dragData?.sourceType === 'block' && 
          dragData.sourceParentId === containerId &&
          dragData.sourceIndex !== undefined) {
        // If moving down, the visual index stays the same
        // If moving up, we need to account for the removed item
        if (dragData.sourceIndex < snapPoint.index) {
          adjustedIndex = snapPoint.index - 1
        }
      }

      updateDropTarget({
        containerId: snapPoint.containerId,
        index: adjustedIndex,
        indicatorY: snapPoint.y,
        isValid,
      })

      event.dataTransfer.dropEffect = isValid ? 'move' : 'none'
    } else {
      updateDropTarget(null)
      event.dataTransfer.dropEffect = 'none'
    }
  }, [containerId, dragData, findNearestSnapPoint, isValidDropTarget, updateDropTarget, updatePointerPosition])

  /**
   * Handle drag enter event
   */
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (!isInsideRef.current) {
      isInsideRef.current = true
      onDragEnter?.()
    }
  }, [onDragEnter])

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    // Check if we're actually leaving the container
    const relatedTarget = event.relatedTarget as HTMLElement
    if (containerRef?.current && !containerRef.current.contains(relatedTarget)) {
      isInsideRef.current = false
      onDragLeave?.()
      updateDropTarget(null)
    }
  }, [containerRef, onDragLeave, updateDropTarget])

  /**
   * Handle drop event
   */
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    isInsideRef.current = false
    
    // End drag with drop
    endDrag(true)
  }, [endDrag])

  /**
   * Handle drag end event
   */
  const handleDragEnd = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    
    isInsideRef.current = false

    // Check if drop was successful
    const dropEffect = event.dataTransfer.dropEffect
    const wasDropped = dropEffect !== 'none'

    endDrag(wasDropped)
  }, [endDrag])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isInsideRef.current = false
    }
  }, [])

  return {
    isDragging,
    dragData,
    dropTarget,
    startPaletteDrag,
    startBlockDrag,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    calculateSnapPoints,
    findNearestSnapPoint,
  }
}

export default useDragDrop
