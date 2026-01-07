/**
 * Menu Event Handler
 * 
 * Handles menu actions from the Electron main process and syncs state back.
 * Connects menu actions to the appropriate stores and managers.
 * 
 * Requirements: 1.2, 1.3, 2.2, 2.3, 3.2, 4.2, 4.3
 */

import { useEditorStore } from '../store/editorStore'
import { projectManager } from '../project/ProjectManager'
import { 
  launchGame, 
  stopGame, 
  selectSdkPath, 
  getSdkPath,
  isGameRunning 
} from '../project/GameLauncher'
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
 * Open a project by path and update stores
 */
async function openProjectByPath(projectPath: string): Promise<void> {
  const result = await projectManager.openProject(projectPath)
  
  if (result.success && result.project) {
    const editorStore = useEditorStore.getState()
    
    // Update editor store with project info
    editorStore.setProjectPath(projectPath)
    editorStore.setModified(false)
    editorStore.resetHistory()
    
    // Get the first script file and set it as current
    const scriptFiles = projectManager.getScriptFiles()
    if (scriptFiles.length > 0) {
      const firstScript = scriptFiles[0]
      editorStore.setCurrentFile(firstScript)
      
      const ast = projectManager.getScript(firstScript)
      if (ast) {
        editorStore.setAst(ast)
      }
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
 */
async function handleSave(): Promise<void> {
  const result = await projectManager.saveProject()
  
  if (result.success) {
    const editorStore = useEditorStore.getState()
    editorStore.setModified(false)
    syncMenuState()
  } else {
    console.error('Failed to save project:', result.error)
  }
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
  if (callbacks.onTogglePreviewPanel) {
    callbacks.onTogglePreviewPanel()
  }
  // State sync will be handled by the callback
}

/**
 * Handle toggle properties panel
 * Requirement: 3.4
 */
function handleTogglePropertiesPanel(): void {
  if (callbacks.onTogglePropertiesPanel) {
    callbacks.onTogglePropertiesPanel()
  }
  // State sync will be handled by the callback
}

/**
 * Handle run game action
 * Requirement: 4.2
 */
async function handleRunGame(): Promise<void> {
  const editorStore = useEditorStore.getState()
  const projectPath = editorStore.projectPath
  
  if (!projectPath) {
    console.error('No project open')
    return
  }
  
  const sdkPath = getSdkPath()
  if (!sdkPath) {
    // Prompt user to configure SDK
    const selectedPath = await selectSdkPath()
    if (!selectedPath) {
      return
    }
  }
  
  const result = await launchGame(projectPath)
  
  if (result.success) {
    // Dispatch event to notify MainLayout of game start
    window.dispatchEvent(new CustomEvent('game:started'))
    syncMenuState()
  } else {
    console.error('Failed to launch game:', result.error)
  }
}

/**
 * Handle stop game action
 * Requirement: 4.3
 */
async function handleStopGame(): Promise<void> {
  const result = await stopGame()
  
  if (result.success) {
    // Dispatch event to notify MainLayout of game stop
    window.dispatchEvent(new CustomEvent('game:stopped'))
    syncMenuState()
  } else {
    console.error('Failed to stop game:', result.error)
  }
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
    // These will be updated by the UI components via callbacks
    previewVisible: true,
    propertiesVisible: true,
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
    previewVisible: true,
    propertiesVisible: true,
  }
}
