/**
 * LabelCard Component
 * Label 卡片组件
 * 
 * Design inspired by Don Norman's principles:
 * - "Progressive Disclosure" - show complexity only when needed
 * - "Gulf of Execution" - minimize steps between intention and action
 * - Inline editing reduces cognitive load vs modal dialogs
 * 
 * Wraps LabelContainer with collapse/expand functionality and delete button.
 * Used in MultiLabelView to display individual labels as cards.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.3, 5.4
 */

import React, { useCallback, useState, memo, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LabelContainer, LabelContainerProps } from './LabelContainer'
import { Block } from './types'
import './LabelCard.css'

/**
 * Props for LabelCard component
 */
export interface LabelCardProps {
  /** Label name */
  labelName: string
  /** Label block data (from BlockTreeBuilder) */
  labelBlock: Block
  /** Whether the card is collapsed */
  collapsed: boolean
  /** Toggle collapse callback */
  onToggleCollapse: () => void
  /** Delete label callback */
  onDelete?: () => void
  /** Whether the card is selected */
  selected?: boolean
  /** Click callback for selection */
  onClick?: () => void
  /** All props passed to LabelContainer (except block and labelName) */
  containerProps: Omit<LabelContainerProps, 'block' | 'labelName'>
  /** Additional class name */
  className?: string
  /** Whether to start in editing mode (for newly created labels) */
  isEditing?: boolean
  /** Callback when name is changed via inline editing */
  onNameChange?: (newName: string) => void
  /** Existing label names for duplicate validation */
  existingLabelNames?: string[]
}

/**
 * LabelCard - Card wrapper for LabelContainer with collapse/expand
 * 
 * Implements Requirements:
 * - 2.1: Click to collapse label card
 * - 2.2: Click to expand collapsed label card
 * - 2.3: Show all blocks when expanded
 * - 2.4: Show block count summary when collapsed
 * - 5.3: Delete button with confirmation
 * - 5.4: Remove label from AST on delete
 */
