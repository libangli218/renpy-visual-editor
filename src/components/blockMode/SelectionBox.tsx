/**
 * SelectionBox Component
 * 框选矩形组件
 * 
 * Displays a selection rectangle when user drags on canvas blank area.
 * Used for multi-selecting labels in FreeCanvas.
 * 
 * Requirements: 8.1, 8.2
 */

import React, { useMemo } from 'react'
import { Point } from '../../store/canvasLayoutStore'
import './SelectionBox.css'

/**
 * Props for SelectionBox component
 */
export interface SelectionBoxProps {
  /** Start point of selection (screen coordinates) */
  startPoint: Point | null
  /** Current point of selection (screen coordinates) */
  currentPoint: Point | null
  /** Whether selection is active */
  isSelecting: boolean
}

/**
 * Calculate the normalized rectangle from two points
 * Handles cases where end point is before start point
 */
export function calculateSelectionRect(
  startPoint: Point,
  currentPoint: Point
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(startPoint.x, currentPoint.x)
  const y = Math.min(startPoint.y, currentPoint.y)
  const width = Math.abs(currentPoint.x - startPoint.x)
  const height = Math.abs(currentPoint.y - startPoint.y)
  
  return { x, y, width, height }
}

/**
 * SelectionBox - Visual selection rectangle component
 * 
 * Implements Requirements:
 * - 8.1: Display selection rectangle when dragging on canvas blank area
 * - 8.2: Visual feedback for selection area
 */
export const SelectionBox: React.FC<SelectionBoxProps> = ({
  startPoint,
  currentPoint,
  isSelecting,
}) => {
  // Calculate rectangle dimensions
  const rect = useMemo(() => {
    if (!startPoint || !currentPoint || !isSelecting) {
      return null
    }
    return calculateSelectionRect(startPoint, currentPoint)
  }, [startPoint, currentPoint, isSelecting])

  // Don't render if not selecting or no valid rect
  if (!rect || !isSelecting) {
    return null
  }

  return (
    <div
      className="selection-box"
      style={{
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }}
      data-testid="selection-box"
    />
  )
}

// Display name for debugging
SelectionBox.displayName = 'SelectionBox'

export default SelectionBox
