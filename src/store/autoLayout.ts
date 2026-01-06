/**
 * Auto Layout Algorithm
 * 自动布局算法
 * 
 * Provides automatic layout calculation for Labels when they don't have saved positions.
 * Uses a grid-based layout algorithm to arrange Labels in a visually pleasing manner.
 * 
 * Requirements: 4.3
 */

import { Point } from './canvasLayoutStore'

/**
 * Default card dimensions
 */
export const DEFAULT_CARD_WIDTH = 350
export const DEFAULT_CARD_HEIGHT = 400
export const DEFAULT_GAP = 50

/**
 * Options for auto layout calculation
 */
export interface AutoLayoutOptions {
  /** Card width in pixels */
  cardWidth?: number
  /** Card height in pixels */
  cardHeight?: number
  /** Gap between cards in pixels */
  gap?: number
  /** Starting X position */
  startX?: number
  /** Starting Y position */
  startY?: number
  /** Maximum columns (0 = auto-calculate based on count) */
  maxColumns?: number
}

/**
 * Calculate automatic grid layout positions for labels
 * 
 * Arranges labels in a grid pattern, calculating the optimal number of columns
 * based on the total count of labels.
 * 
 * @param labelNames - Array of label names to layout
 * @param options - Layout configuration options
 * @returns Map of label names to positions
 * 
 * Requirements: 4.3
 */
export function autoLayoutLabels(
  labelNames: string[],
  options: AutoLayoutOptions = {}
): Map<string, Point> {
  const {
    cardWidth = DEFAULT_CARD_WIDTH,
    cardHeight = DEFAULT_CARD_HEIGHT,
    gap = DEFAULT_GAP,
    startX = 0,
    startY = 0,
    maxColumns = 0,
  } = options

  const positions = new Map<string, Point>()

  if (labelNames.length === 0) {
    return positions
  }

  // Calculate optimal number of columns
  // Use square root to create a roughly square grid
  const columns = maxColumns > 0
    ? Math.min(maxColumns, labelNames.length)
    : Math.ceil(Math.sqrt(labelNames.length))

  // Calculate cell dimensions (card + gap)
  const cellWidth = cardWidth + gap
  const cellHeight = cardHeight + gap

  // Assign positions to each label
  labelNames.forEach((name, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)

    positions.set(name, {
      x: startX + col * cellWidth,
      y: startY + row * cellHeight,
    })
  })

  return positions
}

/**
 * Calculate positions for labels that don't have saved positions
 * 
 * Takes existing positions and a list of all labels, returns positions
 * for labels that are missing from the existing positions map.
 * New labels are placed in available grid slots.
 * 
 * @param existingPositions - Map of existing label positions
 * @param allLabelNames - Array of all label names
 * @param options - Layout configuration options
 * @returns Map of positions for labels that were missing
 * 
 * Requirements: 4.3
 */
export function calculateMissingPositions(
  existingPositions: Map<string, Point>,
  allLabelNames: string[],
  options: AutoLayoutOptions = {}
): Map<string, Point> {
  const {
    cardWidth = DEFAULT_CARD_WIDTH,
    cardHeight = DEFAULT_CARD_HEIGHT,
    gap = DEFAULT_GAP,
  } = options

  // Find labels without positions
  const missingLabels = allLabelNames.filter(name => !existingPositions.has(name))

  if (missingLabels.length === 0) {
    return new Map()
  }

  // If no existing positions, use standard auto layout
  if (existingPositions.size === 0) {
    return autoLayoutLabels(missingLabels, options)
  }

  // Find the bounding box of existing positions
  let maxX = -Infinity
  let maxY = -Infinity
  let minX = Infinity
  let minY = Infinity

  for (const pos of existingPositions.values()) {
    maxX = Math.max(maxX, pos.x)
    maxY = Math.max(maxY, pos.y)
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
  }

  // Calculate cell dimensions
  const cellWidth = cardWidth + gap
  const cellHeight = cardHeight + gap

  // Find occupied grid cells
  const occupiedCells = new Set<string>()
  for (const pos of existingPositions.values()) {
    const col = Math.round((pos.x - minX) / cellWidth)
    const row = Math.round((pos.y - minY) / cellHeight)
    occupiedCells.add(`${col},${row}`)
  }

  // Calculate grid dimensions
  const gridCols = Math.ceil((maxX - minX) / cellWidth) + 2
  const gridRows = Math.ceil((maxY - minY) / cellHeight) + 2

  // Find available cells and assign to missing labels
  const newPositions = new Map<string, Point>()
  let labelIndex = 0

  // First, try to fill gaps in existing grid
  for (let row = 0; row < gridRows && labelIndex < missingLabels.length; row++) {
    for (let col = 0; col < gridCols && labelIndex < missingLabels.length; col++) {
      const cellKey = `${col},${row}`
      if (!occupiedCells.has(cellKey)) {
        newPositions.set(missingLabels[labelIndex], {
          x: minX + col * cellWidth,
          y: minY + row * cellHeight,
        })
        occupiedCells.add(cellKey)
        labelIndex++
      }
    }
  }

  // If still have labels to place, add new rows
  let currentRow = gridRows
  while (labelIndex < missingLabels.length) {
    for (let col = 0; col < gridCols && labelIndex < missingLabels.length; col++) {
      newPositions.set(missingLabels[labelIndex], {
        x: minX + col * cellWidth,
        y: minY + currentRow * cellHeight,
      })
      labelIndex++
    }
    currentRow++
  }

  return newPositions
}

