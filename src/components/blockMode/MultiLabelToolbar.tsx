/**
 * MultiLabelToolbar Component
 * 多 Label 视图工具栏组件
 * 
 * Provides toolbar functionality for the multi-label view including:
 * - Script selector for switching between .rpy files
 * - New script button
 * - Search box for filtering labels
 * - New label button
 * - Layout mode toggle (grid/list)
 * - Collapse/expand all buttons
 * 
 * Requirements: 1.1, 2.1, 4.3, 5.1, 5.2, 6.1, 6.4
 */

import React, { useCallback, useState, memo } from 'react'
import { LayoutMode } from './stores/multiLabelViewStore'
import { ScriptSelector } from './ScriptSelector'
import { NewScriptDialog } from './NewScriptDialog'
import { ScriptFileInfo } from '../../store/editorStore'
import './MultiLabelToolbar.css'

/**
 * Props for MultiLabelToolbar component
 */
export interface MultiLabelToolbarProps {
  /** Search query */
  searchQuery: string
  /** Search change callback */
  onSearchChange: (query: string) => void
  /** Search select callback - called when user selects a label from search */
  onSearchSelect?: (labelName: string) => void
  /** Create new label callback - receives the validated label name */
  onCreateLabel: (labelName: string) => void
  /** Layout mode */
  layoutMode: LayoutMode
  /** Layout change callback */
  onLayoutChange: (mode: LayoutMode) => void
  /** Collapse all callback */
  onCollapseAll?: () => void
  /** Expand all callback */
  onExpandAll?: () => void
  /** Total label count */
  labelCount?: number
  /** Filtered label count (when searching) */
  filteredCount?: number
  /** Whether in read-only mode */
  readOnly?: boolean
  /** Additional class name */
  className?: string
  /** Existing label names for duplicate validation */
  existingLabelNames?: string[]
  /** Current zoom level percentage (e.g., 100 for 100%) */
  zoomLevel?: number
  /** Reset zoom callback */
  onResetZoom?: () => void
  /** Fit all labels callback */
  onFitAll?: () => void
  
  // Multi-script props (Requirements 1.1, 2.1, 6.4)
  /** Current script file path */
  currentFile?: string | null
  /** All available script files */
  scriptFiles?: ScriptFileInfo[]
  /** Callback when script is changed */
  onScriptChange?: (filePath: string) => void | Promise<void>
  /** Callback to reload current script */
  onScriptReload?: () => void | Promise<void>
  /** Callback to create new script */
  onCreateScript?: (fileName: string) => void | Promise<void>
  /** Whether script operations are loading */
  isScriptLoading?: boolean
  /** Error message for script switch failures */
  scriptSwitchError?: string | null
  /** Callback to clear script switch error */
  onClearScriptError?: () => void
}

/**
 * MultiLabelToolbar - Toolbar for multi-label view
 * 
 * Implements Requirements:
 * - 1.1: Script selector dropdown in toolbar
 * - 2.1: New script button next to script selector
 * - 4.3: Layout mode switching (grid/list)
 * - 5.1: New label button
 * - 5.2: Prompt for label name on create
 * - 6.1: Search box for filtering labels
 * - 6.4: Keyboard shortcut tooltip (Ctrl+N)
 */
