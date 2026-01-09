import { create } from 'zustand'
import { HistoryManager, HistoryEntry } from './HistoryManager'
import { EditorMode, ComplexityLevel, EditorState } from '../types/editor'
import { RenpyScript, DefineNode, DefaultNode } from '../types/ast'
import { projectManager } from '../project/ProjectManager'
import { parseCharacterValue } from '../components/character/types'

/**
 * Aggregated character info with source file
 * Implements Requirements 4.1, 4.5
 */
export interface AggregatedCharacter {
  /** Character variable name */
  name: string
  /** Display name */
  displayName: string
  /** Character color */
  color?: string
  /** Image prefix */
  imagePrefix?: string
  /** Source file path */
  sourceFile: string
  /** Source file display name */
  sourceFileName: string
}

/**
 * Aggregated variable info with source file
 * Implements Requirements 4.2, 4.5
 */
export interface AggregatedVariable {
  /** Variable name */
  name: string
  /** Variable value */
  value: string
  /** Variable scope (define/default/persistent) */
  scope: 'define' | 'default' | 'persistent'
  /** Source file path */
  sourceFile: string
  /** Source file display name */
  sourceFileName: string
}

/**
 * Script file information for the script selector
 * Implements Requirements 1.2, 1.5, 1.9
 */
export interface ScriptFileInfo {
  /** Full file path */
  path: string
  /** Display name (filename without path) */
  name: string
  /** Whether the file has unsaved changes */
  modified: boolean
  /** Whether the file has parse errors */
  hasError?: boolean
  /** Error message if hasError is true */
  errorMessage?: string
}

/**
 * Unified script state (combines AST cache and undo/redo history)
 * Implements Requirements 4.6, 4.7
 */
export interface ScriptState {
  /** Parsed AST */
  ast: RenpyScript | null
  /** Undo/redo history for this script */
  undoHistory: {
    past: HistoryEntry<EditorState>[]
    future: HistoryEntry<EditorState>[]
  }
  /** Last accessed timestamp for LRU eviction */
  lastAccessed: number
  /** Whether the file has unsaved changes */
  modified: boolean
  /** Whether the file has parse errors */
  hasError: boolean
  /** Error message if hasError is true */
  errorMessage?: string
}

/** Maximum number of script states to cache */
const SCRIPT_STATE_MAX_SIZE = 10

// Create a history manager instance
const historyManager = new HistoryManager<EditorState>(100)

/**
 * List of modification operation types for tracking
 * Used by Property 3: Modification Tracking
 */
export type ModificationOperation = 
  | 'setMode'
  | 'setAst'
  | 'addCharacter'
  | 'updateCharacter'
  | 'deleteCharacter'
  | 'setCharacterLayers'
  | 'addLayerAttribute'
  | 'updateLayerAttribute'
  | 'removeLayerAttribute'
  | 'addVariable'
  | 'updateVariable'
  | 'deleteVariable'
  | 'addBlock'
  | 'updateBlock'
  | 'deleteBlock'
  | 'addNode'
  | 'updateNode'
  | 'deleteNode'
  | 'connectNodes'
  | 'disconnectNodes'

export interface EditorStore {
  // Editor mode state
  mode: EditorMode
  complexity: ComplexityLevel
  
  // Project state
  projectPath: string | null
  currentFile: string | null
  modified: boolean
  
  // AST state - shared between Story Mode and Multi-Label View
  ast: RenpyScript | null
  
  // AST version - increments on undo/redo to trigger re-renders
  astVersion: number
  
  // Selection state
  selectedNodeId: string | null
  selectedBlockId: string | null
  
  // Block mode state
  currentBlockLabel: string | null
  
  // Panel visibility state (Requirements 3.4, 3.5)
  previewVisible: boolean
  propertiesVisible: boolean
  
  // History state (read-only from store perspective)
  canUndo: boolean
  canRedo: boolean
  
  // Multi-script state (Requirements 1.2, 1.6, 1.9)
  scriptFiles: ScriptFileInfo[]
  
  // Unified script state management (Requirements 4.6, 4.7)
  scriptStates: Map<string, ScriptState>
  
  // Loading state
  isLoading: boolean
  loadingFile: string | null
  
  // Aggregated resources from all scripts (Requirements 4.1, 4.2, 4.5)
  allCharacters: AggregatedCharacter[]
  allVariables: AggregatedVariable[]
  
