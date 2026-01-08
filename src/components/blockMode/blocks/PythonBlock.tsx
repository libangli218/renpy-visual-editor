/**
 * PythonBlock Component
 * Python代码积木组件
 * 
 * Provides a code editor for Python code blocks.
 */

import React, { useCallback } from 'react'
import { Block } from '../types'
import { BaseBlock } from './BaseBlock'
import './Block.css'

/**
 * Props for PythonBlock component
 * 模仿 CommentBlock 的 props 定义方式
 */
export interface PythonBlockProps {
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
 * PythonBlock - Python code block component
 * 
 * Displays a code editor for Python code
 */
export const PythonBlock: React.FC<PythonBlockProps> = ({
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
  const code = getSlotValue(block, 'code') as string || ''

  /**
   * Handle slot value change
   */
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSlotChange?.(block.id, 'code', e.target.value)
  }, [block.id, onSlotChange])

  // Check for errors
  const codeError = slotErrors['code']
  const blockHasError = hasError || !!codeError

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
      className="python-block"
    >
      <div className="python-block-content">
        <textarea
          className={`python-code-area ${codeError ? 'has-error' : ''}`}
          value={code}
          onChange={handleCodeChange}
          placeholder="输入 Python 代码..."
          rows={3}
          title={codeError}
          spellCheck={false}
        />
        {codeError && (
          <span className="slot-error-message">{codeError}</span>
        )}
      </div>
    </BaseBlock>
  )
}

export default PythonBlock
