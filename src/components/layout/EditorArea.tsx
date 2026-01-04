import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { PreviewPanel } from './PreviewPanel'
import { NodeModeEditor } from '../nodeMode'

/**
 * EditorArea component - Main editing area with preview and editor
 * 
 * Structure:
 * - Top: Preview panel (scene preview)
 * - Bottom: Edit panel (Story Mode or Node Mode editor)
 */
export const EditorArea: React.FC = () => {
  const { mode } = useEditorStore()

  return (
    <section className="editor-area" aria-label="Editor area">
      <PreviewPanel />
      <div className="edit-panel">
        {mode === 'story' ? (
          <StoryModeEditor />
        ) : (
          <NodeModeEditor />
        )}
      </div>
    </section>
  )
}

/**
 * Placeholder for Story Mode Editor
 * Will be implemented in Task 10
 */
const StoryModeEditor: React.FC = () => {
  return (
    <div className="story-mode-editor" data-testid="story-mode-editor">
      <div className="editor-placeholder">
        <h3>Story Mode</h3>
        <p>Linear script editing view</p>
        <p className="placeholder-hint">
          Edit your visual novel as a script with dialogue blocks, 
          scene changes, and character actions.
        </p>
      </div>
    </div>
  )
}
