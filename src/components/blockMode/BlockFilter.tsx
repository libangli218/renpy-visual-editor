/**
 * BlockFilter Component
 * 积木筛选组件
 * 
 * Allows filtering blocks by type, category, or comment presence.
 * 
 * Requirements: 15.5
 */

import React, { useCallback, useMemo, useState } from 'react'
import { Block, BlockType, BlockCategory } from './types'
import { BLOCK_DEFINITIONS, getBlockDefinition, getAllCategories } from './constants'
import './BlockFilter.css'

/**
 * Filter criteria for blocks
 */
export interface BlockFilterCriteria {
  /** Filter by block types */
  types?: BlockType[]
  /** Filter by categories */
  categories?: BlockCategory[]
  /** Filter by comment presence */
  hasComment?: boolean
  /** Filter by error presence */
  hasError?: boolean
  /** Text search in block content */
  searchText?: string
}

/**
 * Props for BlockFilter component
 */
export interface BlockFilterProps {
  /** Current filter criteria */
  filter: BlockFilterCriteria
  /** Callback when filter changes */
  onFilterChange: (filter: BlockFilterCriteria) => void
  /** Available block types to filter */
  availableTypes?: BlockType[]
  /** Whether to show category filter */
  showCategoryFilter?: boolean
  /** Whether to show type filter */
  showTypeFilter?: boolean
  /** Whether to show comment filter */
  showCommentFilter?: boolean
  /** Whether to show error filter */
  showErrorFilter?: boolean
  /** Whether to show search */
  showSearch?: boolean
  /** Placeholder for search input */
  searchPlaceholder?: string
  /** Additional class name */
  className?: string
}

/**
 * Category display info
 */
const CATEGORY_INFO: Record<BlockCategory, { label: string; icon: string }> = {
  scene: { label: '场景设置', icon: '🎬' },
  dialogue: { label: '对话', icon: '💬' },
  flow: { label: '流程控制', icon: '🔀' },
  audio: { label: '音频', icon: '🎵' },
  advanced: { label: '高级', icon: '⚙️' },
}

/**
 * BlockFilter - Component for filtering blocks
 * 
 * Implements Requirements:
 * - 15.5: Support filtering blocks by comment or type
 */
