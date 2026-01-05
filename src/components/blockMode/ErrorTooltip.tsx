/**
 * ErrorTooltip Component
 * 错误提示组件
 * 
 * Displays error details on hover.
 * Shows validation error messages in a tooltip format.
 * 
 * Requirements: 10.4
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ValidationError } from './types'
import './ErrorTooltip.css'

/**
 * Error type configuration for display
 */
const ERROR_TYPE_CONFIG: Record<ValidationError['type'], {
  icon: string
  label: string
  color: string
}> = {
  'required': {
    icon: '❗',
    label: '必填字段',
    color: '#f44336',
  },
  'invalid-target': {
    icon: '⚠️',
    label: '无效目标',
    color: '#ffc107',
  },
  'missing-resource': {
    icon: '📁',
    label: '资源缺失',
    color: '#ff9800',
  },
  'syntax': {
    icon: '🔴',
    label: '语法错误',
    color: '#f44336',
  },
}

/**
 * Tooltip position type
 */
type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto'

/**
 * Props for ErrorTooltip component
 */
export interface ErrorTooltipProps {
  /** Validation errors to display */
  errors: ValidationError[]
  /** Tooltip position */
  position?: TooltipPosition
  /** Whether the tooltip is visible (controlled mode) */
  visible?: boolean
  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void
  /** Delay before showing tooltip (ms) */
  showDelay?: number
  /** Delay before hiding tooltip (ms) */
  hideDelay?: number
  /** Custom class name */
  className?: string
  /** Children to wrap (trigger element) */
  children: React.ReactNode
}

/**
 * Calculate optimal tooltip position based on available space
 */
function calculatePosition(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  preferredPosition: TooltipPosition
): { position: TooltipPosition; top: number; left: number } {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  }

  const spacing = 8

  // Calculate available space in each direction
  const spaceTop = triggerRect.top
  const spaceBottom = viewport.height - triggerRect.bottom
  const spaceLeft = triggerRect.left
  const spaceRight = viewport.width - triggerRect.right

  let position = preferredPosition

  // Auto-detect best position
  if (position === 'auto') {
    if (spaceBottom >= tooltipRect.height + spacing) {
      position = 'bottom'
    } else if (spaceTop >= tooltipRect.height + spacing) {
      position = 'top'
    } else if (spaceRight >= tooltipRect.width + spacing) {
      position = 'right'
    } else if (spaceLeft >= tooltipRect.width + spacing) {
      position = 'left'
    } else {
      position = 'bottom' // Default fallback
    }
  }

  let top = 0
  let left = 0

  switch (position) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - spacing
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
      break
    case 'bottom':
      top = triggerRect.bottom + spacing
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
      break
    case 'left':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
      left = triggerRect.left - tooltipRect.width - spacing
      break
    case 'right':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
      left = triggerRect.right + spacing
      break
  }

  // Clamp to viewport
  left = Math.max(spacing, Math.min(left, viewport.width - tooltipRect.width - spacing))
  top = Math.max(spacing, Math.min(top, viewport.height - tooltipRect.height - spacing))

  return { position, top, left }
}

/**
 * ErrorTooltip - Displays error details on hover
 * 
 * Implements Requirement 10.4:
 * - Show error details when hovering over error markers
 */
export const ErrorTooltip: React.FC<ErrorTooltipProps> = ({
  errors,
  position: preferredPosition = 'auto',
  visible: controlledVisible,
  onVisibilityChange,
  showDelay = 200,
  hideDelay = 100,
  className = '',
  children,
}) => {
  const [internalVisible, setInternalVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; position: TooltipPosition }>({
    top: 0,
    left: 0,
    position: 'bottom',
  })

  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const showTimeoutRef = useRef<number | null>(null)
  const hideTimeoutRef = useRef<number | null>(null)

  // Use controlled or internal visibility
  const isVisible = controlledVisible !== undefined ? controlledVisible : internalVisible

  /**
   * Update tooltip position
   */
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()

    const newPosition = calculatePosition(triggerRect, tooltipRect, preferredPosition)
    setTooltipPosition(newPosition)
  }, [preferredPosition])

  /**
   * Show tooltip
   */
  const showTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    showTimeoutRef.current = window.setTimeout(() => {
      if (controlledVisible === undefined) {
        setInternalVisible(true)
      }
      onVisibilityChange?.(true)
    }, showDelay)
  }, [showDelay, controlledVisible, onVisibilityChange])

  /**
   * Hide tooltip
   */
  const hideTooltip = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = null
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      if (controlledVisible === undefined) {
        setInternalVisible(false)
      }
      onVisibilityChange?.(false)
    }, hideDelay)
  }, [hideDelay, controlledVisible, onVisibilityChange])

  /**
   * Handle mouse enter on trigger
   */
  const handleMouseEnter = useCallback(() => {
    if (errors.length > 0) {
      showTooltip()
    }
  }, [errors.length, showTooltip])

  /**
   * Handle mouse leave on trigger
   */
  const handleMouseLeave = useCallback(() => {
    hideTooltip()
  }, [hideTooltip])

  /**
   * Handle focus on trigger
   */
  const handleFocus = useCallback(() => {
    if (errors.length > 0) {
      showTooltip()
    }
  }, [errors.length, showTooltip])

  /**
   * Handle blur on trigger
   */
  const handleBlur = useCallback(() => {
    hideTooltip()
  }, [hideTooltip])

  // Update position when visible
  useEffect(() => {
    if (isVisible) {
      // Use requestAnimationFrame to ensure tooltip is rendered before measuring
      requestAnimationFrame(() => {
        updatePosition()
      })
    }
  }, [isVisible, updatePosition])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  // Don't render tooltip if no errors
  if (errors.length === 0) {
    return <>{children}</>
  }

  return (
    <div
      ref={triggerRef}
      className={`error-tooltip-trigger ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`error-tooltip error-tooltip-${tooltipPosition.position}`}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
          role="tooltip"
          aria-live="polite"
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          <div className="error-tooltip-content">
            <div className="error-tooltip-header">
              <span className="error-tooltip-title">
                {errors.length === 1 ? '验证错误' : `${errors.length} 个验证错误`}
              </span>
            </div>
            <ul className="error-tooltip-list">
              {errors.map((error, index) => {
                const config = ERROR_TYPE_CONFIG[error.type]
                return (
                  <li
                    key={`${error.blockId}-${error.slotName || ''}-${index}`}
                    className={`error-tooltip-item error-type-${error.type}`}
                    style={{ '--error-color': config.color } as React.CSSProperties}
                  >
                    <span className="error-item-icon">{config.icon}</span>
                    <div className="error-item-content">
                      <span className="error-item-type">{config.label}</span>
                      <span className="error-item-message">{error.message}</span>
                      {error.slotName && (
                        <span className="error-item-slot">字段: {error.slotName}</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="error-tooltip-arrow" />
        </div>
      )}
    </div>
  )
}

/**
 * Simple inline error tooltip for single errors
 */
export interface InlineErrorTooltipProps {
  /** Error message */
  message: string
  /** Error type */
  type?: ValidationError['type']
  /** Custom class name */
  className?: string
}

export const InlineErrorTooltip: React.FC<InlineErrorTooltipProps> = ({
  message,
  type = 'required',
  className = '',
}) => {
  const config = ERROR_TYPE_CONFIG[type]

  return (
    <div
      className={`inline-error-tooltip ${className}`}
      style={{ '--error-color': config.color } as React.CSSProperties}
      role="alert"
    >
      <span className="inline-error-icon">{config.icon}</span>
      <span className="inline-error-message">{message}</span>
    </div>
  )
}

export default ErrorTooltip
