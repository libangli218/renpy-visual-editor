/**
 * AdvancedPanel Component
 * 高级选项面板组件
 * 
 * Provides a collapsible panel for displaying advanced block properties.
 * Reuses the collapse/expand pattern from CollapsibleBlock.
 * 
 * Requirements: 12.1, 12.2, 12.4, 12.5, 17.1, 17.2, 17.3, 17.4
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { BlockSlot } from '../types'
import { TextSlot } from '../slots/TextSlot'
import { SelectSlot } from '../slots/SelectSlot'
import { TRANSITION_OPTIONS, LAYER_OPTIONS } from '../constants/SlotDefinitions'
import './AdvancedPanel.css'

/**
 * Props for AdvancedPanel component
 */
export interface AdvancedPanelProps {
  /** 高级属性槽列表 (Advanced slot list) */
  slots: BlockSlot[]
  /** 槽位值变更回调 (Slot value change callback) */
  onSlotChange: (slotName: string, value: unknown) => void
  /** 槽位错误信息 (Slot error messages) */
  slotErrors?: Record<string, string>
  /** 是否默认展开 (Default expanded state) */
  defaultExpanded?: boolean
  /** 自定义类名 (Custom class name) */
  className?: string
  /** 面板唯一标识，用于状态持久化 (Panel ID for state persistence) */
  panelId?: string
}

// Storage key prefix for panel state persistence
const PANEL_STATE_KEY_PREFIX = 'advanced-panel-state-'

/**
 * Check if a slot has a non-default value
 */
function hasNonDefaultValue(slot: BlockSlot): boolean {
  const { value, defaultValue } = slot
  
  // If no default value is defined, check if value is truthy
  if (defaultValue === undefined) {
    return value !== null && value !== undefined && value !== ''
  }
  
  // Compare with default value
  return value !== defaultValue
}

/**
 * Get the number of configured (non-default) slots
 */
function getConfiguredCount(slots: BlockSlot[]): number {
  return slots.filter(hasNonDefaultValue).length
}

/**
 * AdvancedPanel - Collapsible panel for advanced block properties
 * 
 * Implements Requirements:
 * - 12.1: Advanced panel collapsed by default
 * - 12.2: Smooth expand/collapse animation
 * - 12.4: Visual indicator when advanced options are configured
 * - 12.5: Preserve expand/collapse state during session
 * - 17.1: Accept list of BlockSlot items to render
 * - 17.2: Consistent expand/collapse UI
 * - 17.3: Emit events when slot values change
 * - 17.4: Display badge when any advanced slot has non-default value
 */
