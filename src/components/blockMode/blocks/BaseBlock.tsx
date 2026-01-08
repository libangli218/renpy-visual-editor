/**
 * BaseBlock Component
 * 基础积木组件
 * 
 * Provides common block appearance: color, icon, title,
 * selection state, error state, and collapse/expand functionality.
 * 
 * Performance optimizations:
 * - React.memo to prevent unnecessary re-renders
 * - useMemo for expensive computations
 * - useCallback for event handlers
 * 
 * Requirements: 1.4, 15.1
 */

import React, { useCallback, useState, useMemo, memo } from 'react'
import { Block } from '../types'
import { getBlockDefinition, isContainerBlockType } from '../constants'
import './Block.css'

/**
 * Props for BaseBlock component
 */
export interface BaseBlockProps {
  /** The block data */
  block: Block
  /** Whether the block is selected */
  selected?: boolean
  /** Whether the block has validation errors */
  hasError?: boolean
  /** Error message to display on hover */
  errorMessage?: string
  /** Whether the block is collapsed (for container types) */
  collapsed?: boolean
  /** Custom collapsed summary text */
  collapsedSummary?: string
  /** Whether this block is the current playback block */
  isPlaybackCurrent?: boolean
  /** Whether playback is waiting for user input on this block */
  isPlaybackWaiting?: boolean
  /** Callback when block is clicked */
  onClick?: (blockId: string) => void
  /** Callback when collapse/expand is toggled */
  onToggleCollapse?: (blockId: string) => void
  /** Callback when block is double-clicked */
  onDoubleClick?: (blockId: string) => void
  /** Callback when block is deleted */
  onDelete?: (blockId: string) => void
  /** Callback when drag starts */
  onDragStart?: (blockId: string, event: React.DragEvent) => void
  /** Callback when drag ends */
  onDragEnd?: (event: React.DragEvent) => void
  /** Children to render inside the block (slots, nested blocks) */
  children?: React.ReactNode
  /** Additional class name */
  className?: string
  /** Whether the block is draggable */
  draggable?: boolean
  /** Whether to show the collapse button */
  showCollapseButton?: boolean
  /** Custom header content */
  headerContent?: React.ReactNode
  /** Depth level for nested blocks */
  depth?: number
}

/**
 * Get the summary text for a collapsed container block
 */
function getCollapsedSummary(block: Block): string {
  if (!block.children || block.children.length === 0) {
    return '空'
  }
  
  const count = block.children.length
  const typeCount: Record<string, number> = {}
  
  for (const child of block.children) {
    typeCount[child.type] = (typeCount[child.type] || 0) + 1
  }
  
  // Get the most common type
  const entries = Object.entries(typeCount)
  if (entries.length === 1) {
    const [type, num] = entries[0]
    const def = getBlockDefinition(type)
    return `${num} 个${def?.label || type}`
  }
  
  return `${count} 个积木`
}

/**
 * BaseBlock - Base component for all block types
 * 
 * Implements Requirements:
 * - 1.4: Use different colors and icons for each block type
 * - 15.1: Container blocks support collapse/expand
 */