  // Actions
  setMode: (mode: EditorMode) => void
  setComplexity: (complexity: ComplexityLevel) => void
  setProjectPath: (path: string | null) => void
  setCurrentFile: (file: string | null) => void
  setModified: (modified: boolean) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedBlockId: (id: string | null) => void
  setAst: (ast: RenpyScript | null) => void
  
  // Block mode actions
  enterBlockMode: (labelName: string) => void
  exitBlockMode: () => void
  
  // Panel visibility actions (Requirements 3.4, 3.5)
  togglePreviewPanel: () => void
  togglePropertiesPanel: () => void
  setPreviewVisible: (visible: boolean) => void
  setPropertiesVisible: (visible: boolean) => void
  
  // History actions
  undo: () => void
  redo: () => void
  pushToHistory: () => void
  resetHistory: () => void
  
  // Multi-script actions (Requirements 1.2, 1.6, 1.9, 3.1-3.8)
  refreshScriptFiles: () => void
  switchScript: (filePath: string) => Promise<void>
  switchToNextScript: () => void
  switchToPrevScript: () => void
  createNewScript: (fileName: string) => Promise<boolean>
  reloadCurrentScript: () => Promise<void>
  
  // Cross-file resource aggregation (Requirements 4.1, 4.2, 4.5)
  aggregateResources: () => void
  
  // Get current state snapshot
  getStateSnapshot: () => EditorState
}

// Helper to create state snapshot with deep copy of AST
function createStateSnapshot(state: Partial<EditorStore>): EditorState {
  return {
    mode: state.mode ?? 'multi-label',
    complexity: state.complexity ?? 'simple',
    projectPath: state.projectPath ?? null,
    currentFile: state.currentFile ?? null,
    modified: state.modified ?? false,
    selectedNodeId: state.selectedNodeId ?? null,
    selectedBlockId: state.selectedBlockId ?? null,
    currentBlockLabel: state.currentBlockLabel ?? null,
    // Deep copy AST to prevent mutations from affecting history
    ast: state.ast ? JSON.parse(JSON.stringify(state.ast)) : null,
  }
}

