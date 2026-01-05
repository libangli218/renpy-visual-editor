import React, { useCallback, useMemo } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { PreviewPanel } from './PreviewPanel'
import { NodeModeEditor } from '../nodeMode'
import { StoryModeEditor } from '../storyMode'
import { BlockModeEditor } from '../blockMode'
import { LabelNode } from '../../types/ast'

/**
 * EditorArea component - Main editing area with preview and editor
 * 
 * Structure:
 * - Top: Preview panel (scene preview) - hidden in block mode
 * - Bottom: Edit panel (Story Mode, Node Mode, or Block Mode editor)
 * 
 * Implements Requirements:
 * - 9.1-9.5: Mode switching between flow and block modes
 */
export const EditorArea: React.FC = () => {
  const { mode, ast, currentBlockLabel, exitBlockMode, setAst } = useEditorStore()

  /**
   * Handle returning from block mode to flow mode
   * Implements Requirement 9.3: Click back to return to flow mode
   * Implements Requirement 9.4: Preserve unsaved changes
   */
  const handleBlockModeBack = useCallback(() => {
    exitBlockMode()
  }, [exitBlockMode])

  /**
   * Handle AST changes from block mode
   * Implements Requirement 9.4: Preserve unsaved changes
   */
  const handleAstChange = useCallback((newAst: typeof ast) => {
    if (newAst) {
      setAst(newAst)
    }
  }, [setAst])

  /**
   * Get available labels from AST for jump/call targets
   */
  const availableLabels = useMemo(() => {
    if (!ast) return []
    return ast.statements
      .filter(s => s.type === 'label')
      .map(s => (s as LabelNode).name)
  }, [ast])

  /**
   * Get available characters from AST
   */
  const availableCharacters = useMemo(() => {
    if (!ast) return []
    const characters = new Set<string>()
    // Extract character names from define statements
    ast.statements.forEach(s => {
      if (s.type === 'define' && 'value' in s) {
        // Check if it's a Character definition
        const value = s.value as string
        if (value && value.includes('Character')) {
          characters.add(s.name)
        }
      }
    })
    return Array.from(characters)
  }, [ast])

  // Render block mode editor when in block mode
  if (mode === 'block' && currentBlockLabel && ast) {
    return (
      <section className="editor-area editor-area-block-mode" aria-label="Block editor area">
        <BlockModeEditor
          labelName={currentBlockLabel}
          ast={ast}
          onBack={handleBlockModeBack}
          onAstChange={handleAstChange}
          availableLabels={availableLabels}
          availableCharacters={availableCharacters}
        />
      </section>
    )
  }

  // Render normal editor area for story/node modes
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