/**
 * Merge existing positions with auto-calculated positions for missing labels
 * 
 * @param existingPositions - Map of existing label positions
 * @param allLabelNames - Array of all label names
 * @param options - Layout configuration options
 * @returns Complete map of positions for all labels
 * 
 * Requirements: 4.3
 */
export function mergeWithAutoLayout(
  existingPositions: Map<string, Point>,
  allLabelNames: string[],
  options: AutoLayoutOptions = {}
): Map<string, Point> {
  const result = new Map(existingPositions)
  const missingPositions = calculateMissingPositions(existingPositions, allLabelNames, options)

  for (const [name, position] of missingPositions) {
    result.set(name, position)
  }

  return result
}

/**
 * Calculate center position for a new label
 * 
 * Places a new label at the center of the viewport or at a reasonable
 * position relative to existing labels.
 * 
 * @param existingPositions - Map of existing label positions
 * @param viewportWidth - Viewport width in pixels
 * @param viewportHeight - Viewport height in pixels
 * @param cardWidth - Card width in pixels
 * @param cardHeight - Card height in pixels
 * @returns Position for the new label
 */
export function calculateCenterPosition(
  existingPositions: Map<string, Point>,
  viewportWidth: number = 1200,
  viewportHeight: number = 800,
  cardWidth: number = DEFAULT_CARD_WIDTH,
  cardHeight: number = DEFAULT_CARD_HEIGHT
): Point {
  if (existingPositions.size === 0) {
    // Center in viewport
    return {
      x: (viewportWidth - cardWidth) / 2,
      y: (viewportHeight - cardHeight) / 2,
    }
  }

  // Calculate center of existing labels
  let sumX = 0
  let sumY = 0
  for (const pos of existingPositions.values()) {
    sumX += pos.x
    sumY += pos.y
  }

  const centerX = sumX / existingPositions.size
  const centerY = sumY / existingPositions.size

  // Offset slightly to avoid overlap
  const offset = DEFAULT_GAP
  return {
    x: centerX + offset,
    y: centerY + offset,
  }
}

/**
 * Find a non-overlapping position near a target position
 * 
 * @param targetPosition - Desired position
 * @param existingPositions - Map of existing label positions
 * @param cardWidth - Card width in pixels
 * @param cardHeight - Card height in pixels
 * @param gap - Minimum gap between cards
 * @returns Non-overlapping position
 */
export function findNonOverlappingPosition(
  targetPosition: Point,
  existingPositions: Map<string, Point>,
  cardWidth: number = DEFAULT_CARD_WIDTH,
  cardHeight: number = DEFAULT_CARD_HEIGHT,
  gap: number = DEFAULT_GAP
): Point {
  // Check if target position overlaps with any existing position
  const isOverlapping = (pos: Point): boolean => {
    for (const existingPos of existingPositions.values()) {
      const dx = Math.abs(pos.x - existingPos.x)
      const dy = Math.abs(pos.y - existingPos.y)
      if (dx < cardWidth + gap && dy < cardHeight + gap) {
        return true
      }
    }
    return false
  }

  // If no overlap, return target position
  if (!isOverlapping(targetPosition)) {
    return targetPosition
  }

  // Search in expanding spiral pattern
  const cellWidth = cardWidth + gap
  const cellHeight = cardHeight + gap
  const maxRadius = 10 // Maximum search radius in cells

  for (let radius = 1; radius <= maxRadius; radius++) {
    // Check positions in a square ring at this radius
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        // Only check positions on the ring edge
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
          continue
        }

        const candidate: Point = {
          x: targetPosition.x + dx * cellWidth,
          y: targetPosition.y + dy * cellHeight,
        }

        if (!isOverlapping(candidate)) {
          return candidate
        }
      }
    }
  }

  // Fallback: place below all existing labels
  let maxY = 0
  for (const pos of existingPositions.values()) {
    maxY = Math.max(maxY, pos.y)
  }

  return {
    x: targetPosition.x,
    y: maxY + cardHeight + gap,
  }
}
