/**
 * BlockPalette Component
 * 积木面板组件
 * 
 * Displays all available block types organized by category.
 * Supports drag-and-drop, search filtering, and category tabs.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import React, { useState, useMemo, useCallback } from 'react'
import { BlockType, BlockCategory, BlockDefinition } from '../types'
import { BLOCK_DEFINITIONS, BLOCK_COLORS } from '../constants'
import './BlockPalette.css'

/**
 * Category configuration for tabs
 */
interface CategoryConfig {
  id: BlockCategory
  label: string
  icon: string
}

const CATEGORIES: CategoryConfig[] = [
  { id: 'scene', label: '场景设置', icon: '🎬' },
  { id: 'dialogue', label: '对话', icon: '💬' },
  { id: 'flow', label: '流程控制', icon: '🔀' },
  { id: 'audio', label: '音频', icon: '🎵' },
  { id: 'advanced', label: '高级', icon: '⚙️' },
]

/**
 * Props for BlockPalette component
 */
export interface BlockPaletteProps {
  /** Callback when drag starts */
  onDragStart?: (type: BlockType, event: React.DragEvent) => void
  /** Callback when drag ends */
  onDragEnd?: (event: React.DragEvent) => void
  /** Currently selected category filter */
  selectedCategory?: BlockCategory | null
  /** Callback when category changes */
  onCategoryChange?: (category: BlockCategory | null) => void
  /** External search query */
  searchQuery?: string
  /** Callback when search query changes */
  onSearchChange?: (query: string) => void
  /** Disabled block types */
  disabledTypes?: BlockType[]
  /** Custom class name */
  className?: string
}

/**
 * BlockPalette - Block selection panel component
 * 
 * Implements Requirements:
 * - 1.1: Display block palette with all available block types
 * - 1.2: Organize blocks by category
 * - 1.3: Support drag-and-drop from palette
 * - 1.4: Use different colors and icons for each block type
 */
