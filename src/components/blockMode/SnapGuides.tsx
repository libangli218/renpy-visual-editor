/**
 * SnapGuides Component
 * 对齐辅助线组件
 * 
 * Renders horizontal and vertical alignment guide lines during drag operations.
 * Uses prominent blue dashed lines for visibility.
 * 
 * Requirements: 7.1
 */

import React, { useMemo } from 'react'
import { CanvasTransform } from '../../store/canvasLayoutStore'
import './SnapGuides.css'

/**
 * Props for SnapGuides component
 */
export interface SnapGuidesProps {
  /** Y coordinates for horizontal guide lines (in canvas space) */
  horizontalLines: number[]
  /** X coordinates for vertical guide lines (in canvas space) */
  verticalLines: number[]
  /** Canvas transform (for correct positioning) */
  transform: CanvasTransform
  /** Whether guides are visible */
  visible?: boolean
}

/**
 * SnapGuides - Renders alignment guide lines
 * 
 * Implements Requirements:
 * - 7.1: Display snap guide alignment lines when dragging Label near other Label edges
 */
export const SnapGuides: React.FC<SnapGuidesProps> = ({
  horizontalLines,
  verticalLines,
  transform,
  visible = true,
}) => {
  // Don't render if not visible or no guides
  if (!visible || (horizontalLines.length === 0 && verticalLines.length === 0)) {
    return null
  }

  // Calculate line positions in screen space
  const screenHorizontalLines = useMemo(() => {
    return horizontalLines.map(y => y * transform.scale + transform.offsetY)
  }, [horizontalLines, transform])

  const screenVerticalLines = useMemo(() => {
    return verticalLines.map(x => x * transform.scale + transform.offsetX)
  }, [verticalLines, transform])

  return (
    <div className="snap-guides">
      {/* Horizontal guide lines */}
      {screenHorizontalLines.map((y, index) => (
        <div
          key={`h-${index}`}
          className="snap-guide snap-guide-horizontal"
          style={{ top: `${y}px` }}
        />
      ))}
      
      {/* Vertical guide lines */}
      {screenVerticalLines.map((x, index) => (
        <div
          key={`v-${index}`}
          className="snap-guide snap-guide-vertical"
          style={{ left: `${x}px` }}
        />
      ))}
    </div>
  )
}

// Display name for debugging
SnapGuides.displayName = 'SnapGuides'

export default SnapGuides
