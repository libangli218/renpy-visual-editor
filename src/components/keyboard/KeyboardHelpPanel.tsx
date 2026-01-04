/**
 * KeyboardHelpPanel Component
 * 
 * Displays a modal panel showing all available keyboard shortcuts.
 * Implements Requirements 17.2
 */

import React from 'react'
import { useKeyboardStore } from './keyboardStore'
import { formatShortcut, SHORTCUT_CATEGORY_INFO } from './types'
import './KeyboardHelpPanel.css'

/**
 * KeyboardHelpPanel - Modal panel showing keyboard shortcuts
 * Press ? to show, Escape to close
 */
export const KeyboardHelpPanel: React.FC = () => {
  const { 
    helpPanelOpen, 
    closeHelpPanel, 
    getGroupedShortcuts,
    getSortedCategories,
  } = useKeyboardStore()
  
  if (!helpPanelOpen) {
    return null
  }
  
  const groupedShortcuts = getGroupedShortcuts()
  const sortedCategories = getSortedCategories()
  
  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeHelpPanel()
    }
  }
  
  return (
    <div className="keyboard-help-backdrop" onClick={handleBackdropClick}>
      <div className="keyboard-help-panel">
        <div className="keyboard-help-header">
          <h2>快捷键</h2>
          <button 
            className="keyboard-help-close"
            onClick={closeHelpPanel}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        
        <div className="keyboard-help-content">
          {sortedCategories.map((category) => {
            const shortcuts = groupedShortcuts.get(category)
            if (!shortcuts || shortcuts.length === 0) {
              return null
            }
            
            const categoryInfo = SHORTCUT_CATEGORY_INFO[category]
            
            return (
              <div key={category} className="keyboard-help-category">
                <h3 className="keyboard-help-category-title">
                  {categoryInfo.name}
                </h3>
                <div className="keyboard-help-shortcuts">
                  {shortcuts
                    .filter((s) => s.enabled !== false)
                    // Filter out alternative shortcuts (they have -alt suffix)
                    .filter((s) => !s.id.endsWith('-alt'))
                    .map((shortcut) => (
                      <div key={shortcut.id} className="keyboard-help-shortcut">
                        <span className="keyboard-help-key">
                          {formatShortcut(shortcut)}
                        </span>
                        <span className="keyboard-help-description">
                          {shortcut.description}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="keyboard-help-footer">
          <span className="keyboard-help-hint">
            按 <kbd>Esc</kbd> 或 <kbd>?</kbd> 关闭
          </span>
        </div>
      </div>
    </div>
  )
}

export default KeyboardHelpPanel