export const LabelCard: React.FC<LabelCardProps> = memo(({
  labelName,
  labelBlock,
  collapsed,
  onToggleCollapse,
  onDelete,
  selected = false,
  onClick,
  containerProps,
  className = '',
  isEditing: initialIsEditing = false,
  onNameChange,
  existingLabelNames = [],
}) => {
  // State for delete confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // State for inline name editing (Don Norman: Progressive Disclosure)
  const [isEditingName, setIsEditingName] = useState(initialIsEditing)
  const [editingNameValue, setEditingNameValue] = useState(labelName)
  const [editingNameError, setEditingNameError] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Calculate block count for summary
  const blockCount = useMemo(() => {
    return labelBlock.children?.length ?? 0
  }, [labelBlock.children])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  // Update editing value when labelName changes externally
  useEffect(() => {
    if (!isEditingName) {
      setEditingNameValue(labelName)
    }
  }, [labelName, isEditingName])

  // Handle collapse toggle
  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCollapse()
  }, [onToggleCollapse])

  // Handle delete button click
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }, [])

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(() => {
    setShowDeleteConfirm(false)
    onDelete?.()
  }, [onDelete])

  // Handle delete cancel
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false)
  }, [])

  // Handle card click
  const handleCardClick = useCallback(() => {
    onClick?.()
  }, [onClick])

  // Handle double-click on label name to start editing
  // Don Norman: Reduce Gulf of Execution - direct manipulation
  const handleNameDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onNameChange) {
      setIsEditingName(true)
      setEditingNameValue(labelName)
      setEditingNameError('')
    }
  }, [labelName, onNameChange])

  // Validate and commit name change
  const commitNameChange = useCallback(() => {
    const trimmedName = editingNameValue.trim()
    
    // Validate: not empty
    if (!trimmedName) {
      setEditingNameError('名称不能为空')
      return false
    }
    
    // Validate: valid identifier
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
      setEditingNameError('只能包含字母、数字和下划线')
      return false
    }
    
    // Validate: not duplicate (excluding current name)
    if (trimmedName !== labelName && existingLabelNames.includes(trimmedName)) {
      setEditingNameError(`"${trimmedName}" 已存在`)
      return false
    }
    
    // Commit change
    setIsEditingName(false)
    setEditingNameError('')
    if (trimmedName !== labelName) {
      onNameChange?.(trimmedName)
    }
    return true
  }, [editingNameValue, labelName, existingLabelNames, onNameChange])

  // Handle name input key events
  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      commitNameChange()
    } else if (e.key === 'Escape') {
      // Cancel editing, revert to original name
      setIsEditingName(false)
      setEditingNameValue(labelName)
      setEditingNameError('')
    }
  }, [commitNameChange, labelName])

  // Handle name input blur - commit on blur
  const handleNameBlur = useCallback(() => {
    // Small delay to allow click events to process first
    setTimeout(() => {
      if (isEditingName) {
        commitNameChange()
      }
    }, 100)
  }, [isEditingName, commitNameChange])

  // Handle name input change
  const handleNameInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingNameValue(e.target.value)
    setEditingNameError('')
  }, [])

  // Build class names
  const cardClasses = useMemo(() => [
    'label-card',
    collapsed && 'collapsed',
    selected && 'selected',
    className,
  ].filter(Boolean).join(' '), [collapsed, selected, className])

  return (
    <div 
      className={cardClasses}
      onClick={handleCardClick}
      data-label-name={labelName}
    >
      {/* Card Header */}
      <div className="label-card-header">
        {/* Collapse/Expand Button */}
        <button
          className="label-card-collapse-btn"
          onClick={handleToggleCollapse}
          title={collapsed ? '展开' : '折叠'}
          aria-label={collapsed ? '展开 Label' : '折叠 Label'}
          aria-expanded={!collapsed}
        >
          <span className={`collapse-icon ${collapsed ? 'collapsed' : ''}`}>
            ▼
          </span>
        </button>

        {/* Label Name - with inline editing support */}
        <div className="label-card-title">
          <span className="label-icon">🏷️</span>
          {isEditingName ? (
            <div className="label-name-edit-container">
              <input
                ref={nameInputRef}
                type="text"
                className={`label-name-input ${editingNameError ? 'error' : ''}`}
                value={editingNameValue}
                onChange={handleNameInputChange}
                onKeyDown={handleNameKeyDown}
                onBlur={handleNameBlur}
                onClick={(e) => e.stopPropagation()}
                placeholder="输入 Label 名称"
              />
              {editingNameError && (
                <span className="label-name-error">{editingNameError}</span>
              )}
            </div>
          ) : (
            <h3 
              className="label-name"
              onDoubleClick={handleNameDoubleClick}
              title={onNameChange ? '双击编辑名称' : undefined}
            >
              {labelName}
            </h3>
          )}
        </div>

        {/* Block Count Badge */}
        <span className="label-card-count" title={`${blockCount} 个积木`}>
          {blockCount}
        </span>

        {/* Delete Button */}
        {onDelete && (
          <button
            className="label-card-delete-btn"
            onClick={handleDeleteClick}
            title="删除 Label"
            aria-label="删除 Label"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Card Content - Collapsed Summary or Full Container */}
      {collapsed ? (
        /* Collapsed State - Show Summary */
        <div className="label-card-summary">
          <span className="summary-text">
            {blockCount === 0 
              ? '空 Label' 
              : `${blockCount} 个积木`
            }
          </span>
          <span className="summary-hint">点击展开查看内容</span>
        </div>
      ) : (
        /* Expanded State - Show Full LabelContainer */
        <div className="label-card-content">
          <LabelContainer
            block={labelBlock}
            labelName={labelName}
            {...containerProps}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog - Rendered via Portal to avoid z-index issues */}
      {showDeleteConfirm && createPortal(
        <div className="label-card-delete-dialog-overlay" onClick={handleCancelDelete}>
          <div 
            className="label-card-delete-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-dialog-header">
              <span className="delete-dialog-icon">⚠️</span>
              <h4>确认删除</h4>
            </div>
            <p className="delete-dialog-message">
              确定要删除 Label "{labelName}" 吗？
              <br />
              <span className="delete-dialog-warning">
                此操作将删除该 Label 及其所有 {blockCount} 个积木，且无法撤销。
              </span>
            </p>
            <div className="delete-dialog-actions">
              <button
                className="delete-dialog-cancel"
                onClick={handleCancelDelete}
              >
                取消
              </button>
              <button
                className="delete-dialog-confirm"
                onClick={handleConfirmDelete}
              >
                删除
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
})

// Display name for debugging
LabelCard.displayName = 'LabelCard'

export default LabelCard