export const BaseBlock: React.FC<BaseBlockProps> = memo(({
  block,
  selected = false,
  hasError = false,
  errorMessage,
  collapsed = false,
  collapsedSummary,
  isPlaybackCurrent = false,
  isPlaybackWaiting = false,
  onClick,
  onToggleCollapse,
  onDoubleClick,
  onDelete,
  onDragStart,
  onDragEnd,
  children,
  className = '',
  draggable = true,
  showCollapseButton,
  headerContent,
  depth = 0,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  
  // Get block definition for visual properties - memoized
  const definition = useMemo(() => getBlockDefinition(block.type), [block.type])
  const isContainer = useMemo(() => isContainerBlockType(block.type), [block.type])
  
  // Determine if collapse button should be shown
  const shouldShowCollapseButton = showCollapseButton ?? (isContainer && block.children && block.children.length > 0)
  
  /**
   * Handle block click
   */
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(block.id)
  }, [block.id, onClick])
  
  /**
   * Handle block double-click
   */
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDoubleClick?.(block.id)
  }, [block.id, onDoubleClick])
  
  /**
   * Handle collapse toggle
   */
  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCollapse?.(block.id)
  }, [block.id, onToggleCollapse])
  
  /**
   * Handle delete click
   */
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(block.id)
  }, [block.id, onDelete])
  
  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((e: React.DragEvent) => {
    // Check if the drag started from an interactive element that should not trigger block drag
    const target = e.target as HTMLElement
    
    const isInteractiveElement = 
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'BUTTON' ||
      target.closest('input[type="range"]') ||
      target.closest('.slot-range-input') ||
      target.closest('.range-input-container')
    
    if (isInteractiveElement) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    
    setIsDragging(true)
    e.dataTransfer.setData('application/x-block-id', block.id)
    e.dataTransfer.setData('text/plain', block.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(block.id, e)
  }, [block.id, onDragStart])
  
  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setIsDragging(false)
    onDragEnd?.(e)
  }, [onDragEnd])
  
  // Build class names - memoized for performance
  const blockClasses = useMemo(() => [
    'base-block',
    `block-type-${block.type}`,
    `block-category-${block.category}`,
    selected && 'selected',
    hasError && 'has-error',
    collapsed && 'collapsed',
    isDragging && 'dragging',
    isContainer && 'container-block',
    isPlaybackCurrent && 'playback-current',
    isPlaybackWaiting && 'playback-waiting',
    depth > 0 && `depth-${Math.min(depth, 5)}`,
    className,
  ].filter(Boolean).join(' '), [block.type, block.category, selected, hasError, collapsed, isDragging, isContainer, isPlaybackCurrent, isPlaybackWaiting, depth, className])
  
  return (
    <div
      className={blockClasses}
      style={{
        '--block-color': definition?.color || '#607D8B',
        '--block-depth': depth,
        borderLeftColor: definition?.color || '#607D8B',
      } as React.CSSProperties}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-block-id={block.id}
      data-block-type={block.type}
      role="button"
      tabIndex={0}
      aria-selected={selected}
      aria-expanded={isContainer ? !collapsed : undefined}
      title={hasError ? errorMessage : definition?.description}
    >
      {/* Block Header */}
      <div className="block-header">
        {/* Collapse button for containers */}
        {shouldShowCollapseButton && (
          <button
            className="block-collapse-btn"
            onClick={handleToggleCollapse}
            aria-label={collapsed ? '展开' : '折叠'}
          >
            <span className={`collapse-icon ${collapsed ? 'collapsed' : ''}`}>
              ▼
            </span>
          </button>
        )}
        
        {/* Block icon */}
        <span className="block-icon">{definition?.icon || '📦'}</span>
        
        {/* Block title */}
        <span className="block-title">{definition?.label || block.type}</span>
        
        {/* Error indicator */}
        {hasError && (
          <span className="block-error-indicator" title={errorMessage}>
            ⚠️
          </span>
        )}
        
        {/* Custom header content */}
        {headerContent}
        
        {/* Delete button - shows on hover when onDelete is provided */}
        {onDelete && (
          <button
            className="block-delete-btn"
            onClick={handleDelete}
            title="删除积木 (Delete)"
            aria-label="删除积木"
          >
            🗑️
          </button>
        )}
        
        {/* Collapsed summary */}
        {collapsed && isContainer && (
          <span className="block-collapsed-summary">
            ({collapsedSummary || getCollapsedSummary(block)})
          </span>
        )}
      </div>
      
      {/* Block Content (slots and children) */}
      {/* Only apply collapsed logic to container blocks */}
      {(!collapsed || !isContainer) && (
        <div className="block-content">
          {children}
        </div>
      )}
      
      {/* Comment badge */}
      {block.comment && (
        <div className="block-comment-badge" title={block.comment}>
          💬
        </div>
      )}
    </div>
  )
})

// Display name for debugging
BaseBlock.displayName = 'BaseBlock'

export default BaseBlock