export const BlockFilter: React.FC<BlockFilterProps> = ({
  filter,
  onFilterChange,
  availableTypes,
  showCategoryFilter = true,
  showTypeFilter = true,
  showCommentFilter = true,
  showErrorFilter = true,
  showSearch = true,
  searchPlaceholder = '搜索积木...',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Get available categories
  const categories = useMemo(() => getAllCategories() as BlockCategory[], [])
  
  // Get available types (filtered by availableTypes if provided)
  const types = useMemo(() => {
    const allTypes = BLOCK_DEFINITIONS.map(d => d.type)
    if (availableTypes) {
      return allTypes.filter(t => availableTypes.includes(t))
    }
    return allTypes
  }, [availableTypes])
  
  /**
   * Handle search text change
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filter,
      searchText: e.target.value || undefined,
    })
  }, [filter, onFilterChange])
  
  /**
   * Handle category toggle
   */
  const handleCategoryToggle = useCallback((category: BlockCategory) => {
    const currentCategories = filter.categories ?? []
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category]
    
    onFilterChange({
      ...filter,
      categories: newCategories.length > 0 ? newCategories : undefined,
    })
  }, [filter, onFilterChange])
  
  /**
   * Handle type toggle
   */
  const handleTypeToggle = useCallback((type: BlockType) => {
    const currentTypes = filter.types ?? []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]
    
    onFilterChange({
      ...filter,
      types: newTypes.length > 0 ? newTypes : undefined,
    })
  }, [filter, onFilterChange])
  
  /**
   * Handle comment filter toggle
   */
  const handleCommentToggle = useCallback(() => {
    onFilterChange({
      ...filter,
      hasComment: filter.hasComment === true ? undefined : true,
    })
  }, [filter, onFilterChange])
  
  /**
   * Handle error filter toggle
   */
  const handleErrorToggle = useCallback(() => {
    onFilterChange({
      ...filter,
      hasError: filter.hasError === true ? undefined : true,
    })
  }, [filter, onFilterChange])
  
  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    onFilterChange({})
  }, [onFilterChange])
  
  /**
   * Check if any filter is active
   */
  const hasActiveFilters = useMemo(() => {
    return !!(
      filter.types?.length ||
      filter.categories?.length ||
      filter.hasComment ||
      filter.hasError ||
      filter.searchText
    )
  }, [filter])
  
  /**
   * Count active filters
   */
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filter.types?.length) count += filter.types.length
    if (filter.categories?.length) count += filter.categories.length
    if (filter.hasComment) count++
    if (filter.hasError) count++
    if (filter.searchText) count++
    return count
  }, [filter])
  
  return (
    <div className={`block-filter ${className}`}>
      {/* Search Bar */}
      {showSearch && (
        <div className="filter-search">
          <span className="filter-search-icon">🔍</span>
          <input
            type="text"
            className="filter-search-input"
            value={filter.searchText ?? ''}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
          />
          {filter.searchText && (
            <button
              className="filter-search-clear"
              onClick={() => onFilterChange({ ...filter, searchText: undefined })}
              title="清除搜索"
            >
              ×
            </button>
          )}
        </div>
      )}
      
      {/* Filter Toggle */}
      <div className="filter-header">
        <button
          className={`filter-toggle ${isExpanded ? 'expanded' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="filter-toggle-icon">⚙️</span>
          <span className="filter-toggle-text">筛选</span>
          {activeFilterCount > 0 && (
            <span className="filter-count">{activeFilterCount}</span>
          )}
          <span className={`filter-chevron ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </button>
        
        {hasActiveFilters && (
          <button
            className="filter-clear"
            onClick={handleClearFilters}
            title="清除所有筛选"
          >
            清除
          </button>
        )}
      </div>
      
      {/* Filter Options */}
      {isExpanded && (
        <div className="filter-options">
          {/* Category Filter */}
          {showCategoryFilter && (
            <div className="filter-section">
              <div className="filter-section-title">分类</div>
              <div className="filter-chips">
                {categories.map(category => {
                  const info = CATEGORY_INFO[category]
                  const isActive = filter.categories?.includes(category)
                  return (
                    <button
                      key={category}
                      className={`filter-chip ${isActive ? 'active' : ''}`}
                      onClick={() => handleCategoryToggle(category)}
                    >
                      <span className="filter-chip-icon">{info.icon}</span>
                      <span className="filter-chip-label">{info.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* Type Filter */}
          {showTypeFilter && (
            <div className="filter-section">
              <div className="filter-section-title">类型</div>
              <div className="filter-chips">
                {types.map(type => {
                  const def = getBlockDefinition(type)
                  const isActive = filter.types?.includes(type)
                  return (
                    <button
                      key={type}
                      className={`filter-chip ${isActive ? 'active' : ''}`}
                      onClick={() => handleTypeToggle(type)}
                      style={{ '--chip-color': def?.color } as React.CSSProperties}
                    >
                      <span className="filter-chip-icon">{def?.icon || '📦'}</span>
                      <span className="filter-chip-label">{def?.label || type}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* Special Filters */}
          {(showCommentFilter || showErrorFilter) && (
            <div className="filter-section">
              <div className="filter-section-title">特殊</div>
              <div className="filter-chips">
                {showCommentFilter && (
                  <button
                    className={`filter-chip ${filter.hasComment ? 'active' : ''}`}
                    onClick={handleCommentToggle}
                  >
                    <span className="filter-chip-icon">💬</span>
                    <span className="filter-chip-label">有注释</span>
                  </button>
                )}
                {showErrorFilter && (
                  <button
                    className={`filter-chip ${filter.hasError ? 'active' : ''}`}
                    onClick={handleErrorToggle}
                  >
                    <span className="filter-chip-icon">⚠️</span>
                    <span className="filter-chip-label">有错误</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Apply filter criteria to a block
 */
export function matchesFilter(block: Block, filter: BlockFilterCriteria): boolean {
  // Type filter
  if (filter.types && filter.types.length > 0) {
    if (!filter.types.includes(block.type)) {
      return false
    }
  }
  
  // Category filter
  if (filter.categories && filter.categories.length > 0) {
    if (!filter.categories.includes(block.category)) {
      return false
    }
  }
  
  // Comment filter
  if (filter.hasComment === true) {
    if (!block.comment?.trim()) {
      return false
    }
  }
  
  // Error filter
  if (filter.hasError === true) {
    if (!block.hasError) {
      return false
    }
  }
  
  // Text search
  if (filter.searchText) {
    const searchLower = filter.searchText.toLowerCase()
    const def = getBlockDefinition(block.type)
    
    // Search in block label
    if (def?.label.toLowerCase().includes(searchLower)) {
      return true
    }
    
    // Search in slot values
    for (const slot of block.slots) {
      if (typeof slot.value === 'string' && slot.value.toLowerCase().includes(searchLower)) {
        return true
      }
    }
    
    // Search in comment
    if (block.comment?.toLowerCase().includes(searchLower)) {
      return true
    }
    
    return false
  }
  
  return true
}

/**
 * Filter a block tree, returning blocks that match the criteria
 */
export function filterBlockTree(root: Block, filter: BlockFilterCriteria): Block[] {
  const results: Block[] = []
  
  function traverse(block: Block) {
    if (matchesFilter(block, filter)) {
      results.push(block)
    }
    
    if (block.children) {
      for (const child of block.children) {
        traverse(child)
      }
    }
  }
  
  traverse(root)
  return results
}

/**
 * Get block IDs that match the filter
 */
export function getMatchingBlockIds(root: Block, filter: BlockFilterCriteria): Set<string> {
  const matchingBlocks = filterBlockTree(root, filter)
  return new Set(matchingBlocks.map(b => b.id))
}

/**
 * Hook for managing block filter state
 */
export function useBlockFilter(initialFilter: BlockFilterCriteria = {}) {
  const [filter, setFilter] = useState<BlockFilterCriteria>(initialFilter)
  
  const clearFilter = useCallback(() => {
    setFilter({})
  }, [])
  
  const hasActiveFilters = useMemo(() => {
    return !!(
      filter.types?.length ||
      filter.categories?.length ||
      filter.hasComment ||
      filter.hasError ||
      filter.searchText
    )
  }, [filter])
  
  return {
    filter,
    setFilter,
    clearFilter,
    hasActiveFilters,
  }
}

export default BlockFilter
