/**
 * Menu Event Handler
 * 
 * Handles menu actions from the Electron main process and syncs state back.
 * Connects menu actions to the appropriate stores and managers.
 * 
 * Requirements: 1.2, 1.3, 2.2, 2.3, 3.2, 4.2, 4.3
 */

import { useEditorStore } from '../store/editorStore'
import { projectManager, electronFileSystem } from '../project/ProjectManager'
import { 
  selectSdkPath, 
  isGameRunning 
} from '../project/GameLauncher'
import { findDefaultFile } from '../utils/FileClassifier'
import { useSettingsStore } from '../settings/settingsStore'
import { showUnsavedChangesDialog } from '../store/confirmDialogStore'
import type { EditorMode } from '../types/editor'

// ============================================================================
// Types
// ============================================================================

/**
 * Menu action event from main process
 */
interface MenuActionEvent {
  action: string
  payload?: unknown
}

/**
 * Menu state for synchronization with main process
 */
interface MenuState {
  projectOpen: boolean
  gameRunning: boolean
  canUndo: boolean
  canRedo: boolean
  currentMode: 'story' | 'multi-label'
  previewVisible: boolean
  propertiesVisible: boolean
}

/**
 * Extended Electron API type for menu operations
 */
interface ElectronMenuAPI {
  onMenuAction: (callback: (event: MenuActionEvent) => void) => void
  removeMenuActionListener: () => void
  updateMenuState: (state: Partial<MenuState>) => void
  getRecentProjects: () => Promise<string[]>
  addRecentProject: (projectPath: string) => Promise<void>
  clearRecentProjects: () => Promise<void>
  openDirectory: () => Promise<string | null>
}

/**
 * Get the electron API with menu operations
 */
function getElectronMenuAPI(): ElectronMenuAPI | null {
  // The menu APIs are defined in preload/index.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = window.electronAPI as any
  if (!api) return null
  
  // Check if menu APIs are available
  if (typeof api.onMenuAction !== 'function') return null
  
  return api as ElectronMenuAPI
}

/**
 * Callbacks for UI actions that need component-level handling
 */
export interface MenuEventCallbacks {
  onOpenProjectDialog?: () => void
  onNewProjectDialog?: () => void
  onOpenSettingsDialog?: () => void
  onShowKeyboardShortcuts?: () => void
  onShowAbout?: () => void
  onTogglePreviewPanel?: () => void
  onTogglePropertiesPanel?: () => void
}

// ============================================================================
// State
// ============================================================================

let callbacks: MenuEventCallbacks = {}
let isInitialized = false

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * Handle new project action
 * Requirement: 1.2 (Open Project triggers directory picker)
 */
async function handleNewProject(): Promise<void> {
  if (callbacks.onNewProjectDialog) {
    callbacks.onNewProjectDialog()
  }
}

/**
 * Handle open project action
 * Requirement: 1.2
 */
async function handleOpenProject(): Promise<void> {
  if (callbacks.onOpenProjectDialog) {
    callbacks.onOpenProjectDialog()
  } else {
    // Fallback: use electron API directly
    const api = getElectronMenuAPI()
    if (api) {
      const path = await api.openDirectory()
      if (path) {
        await openProjectByPath(path)
      }
    }
  }
}

/**
 * Handle open recent project action
 * Requirement: 1.6
 */
async function handleOpenRecentProject(projectPath: string): Promise<void> {
  await openProjectByPath(projectPath)
}

/**
 * Check if there are unsaved changes in the current project
 * Returns true if there are unsaved changes
 */
function hasUnsavedChanges(): boolean {
  const modifiedScripts = projectManager.getModifiedScripts()
  const settingsStore = useSettingsStore.getState()
  const hasModifiedSettings = settingsStore.gui.modified || settingsStore.project.modified
  
  return modifiedScripts.length > 0 || hasModifiedSettings
}

/**
 * Prompt user to save unsaved changes before switching projects
 * Returns true if user wants to proceed, false if cancelled
 */
async function promptSaveChanges(): Promise<boolean> {
  const modifiedScripts = projectManager.getModifiedScripts()
  const settingsStore = useSettingsStore.getState()
  const hasModifiedSettings = settingsStore.gui.modified || settingsStore.project.modified
  
  const items: string[] = []
  if (modifiedScripts.length > 0) {
    items.push(`${modifiedScripts.length} 个脚本`)
  }
  if (hasModifiedSettings) {
    items.push('设置')
  }
  
  // Use Figma-style confirm dialog
  const result = await showUnsavedChangesDialog(items.join(' 和 '))
  
  if (result === 'save') {
    // Trigger save and wait for it to complete
    window.dispatchEvent(new CustomEvent('editor:save'))
    // Give some time for save to complete
    await new Promise(resolve => setTimeout(resolve, 500))
    return true
  } else if (result === 'discard') {
    // Continue without saving
    return true
  } else {
    // Cancel - don't proceed
    return false
  }
}

