/**
 * ValidationOverlay Component
 * 验证覆盖层组件
 * 
 * Displays error markers on blocks based on validation errors.
 * - Required slot empty: Red border
 * - Invalid target: Yellow warning icon
 * - Missing resource: Orange warning icon
 * 
 * Requirements: 10.1, 10.2, 10.3
 */

import React from 'react'
import { ValidationError } from './types'
import './ValidationOverlay.css'

/**
 * Error type to visual style mapping
 */
const ERROR_STYLES: Record<ValidationError['type'], {
  borderColor: string
  iconColor: string
  icon: string
  label: string
}> = {
  'required': {
    borderColor: '#f44336',
    iconColor: '#f44336',
    icon: '❗',
    label: '必填字段为空',
  },
  'invalid-target': {
    borderColor: '#ffc107',
    iconColor: '#ffc107',
    icon: '⚠️',
    label: '目标不存在',
  },
  'missing-resource': {
    borderColor: '#ff9800',
    iconColor: '#ff9800',
    icon: '📁',
    label: '资源缺失',
  },
  'syntax': {
    borderColor: '#f44336',
    iconColor: '#f44336',
    icon: '🔴',
    label: '语法错误',
  },
}

/**
 * Props for ValidationOverlay component
 */
export interface ValidationOverlayProps {
  /** Validation errors for the block */
  errors: ValidationError[]
  /** Whether to show inline error markers */
  showInline?: boolean
  /** Custom class name */
  className?: string
  /** Children to wrap */
  children?: React.ReactNode
}

/**
 * Get the most severe error type from a list of errors
 * Priority: required > syntax > invalid-target > missing-resource
 */
function getMostSevereErrorType(errors: ValidationError[]): ValidationError['type'] | null {
  if (errors.length === 0) return null
  
  const priority: ValidationError['type'][] = ['required', 'syntax', 'invalid-target', 'missing-resource']
  
  for (const type of priority) {
    if (errors.some(e => e.type === type)) {
      return type
    }
  }
  
  return errors[0].type
}

/**
 * ValidationOverlay - Displays validation error markers on blocks
 * 
 * Implements Requirements:
 * - 10.1: Mark required slots that are empty with red border
 * - 10.2: Show yellow warning for invalid jump/call targets
 * - 10.3: Show orange warning for missing resources
 */
export const ValidationOverlay: React.FC<ValidationOverlayProps> = ({
  errors,
  showInline = true,
  className = '',
  children,
}) => {
  if (errors.length === 0) {
    return <>{children}</>
  }

  const mostSevereType = getMostSevereErrorType(errors)
  const style = mostSevereType ? ERROR_STYLES[mostSevereType] : null

  return (
    <div
      className={`validation-overlay ${className} ${errors.length > 0 ? 'has-errors' : ''}`}
      style={{
        '--validation-border-color': style?.borderColor || 'transparent',
        '--validation-icon-color': style?.iconColor || 'inherit',
      } as React.CSSProperties}
      data-error-count={errors.length}
      data-error-type={mostSevereType}
    >
      {children}
      
      {showInline && errors.length > 0 && (
        <div className="validation-error-markers">
          {errors.map((error, index) => (
            <ValidationErrorMarker key={`${error.blockId}-${error.slotName || ''}-${index}`} error={error} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Props for ValidationErrorMarker component
 */
interface ValidationErrorMarkerProps {
  error: ValidationError
}

/**
 * ValidationErrorMarker - Individual error marker
 */
export const ValidationErrorMarker: React.FC<ValidationErrorMarkerProps> = ({ error }) => {
  const style = ERROR_STYLES[error.type]

  return (
    <div
      className={`validation-error-marker error-type-${error.type}`}
      style={{
        '--marker-color': style.iconColor,
      } as React.CSSProperties}
      title={error.message}
      role="alert"
      aria-label={`${style.label}: ${error.message}`}
    >
      <span className="marker-icon">{style.icon}</span>
      {error.slotName && (
        <span className="marker-slot-name">{error.slotName}</span>
      )}
    </div>
  )
}

/**
 * Props for SlotValidationIndicator component
 */
export interface SlotValidationIndicatorProps {
  /** Slot name to check for errors */
  slotName: string
  /** All errors for the block */
  errors: ValidationError[]
  /** Custom class name */
  className?: string
}

/**
 * SlotValidationIndicator - Shows validation state for a specific slot
 * 
 * Use this component to wrap individual slot inputs to show their validation state.
 */
export const SlotValidationIndicator: React.FC<SlotValidationIndicatorProps> = ({
  slotName,
  errors,
  className = '',
}) => {
  const slotErrors = errors.filter(e => e.slotName === slotName)
  
  if (slotErrors.length === 0) {
    return null
  }

  const mostSevereType = getMostSevereErrorType(slotErrors)
  const style = mostSevereType ? ERROR_STYLES[mostSevereType] : null

  return (
    <div
      className={`slot-validation-indicator ${className}`}
      style={{
        '--indicator-color': style?.iconColor || '#f44336',
      } as React.CSSProperties}
    >
      <span className="indicator-icon">{style?.icon || '❗'}</span>
      <span className="indicator-message">{slotErrors[0].message}</span>
    </div>
  )
}

/**
 * Hook to get validation state for a block
 */
export function useBlockValidationState(blockId: string, errors: ValidationError[]) {
  const blockErrors = errors.filter(e => e.blockId === blockId)
  const hasErrors = blockErrors.length > 0
  const mostSevereType = getMostSevereErrorType(blockErrors)
  const style = mostSevereType ? ERROR_STYLES[mostSevereType] : null

  return {
    hasErrors,
    errors: blockErrors,
    errorCount: blockErrors.length,
    mostSevereType,
    borderColor: style?.borderColor || 'transparent',
    iconColor: style?.iconColor || 'inherit',
    icon: style?.icon || '',
    label: style?.label || '',
  }
}

/**
 * Get CSS class names for a block based on its validation errors
 */
export function getValidationClassNames(errors: ValidationError[]): string {
  if (errors.length === 0) return ''

  const classes: string[] = ['has-validation-errors']
  const types = new Set(errors.map(e => e.type))

  if (types.has('required')) classes.push('has-required-error')
  if (types.has('invalid-target')) classes.push('has-target-error')
  if (types.has('missing-resource')) classes.push('has-resource-error')
  if (types.has('syntax')) classes.push('has-syntax-error')

  return classes.join(' ')
}

/**
 * Get inline styles for a block based on its validation errors
 */
export function getValidationStyles(errors: ValidationError[]): React.CSSProperties {
  if (errors.length === 0) return {}

  const mostSevereType = getMostSevereErrorType(errors)
  const style = mostSevereType ? ERROR_STYLES[mostSevereType] : null

  return {
    '--validation-border-color': style?.borderColor || 'transparent',
    '--validation-icon-color': style?.iconColor || 'inherit',
  } as React.CSSProperties
}

export default ValidationOverlay
