import { create } from 'zustand'

/**
 * Point represents a 2D coordinate
 */
export interface Point {
  x: number
  y: number
}

/**
 * Rect represents a rectangle with position and dimensions
 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * LabelBounds represents a Label's position and size on the canvas
 */
export interface LabelBounds {
  name: string
  x: number
  y: number
  width: number
  height: number
}

/**
 * CanvasTransform represents the canvas viewport transformation state
 * - offsetX, offsetY: translation offset in screen pixels
 * - scale: zoom level (0.1 = 10%, 4.0 = 400%)
 */
export interface CanvasTransform {
  offsetX: number
  offsetY: number
  scale: number
}

/**
 * SnapGuides represents alignment guide lines
 */
export interface SnapGuides {
  horizontal: number[]
  vertical: number[]
}

/**
 * Zoom constraints
 */
export const MIN_SCALE = 0.1  // 10%
export const MAX_SCALE = 4.0  // 400%
export const DEFAULT_SCALE = 1.0  // 100%

/**
 * CanvasLayoutState defines the complete state for the free canvas layout
 */
export interface CanvasLayoutState {
  /** Canvas viewport transformation */
  transform: CanvasTransform
  
  /** Label positions mapped by label name */
  labelPositions: Map<string, Point>
  
  /** Set of selected label names */
  selectedLabels: Set<string>
  
  /** Whether the canvas is currently being panned */
  isPanning: boolean
  
  /** Whether the space key is pressed (for pan mode) */
  isSpacePressed: boolean
  
  /** Current snap alignment guides */
  snapGuides: SnapGuides
  
  /** Whether snapping is disabled (Alt key pressed) */
  snapDisabled: boolean
}

/**
 * CanvasLayoutActions defines all actions for the canvas layout store
 */
export interface CanvasLayoutActions {
  // Transform actions
  setTransform: (transform: CanvasTransform) => void
  pan: (deltaX: number, deltaY: number) => void
  zoom: (newScale: number, centerX: number, centerY: number) => void
  resetZoom: () => void
  fitAll: (labelBounds: LabelBounds[]) => void
  
  // Label position actions
  setLabelPosition: (labelName: string, position: Point) => void
  setLabelPositions: (positions: Map<string, Point>) => void
  moveSelectedLabels: (deltaX: number, deltaY: number) => void
  
  // Selection actions
  selectLabel: (labelName: string, additive: boolean) => void
  deselectLabel: (labelName: string) => void
  selectLabels: (labelNames: string[]) => void
  clearSelection: () => void
  
  // UI state actions
  setIsPanning: (panning: boolean) => void
  setIsSpacePressed: (pressed: boolean) => void
  setSnapGuides: (guides: SnapGuides) => void
  setSnapDisabled: (disabled: boolean) => void
  
  // Reset action
  reset: () => void
}

export type CanvasLayoutStore = CanvasLayoutState & CanvasLayoutActions

/**
 * Initial state for the canvas layout store
 */
