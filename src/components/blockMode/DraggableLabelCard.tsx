/**
 * DraggableLabelCard Component
 * 可拖动的 Label 卡片组件
 * 
 * Design inspired by Alan Kay's principles:
 * - "Simple things should be simple, complex things should be possible"
 * - Ctrl+click should work anywhere on the card for selection
 * - Clear visual feedback when in selection mode
 * 
 * Extends LabelCard with absolute positioning and drag functionality.
 * Used in FreeCanvas for free-form layout of labels.
 * 
 * Requirements: 1.1, 1.2, 7.1, 7.2, 7.3, 7.4, 8.3, 8.4
 */

import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react'
import { LabelCard, LabelCardProps } from './LabelCard'
import { Point, Rect, SnapGuides } from '../../store/canvasLayoutStore'
import { calculateSnapPosition, SnapResult } from '../../store/snapUtils'
import './DraggableLabelCard.css'

/**
 * Props for DraggableLabelCard component
 */
export interface DraggableLabelCardProps extends Omit<LabelCardProps, 'className'> {
  /** Canvas coordinate position */
  position: Point
  /** Position change callback */
  onPositionChange: (position: Point) => void
  /** Whether the card is selected (for multi-select) */
  isSelected?: boolean
  /** Selection change callback */
  onSelectionChange?: (selected: boolean, additive: boolean) => void
  /** Drag start callback */
  onDragStart?: () => void
  /** Drag end callback */
  onDragEnd?: () => void
  /** Current canvas scale (for calculating drag distance) */
  canvasScale: number
  /** Card width in pixels */
  cardWidth?: number
  /** Card height in pixels (when expanded) */
  cardHeight?: number
  /** Additional class name */
  className?: string
  /** Other label rectangles for snap alignment */
  otherLabelRects?: Rect[]
  /** Callback when snap guides change */
  onSnapGuidesChange?: (guides: SnapGuides) => void
  /** Whether snapping is disabled (Alt key) */
  snapDisabled?: boolean
  /** Multi-drag callback - called when dragging selected labels together */
  onMultiDrag?: (deltaX: number, deltaY: number) => void
  /** Whether this card is part of a multi-selection being dragged */
  isMultiDragging?: boolean
}

/**
 * DraggableLabelCard - Draggable card wrapper for LabelCard
 * 
 * Implements Requirements:
 * - 1.1: Display LabelCard at saved position on canvas
 * - 1.2: Drag LabelCard to new position and save coordinates
 * - 7.1: Display snap guide alignment lines when dragging
 * - 7.2: Auto-snap to alignment position within threshold
 * - 7.3: Support horizontal and vertical alignment
 * - 7.4: Alt key disables snapping
 * - 8.3: Ctrl+click toggles selection (anywhere on card)
 * - 8.4: Drag selected labels together maintaining relative positions
 */
