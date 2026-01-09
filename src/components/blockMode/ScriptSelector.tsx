/**
 * ScriptSelector Component
 * 脚本选择器组件
 * 
 * Provides a dropdown for selecting and switching between script files.
 * 
 * Requirements:
 * - 1.1: Display dropdown in toolbar showing current script file name
 * - 1.4: Show visual indicator (•) for unsaved changes
 * - 1.5: Display file names without full path
 * - 1.10: Support filtering by typing file name
 * - 3.8: Provide "重新加载" option
 * - 5.1: Show modified indicator (•) next to files with unsaved changes
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react'
import { ScriptFileInfo } from '../../store/editorStore'
import './ScriptSelector.css'

/**
 * Props for ScriptSelector component
 */
export interface ScriptSelectorProps {
  /** Current selected script file path */
  currentFile: string | null
  /** All available script files */
  scriptFiles: ScriptFileInfo[]
  /** Callback when script is changed - returns Promise for error handling */
  onScriptChange: (filePath: string) => void | Promise<void>
  /** Callback to reload current file */
  onReload: () => void | Promise<void>
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Whether currently loading */
  isLoading?: boolean
  /** Additional class name */
  className?: string
  /** Error message to display (for switch failures) */
  switchError?: string | null
  /** Callback to clear switch error */
  onClearError?: () => void
}

/**
 * ScriptSelector - Dropdown for selecting script files
 * 
 * Implements Requirements:
 * - 1.1: Dropdown in toolbar showing current script
 * - 1.4, 5.1: Modified indicator (•)
 * - 1.5: Display names without path
 * - 1.10: Filter by typing
 * - 3.8: Reload option
 */
export const ScriptSelector: React.FC<ScriptSelectorProps> = memo(({
  currentFile,
  scriptFiles,
  onScriptChange,
  onReload,
  disabled = false,
  isLoading = false,
  className = '',
  switchError = null,
  onClearError,
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [localError, setLocalError] = useState<string | null>(null)
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Combined error state
  const errorMessage = switchError || localError

  // Get current file info
  const currentFileInfo = scriptFiles.find(f => f.path === currentFile)
  const displayName = currentFileInfo?.name || '无脚本文件'

  // Filter files based on input
  const filteredFiles = filterText.trim()
    ? scriptFiles.filter(f => 
        f.name.toLowerCase().includes(filterText.toLowerCase())
      )
    : scriptFiles

  // Clear error when dropdown closes
  const handleCloseDropdown = useCallback(() => {
    setIsOpen(false)
    setFilterText('')
    setHighlightedIndex(-1)
    setLocalError(null)
    onClearError?.()
  }, [onClearError])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleCloseDropdown()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, handleCloseDropdown])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('.script-item')
      const item = items[highlightedIndex] as HTMLElement
      if (item) {
        item.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  // Toggle dropdown
  const handleToggle = useCallback(() => {
    if (disabled || isLoading) return
    setIsOpen(prev => !prev)
    if (!isOpen) {
      setFilterText('')
      setHighlightedIndex(-1)
    }
  }, [disabled, isLoading, isOpen])

  // Handle file selection
  const handleSelect = useCallback(async (filePath: string) => {
    if (filePath !== currentFile) {
      // Clear any previous errors
      setLocalError(null)
      onClearError?.()
      
      try {
        await onScriptChange(filePath)
      } catch (error) {
        // Handle switch failure
        const errorMsg = error instanceof Error ? error.message : '切换脚本失败'
        setLocalError(errorMsg)
        // Don't close dropdown on error so user can try again or reload
        return
      }
    }
    setIsOpen(false)
    setFilterText('')
    setHighlightedIndex(-1)
  }, [currentFile, onScriptChange, onClearError])

  // Handle reload
  const handleReload = useCallback(async () => {
    setLocalError(null)
    onClearError?.()
    
    try {
      await onReload()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '重新加载失败'
      setLocalError(errorMsg)
      return
    }
    setIsOpen(false)
    setFilterText('')
  }, [onReload, onClearError])

  // Handle filter input change
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value)
    setHighlightedIndex(0)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredFiles.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredFiles.length) {
          handleSelect(filteredFiles[highlightedIndex].path)
        }
        break
      case 'Escape':
        e.preventDefault()
        handleCloseDropdown()
        break
    }
  }, [isOpen, filteredFiles, highlightedIndex, handleSelect, handleCloseDropdown])

  return (
    <div 
      ref={containerRef}
      className={`script-selector ${className} ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        className="script-selector-trigger"
        onClick={handleToggle}
        disabled={disabled || isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="选择脚本文件"
        title={currentFile || '选择脚本文件'}
      >
        <span className="script-icon">📄</span>
        <span className="script-name">
          {isLoading ? '加载中...' : displayName}
        </span>
        {currentFileInfo?.modified && (
          <span className="modified-indicator" title="有未保存的修改">•</span>
        )}
        {currentFileInfo?.hasError && (
          <span className="error-indicator" title={currentFileInfo.errorMessage || '解析错误'}>!</span>
        )}
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▾</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="script-selector-dropdown">
          {/* Filter Input */}
          <div className="script-filter">
            <span className="filter-icon">🔍</span>
            <input
              ref={inputRef}
              type="text"
              className="filter-input"
              placeholder="搜索脚本..."
              value={filterText}
              onChange={handleFilterChange}
              aria-label="过滤脚本文件"
            />
            {filterText && (
              <button
                className="filter-clear"
                onClick={() => {
                  setFilterText('')
                  inputRef.current?.focus()
                }}
                aria-label="清除过滤"
              >
                ✕
              </button>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="script-error-message">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{errorMessage}</span>
              <button
                className="error-dismiss"
                onClick={() => {
                  setLocalError(null)
                  onClearError?.()
                }}
                aria-label="关闭错误提示"
              >
                ✕
              </button>
            </div>
          )}

          {/* File List */}
          <div 
            ref={listRef}
            className="script-list"
            role="listbox"
            aria-label="脚本文件列表"
          >
            {filteredFiles.length === 0 ? (
              <div className="script-empty">
                {filterText ? '没有匹配的文件' : '没有脚本文件'}
              </div>
            ) : (
              filteredFiles.map((file, index) => (
                <div
                  key={file.path}
                  className={`script-item ${file.path === currentFile ? 'selected' : ''} ${index === highlightedIndex ? 'highlighted' : ''} ${file.hasError ? 'has-error' : ''}`}
                  onClick={() => handleSelect(file.path)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={file.path === currentFile}
                  title={file.path}
                >
                  <span className="item-icon">📄</span>
                  <span className="item-name">{file.name}</span>
                  {file.modified && (
                    <span className="item-modified" title="有未保存的修改">•</span>
                  )}
                  {file.hasError && (
                    <span className="item-error" title={file.errorMessage || '解析错误'}>!</span>
                  )}
                  {file.path === currentFile && (
                    <span className="item-check">✓</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Separator and Reload Option */}
          <div className="script-actions">
            <div className="script-separator" />
            <button
              className="script-action-btn"
              onClick={handleReload}
              title="从磁盘重新加载当前文件"
            >
              <span className="action-icon">🔄</span>
              <span className="action-text">重新加载</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

// Display name for debugging
ScriptSelector.displayName = 'ScriptSelector'

export default ScriptSelector
