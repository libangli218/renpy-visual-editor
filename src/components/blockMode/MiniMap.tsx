/**
 * MiniMap Component
 * 小地图导航组件
 * 
 * Displays a miniature overview of the canvas with all labels
 * and the current viewport position. Supports click-to-navigate
 * and drag-to-pan interactions.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React, { useCallback, useRef, useMemo, useState } from 'react'
import { LabelBounds, Rect, Point } from '../../store/canvasLayoutStore'
import { getBoundingBox } from '../../store/canvasUtils'
import './MiniMap.css'

/**
 * Default minimap dimensions
 */
const DEFAULT_WIDTH = 200
const DEFAULT_HEIGHT = 150
const PADDING = 10

/**
 * Props for MiniMap component
 */
export interface MiniMapProps {
  /** All label positions and sizes */
  labels: LabelBounds[]
  /** Current viewport bounds in canvas coordinates */
  viewport: Rect
  /** Navigation callback - called when user clicks or drags on minimap */
  onNavigate: (position: Point) => void
  /** Minimap size */
  size?: { width: number; height: number }
  /** Whether the minimap is visible */
  visible?: boolean
  /** Custom class name */
  className?: string
}

/**
 * MiniMap - Canvas overview and navigation component
 * 
 * Implements Requirements:
 * - 6.1: Display MiniMap in bottom-right corner
 * - 6.2: Show all LabelCard thumbnail positions
 * - 6.3: Show current viewport range rectangle
 * - 6.4: Click on MiniMap to navigate to position
 * - 6.5: Drag viewport box to pan canvas in real-time
 */
export const MiniMap: React.FC<MiniMapProps> = ({
  labels,
  viewport,
  onNavigate,
  size = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
  visible = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)


  /**
   * Calculate the content bounds (all labels + viewport)
   * This determines what area the minimap needs to show
   */
  const contentBounds = useMemo(() => {
    // Include viewport in bounds calculation
    const allRects: Rect[] = [...labels]
    if (viewport.width > 0 && viewport.height > 0) {
      allRects.push(viewport)
    }
    
    const totalBounds = getBoundingBox(allRects)
    
    if (!totalBounds) {
      // No content, use default bounds
      return {
        x: 0,
        y: 0,
        width: 1000,
        height: 800,
      }
    }
    
    // Add some padding to the bounds
    const paddingAmount = 100
    return {
      x: totalBounds.x - paddingAmount,
      y: totalBounds.y - paddingAmount,
      width: totalBounds.width + paddingAmount * 2,
      height: totalBounds.height + paddingAmount * 2,
    }
  }, [labels, viewport])

  /**
   * Calculate the scale factor to fit content in minimap
   */
  const scale = useMemo(() => {
    const availableWidth = size.width - PADDING * 2
    const availableHeight = size.height - PADDING * 2
    
    const scaleX = availableWidth / contentBounds.width
    const scaleY = availableHeight / contentBounds.height
    
    return Math.min(scaleX, scaleY)
  }, [size, contentBounds])

  /**
   * Convert canvas coordinates to minimap coordinates
   */
  const canvasToMinimap = useCallback((canvasX: number, canvasY: number): Point => {
    return {
      x: (canvasX - contentBounds.x) * scale + PADDING,
      y: (canvasY - contentBounds.y) * scale + PADDING,
    }
  }, [contentBounds, scale])

  /**
   * Convert minimap coordinates to canvas coordinates
   */
  const minimapToCanvas = useCallback((minimapX: number, minimapY: number): Point => {
    return {
      x: (minimapX - PADDING) / scale + contentBounds.x,
      y: (minimapY - PADDING) / scale + contentBounds.y,
    }
  }, [contentBounds, scale])

  /**
   * Handle click on minimap to navigate
   */
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const minimapX = e.clientX - rect.left
    const minimapY = e.clientY - rect.top
    
    // Convert to canvas coordinates
    const canvasPos = minimapToCanvas(minimapX, minimapY)
    
    // Navigate to center the viewport on this position
    onNavigate(canvasPos)
  }, [minimapToCanvas, onNavigate, isDragging])

  /**
   * Handle mouse down on viewport box for dragging
   */
  const handleViewportMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      
      const minimapX = moveEvent.clientX - rect.left
      const minimapY = moveEvent.clientY - rect.top
      
      // Convert to canvas coordinates
      const canvasPos = minimapToCanvas(minimapX, minimapY)
      
      // Navigate to center the viewport on this position
      onNavigate(canvasPos)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [minimapToCanvas, onNavigate])


  /**
   * Calculate viewport rectangle in minimap coordinates
   */
  const viewportRect = useMemo(() => {
    const topLeft = canvasToMinimap(viewport.x, viewport.y)
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: viewport.width * scale,
      height: viewport.height * scale,
    }
  }, [viewport, canvasToMinimap, scale])

  /**
   * Render label rectangles
   */
  const labelRects = useMemo(() => {
    return labels.map((label) => {
      const pos = canvasToMinimap(label.x, label.y)
      return {
        name: label.name,
        x: pos.x,
        y: pos.y,
        width: Math.max(label.width * scale, 4), // Minimum 4px for visibility
        height: Math.max(label.height * scale, 3), // Minimum 3px for visibility
      }
    })
  }, [labels, canvasToMinimap, scale])

  if (!visible) {
    return null
  }

  const containerClasses = [
    'minimap',
    isDragging && 'dragging',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{
        width: size.width,
        height: size.height,
      }}
      onClick={handleClick}
    >
      {/* Background */}
      <div className="minimap-background" />
      
      {/* Label rectangles */}
      <div className="minimap-labels">
        {labelRects.map((rect) => (
          <div
            key={rect.name}
            className="minimap-label"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
            title={rect.name}
          />
        ))}
      </div>
      
      {/* Viewport rectangle */}
      <div
        className="minimap-viewport"
        style={{
          left: viewportRect.x,
          top: viewportRect.y,
          width: Math.max(viewportRect.width, 10),
          height: Math.max(viewportRect.height, 10),
        }}
        onMouseDown={handleViewportMouseDown}
      />
    </div>
  )
}

// Display name for debugging
MiniMap.displayName = 'MiniMap'

export default MiniMap
