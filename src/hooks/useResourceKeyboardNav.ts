/**
 * useResourceKeyboardNav Hook
 * 
 * Provides keyboard navigation support for resource lists.
 * Implements arrow key navigation, Enter to open preview, and focus management.
 * 
 * Implements Requirements:
 * - Accessibility: Keyboard navigation for resource lists
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { ResourceDragData } from '../store/resourceStore'

/**
 * Options for useResourceKeyboardNav hook
 */
export interface UseResourceKeyboardNavOptions {
  /** Array of resources to navigate */
  resources: ResourceDragData[]
  /** Callback when a resource is selected via keyboard */
  onSelect?: (resource: ResourceDragData) => void
  /** Callback when Enter is pressed (open preview) */
  onPreview?: (resource: ResourceDragData) => void
  /** Whether keyboard navigation is enabled */
  enabled?: boolean
  /** Container element ref for focus management */
  containerRef?: React.RefObject<HTMLElement>
}

/**
 * Return type for useResourceKeyboardNav hook
 */
export interface UseResourceKeyboardNavReturn {
  /** Currently focused resource index (-1 if none) */
  focusIndex: number
  /** Set the focus index manually */
  setFocusIndex: (index: number) => void
  /** Reset focus to -1 */
  resetFocus: () => void
  /** Check if a resource at index is focused */
  isFocused: (index: number) => boolean
  /** Get the currently focused resource */
  focusedResource: ResourceDragData | null
  /** Keyboard event handler to attach to container */
  handleKeyDown: (event: React.KeyboardEvent) => void
  /** Focus the container element */
  focusContainer: () => void
  /** Props to spread on resource items for focus management */
  getItemProps: (index: number) => {
    tabIndex: number
    'data-focus-index': number
    'aria-selected': boolean
  }
}

/**
 * useResourceKeyboardNav - Hook for keyboard navigation in resource lists
 * 
 * Provides:
 * - Arrow Up/Down: Navigate between resources
 * - Enter: Open preview for focused resource
 * - Home: Jump to first resource
 * - End: Jump to last resource
 * - Escape: Clear focus
 * 
 * Usage:
 * ```tsx
 * const { focusIndex, handleKeyDown, getItemProps } = useResourceKeyboardNav({
 *   resources,
 *   onSelect: (resource) => selectResource(resource),
 *   onPreview: (resource) => openPreview(resource),
 * })
 * 
 * return (
 *   <div onKeyDown={handleKeyDown} tabIndex={0}>
 *     {resources.map((resource, index) => (
 *       <ResourceItem
 *         key={resource.imageTag}
 *         {...getItemProps(index)}
 *         className={focusIndex === index ? 'focused' : ''}
 *       />
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useResourceKeyboardNav(
  options: UseResourceKeyboardNavOptions
): UseResourceKeyboardNavReturn {
  const {
    resources,
    onSelect,
    onPreview,
    enabled = true,
    containerRef,
  } = options

  const [focusIndex, setFocusIndex] = useState(-1)
  const internalContainerRef = useRef<HTMLElement | null>(null)

  // Get the effective container ref
  const getContainer = useCallback(() => {
    return containerRef?.current ?? internalContainerRef.current
  }, [containerRef])

  // Reset focus when resources change
  useEffect(() => {
    // If the focused index is out of bounds, reset it
    if (focusIndex >= resources.length) {
      setFocusIndex(resources.length > 0 ? resources.length - 1 : -1)
    }
  }, [resources.length, focusIndex])

  // Get the currently focused resource
  const focusedResource = focusIndex >= 0 && focusIndex < resources.length
    ? resources[focusIndex]
    : null

  /**
   * Reset focus to -1
   */
  const resetFocus = useCallback(() => {
    setFocusIndex(-1)
  }, [])

  /**
   * Check if a resource at index is focused
   */
  const isFocused = useCallback((index: number) => {
    return focusIndex === index
  }, [focusIndex])

  /**
   * Focus the container element
   */
  const focusContainer = useCallback(() => {
    const container = getContainer()
    if (container) {
      container.focus()
    }
  }, [getContainer])

  /**
   * Scroll the focused item into view
   */
  const scrollIntoView = useCallback((index: number) => {
    const container = getContainer()
    if (!container) return

    const item = container.querySelector(`[data-focus-index="${index}"]`)
    if (item) {
      item.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [getContainer])

  /**
   * Move focus to the next resource
   */
  const moveNext = useCallback(() => {
    if (resources.length === 0) return

    setFocusIndex((prev) => {
      const next = prev < resources.length - 1 ? prev + 1 : prev
      if (next !== prev) {
        scrollIntoView(next)
        if (onSelect && resources[next]) {
          onSelect(resources[next])
        }
      }
      return next
    })
  }, [resources, onSelect, scrollIntoView])

  /**
   * Move focus to the previous resource
   */
  const movePrevious = useCallback(() => {
    if (resources.length === 0) return

    setFocusIndex((prev) => {
      const next = prev > 0 ? prev - 1 : prev === -1 ? 0 : prev
      if (next !== prev) {
        scrollIntoView(next)
        if (onSelect && resources[next]) {
          onSelect(resources[next])
        }
      }
      return next
    })
  }, [resources, onSelect, scrollIntoView])

  /**
   * Move focus to the first resource
   */
  const moveToFirst = useCallback(() => {
    if (resources.length === 0) return

    setFocusIndex(0)
    scrollIntoView(0)
    if (onSelect && resources[0]) {
      onSelect(resources[0])
    }
  }, [resources, onSelect, scrollIntoView])

  /**
   * Move focus to the last resource
   */
  const moveToLast = useCallback(() => {
    if (resources.length === 0) return

    const lastIndex = resources.length - 1
    setFocusIndex(lastIndex)
    scrollIntoView(lastIndex)
    if (onSelect && resources[lastIndex]) {
      onSelect(resources[lastIndex])
    }
  }, [resources, onSelect, scrollIntoView])

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enabled || resources.length === 0) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveNext()
        break

      case 'ArrowUp':
        event.preventDefault()
        movePrevious()
        break

      case 'Home':
        event.preventDefault()
        moveToFirst()
        break

      case 'End':
        event.preventDefault()
        moveToLast()
        break

      case 'Enter':
        event.preventDefault()
        if (focusedResource && onPreview) {
          onPreview(focusedResource)
        }
        break

      case 'Escape':
        event.preventDefault()
        resetFocus()
        break

      default:
        // Don't prevent default for other keys
        break
    }
  }, [
    enabled,
    resources.length,
    moveNext,
    movePrevious,
    moveToFirst,
    moveToLast,
    focusedResource,
    onPreview,
    resetFocus,
  ])

  /**
   * Get props to spread on resource items for focus management
   */
  const getItemProps = useCallback((index: number) => {
    return {
      tabIndex: focusIndex === index ? 0 : -1,
      'data-focus-index': index,
      'aria-selected': focusIndex === index,
    }
  }, [focusIndex])

  return {
    focusIndex,
    setFocusIndex,
    resetFocus,
    isFocused,
    focusedResource,
    handleKeyDown,
    focusContainer,
    getItemProps,
  }
}

export default useResourceKeyboardNav
