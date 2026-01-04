import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { EditorMode } from '../../types/editor'

/**
 * ModeSwitcher component - Toggle between Story Mode and Node Mode
 * Implements Requirements 2.1: Provide Story Mode and Node Mode editing views
 */
export const ModeSwitcher: React.FC = () => {
  const { mode, setMode } = useEditorStore()

  const handleModeChange = (newMode: EditorMode) => {
    setMode(newMode)
  }

  return (
    <div className="mode-switcher" role="tablist" aria-label="Editor mode">
      <button
        role="tab"
        aria-selected={mode === 'story'}
        className={`mode-button ${mode === 'story' ? 'active' : ''}`}
        onClick={() => handleModeChange('story')}
        title="Story Mode - Linear script editing"
      >
        <span className="mode-icon">📖</span>
        <span className="mode-label">Story Mode</span>
      </button>
      <button
        role="tab"
        aria-selected={mode === 'node'}
        className={`mode-button ${mode === 'node' ? 'active' : ''}`}
        onClick={() => handleModeChange('node')}
        title="Node Mode - Flow chart editing"
      >
        <span className="mode-icon">🔗</span>
        <span className="mode-label">Node Mode</span>
      </button>
    </div>
  )
}