/**
 * Open a project by path and update stores
 * Reuses the same logic as LeftPanel.handleOpenProject
 */
async function openProjectByPath(projectPath: string): Promise<void> {
  // Check for unsaved changes before switching projects
  if (hasUnsavedChanges()) {
    const shouldProceed = await promptSaveChanges()
    if (!shouldProceed) {
      return // User cancelled
    }
  }
  
  const result = await projectManager.openProject(projectPath)
  
  if (result.success && result.project) {
    const editorStore = useEditorStore.getState()
    
    // Update editor store with project info
    editorStore.setProjectPath(projectPath)
    
    // Find the best default file to open (prioritizes script.rpy, then story scripts)
    // Implements Requirements 1.4, 1.5
    const defaultFilePath = findDefaultFile(result.project.scripts)
    if (defaultFilePath) {
      // Set current file first so AST changes can be tracked
      editorStore.setCurrentFile(defaultFilePath)
      const defaultScript = result.project.scripts.get(defaultFilePath)
      if (defaultScript) {
        editorStore.setAst(defaultScript)
      }
    }
    
    // Reset history after loading project to prevent undo from going back to empty state
    editorStore.resetHistory()
    
    // Clear modified scripts since we just loaded the project
    projectManager.clearModifiedScripts()
    
    // Load settings from gui.rpy and options.rpy
    // Implements Requirement 9.1
    const settingsFileSystem = {
      readFile: (path: string) => electronFileSystem.readFile(path),
      writeFile: (path: string, content: string) => electronFileSystem.writeFile(path, content),
      exists: (path: string) => electronFileSystem.exists(path),
    }
    
    try {
      await useSettingsStore.getState().loadSettings(projectPath, settingsFileSystem)
    } catch (settingsError) {
      console.error('Failed to load settings:', settingsError)
      // Don't fail project open if settings fail to load
    }
    
    // Add to recent projects
    const api = getElectronMenuAPI()
    if (api) {
      await api.addRecentProject(projectPath)
    }
    
    // Sync menu state
    syncMenuState()
  }
}

/**
 * Handle save action
 * Requirement: 1.3
 * 
 * Dispatches editor:save event to trigger MainLayout's handleSave,
 * which includes full save logic with status feedback.
 */
async function handleSave(): Promise<void> {
  // Dispatch event to trigger MainLayout's save handler
  // This reuses the existing save logic with proper status feedback
  window.dispatchEvent(new CustomEvent('editor:save'))
}

/**
 * Handle undo action
 * Requirement: 2.2
 */
function handleUndo(): void {
  const editorStore = useEditorStore.getState()
  editorStore.undo()
  syncMenuState()
}

/**
 * Handle redo action
 * Requirement: 2.3
 */
function handleRedo(): void {
  const editorStore = useEditorStore.getState()
  editorStore.redo()
  syncMenuState()
}

/**
 * Handle view mode change
 * Requirement: 3.2
 */
function handleSetViewMode(mode: string): void {
  if (mode === 'story' || mode === 'multi-label') {
    const editorStore = useEditorStore.getState()
    editorStore.setMode(mode as EditorMode)
    syncMenuState()
  }
}

/**
 * Handle toggle preview panel
 * Requirement: 3.4
 */
function handleTogglePreviewPanel(): void {
  const editorStore = useEditorStore.getState()
  editorStore.togglePreviewPanel()
  
  // Also call callback if provided for UI-specific handling
  if (callbacks.onTogglePreviewPanel) {
    callbacks.onTogglePreviewPanel()
  }
  
  syncMenuState()
}

/**
 * Handle toggle properties panel
 * Requirement: 3.4
 */
function handleTogglePropertiesPanel(): void {
  const editorStore = useEditorStore.getState()
  editorStore.togglePropertiesPanel()
  
  // Also call callback if provided for UI-specific handling
  if (callbacks.onTogglePropertiesPanel) {
    callbacks.onTogglePropertiesPanel()
  }
  
  syncMenuState()
}

/**
 * Handle run game action
 * Requirement: 4.2
 * 
 * Dispatches editor:launch-game event to trigger Header's handleLaunchGame,
 * which includes full launch logic with save and status feedback.
 */
async function handleRunGame(): Promise<void> {
  // Dispatch event to trigger Header's launch handler
  // This reuses the existing launch logic with proper save and status feedback
  window.dispatchEvent(new CustomEvent('editor:launch-game'))
}

/**
 * Handle stop game action
 * Requirement: 4.3
 * 
 * Dispatches editor:stop-game event to trigger Header's handleStopGame,
 * which includes proper status feedback.
 */
async function handleStopGame(): Promise<void> {
  // Dispatch event to trigger Header's stop handler
  window.dispatchEvent(new CustomEvent('editor:stop-game'))
}

/**
 * Handle open project settings action
 * Requirement: 4.4
 */