export const DraggableLabelCard: React.FC<DraggableLabelCardProps> = ({
  position,
  onPositionChange,
  isSelected = false,
  onSelectionChange,
  onDragStart,
  onDragEnd,
  canvasScale,
  cardWidth = 350,
  cardHeight = 400,
  className = '',
  otherLabelRects = [],
  onSnapGuidesChange,
  snapDisabled = false,
  onMultiDrag,
  isMultiDragging = false,
  ...labelCardProps
}) => {
  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)
  const dragStartRef = useRef<Point | null>(null)
  const initialPositionRef = useRef<Point | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  /**
   * Track Ctrl key state for visual feedback
   * Alan Kay principle: Clear visual feedback for mode changes
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setIsCtrlPressed(true)
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsCtrlPressed(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  /**
   * Handle Ctrl+click for selection - uses capture phase to intercept before children
   * Alan Kay principle: Simple things should be simple - Ctrl+click anywhere selects
   */
  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    // If Ctrl/Cmd is pressed, handle selection and stop propagation
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      e.stopPropagation()
      onSelectionChange?.(!isSelected, true)
    }
  }, [isSelected, onSelectionChange])

  /**
   * Handle mouse down to start dragging
   * Only start drag on the header area, not on content
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag with left mouse button
    if (e.button !== 0) return

    // If Ctrl is pressed, don't start drag - let clickCapture handle selection
    if (e.ctrlKey || e.metaKey) return

    // Check if clicking on header (for drag) or content (for interaction)
    const target = e.target as HTMLElement
    const isHeader = target.closest('.label-card-header')
    const isButton = target.closest('button')
    
    // Don't start drag if clicking on buttons or not on header
    if (isButton || !isHeader) return

    e.preventDefault()
    e.stopPropagation()

    // Start dragging
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    initialPositionRef.current = { ...position }
    onDragStart?.()

    // Select this card if not already selected
    if (!isSelected) {
      onSelectionChange?.(true, false)
    }
  }, [position, isSelected, onSelectionChange, onDragStart])

  /**
   * Handle mouse move during drag
   * Includes snap alignment calculation and multi-drag support
   * Requirements: 8.4
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !initialPositionRef.current) return

    // Calculate delta in screen coordinates
    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y

    // Convert to canvas coordinates (account for scale)
    const canvasDeltaX = deltaX / canvasScale
    const canvasDeltaY = deltaY / canvasScale

    // If this card is selected and there are multiple selections, use multi-drag
    if (isSelected && onMultiDrag) {
      // Notify parent to move all selected labels
      onMultiDrag(canvasDeltaX, canvasDeltaY)
      return
    }

    // Calculate raw new position for single drag
    const rawPosition: Point = {
      x: initialPositionRef.current.x + canvasDeltaX,
      y: initialPositionRef.current.y + canvasDeltaY,
    }

    // Create dragging rect for snap calculation
    const draggingRect: Rect = {
      x: rawPosition.x,
      y: rawPosition.y,
      width: cardWidth,
      height: labelCardProps.collapsed ? 50 : cardHeight, // Approximate collapsed height
    }

    // Calculate snap position
    const snapResult: SnapResult = calculateSnapPosition(
      draggingRect,
      otherLabelRects,
      snapDisabled
    )

    // Update snap guides
    onSnapGuidesChange?.(snapResult.guides)

    // Use snapped position
    onPositionChange(snapResult.position)
  }, [isDragging, canvasScale, onPositionChange, cardWidth, cardHeight, labelCardProps.collapsed, otherLabelRects, snapDisabled, onSnapGuidesChange, isSelected, onMultiDrag])

  /**
   * Handle mouse up to end dragging
   * Clears snap guides when drag ends
   */
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      dragStartRef.current = null
      initialPositionRef.current = null
      // Clear snap guides when drag ends
      onSnapGuidesChange?.({ horizontal: [], vertical: [] })
      onDragEnd?.()
    }
  }, [isDragging, onDragEnd, onSnapGuidesChange])

  /**
   * Add/remove global mouse event listeners for drag
   */
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  /**
   * Handle card click for selection (non-Ctrl clicks)
   */
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Ctrl+click is handled by clickCapture, skip here
    if (e.ctrlKey || e.metaKey) return
    
    // Prevent click from bubbling to canvas
    e.stopPropagation()
    
    // Regular click - select only this card (handled by mouseDown for header)
  }, [])

  // Build style for absolute positioning
  // Dan Abramov optimization: Use transform instead of left/top for better performance
  // transform doesn't trigger layout, only composite - much faster for animations
  const cardStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: 0,
    top: 0,
    transform: `translate(${position.x}px, ${position.y}px)${isDragging ? ' scale(1.02)' : ''}`,
    width: `${cardWidth}px`,
    // Let height be auto to fit content, only set minHeight when expanded
    minHeight: labelCardProps.collapsed ? 'auto' : undefined,
    // Prevent text selection during drag
    userSelect: isDragging ? 'none' as const : undefined,
    // Enable GPU acceleration for smoother dragging
    willChange: isDragging ? 'transform' : undefined,
  }), [position, cardWidth, labelCardProps.collapsed, isDragging])

  // Build class names
  const wrapperClasses = useMemo(() => [
    'draggable-label-card',
    isDragging && 'dragging',
    isSelected && 'selected',
    isMultiDragging && 'multi-dragging',
    isCtrlPressed && 'ctrl-mode', // Visual feedback for selection mode
    className,
  ].filter(Boolean).join(' '), [isDragging, isSelected, isMultiDragging, isCtrlPressed, className])

  return (
    <div
      ref={cardRef}
      className={wrapperClasses}
      style={cardStyle}
      onClickCapture={handleClickCapture}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <LabelCard
        {...labelCardProps}
        selected={isSelected}
        className="draggable-label-card-inner"
      />
    </div>
  )
}

// Display name for debugging
DraggableLabelCard.displayName = 'DraggableLabelCard'

export default DraggableLabelCard
