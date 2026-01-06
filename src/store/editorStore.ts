import { create } from 'zustand'
import { HistoryManager } from './HistoryManager'
import { EditorMode, ComplexityLevel, EditorState } from '../types/editor'
import { RenpyScript } from '../types/ast'

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
  
  // History state (read-only from store perspective)
  canUndo: boolean
  canRedo: boolean
  
  // Actions
  setMode: (mode: EditorMode) => void
  setComplexity: (complexity: ComplexityLevel) => void
  setProjectPath: (path: string | null) => void
  setCurrentFile: (file: string | null) => void
  setModified: (modified: boolean) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedBlockId: (id: string | null) => void
  setAst: (ast: RenpyScript | null) => void
  
  // History actions
  undo: () => void
  redo: () => void
  pushToHistory: () => void
  resetHistory: () => void
  
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
    ast: null,
    astVersion: 0,
    canUndo: false,
    canRedo: false,
    
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
      set({
        ast,
        modified: true,
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo(),
      })
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
    
    getStateSnapshot: () => {
      return createStateSnapshot(get())
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
