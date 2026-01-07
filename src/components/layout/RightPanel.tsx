import React, { useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { CharacterPropertiesPanel, useCharacterStore } from '../character'

/**
 * RightPanel component - Properties panel for selected elements (Figma-style collapsible)
 * Implements Requirements 5.4, 6.6: Show properties for selected node/block
 * Implements Requirements 7.3: Character property editing
 * 
 * Shows different content based on:
 * - Selected character (shows CharacterPropertiesPanel)
 * - Selected block in Multi-Label View
 * - Complexity level (shows code preview in 'preview' and 'advanced' modes)
 */

// Storage key for panel collapsed state
const PANEL_COLLAPSED_KEY = 'right-panel-collapsed'

export const RightPanel: React.FC = () => {
  const { selectedBlockId, complexity } = useEditorStore()
  const { selectedCharacterId } = useCharacterStore()
  
  // Panel collapsed state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(PANEL_COLLAPSED_KEY)
    return stored === 'true'
  })

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem(PANEL_COLLAPSED_KEY, String(isCollapsed))
  }, [isCollapsed])

  // Toggle panel collapse
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  return (
    <aside 
      className={`right-panel ${isCollapsed ? 'collapsed' : ''}`} 
      aria-label="Properties panel"
    >
      {/* Panel Header */}
      <div 
        className="panel-header"
        onDoubleClick={toggleCollapse}
      >
        <button
          className="panel-collapse-btn"
          onClick={toggleCollapse}
          title={isCollapsed ? '展开面板' : '折叠面板'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? '«' : '»'}
        </button>
        {!isCollapsed && <h2>Properties</h2>}
      </div>
      
      {/* Collapsed View */}
      {isCollapsed ? (
        <div className="panel-collapsed-content">
          <button
            className="collapsed-section-btn"
            onClick={() => setIsCollapsed(false)}
            title="属性"
          >
            ⚙️
          </button>
          <button
            className="collapsed-section-btn"
            onClick={() => setIsCollapsed(false)}
            title="代码"
          >
            {'</>'}
          </button>
        </div>
      ) : (
        /* Expanded View */
        <div className="panel-content">
          {/* Character properties panel - shown when a character is selected */}
          {selectedCharacterId ? (
            <CharacterPropertiesPanel
              showCodePreview={complexity === 'preview' || complexity === 'advanced'}
              allowCodeEdit={complexity === 'advanced'}
            />
          ) : !selectedBlockId ? (
            <div className="properties-empty">
              <div className="properties-empty-icon" />
              <p className="properties-empty-text">
                选择一个元素<br />查看其属性
              </p>
            </div>
          ) : (
            <div className="properties-content">
              {/* Properties will be rendered based on selected element type */}
              <div className="property-group">
                <h3 className="property-group-title">General</h3>
                <div className="property-item">
                  <label>ID</label>
                  <span className="property-value">
                    {selectedBlockId}
                  </span>
                </div>
              </div>
              
              {/* Code preview section - shown in preview and advanced modes */}
              {(complexity === 'preview' || complexity === 'advanced') && (
                <div className="property-group code-preview-group">
                  <h3 className="property-group-title">Generated Code</h3>
                  <div className="code-preview">
                    <pre>
                      <code># Code preview will appear here</code>
                    </pre>
                  </div>
                  {complexity === 'advanced' && (
                    <p className="code-edit-hint">
                      Edit code directly in advanced mode
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
