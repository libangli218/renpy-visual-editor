/**
 * CollapsibleBlock Component
 * 可折叠积木组件
 * 
 * Provides collapse/expand functionality for container blocks.
 * When collapsed, displays a summary of the contained blocks.
 * 
 * Requirements: 15.1, 15.2
 */

import React, { useCallback, useMemo } from 'react'
import { Block, BlockType } from '../types'
import { getBlockDefinition } from '../constants'
import { useBlockEditorStore } from '../stores/blockEditorStore'
import './CollapsibleBlock.css'

/**
 * Props for CollapsibleBlock component
 */
export interface CollapsibleBlockProps {
  /** The block data */
  block: Block
  /** Children to render when expanded */
  children?: React.ReactNode
  /** Callback when collapse state changes */
  onToggleCollapse?: (blockId: string, collapsed: boolean) => void
  /** Custom summary renderer */
  renderSummary?: (block: Block, summary: BlockSummary) => React.ReactNode
  /** Additional class name */
  className?: string
}

/**
 * Summary information for a collapsed block
 */
export interface BlockSummary {
  /** Total number of child blocks */
  totalCount: number
  /** Count by block type */
  byType: Record<string, number>
  /** Formatted summary text */
  text: string
  /** Most common block type */
  dominantType?: BlockType
  /** Count of the dominant type */
  dominantCount?: number
}

/**
 * Calculate summary for a block's children
 */
export function calculateBlockSummary(block: Block): BlockSummary {
  const children = block.children ?? []
  const totalCount = children.length
  
  if (totalCount === 0) {
    return {
      totalCount: 0,
      byType: {},
      text: '空',
    }
  }
  
  // Count blocks by type
  const byType: Record<string, number> = {}
  for (const child of children) {
    byType[child.type] = (byType[child.type] || 0) + 1
  }
  
  // Find dominant type
  let dominantType: BlockType | undefined
  let dominantCount = 0
  for (const [type, count] of Object.entries(byType)) {
    if (count > dominantCount) {
      dominantType = type as BlockType
      dominantCount = count
    }
  }
  
  // Generate summary text
  let text: string
  const typeCount = Object.keys(byType).length
  
  if (typeCount === 1 && dominantType) {
    // All blocks are the same type
    const def = getBlockDefinition(dominantType)
    const label = def?.label || dominantType
    text = `${dominantCount} 个${label}`
  } else if (typeCount === 2) {
    // Two types - show both
    const entries = Object.entries(byType)
    const parts = entries.map(([type, count]) => {
      const def = getBlockDefinition(type)
      return `${count} 个${def?.label || type}`
    })
    text = parts.join('、')
  } else {
    // Multiple types - show total
    text = `${totalCount} 个积木`
  }
  
  return {
    totalCount,
    byType,
    text,
    dominantType,
    dominantCount,
  }
}

/**
 * Get detailed summary with icons for each type
 */
export function getDetailedSummary(block: Block): Array<{ type: BlockType; count: number; icon: string; label: string }> {
  const children = block.children ?? []
  const byType: Record<string, number> = {}
  
  for (const child of children) {
    byType[child.type] = (byType[child.type] || 0) + 1
  }
  
  return Object.entries(byType).map(([type, count]) => {
    const def = getBlockDefinition(type)
    return {
      type: type as BlockType,
      count,
      icon: def?.icon || '📦',
      label: def?.label || type,
    }
  }).sort((a, b) => b.count - a.count)
}

/**
 * CollapsibleBlock - Wrapper component for collapsible container blocks
 * 
 * Implements Requirements:
 * - 15.1: Container blocks support collapse/expand
 * - 15.2: When collapsed, display content summary
 */
export const CollapsibleBlock: React.FC<CollapsibleBlockProps> = ({
  block,
  children,
  onToggleCollapse,
  renderSummary,
  className = '',
}) => {
  const { collapsedBlocks, toggleBlockCollapsed } = useBlockEditorStore()
  
  const isCollapsed = collapsedBlocks.has(block.id)
  
  // Calculate summary
  const summary = useMemo(() => calculateBlockSummary(block), [block])
  const detailedSummary = useMemo(() => getDetailedSummary(block), [block])
  
  /**
   * Handle collapse toggle
   */
  const handleToggle = useCallback(() => {
    toggleBlockCollapsed(block.id)
    onToggleCollapse?.(block.id, !isCollapsed)
  }, [block.id, isCollapsed, toggleBlockCollapsed, onToggleCollapse])
  
  /**
   * Handle keyboard interaction
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }, [handleToggle])
  
  // Don't render collapse UI if block has no children
  const hasChildren = block.children && block.children.length > 0
  
  return (
    <div 
      className={`collapsible-block ${isCollapsed ? 'collapsed' : 'expanded'} ${className}`}
      data-block-id={block.id}
    >
      {/* Collapse Toggle Header */}
      {hasChildren && (
        <div 
          className="collapsible-header"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? '展开' : '折叠'}
        >
          <span className={`collapse-chevron ${isCollapsed ? 'collapsed' : ''}`}>
            ▼
          </span>
          
          {isCollapsed && (
            <div className="collapse-summary">
              {renderSummary ? (
                renderSummary(block, summary)
              ) : (
                <>
                  <span className="summary-text">{summary.text}</span>
                  <div className="summary-icons">
                    {detailedSummary.slice(0, 3).map(({ type, count, icon }) => (
                      <span key={type} className="summary-icon-item" title={`${count} 个`}>
                        {icon}
                        {count > 1 && <span className="summary-count">×{count}</span>}
                      </span>
                    ))}
                    {detailedSummary.length > 3 && (
                      <span className="summary-more">+{detailedSummary.length - 3}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Content - hidden when collapsed */}
      {!isCollapsed && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  )
}

export default CollapsibleBlock
