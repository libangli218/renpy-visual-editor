/**
 * LabelContainer Component
 * Label 容器组件
 * 
 * Displays a Label as a container with its name as title,
 * vertical content area for child blocks, and empty state placeholder.
 * Supports drag-and-drop reordering of internal blocks.
 * 
 * Performance optimizations:
 * - React.memo to prevent unnecessary re-renders
 * - useMemo for expensive computations
 * - useCallback for event handlers
 * 
 * Requirements: 2.1-2.5
 */

import React, { useCallback, useState, useRef, useMemo, memo } from 'react'
import { Block } from './types'
import './LabelContainer.css'

/**
 * Props for LabelContainer component
 */
export interface LabelContainerProps {
  /** The label block data */
  block: Block
  /** Label name to display as title */
  labelName: string
  /** Callback when a block is clicked */
  onBlockClick?: (blockId: string) => void
  /** Callback when a block is double-clicked */
  onBlockDoubleClick?: (blockId: string) => void
  /** Callback when a block drag starts */
  onBlockDragStart?: (blockId: string, event: React.DragEvent) => void
  /** Callback when a block drag ends */
  onBlockDragEnd?: (event: React.DragEvent) => void
  /** Callback when blocks are reordered via drag-drop */
  onBlockReorder?: (blockId: string, newIndex: number) => void
  /** Callback when a new block is dropped from palette */
  onBlockDrop?: (blockType: string, index: number) => void
  /** Callback when an existing block is moved here */
  onBlockMove?: (blockId: string, index: number) => void
  /** Render function for child blocks */
  renderBlock?: (block: Block, index: number) => React.ReactNode
  /** Whether the container is in read-only mode */
  readOnly?: boolean
  /** Additional class name */
  className?: string
  /** Selected block ID */
  selectedBlockId?: string | null
}

/**
 * Drop position indicator
 */
interface DropPosition {
  index: number
  y: number
}

/**
 * LabelContainer - Container component for a Label's blocks
 * 
 * Implements Requirements:
 * - 2.1: Display Label container when editing a Label
 * - 2.2: Display Label name as title
 * - 2.3: Provide vertical content area for child blocks
 * - 2.4: Show placeholder when empty
 * - 2.5: Support drag-drop reordering
 */
