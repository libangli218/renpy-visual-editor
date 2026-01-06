/**
 * FreeCanvas Component
 * 自由画布组件
 * 
 * Core canvas component that handles pan, zoom, and event distribution.
 * Uses CSS transform for performance (no reflow, only repaint).
 * 
 * Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 5.4, 7.1, 7.4
 */

import React, { useCallback, useRef, useEffect, useMemo } from 'react'
import { 
  CanvasTransform, 
  Point,
  LabelBounds,
  SnapGuides as SnapGuidesType,
  MIN_SCALE, 
  MAX_SCALE,
  useCanvasLayoutStore 
} from '../../store/canvasLayoutStore'
import { screenToCanvas, zoomAtPoint, getBoundingBox, calculateFitTransform } from '../../store/canvasUtils'
import { SnapGuides } from './SnapGuides'
import './FreeCanvas.css'

/**
 * Zoom step multiplier for wheel zoom
 */
const ZOOM_STEP = 0.1

/**
 * Props for FreeCanvas component
 */
export interface FreeCanvasProps {
  /** Child elements (LabelCards) */
  children: React.ReactNode
  /** Canvas transform state */
  transform: CanvasTransform
  /** Transform state change callback */
  onTransformChange: (transform: CanvasTransform) => void
  /** Whether currently panning */
  isPanning: boolean
  /** Set panning state */
  setIsPanning: (panning: boolean) => void
  /** Selection box callback */
  onSelectionBox?: (rect: { x: number; y: number; width: number; height: number }) => void
  /** Double click on canvas callback */
  onDoubleClickCanvas?: (position: Point) => void
  /** Label bounds for fit-all calculation */
  labelBounds?: LabelBounds[]
  /** Custom class name */
  className?: string
  /** Current snap guides to display */
  snapGuides?: SnapGuidesType
  /** Whether snapping is disabled */
  snapDisabled?: boolean
  /** Callback when snap disabled state changes (Alt key) */
  onSnapDisabledChange?: (disabled: boolean) => void
}

/**
 * FreeCanvas - Core canvas component with pan and zoom
 * 
 * Implements Requirements:
 * - 1.1: Display all LabelCards on infinite canvas
 * - 1.4: Support arbitrary canvas size (infinite canvas concept)
 * - 2.1: Middle mouse button pan
 * - 2.2: Space + left mouse button pan
 * - 2.3: All LabelCards move together maintaining relative positions
 * - 2.4: Home key returns to origin
 * - 3.1: Mouse wheel zoom centered on cursor
 * - 3.2: All LabelCards scale together
 * - 3.3: Zoom range limited to 10%-400%
 * - 3.4: Reset zoom button (handled externally)
 * - 3.5: Ctrl+0 resets zoom to 100%
 * - 5.4: F key fits all labels in view
 * - 7.1: Display snap guide alignment lines
 * - 7.4: Alt key disables snapping
 */
