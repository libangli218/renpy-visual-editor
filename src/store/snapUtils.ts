/**
 * Snap Utilities
 * 吸附对齐计算工具函数
 * 
 * Provides functions for calculating snap positions and alignment guides
 * during drag operations.
 * 
 * Requirements: 7.2, 7.3
 */

import { Point, Rect, SnapGuides } from './canvasLayoutStore'

/**
 * Snap threshold in pixels
 * When a dragging element is within this distance of an alignment line,
 * it will snap to that line.
 */
export const SNAP_THRESHOLD = 8

/**
 * Result of snap position calculation
 */
export interface SnapResult {
  /** The snapped position (may be same as input if no snap) */
  position: Point
  /** Guide lines to display */
  guides: SnapGuides
  /** Whether any snapping occurred */
  snapped: boolean
}

/**
 * Alignment edges for a rectangle
 */
interface RectEdges {
  left: number
  right: number
  top: number
  bottom: number
  centerX: number
  centerY: number
}

/**
 * Get all alignment edges for a rectangle
 */
function getRectEdges(rect: Rect): RectEdges {
  return {
    left: rect.x,
    right: rect.x + rect.width,
    top: rect.y,
    bottom: rect.y + rect.height,
    centerX: rect.x + rect.width / 2,
    centerY: rect.y + rect.height / 2,
  }
}

/**
 * Calculate snap position for a dragging rectangle
 * 
 * Checks alignment against other rectangles and returns the snapped position
 * along with guide lines to display.
 * 
 * Supports:
 * - Edge alignment (left, right, top, bottom)
 * - Center alignment (horizontal and vertical center)
 * 
 * @param draggingRect - The rectangle being dragged
 * @param otherRects - Other rectangles to align against
 * @param snapDisabled - Whether snapping is disabled (Alt key)
 * @returns Snap result with position and guides
 * 
 * Requirements: 7.2, 7.3
 */
