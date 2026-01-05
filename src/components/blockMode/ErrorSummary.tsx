/**
 * ErrorSummary Component
 * 错误汇总组件
 * 
 * Displays error count summary next to the block palette.
 * Groups errors by type and shows total count.
 * 
 * Requirements: 10.5
 */

import React, { useMemo, useCallback } from 'react'
import { ValidationError, ErrorSummary as ErrorSummaryType } from './types'
import { useValidationErrors } from './stores/blockEditorStore'
import './ErrorSummary.css'

/**
 * Error type configuration for display
 */
const ERROR_TYPE_CONFIG: Record<ValidationError['type'], {
  icon: string
  label: string
  color: string
  priority: number
}> = {
  'required': {
    icon: '❗',
    label: '必填字段为空',
    color: '#f44336',
    priority: 1,
  },
  'syntax': {
    icon: '🔴',
    label: '语法错误',
    color: '#f44336',
    priority: 2,
  },
  'invalid-target': {
    icon: '⚠️',
    label: '目标不存在',
    color: '#ffc107',
    priority: 3,
  },
  'missing-resource': {
    icon: '📁',
    label: '资源缺失',
    color: '#ff9800',
    priority: 4,
  },
}

/**
 * Props for ErrorSummary component
 */
export interface ErrorSummaryProps {
  /** Validation errors (if not using store) */
  errors?: ValidationError[]
  /** Whether to show detailed breakdown */
  showDetails?: boolean
  /** Whether the summary is expanded */
  expanded?: boolean
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void
  /** Callback when an error type is clicked */
  onErrorTypeClick?: (type: ValidationError['type']) => void
  /** Callback when an error is clicked */
  onErrorClick?: (error: ValidationError) => void
  /** Custom class name */
  className?: string
  /** Position of the summary */
  position?: 'top' | 'bottom' | 'inline'
}

/**
 * ErrorSummary - Displays error count summary
 * 
 * Implements Requirement 10.5:
 * - Display error count summary next to block palette
 * - Group errors by type
 */
