/**
 * LabelCard Component
 * Label 卡片组件
 * 
 * Wraps LabelContainer with collapse/expand functionality and delete button.
 * Used in MultiLabelView to display individual labels as cards.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.3, 5.4
 */

import React, { useCallback, useState, memo, useMemo } from 'react'
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
}) => {
  // State for delete confirmation dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Calculate block count for summary
  const blockCount = useMemo(() => {
    return labelBlock.children?.length ?? 0
  }, [labelBlock.children])

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

        {/* Label Name */}
        <div className="label-card-title">
          <span className="label-icon">🏷️</span>
          <h3 className="label-name">{labelName}</h3>
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