export const FreeCanvas: React.FC<FreeCanvasProps> = ({
  children,
  transform,
  onTransformChange,
  isPanning,
  setIsPanning,
  onSelectionBox,
  onDoubleClickCanvas,
  labelBounds = [],
  className = '',
  snapGuides = { horizontal: [], vertical: [] },
  snapDisabled = false,
  onSnapDisabledChange,
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 })
  const isSpacePressedRef = useRef(false)
  const isMiddleMouseRef = useRef(false)

  // Store actions
  const { setIsSpacePressed } = useCanvasLayoutStore()

  /**
   * Handle mouse wheel for zooming
   * Zoom centered on mouse position
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    // Calculate mouse position relative to container
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate new scale
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, transform.scale + delta))

    // Apply zoom at mouse position
    const newTransform = zoomAtPoint(transform, newScale, mouseX, mouseY)
    onTransformChange(newTransform)
  }, [transform, onTransformChange])

  /**
   * Handle mouse down for panning
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button (button 1) or Space + Left click (button 0)
    if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) {
      e.preventDefault()
      setIsPanning(true)
      if (e.button === 1) {
        isMiddleMouseRef.current = true
      }
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    }
  }, [setIsPanning])

  /**
   * Handle mouse move for panning
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return

    const deltaX = e.clientX - lastMousePosRef.current.x
    const deltaY = e.clientY - lastMousePosRef.current.y

    onTransformChange({
      ...transform,
      offsetX: transform.offsetX + deltaX,
      offsetY: transform.offsetY + deltaY,
    })

    lastMousePosRef.current = { x: e.clientX, y: e.clientY }
  }, [isPanning, transform, onTransformChange])

  /**
   * Handle mouse up to stop panning
   */
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      isMiddleMouseRef.current = false
    }
    if (isPanning) {
      setIsPanning(false)
    }
  }, [isPanning, setIsPanning])

  /**
   * Handle mouse leave to stop panning
   */
  const handleMouseLeave = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      isMiddleMouseRef.current = false
    }
  }, [isPanning, setIsPanning])

  /**
   * Handle double click on canvas
   */
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!onDoubleClickCanvas) return
    
    // Only trigger if clicking on the canvas itself, not on children
    if (e.target !== containerRef.current && e.target !== containerRef.current?.querySelector('.free-canvas-viewport')) {
      return
    }

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    // Convert screen position to canvas position
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const canvasPos = screenToCanvas(screenX, screenY, transform)
    
    onDoubleClickCanvas(canvasPos)
  }, [transform, onDoubleClickCanvas])

  /**
   * Handle keyboard events
   * Includes Alt key for disabling snap
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space key for pan mode
      if (e.code === 'Space' && !e.repeat) {
        isSpacePressedRef.current = true
        setIsSpacePressed(true)
      }

      // Alt key - disable snapping
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        onSnapDisabledChange?.(true)
      }

      // Home key - return to origin
      if (e.code === 'Home') {
        e.preventDefault()
        onTransformChange({
          offsetX: 0,
          offsetY: 0,
          scale: transform.scale,
        })
      }

      // Ctrl+0 - reset zoom to 100%
      if (e.code === 'Digit0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          // Zoom to 100% centered on viewport center
          const centerX = rect.width / 2
          const centerY = rect.height / 2
          const newTransform = zoomAtPoint(transform, 1.0, centerX, centerY)
          onTransformChange(newTransform)
        }
      }

      // F key - fit all labels in view
      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't trigger if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return
        }
        e.preventDefault()
        handleFitAll()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false
        setIsSpacePressed(false)
        // Stop panning if it was space-initiated
        if (isPanning && !isMiddleMouseRef.current) {
          setIsPanning(false)
        }
      }

      // Alt key released - re-enable snapping
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        onSnapDisabledChange?.(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [transform, onTransformChange, isPanning, setIsPanning, setIsSpacePressed, labelBounds, onSnapDisabledChange])

  /**
   * Fit all labels in view
   */
  const handleFitAll = useCallback(() => {
    if (labelBounds.length === 0) {
      // No labels, reset to default
      onTransformChange({
        offsetX: 0,
        offsetY: 0,
        scale: 1.0,
      })
      return
    }

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    // Calculate bounding box of all labels
    const bounds = getBoundingBox(labelBounds)
    if (!bounds) return

    // Calculate transform to fit content
    const newTransform = calculateFitTransform(bounds, rect.width, rect.height, 50)
    onTransformChange(newTransform)
  }, [labelBounds, onTransformChange])

  // Build viewport transform style
  const viewportStyle = useMemo(() => ({
    transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
    transformOrigin: '0 0',
  }), [transform])

  // Build cursor style based on state
  const cursorStyle = useMemo(() => {
    if (isPanning) return 'grabbing'
    if (isSpacePressedRef.current) return 'grab'
    return 'default'
  }, [isPanning])

  // Build class names
  const containerClasses = useMemo(() => [
    'free-canvas',
    isPanning && 'panning',
    className,
  ].filter(Boolean).join(' '), [isPanning, className])

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{ cursor: cursorStyle }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
    >
      {/* Viewport - applies transform */}
      <div 
        className="free-canvas-viewport"
        style={viewportStyle}
      >
        {children}
      </div>

      {/* Snap alignment guides */}
      <SnapGuides
        horizontalLines={snapGuides.horizontal}
        verticalLines={snapGuides.vertical}
        transform={transform}
        visible={!snapDisabled}
      />

      {/* Grid background (optional visual aid) */}
      <div className="free-canvas-grid" />
    </div>
  )
}

// Display name for debugging
FreeCanvas.displayName = 'FreeCanvas'

export default FreeCanvas