export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  errors: propErrors,
  showDetails = true,
  expanded: controlledExpanded,
  onExpandedChange,
  onErrorTypeClick,
  onErrorClick,
  className = '',
  position = 'top',
}) => {
  // Use prop errors or store errors
  const storeErrors = useValidationErrors()
  const errors = propErrors ?? storeErrors

  // Internal expanded state
  const [internalExpanded, setInternalExpanded] = React.useState(false)
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded

  /**
   * Calculate error summary
   */
  const summary = useMemo((): ErrorSummaryType => {
    const byType: Record<ValidationError['type'], number> = {
      'required': 0,
      'invalid-target': 0,
      'missing-resource': 0,
      'syntax': 0,
    }

    for (const error of errors) {
      byType[error.type]++
    }

    return {
      total: errors.length,
      byType,
    }
  }, [errors])

  /**
   * Get sorted error types (by priority)
   */
  const sortedErrorTypes = useMemo(() => {
    return (Object.keys(summary.byType) as ValidationError['type'][])
      .filter(type => summary.byType[type] > 0)
      .sort((a, b) => ERROR_TYPE_CONFIG[a].priority - ERROR_TYPE_CONFIG[b].priority)
  }, [summary.byType])

  /**
   * Toggle expanded state
   */
  const handleToggleExpanded = useCallback(() => {
    const newExpanded = !expanded
    if (controlledExpanded === undefined) {
      setInternalExpanded(newExpanded)
    }
    onExpandedChange?.(newExpanded)
  }, [expanded, controlledExpanded, onExpandedChange])

  /**
   * Handle error type click
   */
  const handleErrorTypeClick = useCallback((type: ValidationError['type']) => {
    onErrorTypeClick?.(type)
  }, [onErrorTypeClick])

  /**
   * Handle individual error click
   */
  const handleErrorClick = useCallback((error: ValidationError) => {
    onErrorClick?.(error)
  }, [onErrorClick])

  // Don't render if no errors
  if (errors.length === 0) {
    return (
      <div className={`error-summary error-summary-${position} no-errors ${className}`}>
        <div className="error-summary-badge success">
          <span className="badge-icon">✓</span>
          <span className="badge-text">无错误</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`error-summary error-summary-${position} has-errors ${className}`}>
      {/* Summary Badge */}
      <button
        className="error-summary-badge error"
        onClick={handleToggleExpanded}
        aria-expanded={expanded}
        aria-label={`${summary.total} 个验证错误，点击${expanded ? '收起' : '展开'}详情`}
      >
        <span className="badge-icon">⚠️</span>
        <span className="badge-count">{summary.total}</span>
        <span className="badge-text">个错误</span>
        {showDetails && (
          <span className={`badge-expand-icon ${expanded ? 'expanded' : ''}`}>
            ▼
          </span>
        )}
      </button>

      {/* Error Type Breakdown */}
      {showDetails && expanded && (
        <div className="error-summary-details">
          <div className="error-type-list">
            {sortedErrorTypes.map(type => {
              const config = ERROR_TYPE_CONFIG[type]
              const count = summary.byType[type]
              const typeErrors = errors.filter(e => e.type === type)

              return (
                <div
                  key={type}
                  className="error-type-group"
                  style={{ '--error-color': config.color } as React.CSSProperties}
                >
                  <button
                    className="error-type-header"
                    onClick={() => handleErrorTypeClick(type)}
                    aria-label={`${config.label}: ${count} 个`}
                  >
                    <span className="error-type-icon">{config.icon}</span>
                    <span className="error-type-label">{config.label}</span>
                    <span className="error-type-count">{count}</span>
                  </button>

                  {/* Individual errors */}
                  <ul className="error-type-items">
                    {typeErrors.slice(0, 5).map((error, index) => (
                      <li key={`${error.blockId}-${error.slotName || ''}-${index}`}>
                        <button
                          className="error-item-button"
                          onClick={() => handleErrorClick(error)}
                          title={error.message}
                        >
                          <span className="error-item-message">{error.message}</span>
                          {error.slotName && (
                            <span className="error-item-slot">{error.slotName}</span>
                          )}
                        </button>
                      </li>
                    ))}
                    {typeErrors.length > 5 && (
                      <li className="error-type-more">
                        还有 {typeErrors.length - 5} 个...
                      </li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact error summary badge for inline use
 */
export interface ErrorBadgeProps {
  /** Error count */
  count: number
  /** Error type (for color) */
  type?: ValidationError['type'] | 'mixed'
  /** Click handler */
  onClick?: () => void
  /** Custom class name */
  className?: string
}

export const ErrorBadge: React.FC<ErrorBadgeProps> = ({
  count,
  type = 'mixed',
  onClick,
  className = '',
}) => {
  if (count === 0) {
    return null
  }

  const color = type === 'mixed' ? '#f44336' : ERROR_TYPE_CONFIG[type]?.color || '#f44336'

  return (
    <button
      className={`error-badge ${className}`}
      style={{ '--badge-color': color } as React.CSSProperties}
      onClick={onClick}
      aria-label={`${count} 个错误`}
    >
      {count}
    </button>
  )
}

/**
 * Hook to get error summary from store
 */
export function useErrorSummary(): ErrorSummaryType {
  const errors = useValidationErrors()

  return useMemo(() => {
    const byType: Record<ValidationError['type'], number> = {
      'required': 0,
      'invalid-target': 0,
      'missing-resource': 0,
      'syntax': 0,
    }

    for (const error of errors) {
      byType[error.type]++
    }

    return {
      total: errors.length,
      byType,
    }
  }, [errors])
}

/**
 * Hook to get errors for a specific block
 */
export function useBlockErrorSummary(blockId: string): {
  hasErrors: boolean
  count: number
  errors: ValidationError[]
  mostSevereType: ValidationError['type'] | null
} {
  const allErrors = useValidationErrors()

  return useMemo(() => {
    const blockErrors = allErrors.filter(e => e.blockId === blockId)
    
    let mostSevereType: ValidationError['type'] | null = null
    const priority: ValidationError['type'][] = ['required', 'syntax', 'invalid-target', 'missing-resource']
    
    for (const type of priority) {
      if (blockErrors.some(e => e.type === type)) {
        mostSevereType = type
        break
      }
    }

    return {
      hasErrors: blockErrors.length > 0,
      count: blockErrors.length,
      errors: blockErrors,
      mostSevereType,
    }
  }, [allErrors, blockId])
}

export default ErrorSummary
