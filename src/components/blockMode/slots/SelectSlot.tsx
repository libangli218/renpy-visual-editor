/**
 * SelectSlot Component
 * 下拉选择槽组件
 * 
 * Provides dropdown selection with optional custom value support.
 * 
 * Requirements: 4.2
 */

import React, { useCallback, useState, useMemo } from 'react'
import { SlotOption } from '../types'
import './Slots.css'

/**
 * Props for SelectSlot component
 */
export interface SelectSlotProps {
  /** Slot name for identification */
  name: string
  /** Display label */
  label?: string
  /** Current value */
  value: string | null
  /** Available options */
  options: SlotOption[]
  /** Whether the slot is required */
  required?: boolean
  /** Placeholder text for empty selection */
  placeholder?: string
  /** Whether to allow custom values not in options */
  allowCustom?: boolean
  /** Custom value input placeholder */
  customPlaceholder?: string
  /** Whether the slot is disabled */
  disabled?: boolean
  /** Error message to display */
  error?: string
  /** Callback when value changes */
  onChange?: (name: string, value: string | null) => void
  /** Callback when selection loses focus */
  onBlur?: (name: string, value: string | null) => void
  /** Additional class name */
  className?: string
  /** Whether to show icons in options */
  showIcons?: boolean
}

/** Special value for custom option */
const CUSTOM_OPTION_VALUE = '__custom__'

/**
 * SelectSlot - Dropdown selection slot component
 * 
 * Implements Requirements:
 * - 4.2: Dropdown option list with custom option support
 */
export const SelectSlot: React.FC<SelectSlotProps> = ({
  name,
  label,
  value,
  options,
  required = false,
  placeholder = '请选择...',
  allowCustom = false,
  customPlaceholder = '输入自定义值...',
  disabled = false,
  error,
  onChange,
  onBlur,
  className = '',
  showIcons = true,
}) => {
  // Track if custom input is active
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customValue, setCustomValue] = useState('')

  /**
   * Check if current value is a custom value (not in options)
   */
  const isCustomValue = useMemo(() => {
    if (!value || !allowCustom) return false
    return !options.some(opt => opt.value === value)
  }, [value, options, allowCustom])

  /**
   * Get the display value for the select
   */
  const selectValue = useMemo(() => {
    if (isCustomMode || isCustomValue) {
      return CUSTOM_OPTION_VALUE
    }
    return value || ''
  }, [value, isCustomMode, isCustomValue])

  /**
   * Handle select change
   */
  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value

    if (newValue === CUSTOM_OPTION_VALUE) {
      setIsCustomMode(true)
      setCustomValue(value || '')
    } else if (newValue === '') {
      setIsCustomMode(false)
      setCustomValue('')
      onChange?.(name, null)
    } else {
      setIsCustomMode(false)
      setCustomValue('')
      onChange?.(name, newValue)
    }
  }, [name, value, onChange])

  /**
   * Handle custom input change
   */
  const handleCustomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setCustomValue(newValue)
    onChange?.(name, newValue || null)
  }, [name, onChange])

  /**
   * Handle blur event
   */
  const handleBlur = useCallback(() => {
    if (isCustomMode && !customValue) {
      setIsCustomMode(false)
    }
    onBlur?.(name, value)
  }, [name, value, isCustomMode, customValue, onBlur])

  /**
   * Cancel custom mode
   */
  const handleCancelCustom = useCallback(() => {
    setIsCustomMode(false)
    setCustomValue('')
    onChange?.(name, null)
  }, [name, onChange])

  // Build class names
  const slotClasses = [
    'slot',
    'select-slot',
    required && 'required',
    error && 'has-error',
    disabled && 'disabled',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={slotClasses}>
      {label && (
        <label className={`slot-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}

      <div className="select-slot-wrapper">
        <select
          className={`slot-input slot-select ${error ? 'has-error' : ''}`}
          value={selectValue}
          onChange={handleSelectChange}
          onBlur={handleBlur}
          disabled={disabled}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        >
          {/* Empty/placeholder option */}
          <option value="">{placeholder}</option>

          {/* Regular options */}
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {showIcons && option.icon ? `${option.icon} ${option.label}` : option.label}
            </option>
          ))}

          {/* Custom option */}
          {allowCustom && (
            <option value={CUSTOM_OPTION_VALUE}>
              ✏️ 自定义...
            </option>
          )}
        </select>

        {/* Custom value input */}
        {(isCustomMode || isCustomValue) && allowCustom && (
          <div className="select-slot-custom-input">
            <div className="resource-slot-input-row">
              <input
                type="text"
                className={`slot-input slot-text-input ${error ? 'has-error' : ''}`}
                value={isCustomValue ? (value || '') : customValue}
                onChange={handleCustomChange}
                onBlur={handleBlur}
                placeholder={customPlaceholder}
                disabled={disabled}
                autoFocus
              />
              <button
                type="button"
                className="resource-slot-browse-btn"
                onClick={handleCancelCustom}
                title="取消自定义"
                disabled={disabled}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <span id={`${name}-error`} className="slot-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export default SelectSlot
