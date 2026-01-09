import React, { useCallback, useMemo, useEffect, useState } from 'react'
import { useEditorStore, AggregatedCharacter, AggregatedVariable } from '../../store/editorStore'
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
 * - 1.1: Script selector in toolbar
 * - 2.1: New script button
 * - 7.1: Default to Multi-Label View when opening project
 * - 7.3: Remove BlockModeEditor independent entry
 * - 3.4: Toggle Preview Panel visibility
 */
export const EditorArea: React.FC = () => {
  const { 
    mode, 
    ast, 
    setAst, 
    projectPath, 
    previewVisible,
    // Multi-script state
    currentFile,
    scriptFiles,
    isLoading,
    switchScript,
    reloadCurrentScript,
    createNewScript,
    refreshScriptFiles,
    // Aggregated resources (Requirements 4.1, 4.2, 4.5)
    allCharacters,
    allVariables,
    aggregateResources,
  } = useEditorStore()
  
  // State for available resources
  const [availableImages, setAvailableImages] = useState<string[]>([])
  const [availableAudio, setAvailableAudio] = useState<string[]>([])
  const [imageTags, setImageTags] = useState<ImageTag[]>([])
  const [backgroundTags, setBackgroundTags] = useState<ImageTag[]>([])
  
  // State for script switch error
  const [scriptSwitchError, setScriptSwitchError] = useState<string | null>(null)

  // Refresh script files when project path changes
  useEffect(() => {
    if (projectPath) {
      refreshScriptFiles()
    }
  }, [projectPath, refreshScriptFiles])

  // Aggregate resources from all scripts when project changes or AST changes
  // Implements Requirements 4.1, 4.2, 4.5
  useEffect(() => {
    if (projectPath) {
      aggregateResources()
    }
  }, [projectPath, ast, aggregateResources])

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
   * Handle script change (Requirements 1.1, 1.3)
   */
  const handleScriptChange = useCallback(async (filePath: string) => {
    try {
      setScriptSwitchError(null)
      await switchScript(filePath)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '切换脚本失败'
      setScriptSwitchError(errorMsg)
      throw error
    }
  }, [switchScript])

  /**
   * Handle script reload (Requirement 3.8)
   */
  const handleScriptReload = useCallback(async () => {
    try {
      setScriptSwitchError(null)
      await reloadCurrentScript()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '重新加载失败'
      setScriptSwitchError(errorMsg)
      throw error
    }
  }, [reloadCurrentScript])

  /**
   * Handle create new script (Requirements 2.1, 2.5, 2.6)
   */
  const handleCreateScript = useCallback(async (fileName: string) => {
    try {
      setScriptSwitchError(null)
      const success = await createNewScript(fileName)
      if (!success) {
        throw new Error('创建脚本失败')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '创建脚本失败'
      setScriptSwitchError(errorMsg)
      throw error
    }
  }, [createNewScript])

  /**
   * Clear script switch error
   */
  const handleClearScriptError = useCallback(() => {
    setScriptSwitchError(null)
  }, [])

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
   * Get available characters from all scripts (aggregated)
   * Implements Requirements 4.1, 4.3, 4.5
   */
  const availableCharacters = useMemo(() => {
    // Use aggregated characters from all files
    return allCharacters.map(char => char.name)
  }, [allCharacters])

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
          aggregatedCharacters={allCharacters}
          availableImages={availableImages}
          availableAudio={availableAudio}
          imageTags={imageTags}
          backgroundTags={backgroundTags}
          projectPath={projectPath}
          // Multi-script props (Requirements 1.1, 2.1, 6.4)
          currentFile={currentFile}
          scriptFiles={scriptFiles}
          onScriptChange={handleScriptChange}
          onScriptReload={handleScriptReload}
          onCreateScript={handleCreateScript}
          isScriptLoading={isLoading}
          scriptSwitchError={scriptSwitchError}
          onClearScriptError={handleClearScriptError}
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