export function calculateSnapPosition(
  draggingRect: Rect,
  otherRects: Rect[],
  snapDisabled: boolean = false
): SnapResult {
  // If snapping is disabled, return original position with no guides
  if (snapDisabled) {
    return {
      position: { x: draggingRect.x, y: draggingRect.y },
      guides: { horizontal: [], vertical: [] },
      snapped: false,
    }
  }

  const draggingEdges = getRectEdges(draggingRect)
  
  // Track best snap for X and Y independently
  let bestSnapX: number | null = null
  let bestSnapDistX = SNAP_THRESHOLD + 1
  let bestSnapY: number | null = null
  let bestSnapDistY = SNAP_THRESHOLD + 1
  
  // Track guide lines
  const horizontalGuides: number[] = []
  const verticalGuides: number[] = []

  for (const rect of otherRects) {
    const edges = getRectEdges(rect)
    
    // Check vertical alignments (X axis)
    // Left edge to left edge
    const leftToLeft = Math.abs(draggingEdges.left - edges.left)
    if (leftToLeft < bestSnapDistX && leftToLeft <= SNAP_THRESHOLD) {
      bestSnapDistX = leftToLeft
      bestSnapX = edges.left
    }
    
    // Right edge to right edge
    const rightToRight = Math.abs(draggingEdges.right - edges.right)
    if (rightToRight < bestSnapDistX && rightToRight <= SNAP_THRESHOLD) {
      bestSnapDistX = rightToRight
      bestSnapX = edges.right - draggingRect.width
    }
    
    // Left edge to right edge
    const leftToRight = Math.abs(draggingEdges.left - edges.right)
    if (leftToRight < bestSnapDistX && leftToRight <= SNAP_THRESHOLD) {
      bestSnapDistX = leftToRight
      bestSnapX = edges.right
    }
    
    // Right edge to left edge
    const rightToLeft = Math.abs(draggingEdges.right - edges.left)
    if (rightToLeft < bestSnapDistX && rightToLeft <= SNAP_THRESHOLD) {
      bestSnapDistX = rightToLeft
      bestSnapX = edges.left - draggingRect.width
    }
    
    // Center X alignment
    const centerXDist = Math.abs(draggingEdges.centerX - edges.centerX)
    if (centerXDist < bestSnapDistX && centerXDist <= SNAP_THRESHOLD) {
      bestSnapDistX = centerXDist
      bestSnapX = edges.centerX - draggingRect.width / 2
    }
    
    // Check horizontal alignments (Y axis)
    // Top edge to top edge
    const topToTop = Math.abs(draggingEdges.top - edges.top)
    if (topToTop < bestSnapDistY && topToTop <= SNAP_THRESHOLD) {
      bestSnapDistY = topToTop
      bestSnapY = edges.top
    }
    
    // Bottom edge to bottom edge
    const bottomToBottom = Math.abs(draggingEdges.bottom - edges.bottom)
    if (bottomToBottom < bestSnapDistY && bottomToBottom <= SNAP_THRESHOLD) {
      bestSnapDistY = bottomToBottom
      bestSnapY = edges.bottom - draggingRect.height
    }
    
    // Top edge to bottom edge
    const topToBottom = Math.abs(draggingEdges.top - edges.bottom)
    if (topToBottom < bestSnapDistY && topToBottom <= SNAP_THRESHOLD) {
      bestSnapDistY = topToBottom
      bestSnapY = edges.bottom
    }
    
    // Bottom edge to top edge
    const bottomToTop = Math.abs(draggingEdges.bottom - edges.top)
    if (bottomToTop < bestSnapDistY && bottomToTop <= SNAP_THRESHOLD) {
      bestSnapDistY = bottomToTop
      bestSnapY = edges.top - draggingRect.height
    }
    
    // Center Y alignment
    const centerYDist = Math.abs(draggingEdges.centerY - edges.centerY)
    if (centerYDist < bestSnapDistY && centerYDist <= SNAP_THRESHOLD) {
      bestSnapDistY = centerYDist
      bestSnapY = edges.centerY - draggingRect.height / 2
    }
  }

  // Calculate final position
  const finalX = bestSnapX !== null ? bestSnapX : draggingRect.x
  const finalY = bestSnapY !== null ? bestSnapY : draggingRect.y
  
  // Collect guide lines for the snapped position
  if (bestSnapX !== null) {
    const snappedEdges = getRectEdges({
      x: finalX,
      y: finalY,
      width: draggingRect.width,
      height: draggingRect.height,
    })
    
    // Find which edges are aligned and add guide lines
    for (const rect of otherRects) {
      const edges = getRectEdges(rect)
      
      // Check which vertical line we snapped to
      if (Math.abs(snappedEdges.left - edges.left) < 1) {
        verticalGuides.push(edges.left)
      }
      if (Math.abs(snappedEdges.right - edges.right) < 1) {
        verticalGuides.push(edges.right)
      }
      if (Math.abs(snappedEdges.left - edges.right) < 1) {
        verticalGuides.push(edges.right)
      }
      if (Math.abs(snappedEdges.right - edges.left) < 1) {
        verticalGuides.push(edges.left)
      }
      if (Math.abs(snappedEdges.centerX - edges.centerX) < 1) {
        verticalGuides.push(edges.centerX)
      }
    }
  }
  
  if (bestSnapY !== null) {
    const snappedEdges = getRectEdges({
      x: finalX,
      y: finalY,
      width: draggingRect.width,
      height: draggingRect.height,
    })
    
    // Find which edges are aligned and add guide lines
    for (const rect of otherRects) {
      const edges = getRectEdges(rect)
      
      // Check which horizontal line we snapped to
      if (Math.abs(snappedEdges.top - edges.top) < 1) {
        horizontalGuides.push(edges.top)
      }
      if (Math.abs(snappedEdges.bottom - edges.bottom) < 1) {
        horizontalGuides.push(edges.bottom)
      }
      if (Math.abs(snappedEdges.top - edges.bottom) < 1) {
        horizontalGuides.push(edges.bottom)
      }
      if (Math.abs(snappedEdges.bottom - edges.top) < 1) {
        horizontalGuides.push(edges.top)
      }
      if (Math.abs(snappedEdges.centerY - edges.centerY) < 1) {
        horizontalGuides.push(edges.centerY)
      }
    }
  }

  // Remove duplicate guide lines
  const uniqueHorizontal = [...new Set(horizontalGuides)]
  const uniqueVertical = [...new Set(verticalGuides)]

  return {
    position: { x: finalX, y: finalY },
    guides: {
      horizontal: uniqueHorizontal,
      vertical: uniqueVertical,
    },
    snapped: bestSnapX !== null || bestSnapY !== null,
  }
}

/**
 * Check if a value is within snap threshold of a target
 * 
 * @param value - Current value
 * @param target - Target value to snap to
 * @param threshold - Snap threshold (default: SNAP_THRESHOLD)
 * @returns true if within threshold
 */
export function isWithinSnapThreshold(
  value: number,
  target: number,
  threshold: number = SNAP_THRESHOLD
): boolean {
  return Math.abs(value - target) <= threshold
}

/**
 * Get all potential snap targets from a set of rectangles
 * 
 * @param rects - Rectangles to get snap targets from
 * @returns Object with horizontal and vertical snap targets
 */
export function getSnapTargets(rects: Rect[]): { horizontal: number[]; vertical: number[] } {
  const horizontal: number[] = []
  const vertical: number[] = []
  
  for (const rect of rects) {
    const edges = getRectEdges(rect)
    
    // Vertical targets (X positions)
    vertical.push(edges.left, edges.right, edges.centerX)
    
    // Horizontal targets (Y positions)
    horizontal.push(edges.top, edges.bottom, edges.centerY)
  }
  
  // Remove duplicates and sort
  return {
    horizontal: [...new Set(horizontal)].sort((a, b) => a - b),
    vertical: [...new Set(vertical)].sort((a, b) => a - b),
  }
}
