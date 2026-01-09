/**
 * useResourceDrop Hook
 * 资源拖拽放置 Hook
 * 
 * Handles drag-and-drop operations for resource items (backgrounds and sprites)
 * onto block components (SceneBlock and ShowBlock).
 * 
 * Implements Requirements:
 * - 4.4: Scene block accepts dropped background images
 * - 4.5: Show block accepts dropped sprite images
 * - 4.7: Show visual drop indicator when dragging over compatible slot
 * - 4.8: Show "not allowed" cursor when dragging over incompatible slot
 */

import { useState, useCallback, useRef } from 'react'
import {
  ResourceDragData,
  RESOURCE_DRAG_DATA_TYPE,
  deserializeDragData,
} from '../store/resourceStore'

/**
 * Options for useResourceDrop hook
 */
export interface UseResourceDropOptions {
  /** Accepted resource type ('background' for SceneBlock, 'sprite' for ShowBlock) */
  acceptType: 'background' | 'sprite'
  /** Callback when a valid resource is dropped */
  onDrop: (imageTag: string, imagePath: string) => void
  /** Whether the drop zone is enabled */
  enabled?: boolean
}

/**
 * Return type for useResourceDrop hook
 */
export interface UseResourceDropReturn {
  /** Whether a dragged item is currently over the drop zone */
  isOver: boolean
  /** Whether the dragged item can be dropped (type matches) */
  canDrop: boolean
  /** The drag data if currently dragging over */
  dragData: ResourceDragData | null
  /** Event handlers to attach to the drop zone element */
  dropHandlers: {
    onDragOver: (e: React.DragEvent) => void
    onDragEnter: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
}

/**
 * Extract resource drag data from a drag event
 */
function extractDragData(event: React.DragEvent): ResourceDragData | null {
  // Check if this is a resource drag
  const types = event.dataTransfer.types
  if (!types.includes(RESOURCE_DRAG_DATA_TYPE)) {
    return null
  }

  // Try to get the data (may not be available during dragover due to security)
  const data = event.dataTransfer.getData(RESOURCE_DRAG_DATA_TYPE)
  if (data) {
    return deserializeDragData(data)
  }

  // During dragover, we can't access the data, but we know it's a resource drag
  // Return a placeholder to indicate a resource is being dragged
  return null
}

/**
 * Check if the drag event contains resource data
 */
function isResourceDrag(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(RESOURCE_DRAG_DATA_TYPE)
}

/**
 * useResourceDrop - Hook for handling resource drag-drop onto blocks
 * 
 * Usage:
 * ```tsx
 * const { isOver, canDrop, dropHandlers } = useResourceDrop({
 *   acceptType: 'background',
 *   onDrop: (imageTag, imagePath) => {
 *     updateBlockProperty('image', imageTag)
 *   }
 * })
 * 
 * return (
 *   <div 
 *     className={`block ${isOver && canDrop ? 'drop-target' : ''}`}
 *     {...dropHandlers}
 *   >
 *     ...
 *   </div>
 * )
 * ```
 */
export function useResourceDrop(options: UseResourceDropOptions): UseResourceDropReturn {
  const { acceptType, onDrop, enabled = true } = options

  const [isOver, setIsOver] = useState(false)
  const [canDrop, setCanDrop] = useState(false)
  const [dragData, setDragData] = useState<ResourceDragData | null>(null)
  
  // Track enter/leave count to handle nested elements
  const enterCountRef = useRef(0)

  /**
   * Handle drag over event
   * Sets the drop effect based on whether the resource type is compatible
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!enabled) return

    // Check if this is a resource drag
    if (!isResourceDrag(event)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    // During dragover, we can't access the actual data due to browser security
    // We'll determine canDrop based on the data we got during dragenter
    // For now, allow the drop and we'll validate on actual drop
    if (canDrop) {
      event.dataTransfer.dropEffect = 'copy'
    } else {
      event.dataTransfer.dropEffect = 'none'
    }
  }, [enabled, canDrop])

  /**
   * Handle drag enter event
   * Determines if the dragged resource type is compatible
   */
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    if (!enabled) return

    // Check if this is a resource drag
    if (!isResourceDrag(event)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    enterCountRef.current++

    // Only process on first enter
    if (enterCountRef.current === 1) {
      setIsOver(true)

      // Try to extract drag data
      const data = extractDragData(event)
      setDragData(data)

      // Determine if we can drop based on type
      // During dragenter, we might be able to access the data
      if (data) {
        const compatible = data.type === acceptType
        setCanDrop(compatible)
      } else {
        // Can't determine type yet, assume compatible and validate on drop
        // This handles the case where data isn't accessible during dragenter
        setCanDrop(true)
      }
    }
  }, [enabled, acceptType])

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (!enabled) return

    event.preventDefault()
    event.stopPropagation()

    enterCountRef.current--

    // Only reset when fully leaving the element (not entering a child)
    if (enterCountRef.current === 0) {
      setIsOver(false)
      setCanDrop(false)
      setDragData(null)
    }
  }, [enabled])

  /**
   * Handle drop event
   * Validates the resource type and calls onDrop if compatible
   */
  const handleDrop = useCallback((event: React.DragEvent) => {
    if (!enabled) return

    event.preventDefault()
    event.stopPropagation()

    // Reset state
    enterCountRef.current = 0
    setIsOver(false)
    setCanDrop(false)
    setDragData(null)

    // Extract the drag data
    const data = extractDragData(event)
    if (!data) {
      // Not a resource drag or couldn't parse data
      return
    }

    // Validate type compatibility
    if (data.type !== acceptType) {
      // Type mismatch - don't accept the drop
      console.warn(`Resource drop rejected: expected ${acceptType}, got ${data.type}`)
      return
    }

    // Call the onDrop callback with the image tag and path
    onDrop(data.imageTag, data.imagePath)
  }, [enabled, acceptType, onDrop])

  return {
    isOver,
    canDrop,
    dragData,
    dropHandlers: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  }
}

export default useResourceDrop
