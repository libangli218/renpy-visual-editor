/**
 * LabelSlot Component
 * Label 选择槽组件
 * 
 * Provides Label selection for jump/call targets.
 * Shows warning when target Label doesn't exist.
 * 
 * Requirements: 5.5, 5.6, 10.2
 */

import React, { useCallback, useMemo } from 'react'
import './Slots.css'

/**
 * Label definition
 */
export interface LabelDefinition {
  /** Label name */
  name: string
  /** Display name (optional, defaults to name) */
  displayName?: string
  /** File where label is defined */
  file?: string
  /** Whether this is the current label being edited */
  isCurrent?: boolean
}

/**
 * Props for LabelSlot component
 */
export interface LabelSlotProps {
  /** Slot name for identification */
  name: string
  /** Display label */
  label?: string
  /** Current value (label name) */
  value: string | null
  /** Available labels */
  labels: LabelDefinition[]
  /** Whether the slot is required */
  required?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Whether the slot is disabled */
  disabled?: boolean
  /** Error message to display */
  error?: string
  /** Current label being edited (to exclude from list or mark) */
  currentLabel?: string
  /** Whether to show current label in the list */
  showCurrentLabel?: boolean
  /** Callback when value changes */
  onChange?: (name: string, value: string | null) => void
  /** Callback when selection loses focus */
  onBlur?: (name: string, value: string | null) => void
  /** Callback when "go to label" is clicked */
  onNavigate?: (labelName: string) => void
  /** Additional class name */
  className?: string
}

/**
 * LabelSlot - Label selection slot component
 * 
 * Implements Requirements:
 * - 5.5: Jump block contains target Label selection slot
 * - 5.6: Call block contains target Label selection slot
 * - 10.2: Show warning when Jump/Call target Label doesn't exist
 */
export const LabelSlot: React.FC<LabelSlotProps> = ({
  name,
  label,
  value,
  labels,
  required = false,
  placeholder = '选择目标 Label...',
  disabled = false,
  error,
  currentLabel,
  showCurrentLabel = false,
  onChange,
  onBlur,
  onNavigate,
  className = '',
}) => {
  /**
   * Filter labels (optionally excluding current label)
   */
  const filteredLabels = useMemo(() => {
    if (showCurrentLabel || !currentLabel) {
      return labels
    }
    return labels.filter(l => l.name !== currentLabel)
  }, [labels, currentLabel, showCurrentLabel])

  /**
   * Check if target label exists
   */
  const targetExists = useMemo(() => {
    if (!value) return true
    return labels.some(l => l.name === value)
  }, [value, labels])

  /**
   * Get current label definition
   */
  const currentLabelDef = useMemo(() => {
    if (!value) return null
    return labels.find(l => l.name === value)
  }, [value, labels])

  /**
   * Handle select change
   */
  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || null
    onChange?.(name, newValue)
  }, [name, onChange])

  /**
   * Handle blur event
   */
  const handleBlur = useCallback(() => {
    onBlur?.(name, value)
  }, [name, value, onBlur])

  /**
   * Handle navigate to label
   */
  const handleNavigate = useCallback(() => {
    if (value && targetExists && onNavigate) {
      onNavigate(value)
    }
  }, [value, targetExists, onNavigate])

  // Build class names
  const slotClasses = [
    'slot',
    'label-slot',
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

      <div className="label-slot-wrapper">
        <div className="resource-slot-input-row">
          <select
            className={`slot-input slot-select label-slot-select ${error || !targetExists ? 'has-error' : ''}`}
            value={value || ''}
            onChange={handleSelectChange}
            onBlur={handleBlur}
            disabled={disabled}
            aria-required={required}
            aria-invalid={!!error || !targetExists}
            aria-describedby={error ? `${name}-error` : undefined}
          >
            <option value="">{placeholder}</option>
            
            {/* Group labels by file if file info is available */}
            {filteredLabels.some(l => l.file) ? (
              <>
                {/* Group by file */}
                {Object.entries(
                  filteredLabels.reduce((acc, label) => {
                    const file = label.file || '其他'
                    if (!acc[file]) acc[file] = []
                    acc[file].push(label)
                    return acc
                  }, {} as Record<string, LabelDefinition[]>)
                ).map(([file, fileLabels]) => (
                  <optgroup key={file} label={file}>
                    {fileLabels.map(labelDef => (
                      <option
                        key={labelDef.name}
                        value={labelDef.name}
                        disabled={labelDef.isCurrent}
                      >
                        {labelDef.displayName || labelDef.name}
                        {labelDef.isCurrent ? ' (当前)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </>
            ) : (
              /* Simple list without grouping */
              filteredLabels.map(labelDef => (
                <option
                  key={labelDef.name}
                  value={labelDef.name}
                  disabled={labelDef.isCurrent}
                >
                  {labelDef.displayName || labelDef.name}
                  {labelDef.isCurrent ? ' (当前)' : ''}
                </option>
              ))
            )}

            {/* Show current value if not in labels list */}
            {value && !labels.some(l => l.name === value) && (
              <option value={value} className="missing-label">
                {value} (不存在)
              </option>
            )}
          </select>

          {/* Navigate button */}
          {onNavigate && value && targetExists && (
            <button
              type="button"
              className="resource-slot-browse-btn"
              onClick={handleNavigate}
              disabled={disabled}
              title={`跳转到 ${value}`}
            >
              ↗️
            </button>
          )}
        </div>

        {/* Warning for non-existent label */}
        {value && !targetExists && (
          <div className="label-slot-warning">
            <span className="label-slot-warning-icon">⚠️</span>
            <span>目标 Label "{value}" 不存在</span>
          </div>
        )}

        {/* Show file info for selected label */}
        {currentLabelDef?.file && targetExists && (
          <span className="slot-helper">
            📄 {currentLabelDef.file}
          </span>
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

export default LabelSlot