export const MultiLabelToolbar: React.FC<MultiLabelToolbarProps> = memo(({
  searchQuery,
  onSearchChange,
  onSearchSelect,
  onCreateLabel,
  layoutMode,
  onLayoutChange,
  onCollapseAll,
  onExpandAll,
  labelCount = 0,
  filteredCount,
  readOnly = false,
  className = '',
  existingLabelNames = [],
  zoomLevel = 100,
  onResetZoom,
  onFitAll,
  // Multi-script props
  currentFile = null,
  scriptFiles = [],
  onScriptChange,
  onScriptReload,
  onCreateScript,
  isScriptLoading = false,
  scriptSwitchError = null,
  onClearScriptError,
}) => {
  // State for new label dialog
  const [showNewLabelDialog, setShowNewLabelDialog] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelError, setNewLabelError] = useState('')
  
  // State for new script dialog (Requirement 2.1)
  const [showNewScriptDialog, setShowNewScriptDialog] = useState(false)
  const [isCreatingScript, setIsCreatingScript] = useState(false)

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }, [onSearchChange])

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    onSearchChange('')
  }, [onSearchChange])

  // Handle layout toggle
  const handleLayoutToggle = useCallback((mode: LayoutMode) => {
    onLayoutChange(mode)
  }, [onLayoutChange])

  // Handle new label button click
  const handleNewLabelClick = useCallback(() => {
    setNewLabelName('')
    setNewLabelError('')
    setShowNewLabelDialog(true)
  }, [])

  // Handle new label name change
  const handleNewLabelNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewLabelName(e.target.value)
    setNewLabelError('')
  }, [])

  // Handle new label confirm
  const handleConfirmNewLabel = useCallback(() => {
    const trimmedName = newLabelName.trim()
    
    // Validate label name
    if (!trimmedName) {
      setNewLabelError('Label 名称不能为空')
      return
    }
    
    // Check for valid identifier (alphanumeric and underscore, starting with letter or underscore)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
      setNewLabelError('Label 名称只能包含字母、数字和下划线，且不能以数字开头')
      return
    }

    // Check for duplicate names
    if (existingLabelNames.includes(trimmedName)) {
      setNewLabelError(`Label "${trimmedName}" 已存在，请使用其他名称`)
      return
    }

    setShowNewLabelDialog(false)
    onCreateLabel(trimmedName)
  }, [newLabelName, onCreateLabel, existingLabelNames])

  // Handle new label cancel
  const handleCancelNewLabel = useCallback(() => {
    setShowNewLabelDialog(false)
    setNewLabelName('')
    setNewLabelError('')
  }, [])

  // Handle key press in new label input
  const handleNewLabelKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmNewLabel()
    } else if (e.key === 'Escape') {
      handleCancelNewLabel()
    }
  }, [handleConfirmNewLabel, handleCancelNewLabel])

  // Handle new script button click (Requirement 2.1)
  const handleNewScriptClick = useCallback(() => {
    setShowNewScriptDialog(true)
  }, [])

  // Handle new script dialog close
  const handleNewScriptDialogClose = useCallback(() => {
    setShowNewScriptDialog(false)
  }, [])

  // Handle new script creation (Requirement 2.1)
  const handleCreateScript = useCallback(async (fileName: string) => {
    if (!onCreateScript) return
    
    setIsCreatingScript(true)
    try {
      await onCreateScript(fileName)
      setShowNewScriptDialog(false)
    } catch (error) {
      // Error will be handled by the dialog
      throw error
    } finally {
      setIsCreatingScript(false)
    }
  }, [onCreateScript])

  // Get existing script file names for validation
  const existingScriptNames = scriptFiles.map(f => f.name)

  // Determine if showing filtered results
  const isFiltered = searchQuery.trim().length > 0
  const displayCount = isFiltered && filteredCount !== undefined ? filteredCount : labelCount

  // Check if multi-script features are enabled
  const hasMultiScriptSupport = onScriptChange && scriptFiles.length > 0

  return (
    <div className={`multi-label-toolbar ${className}`}>
      {/* Script Section: Script Selector and New Script Button (Requirements 1.1, 2.1) */}
      {hasMultiScriptSupport && (
        <div className="toolbar-section toolbar-scripts">
          <ScriptSelector
            currentFile={currentFile}
            scriptFiles={scriptFiles}
            onScriptChange={onScriptChange}
            onReload={onScriptReload || (() => {})}
            disabled={readOnly}
            isLoading={isScriptLoading}
            switchError={scriptSwitchError}
            onClearError={onClearScriptError}
          />
          {!readOnly && onCreateScript && (
            <button
              className="toolbar-button toolbar-new-script"
              onClick={handleNewScriptClick}
              title="新建脚本文件 (Ctrl+N)"
              disabled={isScriptLoading}
            >
              <span className="button-icon">📄</span>
              <span className="button-text">新建文件</span>
            </button>
          )}
        </div>
      )}

      {/* Left Section: Search */}
      <div className="toolbar-section toolbar-left">
        <div className="toolbar-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索 Label..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="搜索 Label"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={handleClearSearch}
              aria-label="清除搜索"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Center Section: Main Actions */}
      <div className="toolbar-section toolbar-center">
        {/* New Label Button - Primary Action */}
        {!readOnly && (
          <button
            className="toolbar-button toolbar-new-label"
            onClick={handleNewLabelClick}
            title="新建 Label (双击画布也可创建)"
          >
            <span className="button-icon">＋</span>
            <span className="button-text">新建</span>
          </button>
        )}

        {/* Collapse/Expand Group */}
        <div className="toolbar-button-group">
          {onCollapseAll && (
            <button
              className="toolbar-button toolbar-collapse-all"
              onClick={onCollapseAll}
              title="折叠全部"
            >
              <span className="button-icon">⊟</span>
              <span className="button-text">折叠</span>
            </button>
          )}
          {onExpandAll && (
            <button
              className="toolbar-button toolbar-expand-all"
              onClick={onExpandAll}
              title="展开全部"
            >
              <span className="button-icon">⊞</span>
              <span className="button-text">展开</span>
            </button>
          )}
        </div>

        {/* Label Count Badge */}
        <span className="toolbar-count">
          {isFiltered 
            ? `${displayCount}/${labelCount}`
            : `${labelCount} Labels`
          }
        </span>
      </div>

      {/* Right Section: Canvas Controls */}
      <div className="toolbar-section toolbar-right">
        <div className="canvas-controls" role="group" aria-label="画布控制">
          {/* Fit All Button */}
          {onFitAll && (
            <button
              className="toolbar-button toolbar-fit-all"
              onClick={onFitAll}
              title="适应全部 (F)"
            >
              <span className="button-icon">⊡</span>
              <span className="button-text">适应</span>
            </button>
          )}
          
          {/* Zoom Display and Reset */}
          <div className="zoom-control">
            <span className="zoom-level" title="当前缩放级别">
              {zoomLevel}%
            </span>
            {onResetZoom && zoomLevel !== 100 && (
              <button
                className="zoom-reset-btn"
                onClick={onResetZoom}
                title="重置缩放 (Ctrl+0)"
              >
                重置
              </button>
            )}
          </div>
        </div>

        {/* Layout Toggle - hidden in free canvas mode but kept for compatibility */}
        <div className="layout-toggle" role="group" aria-label="布局模式" style={{ display: 'none' }}>
          <button
            className={`layout-toggle-btn ${layoutMode === 'grid' ? 'active' : ''}`}
            onClick={() => handleLayoutToggle('grid')}
            title="网格布局"
            aria-pressed={layoutMode === 'grid'}
          >
            <span className="layout-icon">▦</span>
          </button>
          <button
            className={`layout-toggle-btn ${layoutMode === 'list' ? 'active' : ''}`}
            onClick={() => handleLayoutToggle('list')}
            title="列表布局"
            aria-pressed={layoutMode === 'list'}
          >
            <span className="layout-icon">☰</span>
          </button>
        </div>
      </div>

      {/* New Label Dialog */}
      {showNewLabelDialog && (
        <div className="new-label-dialog-overlay" onClick={handleCancelNewLabel}>
          <div 
            className="new-label-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-header">
              <span className="dialog-icon">🏷️</span>
              <h4>新建 Label</h4>
            </div>
            <div className="dialog-content">
              <label className="dialog-label">
                Label 名称
                <input
                  type="text"
                  className={`dialog-input ${newLabelError ? 'error' : ''}`}
                  value={newLabelName}
                  onChange={handleNewLabelNameChange}
                  onKeyDown={handleNewLabelKeyPress}
                  placeholder="例如: chapter1, ending_good"
                  autoFocus
                />
              </label>
              {newLabelError && (
                <span className="dialog-error">{newLabelError}</span>
              )}
              <p className="dialog-hint">
                Label 名称用于标识场景，只能包含字母、数字和下划线
              </p>
            </div>
            <div className="dialog-actions">
              <button
                className="dialog-cancel"
                onClick={handleCancelNewLabel}
              >
                取消
              </button>
              <button
                className="dialog-confirm"
                onClick={handleConfirmNewLabel}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Script Dialog (Requirement 2.1) */}
      {onCreateScript && (
        <NewScriptDialog
          isOpen={showNewScriptDialog}
          onClose={handleNewScriptDialogClose}
          onCreate={handleCreateScript}
          existingFiles={existingScriptNames}
          isCreating={isCreatingScript}
        />
      )}
    </div>
  )
})

// Display name for debugging
MultiLabelToolbar.displayName = 'MultiLabelToolbar'

export default MultiLabelToolbar