export const BlockPalette: React.FC<BlockPaletteProps> = ({
  onDragStart,
  onDragEnd,
  selectedCategory: externalCategory,
  onCategoryChange,
  searchQuery: externalSearchQuery,
  onSearchChange,
  disabledTypes = [],
  className = '',
}) => {
  // Internal state for category and search (used if not controlled externally)
  const [internalCategory, setInternalCategory] = useState<BlockCategory | null>(null)
  const [internalSearchQuery, setInternalSearchQuery] = useState('')

  // Use external or internal state
  const selectedCategory = externalCategory !== undefined ? externalCategory : internalCategory
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery

  /**
   * Handle category tab click
   */
  const handleCategoryClick = useCallback((category: BlockCategory | null) => {
    if (onCategoryChange) {
      onCategoryChange(category)
    } else {
      setInternalCategory(category)
    }
  }, [onCategoryChange])

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    if (onSearchChange) {
      onSearchChange(query)
    } else {
      setInternalSearchQuery(query)
    }
  }, [onSearchChange])

  /**
   * Clear search query
   */
  const handleClearSearch = useCallback(() => {
    if (onSearchChange) {
      onSearchChange('')
    } else {
      setInternalSearchQuery('')
    }
  }, [onSearchChange])

  /**
   * Filter blocks based on category and search query
   */
  const filteredBlocks = useMemo(() => {
    let blocks = BLOCK_DEFINITIONS

    // Filter by category
    if (selectedCategory) {
      blocks = blocks.filter(block => block.category === selectedCategory)
    }

    // Filter by search query (matches label or description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      blocks = blocks.filter(block => 
        block.label.toLowerCase().includes(query) ||
        block.description.toLowerCase().includes(query)
      )
    }

    // Exclude label type from palette (it's a container, not draggable)
    blocks = blocks.filter(block => block.type !== 'label')

    return blocks
  }, [selectedCategory, searchQuery])

  /**
   * Group blocks by category for display
   */
  const groupedBlocks = useMemo(() => {
    if (selectedCategory) {
      // If category is selected, return single group
      return [{ category: selectedCategory, blocks: filteredBlocks }]
    }

    // Group by category
    const groups: { category: BlockCategory; blocks: BlockDefinition[] }[] = []
    const categoryOrder: BlockCategory[] = ['scene', 'dialogue', 'flow', 'audio', 'advanced']

    for (const cat of categoryOrder) {
      const categoryBlocks = filteredBlocks.filter(b => b.category === cat)
      if (categoryBlocks.length > 0) {
        groups.push({ category: cat, blocks: categoryBlocks })
      }
    }

    return groups
  }, [selectedCategory, filteredBlocks])

  /**
   * Handle drag start on a block item
   */
  const handleDragStart = useCallback((block: BlockDefinition, event: React.DragEvent) => {
    // Set drag data
    event.dataTransfer.setData('application/x-block-type', block.type)
    event.dataTransfer.setData('text/plain', block.type)
    event.dataTransfer.effectAllowed = 'copyMove'

    // Create drag preview
    const dragPreview = document.createElement('div')
    dragPreview.className = 'block-drag-preview'
    dragPreview.style.backgroundColor = block.color
    dragPreview.innerHTML = `<span class="drag-icon">${block.icon}</span><span class="drag-label">${block.label}</span>`
    document.body.appendChild(dragPreview)
    event.dataTransfer.setDragImage(dragPreview, 20, 20)

    // Clean up preview after drag starts
    setTimeout(() => {
      document.body.removeChild(dragPreview)
    }, 0)

    // Call external handler
    if (onDragStart) {
      onDragStart(block.type, event)
    }
  }, [onDragStart])

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback((event: React.DragEvent) => {
    if (onDragEnd) {
      onDragEnd(event)
    }
  }, [onDragEnd])

  /**
   * Check if a block type is disabled
   */
  const isBlockDisabled = useCallback((type: BlockType) => {
    return disabledTypes.includes(type)
  }, [disabledTypes])

  /**
   * Get category label
   */
  const getCategoryLabel = (category: BlockCategory): string => {
    return CATEGORIES.find(c => c.id === category)?.label || category
  }

  return (
    <div className={`block-palette ${className}`}>
      {/* Search Input */}
      <div className="palette-search">
        <input
          type="text"
          className="palette-search-input"
          placeholder="搜索积木..."
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search blocks"
        />
        {searchQuery && (
          <button
            className="palette-search-clear"
            onClick={handleClearSearch}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="palette-categories" role="tablist" aria-label="Block categories">
        <button
          className={`palette-category-tab ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => handleCategoryClick(null)}
          role="tab"
          aria-selected={selectedCategory === null}
        >
          全部
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`palette-category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => handleCategoryClick(cat.id)}
            role="tab"
            aria-selected={selectedCategory === cat.id}
            style={{
              '--category-color': BLOCK_COLORS[cat.id],
            } as React.CSSProperties}
          >
            <span className="category-icon">{cat.icon}</span>
            <span className="category-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Block List */}
      <div className="palette-blocks">
        {filteredBlocks.length === 0 ? (
          <div className="palette-empty">
            <span className="palette-empty-icon">🔍</span>
            <span className="palette-empty-text">没有找到匹配的积木</span>
          </div>
        ) : (
          groupedBlocks.map(group => (
            <div key={group.category} className="palette-group">
              {!selectedCategory && (
                <div className="palette-group-header">
                  <span 
                    className="palette-group-indicator"
                    style={{ backgroundColor: BLOCK_COLORS[group.category] }}
                  />
                  <span className="palette-group-label">{getCategoryLabel(group.category)}</span>
                </div>
              )}
              <div className="palette-group-blocks">
                {group.blocks.map(block => (
                  <BlockPaletteItem
                    key={block.type}
                    block={block}
                    disabled={isBlockDisabled(block.type)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Props for BlockPaletteItem component
 */
interface BlockPaletteItemProps {
  block: BlockDefinition
  disabled?: boolean
  onDragStart: (block: BlockDefinition, event: React.DragEvent) => void
  onDragEnd: (event: React.DragEvent) => void
}

/**
 * BlockPaletteItem - Individual block item in the palette
 */
const BlockPaletteItem: React.FC<BlockPaletteItemProps> = ({
  block,
  disabled = false,
  onDragStart,
  onDragEnd,
}) => {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (event: React.DragEvent) => {
    if (disabled) {
      event.preventDefault()
      return
    }
    setIsDragging(true)
    onDragStart(block, event)
  }

  const handleDragEnd = (event: React.DragEvent) => {
    setIsDragging(false)
    onDragEnd(event)
  }

  return (
    <div
      className={`palette-block-item ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        '--block-color': block.color,
      } as React.CSSProperties}
      title={block.description}
      aria-label={`${block.label}: ${block.description}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <span className="block-item-icon">{block.icon}</span>
      <span className="block-item-label">{block.label}</span>
      <span className="block-item-color-bar" style={{ backgroundColor: block.color }} />
    </div>
  )
}

export default BlockPalette