const initialState: CanvasLayoutState = {
  transform: {
    offsetX: 0,
    offsetY: 0,
    scale: DEFAULT_SCALE,
  },
  labelPositions: new Map(),
  selectedLabels: new Set(),
  isPanning: false,
  isSpacePressed: false,
  snapGuides: {
    horizontal: [],
    vertical: [],
  },
  snapDisabled: false,
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Canvas Layout Store
 * 
 * Manages the state for the free canvas layout including:
 * - Canvas viewport transformation (pan, zoom)
 * - Label positions
 * - Selection state
 * - Snap guides
 * 
 * Requirements: 1.2, 2.1, 3.1
 */
export const useCanvasLayoutStore = create<CanvasLayoutStore>((set, get) => ({
  ...initialState,
  
  /**
   * Set the complete transform state
   */
  setTransform: (transform) => {
    set({
      transform: {
        ...transform,
        scale: clamp(transform.scale, MIN_SCALE, MAX_SCALE),
      },
    })
  },
  
  /**
   * Pan the canvas by delta amounts
   * Requirements: 2.1, 2.2, 2.3
   */
  pan: (deltaX, deltaY) => {
    const { transform } = get()
    set({
      transform: {
        ...transform,
        offsetX: transform.offsetX + deltaX,
        offsetY: transform.offsetY + deltaY,
      },
    })
  },
  
  /**
   * Zoom the canvas at a specific point (mouse position)
   * The point under the mouse should remain stationary after zoom
   * Requirements: 3.1, 3.2, 3.3
   */
  zoom: (newScale, centerX, centerY) => {
    const { transform } = get()
    const clampedScale = clamp(newScale, MIN_SCALE, MAX_SCALE)
    
    // Calculate the canvas position under the mouse before zoom
    const canvasX = (centerX - transform.offsetX) / transform.scale
    const canvasY = (centerY - transform.offsetY) / transform.scale
    
    // Calculate new offset to keep the same canvas point under the mouse
    const newOffsetX = centerX - canvasX * clampedScale
    const newOffsetY = centerY - canvasY * clampedScale
    
    set({
      transform: {
        offsetX: newOffsetX,
        offsetY: newOffsetY,
        scale: clampedScale,
      },
    })
  },
  
  /**
   * Reset zoom to 100% and center at origin
   * Requirements: 3.4, 3.5
   */
  resetZoom: () => {
    set({
      transform: {
        offsetX: 0,
        offsetY: 0,
        scale: DEFAULT_SCALE,
      },
    })
  },
  
  /**
   * Fit all labels in the viewport
   * Requirements: 5.3, 5.4
   */
  fitAll: (labelBounds) => {
    if (labelBounds.length === 0) {
      // No labels, reset to default
      set({
        transform: {
          offsetX: 0,
          offsetY: 0,
          scale: DEFAULT_SCALE,
        },
      })
      return
    }
    
    // Calculate bounding box of all labels
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    for (const label of labelBounds) {
      minX = Math.min(minX, label.x)
      minY = Math.min(minY, label.y)
      maxX = Math.max(maxX, label.x + label.width)
      maxY = Math.max(maxY, label.y + label.height)
    }
    
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    
    // Assume a viewport size (this should be passed in or obtained from context)
    // For now, use a reasonable default
    const viewportWidth = 1200
    const viewportHeight = 800
    const padding = 50
    
    // Calculate scale to fit content with padding
    const scaleX = (viewportWidth - padding * 2) / contentWidth
    const scaleY = (viewportHeight - padding * 2) / contentHeight
    const scale = clamp(Math.min(scaleX, scaleY), MIN_SCALE, MAX_SCALE)
    
    // Calculate offset to center content
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const offsetX = viewportWidth / 2 - centerX * scale
    const offsetY = viewportHeight / 2 - centerY * scale
    
    set({
      transform: {
        offsetX,
        offsetY,
        scale,
      },
    })
  },
  
  /**
   * Set position for a single label
   * Requirements: 1.2, 4.1
   */
  setLabelPosition: (labelName, position) => {
    const { labelPositions } = get()
    const newPositions = new Map(labelPositions)
    newPositions.set(labelName, position)
    set({ labelPositions: newPositions })
  },
  
  /**
   * Set positions for multiple labels at once
   * Requirements: 4.2, 4.3
   */
  setLabelPositions: (positions) => {
    set({ labelPositions: new Map(positions) })
  },
  
  /**
   * Move all selected labels by delta amounts
   * Requirements: 8.4
   */
  moveSelectedLabels: (deltaX, deltaY) => {
    const { selectedLabels, labelPositions } = get()
    if (selectedLabels.size === 0) return
    
    const newPositions = new Map(labelPositions)
    for (const labelName of selectedLabels) {
      const currentPos = labelPositions.get(labelName)
      if (currentPos) {
        newPositions.set(labelName, {
          x: currentPos.x + deltaX,
          y: currentPos.y + deltaY,
        })
      }
    }
    set({ labelPositions: newPositions })
  },
  
  /**
   * Select a label, optionally adding to existing selection
   * Requirements: 8.3
   */
  selectLabel: (labelName, additive) => {
    const { selectedLabels } = get()
    const newSelection = additive ? new Set(selectedLabels) : new Set<string>()
    
    if (additive && selectedLabels.has(labelName)) {
      // Toggle off if already selected in additive mode
      newSelection.delete(labelName)
    } else {
      newSelection.add(labelName)
    }
    
    set({ selectedLabels: newSelection })
  },
  
  /**
   * Deselect a specific label
   */
  deselectLabel: (labelName) => {
    const { selectedLabels } = get()
    const newSelection = new Set(selectedLabels)
    newSelection.delete(labelName)
    set({ selectedLabels: newSelection })
  },
  
  /**
   * Select multiple labels (from box selection)
   * Requirements: 8.1, 8.2
   */
  selectLabels: (labelNames) => {
    set({ selectedLabels: new Set(labelNames) })
  },
  
  /**
   * Clear all selections
   * Requirements: 8.5
   */
  clearSelection: () => {
    set({ selectedLabels: new Set() })
  },
  
  /**
   * Set panning state
   */
  setIsPanning: (panning) => {
    set({ isPanning: panning })
  },
  
  /**
   * Set space key pressed state
   */
  setIsSpacePressed: (pressed) => {
    set({ isSpacePressed: pressed })
  },
  
  /**
   * Set snap alignment guides
   * Requirements: 7.1
   */
  setSnapGuides: (guides) => {
    set({ snapGuides: guides })
  },
  
  /**
   * Set snap disabled state (Alt key)
   * Requirements: 7.4
   */
  setSnapDisabled: (disabled) => {
    set({ snapDisabled: disabled })
  },
  
  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      ...initialState,
      labelPositions: new Map(),
      selectedLabels: new Set(),
      snapGuides: { horizontal: [], vertical: [] },
    })
  },
}))

/**
 * Get the current canvas transform
 */
export function getCanvasTransform(): CanvasTransform {
  return useCanvasLayoutStore.getState().transform
}

/**
 * Get the current label positions
 */
export function getLabelPositions(): Map<string, Point> {
  return useCanvasLayoutStore.getState().labelPositions
}

/**
 * Get the current selected labels
 */
export function getSelectedLabels(): Set<string> {
  return useCanvasLayoutStore.getState().selectedLabels
}
