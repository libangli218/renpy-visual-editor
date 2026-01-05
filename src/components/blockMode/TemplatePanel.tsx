/**
 * TemplatePanel Component
 * 模板面板组件
 * 
 * Displays available block templates and allows dragging them to the editor.
 * Supports both built-in and custom templates.
 * 
 * Requirements: 14.1
 * - 14.1: Block palette provides common block combination templates
 */

import React, { useState, useMemo, useCallback } from 'react'
import { BlockTemplate } from './types'
import { getTemplateManager } from './TemplateManager'
import { BLOCK_COLORS } from './constants/BlockDefinitions'
import './TemplatePanel.css'

/**
 * Props for TemplatePanel component
 */
export interface TemplatePanelProps {
  /** Callback when drag starts */
  onDragStart?: (template: BlockTemplate, event: React.DragEvent) => void
  /** Callback when drag ends */
  onDragEnd?: (event: React.DragEvent) => void
  /** Callback when template is clicked (for preview) */
  onTemplateClick?: (template: BlockTemplate) => void
  /** Callback when template is double-clicked (for immediate insert) */
  onTemplateDoubleClick?: (template: BlockTemplate) => void
  /** Callback when custom template is deleted */
  onTemplateDelete?: (templateId: string) => void
  /** Whether to show custom templates section */
  showCustomTemplates?: boolean
  /** Whether to allow deleting custom templates */
  allowDelete?: boolean
  /** Custom class name */
  className?: string
}

/**
 * TemplatePanel - Template selection panel component
 * 
 * Implements Requirements:
 * - 14.1: Display template list with drag-and-drop support
 */