export const useEditorStore = create<EditorStore>((set, get) => {
  // Initialize history with initial state
  const initialState: EditorState = {
    mode: 'multi-label',
    complexity: 'simple',
    projectPath: null,
    currentFile: null,
    modified: false,
    selectedNodeId: null,
    selectedBlockId: null,
    currentBlockLabel: null,
    ast: null,
  }
  historyManager.initialize(initialState)

  return {
    // Initial state - default to multi-label mode
    mode: 'multi-label',
    complexity: 'simple',
    projectPath: null,
    currentFile: null,
    modified: false,
    selectedNodeId: null,
    selectedBlockId: null,
    currentBlockLabel: null,
    ast: null,
    astVersion: 0,
    // Panel visibility - default to visible (Requirements 3.4, 3.5)
    previewVisible: true,
    propertiesVisible: true,
    canUndo: false,
    canRedo: false,
    // Multi-script state (Requirements 1.2, 1.6, 1.9)
    scriptFiles: [],
    scriptStates: new Map<string, ScriptState>(),
    isLoading: false,
    loadingFile: null,
    // Aggregated resources from all scripts (Requirements 4.1, 4.2, 4.5)
    allCharacters: [],
    allVariables: [],
    
    // Actions that modify state and push to history
    setMode: (mode) => {
      const state = get()
      // Push current state to history before change
      // Mode switching preserves AST data (Property 2: Mode Synchronization)
      historyManager.push(createStateSnapshot(state))
      set({ 
        mode, 
        modified: true,
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo(),
        // AST is preserved - both modes share the same data
      })
    },
    
    setComplexity: (complexity) => {
      // Complexity change doesn't affect data, no history push needed
      // Property 4: Complexity Level Data Preservation
      set({ complexity })
    },
    
    setProjectPath: (projectPath) => {
      const state = get()
      historyManager.push(createStateSnapshot(state))
      set({ 
        projectPath,
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo(),
      })
    },
    
    setCurrentFile: (currentFile) => {
      const state = get()
      historyManager.push(createStateSnapshot(state))
      set({ 
        currentFile,
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo(),
      })
    },
    
    setModified: (modified) => {
      set({ modified })
    },
    
    setSelectedNodeId: (selectedNodeId) => {
      // Selection changes don't need history
      set({ selectedNodeId })
    },
    
    setSelectedBlockId: (selectedBlockId) => {
      // Selection changes don't need history
      set({ selectedBlockId })
    },
    
    setAst: (ast) => {
      const state = get()
      historyManager.push(createStateSnapshot(state))
      
      // Mark the current file as modified in projectManager
      if (state.currentFile) {
        projectManager.markScriptModified(state.currentFile)
        // Also update the script in projectManager
        if (ast) {
          projectManager.updateScript(state.currentFile, ast)
        }
      }
      
      set({
        ast,
        modified: true,
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo(),
      })
    },
    
    // Panel visibility actions (Requirements 3.4, 3.5)
    togglePreviewPanel: () => {
      const state = get()
      set({ previewVisible: !state.previewVisible })
    },
    
    togglePropertiesPanel: () => {
      const state = get()
      set({ propertiesVisible: !state.propertiesVisible })
    },
    
    setPreviewVisible: (visible) => {
      set({ previewVisible: visible })
    },
    
    setPropertiesVisible: (visible) => {
      set({ propertiesVisible: visible })
    },
    
    // History actions
    undo: () => {
      const previousState = historyManager.undo()
      if (previousState) {
        const currentState = get()
        set({
          ...previousState,
          // Preserve current mode when undoing
          mode: currentState.mode,
          // Increment astVersion to trigger re-renders
          astVersion: currentState.astVersion + 1,
          canUndo: historyManager.canUndo(),
          canRedo: historyManager.canRedo(),
        })
      }
    },
    
    redo: () => {
      const nextState = historyManager.redo()
      if (nextState) {
        const currentState = get()
        set({
          ...nextState,
          // Preserve current mode when redoing
          mode: currentState.mode,
          // Increment astVersion to trigger re-renders
          astVersion: currentState.astVersion + 1,
          canUndo: historyManager.canUndo(),
          canRedo: historyManager.canRedo(),
        })
      }
    },
    
    pushToHistory: () => {
      const state = get()
      historyManager.push(createStateSnapshot(state))
      set({
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo(),
      })
    },

    // Reset history with current state as the new initial state
    // Used when loading a project to prevent undo from going back to empty state
    resetHistory: () => {
      const state = get()
      historyManager.initialize(createStateSnapshot(state))
      set({
        canUndo: false,
        canRedo: false,
      })
    },
    
    // Block mode actions
    enterBlockMode: (labelName) => {
      set({ 
        mode: 'block',
        currentBlockLabel: labelName 
      })
    },
    
    exitBlockMode: () => {
      set({ 
        mode: 'multi-label',
        currentBlockLabel: null 
      })
    },
    
    getStateSnapshot: () => {
      return createStateSnapshot(get())
    },
    
    /**
     * Refresh the script files list from ProjectManager
     * Implements Requirements 1.2, 1.6, 1.9
     */
    refreshScriptFiles: () => {
      const scriptPaths = projectManager.getScriptFiles()
      
      // Convert to ScriptFileInfo format
      const scriptFiles: ScriptFileInfo[] = scriptPaths.map(path => {
        // Extract filename from path
        const parts = path.split(/[/\\]/)
        const name = parts[parts.length - 1] || path
        
        // Check if modified
        const modified = projectManager.isScriptModified(path)
        
        // Check for errors in scriptStates
        const state = get()
        const scriptState = state.scriptStates.get(path)
        
        return {
          path,
          name,
          modified,
          hasError: scriptState?.hasError ?? false,
          errorMessage: scriptState?.errorMessage,
        }
      })
      
      // Sort files: script.rpy first, then alphabetically
      scriptFiles.sort((a, b) => {
        // script.rpy always comes first
        if (a.name === 'script.rpy') return -1
        if (b.name === 'script.rpy') return 1
        // Otherwise sort alphabetically
        return a.name.localeCompare(b.name)
      })
      
      set({ scriptFiles })
    },
    
    /**
     * Switch to a different script file
     * Implements Requirements 3.1, 3.2, 3.3, 3.4, 3.6
     */
    switchScript: async (filePath: string) => {
      const state = get()
      
      // Don't switch if already on this file
      if (state.currentFile === filePath) {
        return
      }
      
      // Set loading state
      set({ isLoading: true, loadingFile: filePath })
      
      try {
        // Save current script state before switching
        if (state.currentFile && state.ast) {
          const currentScriptState: ScriptState = {
            ast: JSON.parse(JSON.stringify(state.ast)),
            undoHistory: {
              past: [],  // History is managed by historyManager
              future: [],
            },
            lastAccessed: Date.now(),
            modified: projectManager.isScriptModified(state.currentFile),
            hasError: false,
          }
          
          const newScriptStates = new Map(state.scriptStates)
          newScriptStates.set(state.currentFile, currentScriptState)
          
          // LRU cleanup: remove oldest entries if over limit
          if (newScriptStates.size > SCRIPT_STATE_MAX_SIZE) {
            const entries = Array.from(newScriptStates.entries())
              .filter(([path]) => !projectManager.isScriptModified(path)) // Don't evict modified files
              .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
            
            while (newScriptStates.size > SCRIPT_STATE_MAX_SIZE && entries.length > 0) {
              const oldest = entries.shift()
              if (oldest) {
                newScriptStates.delete(oldest[0])
              }
            }
          }
          
          set({ scriptStates: newScriptStates })
          
          // Update AST in ProjectManager
          projectManager.updateScript(state.currentFile, state.ast)
        }
        
        // Try to load from cache first
        let newAst: RenpyScript | null = null
        let hasError = false
        let errorMessage: string | undefined
        
        const cachedState = state.scriptStates.get(filePath)
        if (cachedState?.ast) {
          newAst = cachedState.ast
          hasError = cachedState.hasError
          errorMessage = cachedState.errorMessage
        } else {
          // Load from ProjectManager
          const scriptAst = projectManager.getScript(filePath)
          if (scriptAst) {
            newAst = scriptAst
          } else {
            // Script not in ProjectManager, this shouldn't happen normally
            hasError = true
            errorMessage = `Script not found: ${filePath}`
          }
        }
        
        // Update script state cache
        const newScriptStates = new Map(get().scriptStates)
        newScriptStates.set(filePath, {
          ast: newAst ? JSON.parse(JSON.stringify(newAst)) : null,
          undoHistory: { past: [], future: [] },
          lastAccessed: Date.now(),
          modified: projectManager.isScriptModified(filePath),
          hasError,
          errorMessage,
        })
        
        // Reset history for the new file
        historyManager.initialize(createStateSnapshot({
          ...state,
          currentFile: filePath,
          ast: newAst,
          selectedNodeId: null,
          selectedBlockId: null,
        }))
        
        // Update state: reset selection, preserve mode
        set({
          currentFile: filePath,
          ast: newAst,
          selectedNodeId: null,
          selectedBlockId: null,
          // Preserve mode (Requirements 3.4)
          // mode: state.mode,
          scriptStates: newScriptStates,
          isLoading: false,
          loadingFile: null,
          canUndo: false,
          canRedo: false,
        })
        
        // Refresh script files to update modified indicators
        get().refreshScriptFiles()
        
      } catch (error) {
        console.error('Failed to switch script:', error)
        set({ isLoading: false, loadingFile: null })
      }
    },
    
    /**
     * Switch to the next script in the list
     * Implements Requirement 6.1
     */
    switchToNextScript: () => {
      const state = get()
      if (state.scriptFiles.length <= 1 || !state.currentFile) {
        return
      }
      
      const currentIndex = state.scriptFiles.findIndex(f => f.path === state.currentFile)
      const nextIndex = (currentIndex + 1) % state.scriptFiles.length
      const nextFile = state.scriptFiles[nextIndex]
      
      if (nextFile) {
        get().switchScript(nextFile.path)
      }
    },
    
    /**
     * Switch to the previous script in the list
     * Implements Requirement 6.2
     */
    switchToPrevScript: () => {
      const state = get()
      if (state.scriptFiles.length <= 1 || !state.currentFile) {
        return
      }
      
      const currentIndex = state.scriptFiles.findIndex(f => f.path === state.currentFile)
      const prevIndex = (currentIndex - 1 + state.scriptFiles.length) % state.scriptFiles.length
      const prevFile = state.scriptFiles[prevIndex]
      
      if (prevFile) {
        get().switchScript(prevFile.path)
      }
    },
    
    /**
     * Create a new script file
     * Implements Requirements 2.5, 2.6
     */
    createNewScript: async (fileName: string) => {
      // Ensure .rpy extension
      if (!fileName.endsWith('.rpy')) {
        fileName += '.rpy'
      }
      
      // Generate default template
      const labelName = fileName.replace('.rpy', '').replace(/[^a-zA-Z0-9_]/g, '_')
      const template = `# ${fileName}
# 由 Ren'Py Visual Editor 创建

label ${labelName}:
    "这是一个新的场景。"
    return
`
      
      const result = await projectManager.createScript(fileName, template)
      
      if (result.success) {
        // Refresh script files list
        get().refreshScriptFiles()
        
        // Get the new file path
        const project = projectManager.getProject()
        if (project) {
          const newFilePath = Array.from(project.scripts.keys()).find(p => p.endsWith(fileName))
          if (newFilePath) {
            // Switch to the new file
            await get().switchScript(newFilePath)
            return true
          }
        }
      }
      
      return false
    },
    
    /**
     * Reload the current script from disk
     * Implements Requirement 3.8
     */
    reloadCurrentScript: async () => {
      const state = get()
      if (!state.currentFile) {
        return
      }
      
      set({ isLoading: true, loadingFile: state.currentFile })
      
      try {
        // Get fresh AST from ProjectManager
        const ast = projectManager.getScript(state.currentFile)
        
        if (ast) {
          // Update script state cache
          const newScriptStates = new Map(state.scriptStates)
          newScriptStates.set(state.currentFile, {
            ast: JSON.parse(JSON.stringify(ast)),
            undoHistory: { past: [], future: [] },
            lastAccessed: Date.now(),
            modified: false,
            hasError: false,
          })
          
          // Reset history
          historyManager.initialize(createStateSnapshot({
            ...state,
            ast,
          }))
          
          set({
            ast,
            scriptStates: newScriptStates,
            isLoading: false,
            loadingFile: null,
            canUndo: false,
            canRedo: false,
          })
          
          // Refresh script files to update modified indicators
          get().refreshScriptFiles()
        }
      } catch (error) {
        console.error('Failed to reload script:', error)
        set({ isLoading: false, loadingFile: null })
      }
    },
    
    /**
     * Aggregate characters and variables from all script files
     * Implements Requirements 4.1, 4.2, 4.5
     */
    aggregateResources: () => {
      const project = projectManager.getProject()
      if (!project) {
        set({ allCharacters: [], allVariables: [] })
        return
      }
      
      const allCharacters: AggregatedCharacter[] = []
      const allVariables: AggregatedVariable[] = []
      
      // Helper to extract filename from path
      const getFileName = (path: string): string => {
        const parts = path.split(/[/\\]/)
        return parts[parts.length - 1] || path
      }
      
      // Iterate through all scripts in the project
      for (const [filePath, ast] of project.scripts.entries()) {
        const fileName = getFileName(filePath)
        
        // Process each statement in the AST
        for (const statement of ast.statements) {
          if (statement.type === 'define') {
            const defineNode = statement as DefineNode
            
            // Check if it's a Character definition
            if (defineNode.value.startsWith('Character(')) {
              const parsed = parseCharacterValue(defineNode.value)
              if (parsed) {
                allCharacters.push({
                  name: defineNode.name,
                  displayName: parsed.displayName || defineNode.name,
                  color: parsed.color,
                  imagePrefix: parsed.imagePrefix,
                  sourceFile: filePath,
                  sourceFileName: fileName,
                })
              }
            } else {
              // Regular define variable (not a Character)
              allVariables.push({
                name: defineNode.name,
                value: defineNode.value,
                scope: 'define',
                sourceFile: filePath,
                sourceFileName: fileName,
              })
            }
          } else if (statement.type === 'default') {
            const defaultNode = statement as DefaultNode
            
            // Check if it's a persistent variable
            if (defaultNode.name.startsWith('persistent.')) {
              allVariables.push({
                name: defaultNode.name.substring('persistent.'.length),
                value: defaultNode.value,
                scope: 'persistent',
                sourceFile: filePath,
                sourceFileName: fileName,
              })
            } else {
              allVariables.push({
                name: defaultNode.name,
                value: defaultNode.value,
                scope: 'default',
                sourceFile: filePath,
                sourceFileName: fileName,
              })
            }
          }
        }
      }
      
      set({ allCharacters, allVariables })
    },
  }
})

// Export the history manager for testing
export { historyManager }

// Export a function to get the current state snapshot for history
export function getEditorStateSnapshot(): EditorState {
  const state = useEditorStore.getState()
  return createStateSnapshot(state)
}

/**
 * Mark the editor as modified
 * This function should be called by any store that makes changes to the project data
 * Implements Property 3: Modification Tracking
 * Validates: Requirements 1.4
 */
export function markAsModified(): void {
  useEditorStore.getState().setModified(true)
}

/**
 * Check if the editor has unsaved modifications
 */
export function isModified(): boolean {
  return useEditorStore.getState().modified
}

/**
 * Clear the modified flag (typically after saving)
 */
export function clearModified(): void {
  useEditorStore.getState().setModified(false)
}
