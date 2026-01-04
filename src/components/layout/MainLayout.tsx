import React, { useEffect, useState, useCallback, useRef } from 'react'
import { LeftPanel } from './LeftPanel'
import { RightPanel } from './RightPanel'
import { EditorArea } from './EditorArea'
import { Header } from './Header'
import { projectManager } from '../../project/ProjectManager'
import { useEditorStore } from '../../store/editorStore'
import './MainLayout.css'

/**
 * MainLayout component - The primary layout structure for the editor
 * Implements Requirements 1.3: Display project structure in left panel
 * 
 * Layout structure:
 * - Header: Title, mode switcher, complexity switcher
 * - Left Panel: Project browser (scenes, characters, backgrounds, audio, variables)
 * - Center: Editor area with preview panel on top and edit panel below
 * - Right Panel: Properties panel for selected elements
 */
export const MainLayout: React.FC = () => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState<string>('')
  
  // Track AST changes to mark scripts as modified
  const { ast, currentFile, modified } = useEditorStore()
  const previousAstRef = useRef(ast)
  const isInitialLoadRef = useRef(true)

  /**
   * Track AST changes and mark the current file as modified
   */
  useEffect(() => {
    // Skip initial load - don't mark as modified when first loading
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      previousAstRef.current = ast
      return
    }

    // If AST changed and we have a current file, mark it as modified
    if (ast !== previousAstRef.current && currentFile && modified) {
      projectManager.markScriptModified(currentFile)
    }
    
    previousAstRef.current = ast
  }, [ast, currentFile, modified])

  /**
   * Reset initial load flag when file changes
   */
  useEffect(() => {
    isInitialLoadRef.current = true
  }, [currentFile])

  /**
   * Handle save project
   * Implements Ctrl+S save functionality
   */
  const handleSave = useCallback(async () => {
    if (!projectManager.getProject()) {
      setSaveStatus('error')
      setSaveMessage('没有打开的项目')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }

    const modifiedCount = projectManager.getModifiedScripts().length
    if (modifiedCount === 0) {
      setSaveStatus('saved')
      setSaveMessage('没有需要保存的修改')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }

    setSaveStatus('saving')
    setSaveMessage(`正在保存 ${modifiedCount} 个文件...`)

    try {
      const result = await projectManager.saveProject()
      
      if (result.success) {
        setSaveStatus('saved')
        setSaveMessage(`已保存 ${modifiedCount} 个文件`)
      } else {
        setSaveStatus('error')
        setSaveMessage(result.error || '保存失败')
      }
    } catch (error) {
      setSaveStatus('error')
      setSaveMessage(error instanceof Error ? error.message : '保存失败')
    }

    // Reset status after 2 seconds
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [])

  /**
   * Listen for editor:save event (triggered by Ctrl+S)
   */
  useEffect(() => {
    const handleSaveEvent = () => {
      handleSave()
    }

    window.addEventListener('editor:save', handleSaveEvent)

    return () => {
      window.removeEventListener('editor:save', handleSaveEvent)
    }
  }, [handleSave])

  return (
    <div className="main-layout">
      <Header />
      {/* Save status indicator */}
      {saveStatus !== 'idle' && (
        <div className={`save-status save-status-${saveStatus}`}>
          {saveStatus === 'saving' && '💾 '}
          {saveStatus === 'saved' && '✅ '}
          {saveStatus === 'error' && '❌ '}
          {saveMessage}
        </div>
      )}
      <main className="main-content">
        <LeftPanel />
        <EditorArea />
        <RightPanel />
      </main>
    </div>
  )
}