export const TemplatePanel: React.FC<TemplatePanelProps> = ({
  onDragStart,
  onDragEnd,
  onTemplateClick,
  onTemplateDoubleClick,
  onTemplateDelete,
  showCustomTemplates = true,
  allowDelete = true,
  className = '',
}) => {
  const [expandedSection, setExpandedSection] = useState<'builtin' | 'custom' | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Get templates from manager
  const templateManager = useMemo(() => getTemplateManager(), [])
  const builtInTemplates = useMemo(() => templateManager.getBuiltInTemplates(), [templateManager])
  const customTemplates = useMemo(() => templateManager.getCustomTemplates(), [templateManager])

  // Filter templates by search query
  const filteredBuiltIn = useMemo(() => {
    if (!searchQuery.trim()) return builtInTemplates
    const query = searchQuery.toLowerCase()
    return builtInTemplates.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    )
  }, [builtInTemplates, searchQuery])

  const filteredCustom = useMemo(() => {
    if (!searchQuery.trim()) return customTemplates
    const query = searchQuery.toLowerCase()
    return customTemplates.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    )
  }, [customTemplates, searchQuery])

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  /**
   * Clear search query
   */
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  /**
   * Toggle section expansion
   */
  const toggleSection = useCallback((section: 'builtin' | 'custom') => {
    setExpandedSection(prev => {
      if (prev === 'all') return section === 'builtin' ? 'custom' : 'builtin'
      if (prev === section) return 'all'
      return section
    })
  }, [])

  /**
   * Handle drag start on a template item
   */
  const handleDragStart = useCallback((template: BlockTemplate, event: React.DragEvent) => {
    // Set drag data
    event.dataTransfer.setData('application/x-template-id', template.id)
    event.dataTransfer.setData('text/plain', template.name)
    event.dataTransfer.effectAllowed = 'copy'

    // Create drag preview
    const dragPreview = document.createElement('div')
    dragPreview.className = 'template-drag-preview'
    dragPreview.innerHTML = `<span class="drag-icon">📦</span><span class="drag-label">${template.name}</span>`
    document.body.appendChild(dragPreview)
    event.dataTransfer.setDragImage(dragPreview, 20, 20)

    // Clean up preview after drag starts
    setTimeout(() => {
      document.body.removeChild(dragPreview)
    }, 0)

    // Call external handler
    if (onDragStart) {
      onDragStart(template, event)
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
   * Handle template click
   */
  const handleTemplateClick = useCallback((template: BlockTemplate) => {
    if (onTemplateClick) {
      onTemplateClick(template)
    }
  }, [onTemplateClick])

  /**
   * Handle template double-click
   */
  const handleTemplateDoubleClick = useCallback((template: BlockTemplate) => {
    if (onTemplateDoubleClick) {
      onTemplateDoubleClick(template)
    }
  }, [onTemplateDoubleClick])

  /**
   * Handle delete template
   */
  const handleDeleteTemplate = useCallback((templateId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (onTemplateDelete) {
      onTemplateDelete(templateId)
    }
  }, [onTemplateDelete])

  /**
   * Get primary color for template based on first block
   */
  const getTemplateColor = (template: BlockTemplate): string => {
    if (template.blocks.length === 0) return BLOCK_COLORS.advanced
    const firstBlock = template.blocks[0]
    return BLOCK_COLORS[firstBlock.category] || BLOCK_COLORS.advanced
  }

  /**
   * Get icon for template based on first block
   */
  const getTemplateIcon = (template: BlockTemplate): string => {
    if (template.blocks.length === 0) return '📦'
    const blockCount = template.blocks.length
    if (blockCount === 1) {
      const type = template.blocks[0].type
      const icons: Record<string, string> = {
        'scene': '🎬',
        'show': '👤',
        'hide': '👻',
        'dialogue': '💬',
        'menu': '🔀',
        'if': '❓',
        'play-music': '🎵',
      }
      return icons[type] || '📦'
    }
    return '📦'
  }

  const showBuiltIn = expandedSection === 'all' || expandedSection === 'builtin'
  const showCustom = showCustomTemplates && (expandedSection === 'all' || expandedSection === 'custom')

  return (
    <div className={`template-panel ${className}`}>
      {/* Search Input */}
      <div className="template-search">
        <input
          type="text"
          className="template-search-input"
          placeholder="搜索模板..."
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search templates"
        />
        {searchQuery && (
          <button
            className="template-search-clear"
            onClick={handleClearSearch}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Template Sections */}
      <div className="template-sections">
        {/* Built-in Templates Section */}
        <div className="template-section">
          <button
            className={`template-section-header ${showBuiltIn ? 'expanded' : ''}`}
            onClick={() => toggleSection('builtin')}
            aria-expanded={showBuiltIn}
          >
            <span className="section-icon">{showBuiltIn ? '▼' : '▶'}</span>
            <span className="section-title">内置模板</span>
            <span className="section-count">{filteredBuiltIn.length}</span>
          </button>
          
          {showBuiltIn && (
            <div className="template-list">
              {filteredBuiltIn.length === 0 ? (
                <div className="template-empty">没有找到匹配的模板</div>
              ) : (
                filteredBuiltIn.map(template => (
                  <TemplateItem
                    key={template.id}
                    template={template}
                    color={getTemplateColor(template)}
                    icon={getTemplateIcon(template)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onClick={handleTemplateClick}
                    onDoubleClick={handleTemplateDoubleClick}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Custom Templates Section */}
        {showCustomTemplates && (
          <div className="template-section">
            <button
              className={`template-section-header ${showCustom ? 'expanded' : ''}`}
              onClick={() => toggleSection('custom')}
              aria-expanded={showCustom}
            >
              <span className="section-icon">{showCustom ? '▼' : '▶'}</span>
              <span className="section-title">自定义模板</span>
              <span className="section-count">{filteredCustom.length}</span>
            </button>
            
            {showCustom && (
              <div className="template-list">
                {filteredCustom.length === 0 ? (
                  <div className="template-empty">
                    {searchQuery ? '没有找到匹配的模板' : '暂无自定义模板'}
                  </div>
                ) : (
                  filteredCustom.map(template => (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      color={getTemplateColor(template)}
                      icon={getTemplateIcon(template)}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={handleTemplateClick}
                      onDoubleClick={handleTemplateDoubleClick}
                      onDelete={allowDelete ? handleDeleteTemplate : undefined}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


/**
 * Props for TemplateItem component
 */
interface TemplateItemProps {
  template: BlockTemplate
  color: string
  icon: string
  onDragStart: (template: BlockTemplate, event: React.DragEvent) => void
  onDragEnd: (event: React.DragEvent) => void
  onClick: (template: BlockTemplate) => void
  onDoubleClick: (template: BlockTemplate) => void
  onDelete?: (templateId: string, event: React.MouseEvent) => void
}

/**
 * TemplateItem - Individual template item in the panel
 */
const TemplateItem: React.FC<TemplateItemProps> = ({
  template,
  color,
  icon,
  onDragStart,
  onDragEnd,
  onClick,
  onDoubleClick,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (event: React.DragEvent) => {
    setIsDragging(true)
    onDragStart(template, event)
  }

  const handleDragEnd = (event: React.DragEvent) => {
    setIsDragging(false)
    onDragEnd(event)
  }

  const handleClick = () => {
    onClick(template)
  }

  const handleDoubleClick = () => {
    onDoubleClick(template)
  }

  const handleDelete = (event: React.MouseEvent) => {
    if (onDelete) {
      onDelete(template.id, event)
    }
  }

  const blockCount = template.blocks.length
  const blockSummary = blockCount === 1 
    ? '1 个积木' 
    : `${blockCount} 个积木`

  return (
    <div
      className={`template-item ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        '--template-color': color,
      } as React.CSSProperties}
      title={template.description}
      aria-label={`${template.name}: ${template.description}`}
      role="button"
      tabIndex={0}
    >
      <span className="template-item-icon">{icon}</span>
      <div className="template-item-content">
        <span className="template-item-name">{template.name}</span>
        <span className="template-item-description">{template.description}</span>
        <span className="template-item-count">{blockSummary}</span>
      </div>
      <span className="template-item-color-bar" style={{ backgroundColor: color }} />
      {onDelete && !template.isBuiltIn && (
        <button
          className="template-item-delete"
          onClick={handleDelete}
          title="删除模板"
          aria-label="Delete template"
        >
          🗑️
        </button>
      )}
    </div>
  )
}

export default TemplatePanel
