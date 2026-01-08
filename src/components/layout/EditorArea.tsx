import React, { useCallback, useMemo, useEffect, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { PreviewPanel } from './PreviewPanel'
import { StoryModeEditor } from '../storyMode'
import { MultiLabelView } from '../blockMode'
import { LabelNode } from '../../types/ast'
import { resourceManager, ImageTag } from '../../resource/ResourceManager'

/**
 * EditorArea component - Main editing area with preview and editor
 * 
 * Structure:
 * - Top: Preview panel (scene preview) - hidden in multi-label mode or when previewVisible is false
 * - Bottom: Edit panel (Story Mode or Multi-Label View)
 * 
 * Implements Requirements:
 * - 7.1: Default to Multi-Label View when opening project
 * - 7.3: Remove BlockModeEditor independent entry
 * - 3.4: Toggle Preview Panel visibility
 */
export const EditorArea: React.FC = () => {
  const { mode, ast, setAst, projectPath, previewVisible } = useEditorStore()
  
  // State for available resources
  const [availableImages, setAvailableImages] = useState<string[]>([])
  const [availableAudio, setAvailableAudio] = useState<string[]>([])
  const [imageTags, setImageTags] = useState<ImageTag[]>([])
  const [backgroundTags, setBackgroundTags] = useState<ImageTag[]>([])

  // Scan resources when project path changes
  useEffect(() => {
    const scanResources = async () => {
      if (!projectPath) {
        setAvailableImages([])
        setAvailableAudio([])
        setImageTags([])
        setBackgroundTags([])
        return
      }

      try {
        await resourceManager.scanResources(projectPath)
        
        // Get images (backgrounds + general images)
        const backgrounds = resourceManager.getResources('background')
        const images = resourceManager.getResources('image')
        const allImages = [...backgrounds, ...images].map(r => r.name)
        setAvailableImages(allImages)
        
        // Get audio - use relative path from game/ directory
        const audio = resourceManager.getResources('audio')
        setAvailableAudio(audio.map(r => {
          // Convert absolute path to relative path from game/ directory
          // e.g., "C:/project/game/audio/jiangnang.mp3" -> "audio/jiangnang.mp3"
          const gamePath = projectPath + '/game/'
          if (r.path.includes(gamePath)) {
            return r.path.substring(r.path.indexOf(gamePath) + gamePath.length).replace(/\\/g, '/')
          }
          // Fallback: try to extract from path
          const audioMatch = r.path.match(/game[/\\](.+)$/)
          if (audioMatch) {
            return audioMatch[1].replace(/\\/g, '/')
          }
          return r.name
        }))
        
        // Get image tags for Show block
        const tags = resourceManager.getImageTags()
        const bgTags = resourceManager.getBackgroundTags()
        setImageTags(tags)
        setBackgroundTags(bgTags)
      } catch (error) {
        console.error('Failed to scan resources:', error)
        setAvailableImages([])
        setAvailableAudio([])
        setImageTags([])
        setBackgroundTags([])
      }
    }

    scanResources()
  }, [projectPath])

  /**
   * Handle AST changes from Multi-Label View
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

  // Render Multi-Label View when in multi-label mode (default)
  // Implements Requirement 7.1: Default to Multi-Label View
  if (mode === 'multi-label' && ast) {
    return (
      <section className="editor-area editor-area-multi-label-mode" aria-label="Multi-label editor area">
        <MultiLabelView
          ast={ast}
          onAstChange={handleAstChange}
          availableLabels={availableLabels}
          availableCharacters={availableCharacters}
          availableImages={availableImages}
          availableAudio={availableAudio}
          imageTags={imageTags}
          backgroundTags={backgroundTags}
          projectPath={projectPath}
        />
      </section>
    )
  }

  // Render normal editor area for story mode
  return (
    <section className="editor-area" aria-label="Editor area">
      {previewVisible && <PreviewPanel />}
      <div className="edit-panel">
        <StoryModeEditor />
      </div>
    </section>
  )
}
