/**
 * Selection Utilities
 * 选择工具函数
 * 
 * Utility functions for multi-select operations including
 * box selection and collision detection.
 * 
 * Requirements: 8.1, 8.2
 */

import { Point, Rect, LabelBounds, CanvasTransform } from './canvasLayoutStore'
import { screenToCanvas } from './canvasUtils'

/**
 * Check if two rectangles intersect
 * Used for box selection collision detection
 */
export function rectsIntersect(rect1: Rect, rect2: Rect): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  )
}

/**
 * Check if a rectangle is completely inside another rectangle
 */
export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

/**
 * Convert screen selection box to canvas coordinates
 */
export function screenSelectionToCanvas(
  startPoint: Point,
  endPoint: Point,
  transform: CanvasTransform,
  containerRect: DOMRect
): Rect {
  // Convert screen points to canvas coordinates
  const canvasStart = screenToCanvas(
    startPoint.x - containerRect.left,
    startPoint.y - containerRect.top,
    transform
  )
  const canvasEnd = screenToCanvas(
    endPoint.x - containerRect.left,
    endPoint.y - containerRect.top,
    transform
  )
  
  // Normalize to get proper rect (handle negative dimensions)
  const x = Math.min(canvasStart.x, canvasEnd.x)
  const y = Math.min(canvasStart.y, canvasEnd.y)
  const width = Math.abs(canvasEnd.x - canvasStart.x)
  const height = Math.abs(canvasEnd.y - canvasStart.y)
  
  return { x, y, width, height }
}

/**
 * Find all labels that intersect with the selection box
 * 
 * Requirements: 8.1, 8.2
 * 
 * @param selectionRect - Selection rectangle in canvas coordinates
 * @param labelBounds - Array of label bounds
 * @returns Array of label names that intersect with selection
 */
export function getLabelsInSelection(
  selectionRect: Rect,
  labelBounds: LabelBounds[]
): string[] {
  const selectedLabels: string[] = []
  
  for (const label of labelBounds) {
    const labelRect: Rect = {
      x: label.x,
      y: label.y,
      width: label.width,
      height: label.height,
    }
    
    // Check if label intersects with selection box
    if (rectsIntersect(selectionRect, labelRect)) {
      selectedLabels.push(label.name)
    }
  }
  
  return selectedLabels
}

/**
 * Calculate the bounding box that contains all selected labels
 */
export function getSelectionBoundingBox(
  selectedLabels: string[],
  labelBounds: LabelBounds[]
): Rect | null {
  const selected = labelBounds.filter(lb => selectedLabels.includes(lb.name))
  
  if (selected.length === 0) {
    return null
  }
  
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  
  for (const label of selected) {
    minX = Math.min(minX, label.x)
    minY = Math.min(minY, label.y)
    maxX = Math.max(maxX, label.x + label.width)
    maxY = Math.max(maxY, label.y + label.height)
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Calculate relative positions of selected labels from a reference point
 * Used for multi-drag to maintain relative positions
 * 
 * Requirements: 8.4
 */
export function calculateRelativePositions(
  selectedLabels: string[],
  labelPositions: Map<string, Point>,
  referencePoint: Point
): Map<string, Point> {
  const relativePositions = new Map<string, Point>()
  
  for (const labelName of selectedLabels) {
    const position = labelPositions.get(labelName)
    if (position) {
      relativePositions.set(labelName, {
        x: position.x - referencePoint.x,
        y: position.y - referencePoint.y,
      })
    }
  }
  
  return relativePositions
}

/**
 * Apply relative positions to calculate new absolute positions
 * Used for multi-drag to move all selected labels together
 * 
 * Requirements: 8.4
 */
export function applyRelativePositions(
  relativePositions: Map<string, Point>,
  newReferencePoint: Point
): Map<string, Point> {
  const newPositions = new Map<string, Point>()
  
  for (const [labelName, relativePos] of relativePositions) {
    newPositions.set(labelName, {
      x: newReferencePoint.x + relativePos.x,
      y: newReferencePoint.y + relativePos.y,
    })
  }
  
  return newPositions
}
