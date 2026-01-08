/**
 * SetBlock Component
 * 赋值积木组件
 * 
 * Provides a compact inline layout for variable assignment.
 * Format: [variable] [operator] [value]
 */

import React, { useCallback } from 'react'
import { Block } from '../types'
import { BaseBlock } from './BaseBlock'
import './Block.css'

/**
 * Props for SetBlock component
 */
export interface SetBlockProps {
  /** The block data */
  block: Block
  /** Whether the block is selected */
  selected?: boolean
  /** Whether the block has validation errors */
  hasError?: boolean
  /** Error message to display on hover */
  errorMessage?: string
  /** Callback when block is clicked */
  onClick?: (blockId: string) => void
  /** Callback when block is double-clicked */
  onDoubleClick?: (blockId: string) => void
  /** Callback when block is deleted */
  onDelete?: (blockId: string) => void
  /** Callback when drag starts */
  onDragStart?: (blockId: string, event: React.DragEvent) => void
  /** Callback when drag ends */
  onDragEnd?: (event: React.DragEvent) => void
  /** Whether the block is draggable */
  draggable?: boolean
  /** Callback when a slot value changes */
  onSlotChange?: (blockId: string, slotName: string, value: unknown) => void
  /** Validation errors for slots */
  slotErrors?: Record<string, string>
  /** Depth level for nested blocks */
  depth?: number
}

/**
 * Get slot value from block
 */
function getSlotValue(block: Block, slotName: string): unknown {
  const slot = block.slots.find(s => s.name === slotName)
  return slot?.value
}

/**
 * SetBlock - Variable assignment block component
 * 
 * Displays a compact inline layout: [variable] [=] [value]
 */
export const SetBlock: React.FC<SetBlockProps> = ({
  block,
  selected = false,
  hasError = false,
  errorMessage,
  onClick,
  onDoubleClick,
  onDelete,
  onDragStart,
  onDragEnd,
  draggable = true,
  onSlotChange,
  slotErrors = {},
  depth = 0,
}) => {
  const variable = getSlotValue(block, 'variable') as string || ''
  const operator = getSlotValue(block, 'operator') as string || '='
  const value = getSlotValue(block, 'value') as string || ''

  /**
   * Handle slot value change
   */
  const handleSlotChange = useCallback((slotName: string, newValue: unknown) => {
    onSlotChange?.(block.id, slotName, newValue)
  }, [block.id, onSlotChange])

  // Check for errors
  const hasSlotErrors = Object.keys(slotErrors).length > 0
  const blockHasError = hasError || hasSlotErrors

  return (
    <BaseBlock
      block={block}
      selected={selected}
      hasError={blockHasError}
      errorMessage={errorMessage}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDelete={onDelete}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      draggable={draggable}
      depth={depth}
      className="set-block"
    >
      <div className="set-block-content">
        <input
          type="text"
          className={`set-block-variable ${slotErrors['variable'] ? 'has-error' : ''}`}
          value={variable}
          onChange={(e) => handleSlotChange('variable', e.target.value)}
          placeholder="变量名"
          title={slotErrors['variable']}
        />
        <select
          className="set-block-operator"
          value={operator}
          onChange={(e) => handleSlotChange('operator', e.target.value)}
        >
          <option value="=">=</option>
          <option value="+=">+=</option>
          <option value="-=">-=</option>
          <option value="*=">*=</option>
          <option value="/=">/=</option>
        </select>
        <input
          type="text"
          className={`set-block-value ${slotErrors['value'] ? 'has-error' : ''}`}
          value={value}
          onChange={(e) => handleSlotChange('value', e.target.value)}
          placeholder="值"
          title={slotErrors['value']}
        />
      </div>
    </BaseBlock>
  )
}

export default SetBlock
