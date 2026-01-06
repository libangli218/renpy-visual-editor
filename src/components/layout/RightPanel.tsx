import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { CharacterPropertiesPanel, useCharacterStore } from '../character'

/**
 * RightPanel component - Properties panel for selected elements
 * Implements Requirements 5.4, 6.6: Show properties for selected node/block
 * Implements Requirements 7.3: Character property editing
 * 
 * Shows different content based on:
 * - Selected character (shows CharacterPropertiesPanel)
 * - Selected block in Multi-Label View
 * - Complexity level (shows code preview in 'preview' and 'advanced' modes)
 */
export const RightPanel: React.FC = () => {
  const { selectedBlockId, complexity } = useEditorStore()
  const { selectedCharacterId } = useCharacterStore()

  return (
    <aside className="right-panel" aria-label="Properties panel">
      <div className="panel-header">
        <h2>Properties</h2>
      </div>
      
      <div className="panel-content">
        {/* Character properties panel - shown when a character is selected */}
        {selectedCharacterId ? (
          <CharacterPropertiesPanel
            showCodePreview={complexity === 'preview' || complexity === 'advanced'}
            allowCodeEdit={complexity === 'advanced'}
          />
        ) : !selectedBlockId ? (
          <div className="panel-empty">
            <p>Select an element to view its properties</p>
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
    </aside>
  )
}