export const AdvancedPanel: React.FC<AdvancedPanelProps> = ({
  slots,
  onSlotChange,
  slotErrors = {},
  defaultExpanded = false,
  className = '',
  panelId,
}) => {
  // Initialize expanded state from session storage or default
  const [isExpanded, setIsExpanded] = useState(() => {
    if (panelId) {
      const stored = sessionStorage.getItem(PANEL_STATE_KEY_PREFIX + panelId)
      if (stored !== null) {
        return stored === 'true'
      }
    }
    return defaultExpanded
  })

  // Calculate configured count for indicator
  const configuredCount = useMemo(() => getConfiguredCount(slots), [slots])
  const hasConfiguredSlots = configuredCount > 0

  // Persist expanded state to session storage
  useEffect(() => {
    if (panelId) {
      sessionStorage.setItem(PANEL_STATE_KEY_PREFIX + panelId, String(isExpanded))
    }
  }, [isExpanded, panelId])

  /**
   * Handle expand/collapse toggle
   */
  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  /**
   * Handle keyboard interaction
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }, [handleToggle])

  /**
   * Handle slot value change
   */
  const handleSlotChange = useCallback((slotName: string, value: unknown) => {
    onSlotChange(slotName, value)
  }, [onSlotChange])

  /**
   * Render a single slot based on its type
   */
  const renderSlot = useCallback((slot: BlockSlot) => {
    const error = slotErrors[slot.name]
    const key = slot.name

    switch (slot.type) {
      case 'text':
      case 'multiline':
        return (
          <TextSlot
            key={key}
            name={slot.name}
            label={slot.placeholder}
            value={String(slot.value ?? '')}
            required={slot.required}
            placeholder={slot.placeholder}
            multiline={slot.type === 'multiline'}
            error={error}
            onChange={handleSlotChange}
          />
        )

      case 'number':
        return (
          <div key={key} className="slot number-slot">
            {slot.placeholder && (
              <label className={`slot-label ${slot.required ? 'required' : ''}`}>
                {slot.placeholder}
              </label>
            )}
            <input
              type="number"
              className={`slot-input slot-number-input ${error ? 'has-error' : ''}`}
              value={slot.value !== null && slot.value !== undefined ? String(slot.value) : ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : parseFloat(e.target.value)
                handleSlotChange(slot.name, val)
              }}
              placeholder={slot.placeholder}
              min={slot.validation?.min}
              max={slot.validation?.max}
              step="any"
              aria-required={slot.required}
              aria-invalid={!!error}
            />
            {error && (
              <span className="slot-error" role="alert">{error}</span>
            )}
          </div>
        )

      case 'select':
        return (
          <SelectSlot
            key={key}
            name={slot.name}
            label={slot.placeholder}
            value={slot.value as string | null}
            options={slot.options ?? []}
            required={slot.required}
            placeholder={slot.placeholder}
            error={error}
            onChange={handleSlotChange}
            allowCustom={false}
          />
        )

      case 'transition':
        return (
          <SelectSlot
            key={key}
            name={slot.name}
            label={slot.placeholder || '过渡效果'}
            value={slot.value as string | null}
            options={slot.options ?? TRANSITION_OPTIONS}
            required={slot.required}
            placeholder={slot.placeholder || '选择过渡效果'}
            error={error}
            onChange={handleSlotChange}
            allowCustom={true}
            customPlaceholder="输入自定义过渡效果..."
          />
        )

      case 'position':
        return (
          <SelectSlot
            key={key}
            name={slot.name}
            label={slot.placeholder || '图层'}
            value={slot.value as string | null}
            options={slot.options ?? LAYER_OPTIONS}
            required={slot.required}
            placeholder={slot.placeholder || '选择图层'}
            error={error}
            onChange={handleSlotChange}
            allowCustom={true}
            customPlaceholder="输入自定义图层..."
          />
        )

      default:
        // Fallback to text input for unknown types
        return (
          <TextSlot
            key={key}
            name={slot.name}
            label={slot.placeholder}
            value={String(slot.value ?? '')}
            required={slot.required}
            placeholder={slot.placeholder}
            error={error}
            onChange={handleSlotChange}
          />
        )
    }
  }, [slotErrors, handleSlotChange])

  // Don't render if no slots
  if (slots.length === 0) {
    return null
  }

  return (
    <div className={`advanced-panel ${isExpanded ? 'expanded' : 'collapsed'} ${className}`}>
      {/* Panel Header */}
      <div
        className="advanced-panel-header"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? '折叠高级选项' : '展开高级选项'}
      >
        <span className={`advanced-panel-chevron ${isExpanded ? '' : 'collapsed'}`}>
          ▼
        </span>
        <span className="advanced-panel-title">高级选项</span>
        
        {/* Configuration indicator badge */}
        {hasConfiguredSlots && !isExpanded && (
          <span className="advanced-panel-badge" title={`${configuredCount} 个高级选项已配置`}>
            {configuredCount}
          </span>
        )}
        
        {/* Configured indicator dot (always visible when configured) */}
        {hasConfiguredSlots && (
          <span className="advanced-panel-indicator" title="已配置高级选项" />
        )}
      </div>

      {/* Panel Content */}
      <div className={`advanced-panel-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="advanced-panel-slots">
          {slots.map(renderSlot)}
        </div>
      </div>
    </div>
  )
}

export default AdvancedPanel
