import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { PreviewPanel } from './PreviewPanel'
import { NodeModeEditor } from '../nodeMode'
import { StoryModeEditor } from '../storyMode'

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