function handleOpenProjectSettings(): void {
  if (callbacks.onOpenSettingsDialog) {
    callbacks.onOpenSettingsDialog()
  }
}

/**
 * Handle configure SDK action
 */
async function handleConfigureSdk(): Promise<void> {
  await selectSdkPath()
}

/**
 * Handle show keyboard shortcuts action
 */
function handleShowKeyboardShortcuts(): void {
  if (callbacks.onShowKeyboardShortcuts) {
    callbacks.onShowKeyboardShortcuts()
  }
}

/**
 * Handle show about action
 */
function handleShowAbout(): void {
  if (callbacks.onShowAbout) {
    callbacks.onShowAbout()
  }
}

// ============================================================================
// Menu Action Router
// ============================================================================

/**
 * Route menu action to appropriate handler
 */
async function handleMenuAction(event: MenuActionEvent): Promise<void> {
  const { action, payload } = event
  
  switch (action) {
    case 'newProject':
      await handleNewProject()
      break
    case 'openProject':
      await handleOpenProject()
      break
    case 'openRecentProject':
      if (typeof payload === 'string') {
        await handleOpenRecentProject(payload)
      }
      break
    case 'save':
      await handleSave()
      break
    case 'undo':
      handleUndo()
      break
    case 'redo':
      handleRedo()
      break
    case 'setViewMode':
      if (typeof payload === 'string') {
        handleSetViewMode(payload)
      }
      break
    case 'togglePreviewPanel':
      handleTogglePreviewPanel()
      break
    case 'togglePropertiesPanel':
      handleTogglePropertiesPanel()
      break
    case 'runGame':
      await handleRunGame()
      break
    case 'stopGame':
      await handleStopGame()
      break
    case 'openProjectSettings':
      handleOpenProjectSettings()
      break
    case 'configureSdk':
      await handleConfigureSdk()
      break
    case 'showKeyboardShortcuts':
      handleShowKeyboardShortcuts()
      break
    case 'showAbout':
      handleShowAbout()
      break
    default:
      console.warn('Unknown menu action:', action)
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Register menu event handlers
 * Sets up IPC listener for menu actions from main process
 */
export function registerMenuEventHandlers(eventCallbacks?: MenuEventCallbacks): void {
  if (isInitialized) {
    // Update callbacks if already initialized
    if (eventCallbacks) {
      callbacks = { ...callbacks, ...eventCallbacks }
    }
    return
  }
  
  if (eventCallbacks) {
    callbacks = eventCallbacks
  }
  
  const api = getElectronMenuAPI()
  if (api) {
    api.onMenuAction(handleMenuAction)
    isInitialized = true
  }
}

/**
 * Unregister menu event handlers
 * Cleans up IPC listener
 */
export function unregisterMenuEventHandlers(): void {
  const api = getElectronMenuAPI()
  if (api) {
    api.removeMenuActionListener()
  }
  callbacks = {}
  isInitialized = false
}

/**
 * Update menu event callbacks
 */
export function updateMenuEventCallbacks(newCallbacks: Partial<MenuEventCallbacks>): void {
  callbacks = { ...callbacks, ...newCallbacks }
}

/**
 * Sync menu state to main process
 * Should be called after any state change that affects menu items
 */
export async function syncMenuState(): Promise<void> {
  const api = getElectronMenuAPI()
  if (!api) {
    return
  }
  
  const editorStore = useEditorStore.getState()
  const gameRunning = await isGameRunning()
  
  const state: MenuState = {
    projectOpen: editorStore.projectPath !== null,
    gameRunning,
    canUndo: editorStore.canUndo,
    canRedo: editorStore.canRedo,
    currentMode: editorStore.mode as 'story' | 'multi-label',
    // Get panel visibility from EditorStore (Requirements 3.4, 3.5)
    previewVisible: editorStore.previewVisible,
    propertiesVisible: editorStore.propertiesVisible,
  }
  
  api.updateMenuState(state)
}

/**
 * Sync menu state with panel visibility
 * Called by UI components when panel visibility changes
 */
export function syncMenuStateWithPanels(
  previewVisible: boolean, 
  propertiesVisible: boolean
): void {
  const api = getElectronMenuAPI()
  if (!api) {
    return
  }
  
  api.updateMenuState({
    previewVisible,
    propertiesVisible,
  })
}

/**
 * Get current menu state (for testing)
 */
export async function getCurrentMenuState(): Promise<MenuState> {
  const editorStore = useEditorStore.getState()
  const gameRunning = await isGameRunning()
  
  return {
    projectOpen: editorStore.projectPath !== null,
    gameRunning,
    canUndo: editorStore.canUndo,
    canRedo: editorStore.canRedo,
    currentMode: editorStore.mode as 'story' | 'multi-label',
    previewVisible: editorStore.previewVisible,
    propertiesVisible: editorStore.propertiesVisible,
  }
}
