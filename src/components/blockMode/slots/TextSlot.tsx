/**
 * TextSlot Component
 * 文本输入槽组件
 * 
 * Provides single-line and multiline text input for block slots.
 * Supports required field marking and validation.
 * 
 * Requirements: 3.4
 */

import React, { useCallback, useRef, useEffect } from 'react'
import './Slots.css'

/**
 * Props for TextSlot component
 */
export interface TextSlotProps {
  /** Slot name for identification */
  name: string
  /** Display label */
  label?: string
  /** Current value */
  value: string
  /** Whether the slot is required */
  required?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Whether to use multiline input */
  multiline?: boolean
  /** Number of rows for multiline (default: 3) */
  rows?: number
  /** Maximum character length */
  maxLength?: number
  /** Whether the slot is disabled */
  disabled?: boolean
  /** Error message to display */
  error?: string
  /** Callback when value changes */
  onChange?: (name: string, value: string) => void
  /** Callback when input loses focus */
  onBlur?: (name: string, value: string) => void
  /** Additional class name */
  className?: string
  /** Auto-focus on mount */
  autoFocus?: boolean
  /** Auto-resize textarea to fit content */
  autoResize?: boolean
}

/**
 * TextSlot - Text input slot component
 * 
 * Implements Requirements:
 * - 3.4: Support multiline text input
 * - Required field marking with asterisk
 */
export const TextSlot: React.FC<TextSlotProps> = ({
  name,
  label,
  value,
  required = false,
  placeholder,
  multiline = false,
  rows = 3,
  maxLength,
  disabled = false,
  error,
  onChange,
  onBlur,
  className = '',
  autoFocus = false,
  autoResize = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Auto-resize textarea to fit content
   */
  useEffect(() => {
    if (autoResize && multiline && textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [value, autoResize, multiline])

  /**
   * Handle value change
   */
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange?.(name, e.target.value)
  }, [name, onChange])

  /**
   * Handle blur event
   */
  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onBlur?.(name, e.target.value)
  }, [name, onBlur])

  // Build class names
  const slotClasses = [
    'slot',
    'text-slot',
    multiline && 'multiline',
    required && 'required',
    error && 'has-error',
    disabled && 'disabled',
    className,
  ].filter(Boolean).join(' ')

  const inputClasses = [
    'slot-input',
    multiline ? 'slot-textarea' : 'slot-text-input',
    error && 'has-error',
  ].filter(Boolean).join(' ')

  return (
    <div className={slotClasses}>
      {label && (
        <label className={`slot-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}
      
      {multiline ? (
        <textarea
          ref={textareaRef}
          className={inputClasses}
          value={value || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          className={inputClasses}
          value={value || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      )}
      
      {error && (
        <span id={`${name}-error`} className="slot-error" role="alert">
          {error}
        </span>
      )}
      
      {maxLength && (
        <span className="slot-char-count">
          {(value || '').length}/{maxLength}
        </span>
      )}
    </div>
  )
}

export default TextSlot
