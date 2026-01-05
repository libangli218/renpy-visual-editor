/**
 * SnapIndicator Component
 * 吸附指示器组件
 * 
 * Displays a visual indicator showing where a dragged block will be placed.
 * Shows a preview line at valid drop positions and highlights valid drop areas.
 * 
 * Requirements: 7.1
 * - Show snap preview indicator when dragging near valid snap points
 * - Highlight valid placement areas
 */

import React from 'react'
import { useDropTarget, useIsDragging } from './DragDropContext'
import './SnapIndicator.css'

/**
 * Props for SnapIndicator component
 */
export interface SnapIndicatorProps {
  /** Container element ref for positioning */
  containerRef?: React.RefObject<HTMLElement>
  /** Whether to show the indicator */
  visible?: boolean
  /** Custom Y position (overrides dropTarget.indicatorY) */
  y?: number
  /** Whether the current position is valid */
  isValid?: boolean
  /** Additional class name */
  className?: string
  /** Indicator color for valid positions */
  validColor?: string
  /** Indicator color for invalid positions */
  invalidColor?: string
}

/**
 * SnapIndicator - Visual indicator for block drop positions
 * 
 * Implements Requirements:
 * - 7.1: Show snap preview indicator when dragging near valid snap points
 */
export const SnapIndicator: React.FC<SnapIndicatorProps> = ({
  containerRef,
  visible: visibleProp,
  y: yProp,
  isValid: isValidProp,
  className = '',
  validColor = '#2196F3',
  invalidColor = '#f44336',
}) => {
  const isDragging = useIsDragging()
  const dropTarget = useDropTarget()

  // Determine visibility
  const visible = visibleProp ?? (isDragging && dropTarget !== null)
  
  // Determine Y position
  const y = yProp ?? dropTarget?.indicatorY ?? 0
  
  // Determine validity
  const isValid = isValidProp ?? dropTarget?.isValid ?? false

  // Calculate position relative to container
  const getRelativeY = (): number => {
    if (!containerRef?.current) return y
    const containerRect = containerRef.current.getBoundingClientRect()
    return y - containerRect.top
  }

  if (!visible) {
    return null
  }

  const relativeY = getRelativeY()
  const indicatorColor = isValid ? validColor : invalidColor

  return (
    <div
      className={`snap-indicator ${isValid ? 'valid' : 'invalid'} ${className}`}
      style={{
        '--indicator-y': `${relativeY}px`,
        '--indicator-color': indicatorColor,
      } as React.CSSProperties}
      aria-hidden="true"
    >
      {/* Main indicator line */}
      <div className="snap-indicator-line" />
      
      {/* Left dot */}
      <div className="snap-indicator-dot snap-indicator-dot-left" />
      
      {/* Right dot */}
      <div className="snap-indicator-dot snap-indicator-dot-right" />
      
      {/* Glow effect for valid positions */}
      {isValid && <div className="snap-indicator-glow" />}
    </div>
  )
}

/**
 * Props for DropZoneHighlight component
 */
export interface DropZoneHighlightProps {
  /** Whether the drop zone is active */
  active?: boolean
  /** Whether the current position is valid */
  isValid?: boolean
  /** Additional class name */
  className?: string
}

/**
 * DropZoneHighlight - Highlights valid drop areas
 * 
 * Used to show the entire container as a valid drop target
 */
export const DropZoneHighlight: React.FC<DropZoneHighlightProps> = ({
  active = false,
  isValid = true,
  className = '',
}) => {
  const isDragging = useIsDragging()
  
  if (!isDragging || !active) {
    return null
  }

  return (
    <div
      className={`drop-zone-highlight ${isValid ? 'valid' : 'invalid'} ${className}`}
      aria-hidden="true"
    />
  )
}

export default SnapIndicator
