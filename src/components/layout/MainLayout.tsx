import React, { useEffect, useState, useCallback, useRef } from 'react'
import { LeftPanel } from './LeftPanel'
import { RightPanel } from './RightPanel'
import { EditorArea } from './EditorArea'
import { Header } from './Header'
import { SettingsDialog } from '../settings/SettingsDialog'
import { AboutDialog } from '../about/AboutDialog'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { projectManager, electronFileSystem } from '../../project/ProjectManager'
import { useEditorStore } from '../../store/editorStore'
import { useSettingsStore } from '../../settings/settingsStore'
import { useSettingsDialogStore } from '../../store/settingsDialogStore'
import { useConfirmDialogStore } from '../../store/confirmDialogStore'
import { useKeyboardStore } from '../keyboard/keyboardStore'
import { 
  registerMenuEventHandlers, 
  unregisterMenuEventHandlers,
  syncMenuState,
  type MenuEventCallbacks 
} from '../../menu'
import { registerGameListeners, removeGameListeners } from '../../project/GameLauncher'
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
  const [gameRunning, setGameRunning] = useState(false)
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false)
  
  // Track AST changes to mark scripts as modified
  const { ast, currentFile, modified, projectPath, canUndo, canRedo, mode, propertiesVisible } = useEditorStore()
  const previousAstRef = useRef(ast)
  const isInitialLoadRef = useRef(true)

  // Settings store for saving settings
  const { saveSettings, gui, project } = useSettingsStore()
  
  // Settings dialog store for controlling dialog visibility
  const { isOpen: settingsDialogOpen, openSettingsDialog, closeSettingsDialog } = useSettingsDialogStore()
  
  // Keyboard store for controlling help panel visibility
  const { openHelpPanel } = useKeyboardStore()
  
  // Confirm dialog store for global confirmation dialogs
  const { isOpen: confirmDialogOpen, options: confirmDialogOptions, handleResult: handleConfirmResult } = useConfirmDialogStore()
  
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
  /**
   * Register menu event handlers
   * Connects menu actions to the appropriate stores and UI callbacks
   * Requirements: 1.2, 1.3, 2.2, 2.3, 3.2, 4.2, 4.3, 4.4
   * 
   * Note: onOpenProjectDialog is NOT set here - menuEventHandler.ts
   * will use its fallback logic to directly open the directory picker
   * and call openProjectByPath(), which is the designed behavior.
   */
  useEffect(() => {
    const menuCallbacks: MenuEventCallbacks = {
      // onOpenProjectDialog not set - uses fallback in menuEventHandler.ts
      onNewProjectDialog: () => {
        // Dispatch event to open new project dialog
        window.dispatchEvent(new CustomEvent('menu:newProject'))
      },
      onOpenSettingsDialog: () => {
        // Dispatch event to open settings dialog
        window.dispatchEvent(new CustomEvent('menu:openSettings'))
      },
      onShowKeyboardShortcuts: () => {
        // Dispatch event to show keyboard shortcuts
        window.dispatchEvent(new CustomEvent('menu:showKeyboardShortcuts'))
      },
      onShowAbout: () => {
        // Dispatch event to show about dialog
        window.dispatchEvent(new CustomEvent('menu:showAbout'))
      },
      onTogglePreviewPanel: () => {
        // Dispatch event to toggle preview panel
        window.dispatchEvent(new CustomEvent('menu:togglePreviewPanel'))
      },
      onTogglePropertiesPanel: () => {
        // Dispatch event to toggle properties panel
        window.dispatchEvent(new CustomEvent('menu:togglePropertiesPanel'))
      },
    }

    registerMenuEventHandlers(menuCallbacks)

    // Initial sync of menu state
    syncMenuState()

    return () => {
      unregisterMenuEventHandlers()
    }
  }, [])

  /**
   * Register game event listeners for menu state sync
   * Syncs menu state when game starts, stops, or exits
   * Requirements: 8.2, 8.3
   */
  useEffect(() => {
    const handleGameError = (_error: string) => {
      // Game encountered an error, update running state
      setGameRunning(false)
      syncMenuState()
    }

    const handleGameExit = (_code: number | null) => {
      // Game exited, update running state
      setGameRunning(false)
      syncMenuState()
    }

    registerGameListeners(handleGameError, handleGameExit)

    return () => {
      removeGameListeners()
    }
  }, [])

  /**
   * Listen for game state changes from menu actions
   * Updates local state when game is launched or stopped via menu
   */
  useEffect(() => {
    const handleGameStarted = () => {
      setGameRunning(true)
      syncMenuState()
    }

    const handleGameStopped = () => {
      setGameRunning(false)
      syncMenuState()
    }

    window.addEventListener('game:started', handleGameStarted)
    window.addEventListener('game:stopped', handleGameStopped)

    return () => {
      window.removeEventListener('game:started', handleGameStarted)
      window.removeEventListener('game:stopped', handleGameStopped)
    }
  }, [])

  /**
   * Listen for menu:openSettings event to open settings dialog
   * Requirement 6.1: Settings dialog appears as modal window
   */
  useEffect(() => {
    const handleOpenSettings = () => {
      openSettingsDialog()
    }

    window.addEventListener('menu:openSettings', handleOpenSettings)

    return () => {
      window.removeEventListener('menu:openSettings', handleOpenSettings)
    }
  }, [openSettingsDialog])

  /**
   * Listen for menu:showKeyboardShortcuts event to open keyboard shortcuts panel
   * Requirement 17.2: Keyboard shortcuts help panel
   */
  useEffect(() => {
    const handleShowKeyboardShortcuts = () => {
      openHelpPanel()
    }

    window.addEventListener('menu:showKeyboardShortcuts', handleShowKeyboardShortcuts)

    return () => {
      window.removeEventListener('menu:showKeyboardShortcuts', handleShowKeyboardShortcuts)
    }
  }, [openHelpPanel])

  /**
   * Listen for menu:showAbout event to open about dialog
   */
  useEffect(() => {
    const handleShowAbout = () => {
      setAboutDialogOpen(true)
    }

    window.addEventListener('menu:showAbout', handleShowAbout)

    return () => {
      window.removeEventListener('menu:showAbout', handleShowAbout)
    }
  }, [])

  /**
   * Sync menu state when relevant store values change
   * Requirements: 8.1, 8.2, 8.3
   * - Sync after project open/close (projectPath change)
   * - Sync after undo/redo (canUndo, canRedo change)
   * - Sync after mode change (mode change)
   * - Game state is synced via game event listeners
   */
  useEffect(() => {
    syncMenuState()
  }, [projectPath, modified, canUndo, canRedo, mode, gameRunning])

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
        {propertiesVisible && <RightPanel />}
      </main>
      {/* Settings Dialog - Requirement 6.1 */}
      <SettingsDialog isOpen={settingsDialogOpen} onClose={closeSettingsDialog} />
      {/* About Dialog */}
      <AboutDialog isOpen={aboutDialogOpen} onClose={() => setAboutDialogOpen(false)} />
      {/* Global Confirm Dialog */}
      {confirmDialogOptions && (
        <ConfirmDialog
          isOpen={confirmDialogOpen}
          title={confirmDialogOptions.title}
          message={confirmDialogOptions.message}
          showSaveOption={confirmDialogOptions.showSaveOption}
          confirmLabel={confirmDialogOptions.confirmLabel}
          cancelLabel={confirmDialogOptions.cancelLabel}
          discardLabel={confirmDialogOptions.discardLabel}
          onResult={handleConfirmResult}
        />
      )}
    </div>
  )
}
