import React, { useEffect, useState, useCallback, useRef } from 'react'
import { LeftPanel } from './LeftPanel'
import { RightPanel } from './RightPanel'
import { EditorArea } from './EditorArea'
import { Header } from './Header'
import { projectManager, electronFileSystem } from '../../project/ProjectManager'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../settings/settingsStore'
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
  const { ast, currentFile, modified, projectPath } = useEditorStore()
  const previousAstRef = useRef(ast)
  const isInitialLoadRef = useRef(true)

  // Settings store for saving settings
  const { saveSettings, gui, project } = useSettingsStore()
  
  // Create file system adapter for settings
  const settingsFileSystem = {
    readFile: (path: string) => electronFileSystem.readFile(path),
    writeFile: (path: string, content: string) => electronFileSystem.writeFile(path, content),
    exists: (path: string) => electronFileSystem.exists(path),
  }

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
   * Also saves settings from gui.rpy and options.rpy (Requirement 8.2)
   */
  const handleSave = useCallback(async () => {
    if (!projectManager.getProject()) {
      setSaveStatus('error')
      setSaveMessage('没有打开的项目')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }

    const modifiedCount = projectManager.getModifiedScripts().length
    const hasModifiedSettings = gui.modified || project.modified
    
    if (modifiedCount === 0 && !hasModifiedSettings) {
      setSaveStatus('saved')
      setSaveMessage('没有需要保存的修改')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }

    setSaveStatus('saving')
    const itemsToSave: string[] = []
    if (modifiedCount > 0) itemsToSave.push(`${modifiedCount} 个脚本`)
    if (hasModifiedSettings) itemsToSave.push('设置')
    setSaveMessage(`正在保存 ${itemsToSave.join(' 和 ')}...`)

    try {
      let hasError = false
      let errorMessage = ''

      // Save scripts
      if (modifiedCount > 0) {
        const result = await projectManager.saveProject()
        if (!result.success) {
          hasError = true
          errorMessage = result.error || '保存脚本失败'
        }
      }

      // Save settings (Requirement 8.2)
      if (hasModifiedSettings && projectPath) {
        const settingsResult = await saveSettings(projectPath, settingsFileSystem)
        if (!settingsResult) {
          hasError = true
          errorMessage = errorMessage ? `${errorMessage}; 保存设置失败` : '保存设置失败'
        }
      }
      
      if (hasError) {
        setSaveStatus('error')
        setSaveMessage(errorMessage)
      } else {
        setSaveStatus('saved')
        setSaveMessage(`已保存 ${itemsToSave.join(' 和 ')}`)
      }
    } catch (error) {
      setSaveStatus('error')
      setSaveMessage(error instanceof Error ? error.message : '保存失败')
    }

    // Reset status after 2 seconds
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [gui.modified, project.modified, projectPath, saveSettings, settingsFileSystem])

  /**
   * Listen for editor:save:confirmed event (triggered after orphan check passes)
   * Also listen for editor:save event for backward compatibility when not in node mode
   */
  useEffect(() => {
    const handleSaveEvent = () => {
      handleSave()
    }

    // Listen for confirmed save (after orphan check)
    window.addEventListener('editor:save:confirmed', handleSaveEvent)
    // Also listen for direct save (when not in node mode)
    window.addEventListener('editor:save', handleSaveEvent)

    return () => {
      window.removeEventListener('editor:save:confirmed', handleSaveEvent)
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