export const LabelContainer: React.FC<LabelContainerProps> = memo(({
  block,
  labelName,
  onBlockClick,
  onBlockDoubleClick,
  onBlockDragStart,
  onBlockDragEnd,
  onBlockReorder,
  onBlockDrop,
  onBlockMove,
  renderBlock,
  readOnly = false,
  className = '',
  selectedBlockId,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Memoize children array reference
  const children = useMemo(() => block.children || [], [block.children])
  const isEmpty = children.length === 0

  /**
   * Calculate drop index based on mouse Y position
   */
  const calculateDropIndex = useCallback((clientY: number): number => {
    if (!contentRef.current || children.length === 0) {
      return 0
    }

    const blockElements = contentRef.current.querySelectorAll('[data-block-id]')
    const containerRect = contentRef.current.getBoundingClientRect()
    
    // If above all blocks, insert at beginning
    if (clientY < containerRect.top) {
      return 0
    }

    for (let i = 0; i < blockElements.length; i++) {
      const blockRect = blockElements[i].getBoundingClientRect()
      const blockMiddle = blockRect.top + blockRect.height / 2

      if (clientY < blockMiddle) {
        return i
      }
    }

    // If below all blocks, insert at end
    return children.length
  }, [children.length])

  /**
   * Get Y position for drop indicator
   */
  const getDropIndicatorY = useCallback((index: number): number => {
    if (!contentRef.current) {
      return 0
    }

    const blockElements = contentRef.current.querySelectorAll('[data-block-id]')
    const containerRect = contentRef.current.getBoundingClientRect()
    const scrollTop = contentRef.current.scrollTop
    
    if (blockElements.length === 0) {
      // When empty, position at the top of the content area
      return 0
    }

    if (index === 0) {
      const firstBlock = blockElements[0]
      const firstRect = firstBlock.getBoundingClientRect()
      // Position above the first block, accounting for scroll
      return firstRect.top - containerRect.top + scrollTop
    }

    if (index >= blockElements.length) {
      const lastBlock = blockElements[blockElements.length - 1]
      const lastRect = lastBlock.getBoundingClientRect()
      // Position below the last block, accounting for scroll
      return lastRect.bottom - containerRect.top + scrollTop
    }

    const targetBlock = blockElements[index]
    const targetRect = targetBlock.getBoundingClientRect()
    // Position above the target block, accounting for scroll
    return targetRect.top - containerRect.top + scrollTop
  }, [])

  /**
   * Handle drag start on a child block
   */
  const handleBlockDragStart = useCallback((blockId: string, event: React.DragEvent) => {
    setDraggedBlockId(blockId)
    onBlockDragStart?.(blockId, event)
  }, [onBlockDragStart])

  /**
   * Handle drag end
   */
  const handleBlockDragEnd = useCallback((event: React.DragEvent) => {
    setDraggedBlockId(null)
    setDropPosition(null)
    setIsDragOver(false)
    onBlockDragEnd?.(event)
  }, [onBlockDragEnd])

  /**
   * Handle drag over the container
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (readOnly) return

    event.preventDefault()
    event.stopPropagation()
    
    // Check what type of drag this is
    const hasBlockType = event.dataTransfer.types.includes('application/x-block-type')
    event.dataTransfer.dropEffect = hasBlockType ? 'copy' : 'move'

    const index = calculateDropIndex(event.clientY)
    const y = getDropIndicatorY(index)

    setIsDragOver(true)
    setDropPosition({ index, y })
  }, [readOnly, calculateDropIndex, getDropIndicatorY])

  /**
   * Handle drag enter
   */
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    if (readOnly) return
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(true)
  }, [readOnly])

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    // Only clear if leaving the container entirely
    const relatedTarget = event.relatedTarget as HTMLElement
    if (containerRef.current && !containerRef.current.contains(relatedTarget)) {
      setIsDragOver(false)
      setDropPosition(null)
    }
  }, [])

  /**
   * Handle drop
   */
  const handleDrop = useCallback((event: React.DragEvent) => {
    if (readOnly) return

    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(false)
    setDropPosition(null)

    const dropIndex = calculateDropIndex(event.clientY)

    // Check if dropping a block from palette (new block)
    const blockType = event.dataTransfer.getData('application/x-block-type')
    if (blockType) {
      onBlockDrop?.(blockType, dropIndex)
      return
    }

    // Check if dropping an existing block (reorder or move)
    const blockId = event.dataTransfer.getData('application/x-block-id')
    if (blockId) {
      // Check if it's a reorder within this container
      const isInternalBlock = children.some(child => child.id === blockId)
      
      if (isInternalBlock) {
        // Find current index
        const currentIndex = children.findIndex(child => child.id === blockId)
        
        // Adjust drop index if moving down
        let adjustedIndex = dropIndex
        if (currentIndex < dropIndex) {
          adjustedIndex = Math.max(0, dropIndex - 1)
        }

        // Only reorder if position changed
        if (currentIndex !== adjustedIndex) {
          onBlockReorder?.(blockId, adjustedIndex)
        }
      } else {
        // Block from another container
        onBlockMove?.(blockId, dropIndex)
      }
    }
  }, [readOnly, calculateDropIndex, children, onBlockDrop, onBlockReorder, onBlockMove])

  /**
   * Render a child block with drag handlers
   */
  const renderChildBlock = useCallback((childBlock: Block, index: number) => {
    if (renderBlock) {
      return renderBlock(childBlock, index)
    }

    // Default rendering (should be overridden by parent)
    return (
      <div
        key={childBlock.id}
        data-block-id={childBlock.id}
        className={`label-container-block ${childBlock.id === selectedBlockId ? 'selected' : ''} ${childBlock.id === draggedBlockId ? 'dragging' : ''}`}
        onClick={() => onBlockClick?.(childBlock.id)}
        onDoubleClick={() => onBlockDoubleClick?.(childBlock.id)}
        draggable={!readOnly}
        onDragStart={(e) => handleBlockDragStart(childBlock.id, e)}
        onDragEnd={handleBlockDragEnd}
      >
        <span className="block-type-badge">{childBlock.type}</span>
      </div>
    )
  }, [renderBlock, selectedBlockId, draggedBlockId, readOnly, onBlockClick, onBlockDoubleClick, handleBlockDragStart, handleBlockDragEnd])

  // Build class names - memoized for performance
  const containerClasses = useMemo(() => [
    'label-container',
    isDragOver && 'drag-over',
    isEmpty && 'empty',
    readOnly && 'read-only',
    className,
  ].filter(Boolean).join(' '), [isDragOver, isEmpty, readOnly, className])

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      data-label-name={labelName}
    >
      {/* Label Header */}
      <div className="label-container-header">
        <span className="label-icon">🏷️</span>
        <h2 className="label-name">{labelName}</h2>
        <span className="label-block-count">
          {children.length} {children.length === 1 ? '个积木' : '个积木'}
        </span>
      </div>

      {/* Content Area */}
      <div
        ref={contentRef}
        className="label-container-content"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isEmpty ? (
          /* Empty State Placeholder - pointer-events: none to allow drop on parent */
          <div className="label-container-empty" style={{ pointerEvents: 'none' }}>
            <div className="empty-icon">📦</div>
            <p className="empty-text">拖拽积木到这里</p>
            <p className="empty-hint">从左侧面板选择积木开始编辑</p>
          </div>
        ) : (
          /* Block List */
          <>
            {children.map((child, index) => (
              <React.Fragment key={child.id}>
                {renderChildBlock(child, index)}
              </React.Fragment>
            ))}
          </>
        )}

        {/* Drop Position Indicator */}
        {isDragOver && dropPosition && (
          <div
            className="drop-indicator"
            style={{ top: dropPosition.y }}
          />
        )}
      </div>
    </div>
  )
})

// Display name for debugging
LabelContainer.displayName = 'LabelContainer'

export default LabelContainer
