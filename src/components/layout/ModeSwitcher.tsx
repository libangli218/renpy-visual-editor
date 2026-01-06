import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { EditorMode } from '../../types/editor'

/**
 * ModeSwitcher component - Toggle between Story Mode and Multi-Label View
 * Implements Requirements 7.1: Default to Multi-Label View
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
        aria-selected={mode === 'multi-label'}
        className={`mode-button ${mode === 'multi-label' ? 'active' : ''}`}
        onClick={() => handleModeChange('multi-label')}
        title="Multi-Label View - Edit all labels in a grid"
      >
        <span className="mode-icon">🧩</span>
        <span className="mode-label">Multi-Label</span>
      </button>
    </div>
  )
}
