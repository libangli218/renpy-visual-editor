/**
 * MenuBlock Component
 * 菜单积木组件
 * 
 * Provides menu container with choice blocks.
 * Menu can contain multiple Choice blocks, each with text and optional condition.
 * 
 * Requirements: 5.1-5.4
 */

import React, { useCallback } from 'react'
import { Block } from '../types'
import { BaseBlock, BaseBlockProps } from './BaseBlock'
import './Block.css'

/**
 * Props for MenuBlock component
 */
export interface MenuBlockProps extends Omit<BaseBlockProps, 'children'> {
  /** Callback when a slot value changes */
  onSlotChange?: (blockId: string, slotName: string, value: unknown) => void
  /** Callback to add a new choice */
  onAddChoice?: (menuBlockId: string) => void
  /** Callback to delete a choice */
  onDeleteChoice?: (choiceBlockId: string) => void
  /** Validation errors for slots */
  slotErrors?: Record<string, string>
  /** Render function for child blocks */
  renderChildBlock?: (block: Block, depth: number) => React.ReactNode
  /** Current depth level */
  depth?: number
}

/**
 * Props for ChoiceBlock component
 */
export interface ChoiceBlockProps extends Omit<BaseBlockProps, 'children'> {
  /** Callback when a slot value changes */
  onSlotChange?: (blockId: string, slotName: string, value: unknown) => void
  /** Callback to delete this choice */
  onDelete?: (choiceBlockId: string) => void
  /** Validation errors for slots */
  slotErrors?: Record<string, string>
  /** Render function for child blocks */
  renderChildBlock?: (block: Block, depth: number) => React.ReactNode
  /** Current depth level */
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
 * MenuBlock - Menu container block component
 * 
 * Implements Requirements:
 * - 5.1: Menu block as container for multiple choice blocks
 * - 5.2: Support adding and deleting choices
 */
export const MenuBlock: React.FC<MenuBlockProps> = ({
  block,
  onSlotChange,
  onAddChoice,
  onDeleteChoice,
  slotErrors = {},
  renderChildBlock,
  depth = 0,
  ...baseProps
}) => {
  const choices = block.children || []
  
  /**
   * Handle add choice button click
   */
  const handleAddChoice = useCallback(() => {
    onAddChoice?.(block.id)
  }, [block.id, onAddChoice])
  
  return (
    <BaseBlock
      {...baseProps}
      block={block}
      className={`menu-block ${baseProps.className || ''}`}
      showCollapseButton={choices.length > 0}
      depth={depth}
    >
      <div className="menu-choices-container">
        {choices.length === 0 ? (
          <div className="block-children-container empty">
            <span className="block-children-placeholder">
              点击下方按钮添加选项
            </span>
          </div>
        ) : (
          choices.map((choice) => (
            <ChoiceBlock
              key={choice.id}
              block={choice}
              onSlotChange={onSlotChange}
              onDelete={onDeleteChoice}
              slotErrors={slotErrors}
              renderChildBlock={renderChildBlock}
              depth={depth + 1}
              onClick={baseProps.onClick}
              onDoubleClick={baseProps.onDoubleClick}
              onDragStart={baseProps.onDragStart}
              onDragEnd={baseProps.onDragEnd}
              onToggleCollapse={baseProps.onToggleCollapse}
              selected={choice.selected}
              hasError={choice.hasError}
              collapsed={choice.collapsed}
            />
          ))
        )}
        
        {/* Add Choice Button */}
        <button
          className="menu-add-choice-btn"
          onClick={handleAddChoice}
          type="button"
        >
          <span>➕</span>
          <span>添加选项</span>
        </button>
      </div>
    </BaseBlock>
  )
}

/**
 * ChoiceBlock - Choice block component within a menu
 * 
 * Implements Requirements:
 * - 5.3: Choice block contains text slot and optional condition
 * - 5.4: Choice block as container for triggered blocks
 */
export const ChoiceBlock: React.FC<ChoiceBlockProps> = ({
  block,
  onSlotChange,
  onDelete,
  slotErrors = {},
  renderChildBlock,
  depth = 0,
  ...baseProps
}) => {
  const text = getSlotValue(block, 'text') as string
  const condition = getSlotValue(block, 'condition') as string | null
  const children = block.children || []
  
  /**
   * Handle text change
   */
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSlotChange?.(block.id, 'text', e.target.value)
  }, [block.id, onSlotChange])
  
  /**
   * Handle condition change
   */
  const handleConditionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSlotChange?.(block.id, 'condition', e.target.value || null)
  }, [block.id, onSlotChange])
  
  /**
   * Handle delete button click
   */
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(block.id)
  }, [block.id, onDelete])
  
  // Custom header content with inline text input
  const headerContent = (
    <>
      <input
        type="text"
        className={`choice-text-input ${slotErrors['text'] ? 'has-error' : ''}`}
        value={text || ''}
        onChange={handleTextChange}
        placeholder="输入选项文本..."
        onClick={(e) => e.stopPropagation()}
        title={slotErrors['text']}
      />
      <button
        className="choice-delete-btn"
        onClick={handleDelete}
        type="button"
        title="删除选项"
      >
        🗑️
      </button>
    </>
  )
  
  return (
    <BaseBlock
      {...baseProps}
      block={block}
      className={`choice-block ${baseProps.className || ''}`}
      headerContent={headerContent}
      showCollapseButton={children.length > 0}
      depth={depth}
    >
      <div className="block-slots">
        {/* Condition Input (optional) */}
        <div className="block-slot">
          <label className="block-slot-label">
            显示条件 (可选)
          </label>
          <input
            type="text"
            className={`block-slot-input ${slotErrors['condition'] ? 'has-error' : ''}`}
            value={condition || ''}
            onChange={handleConditionChange}
            placeholder="例如: points >= 10"
            title={slotErrors['condition']}
          />
        </div>
        
        {/* Children Container */}
        <div className={`choice-children-container ${children.length === 0 ? 'empty' : ''}`}>
          {children.length === 0 ? (
            <div className="block-children-container empty">
              <span className="block-children-placeholder">
                拖拽积木到这里
              </span>
            </div>
          ) : (
            <div className="block-children-container">
              {children.map(child => 
                renderChildBlock ? renderChildBlock(child, depth + 1) : null
              )}
            </div>
          )}
        </div>
      </div>
    </BaseBlock>
  )
}

export default MenuBlock
