/**
 * DragPreview Component
 * 拖拽预览组件
 * 
 * Shows a semi-transparent preview of the block being dragged.
 * Handles visual feedback for invalid drop positions.
 * 
 * Requirements: 7.5, 7.6
 * - 7.5: Return block to original position or delete when dropped on invalid position
 * - 7.6: Show semi-transparent drag preview
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useDragDropContext } from './DragDropContext'
import { getBlockDefinition } from './constants'
import './DragPreview.css'

/**
 * Props for DragPreview component
 */
export interface DragPreviewProps {
  /** Additional class name */
  className?: string
  /** Offset from cursor X */
  offsetX?: number
  /** Offset from cursor Y */
  offsetY?: number
}

/**
 * DragPreview - Shows a preview of the dragged block following the cursor
 * 
 * Implements Requirements:
 * - 7.6: Show semi-transparent drag preview
 */
export const DragPreview: React.FC<DragPreviewProps> = ({
  className = '',
  offsetX = 20,
  offsetY = 20,
}) => {
  const { state } = useDragDropContext()
  const { isDragging, dragData, dropTarget, pointerPosition } = state

  // Don't render if not dragging
  if (!isDragging || !dragData || !pointerPosition) {
    return null
  }

  // Get block definition for visual properties
  const blockType = dragData.blockType || (dragData.sourceType === 'block' ? undefined : undefined)
  const definition = blockType ? getBlockDefinition(blockType) : null

  // Determine if current position is valid
  const isValidPosition = dropTarget?.isValid ?? false

  // Calculate position
  const style: React.CSSProperties = {
    left: pointerPosition.x + offsetX,
    top: pointerPosition.y + offsetY,
    '--preview-color': definition?.color || '#607D8B',
  } as React.CSSProperties

  return (
    <div
      className={`drag-preview ${isValidPosition ? 'valid' : 'invalid'} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {/* Block preview content */}
      <div className="drag-preview-content">
        {definition && (
          <>
            <span className="drag-preview-icon">{definition.icon}</span>
            <span className="drag-preview-label">{definition.label}</span>
          </>
        )}
        {!definition && dragData.sourceType === 'block' && (
          <span className="drag-preview-label">移动积木</span>
        )}
      </div>

      {/* Invalid position indicator */}
      {!isValidPosition && dropTarget && (
        <div className="drag-preview-invalid-badge">
          <span className="invalid-icon">✕</span>
        </div>
      )}

      {/* Stack indicator */}
      {dragData.isStack && dragData.stackBlockIds && dragData.stackBlockIds.length > 1 && (
        <div className="drag-preview-stack-badge">
          +{dragData.stackBlockIds.length - 1}
        </div>
      )}
    </div>
  )
}

/**
 * Props for InvalidDropOverlay component
 */
export interface InvalidDropOverlayProps {
  /** Whether to show the overlay */
  visible?: boolean
  /** Message to display */
  message?: string
  /** Additional class name */
  className?: string
}

/**
 * InvalidDropOverlay - Shows feedback when dropping on invalid position
 * 
 * Implements Requirements:
 * - 7.5: Visual feedback for invalid drop positions
 */
export const InvalidDropOverlay: React.FC<InvalidDropOverlayProps> = ({
  visible = false,
  message = '无法放置在此位置',
  className = '',
}) => {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (visible) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [visible])

  if (!visible && !isAnimating) {
    return null
  }

  return (
    <div className={`invalid-drop-overlay ${isAnimating ? 'animating' : ''} ${className}`}>
      <div className="invalid-drop-message">
        <span className="invalid-drop-icon">⚠️</span>
        <span className="invalid-drop-text">{message}</span>
      </div>
    </div>
  )
}

/**
 * Hook for handling invalid drop behavior
 */
export interface UseInvalidDropOptions {
  /** Callback when block should return to original position */
  onReturnToOriginal?: (blockId: string, parentId: string, index: number) => void
  /** Callback when block should be deleted */
  onDelete?: (blockId: string) => void
  /** Whether to delete on invalid drop (default: return to original) */
  deleteOnInvalidDrop?: boolean
}

export interface UseInvalidDropReturn {
  /** Handle an invalid drop */
  handleInvalidDrop: (blockId: string, originalParentId: string, originalIndex: number) => void
  /** Whether currently showing invalid feedback */
  showingInvalidFeedback: boolean
}

/**
 * useInvalidDrop - Hook for handling invalid drop positions
 */
export function useInvalidDrop(options: UseInvalidDropOptions = {}): UseInvalidDropReturn {
  const {
    onReturnToOriginal,
    onDelete,
    deleteOnInvalidDrop = false,
  } = options

  const [showingInvalidFeedback, setShowingInvalidFeedback] = useState(false)

  const handleInvalidDrop = useCallback((
    blockId: string,
    originalParentId: string,
    originalIndex: number
  ) => {
    // Show feedback
    setShowingInvalidFeedback(true)
    setTimeout(() => setShowingInvalidFeedback(false), 500)

    if (deleteOnInvalidDrop) {
      // Delete the block
      onDelete?.(blockId)
    } else {
      // Return to original position
      onReturnToOriginal?.(blockId, originalParentId, originalIndex)
    }
  }, [deleteOnInvalidDrop, onDelete, onReturnToOriginal])

  return {
    handleInvalidDrop,
    showingInvalidFeedback,
  }
}

export default DragPreview
