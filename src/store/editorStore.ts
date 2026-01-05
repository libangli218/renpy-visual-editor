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
  
  // AST state - shared between Story Mode and Node Mode
  ast: RenpyScript | null
  
  // Selection state
  selectedNodeId: string | null
  selectedBlockId: string | null
  
  // Block mode state - the label being edited in block mode
  currentBlockLabel: string | null
  
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
  
  // Block mode actions
  setCurrentBlockLabel: (label: string | null) => void
  enterBlockMode: (labelName: string) => void
  exitBlockMode: () => void
  
  // History actions
  undo: () => void
  redo: () => void
  pushToHistory: () => void
  
  // Get current state snapshot
  getStateSnapshot: () => EditorState
}

// Helper to create state snapshot
function createStateSnapshot(state: Partial<EditorStore>): EditorState {
  return {
    mode: state.mode ?? 'story',
    complexity: state.complexity ?? 'simple',
    projectPath: state.projectPath ?? null,
    currentFile: state.currentFile ?? null,
    modified: state.modified ?? false,
    selectedNodeId: state.selectedNodeId ?? null,
    selectedBlockId: state.selectedBlockId ?? null,
    ast: state.ast ?? null,
    currentBlockLabel: state.currentBlockLabel ?? null,
  }
}

export const useEditorStore = create<EditorStore>((set, get) => {
  // Initialize history with initial state
  const initialState: EditorState = {
    mode: 'story',
    complexity: 'simple',
    projectPath: null,
    currentFile: null,
    modified: false,
    selectedNodeId: null,
    selectedBlockId: null,
    ast: null,
    currentBlockLabel: null,
  }
  historyManager.initialize(initialState)

  return {
    // Initial state
    mode: 'story',
    complexity: 'simple',
    projectPath: null,
    currentFile: null,
    modified: false,
    selectedNodeId: null,
    selectedBlockId: null,
    ast: null,
    currentBlockLabel: null,
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
    
    // Block mode actions
    setCurrentBlockLabel: (currentBlockLabel) => {
      set({ currentBlockLabel })
    },
    
    /**
     * Enter block mode for editing a specific label
     * Implements Requirement 9.2: Double-click label to enter block mode
     * Preserves AST data during mode switch (Property 6: Mode Switching State Preservation)
     */
    enterBlockMode: (labelName) => {
      const state = get()
      // Push current state to history before change
      historyManager.push(createStateSnapshot(state))
      set({
        mode: 'block',
        currentBlockLabel: labelName,
        // AST is preserved - block mode shares the same data
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo(),
      })
    },
    
    /**
     * Exit block mode and return to the previous mode (node mode)
     * Implements Requirement 9.3: Click back to return to flow mode
     * Preserves unsaved changes (Requirement 9.4)
     */
    exitBlockMode: () => {
      const state = get()
      // Push current state to history before change
      historyManager.push(createStateSnapshot(state))
      set({
        mode: 'node',
        currentBlockLabel: null,
        // AST is preserved - unsaved changes are kept
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo(),
      })
    },
    
    // History actions
    undo: () => {
      const previousState = historyManager.undo()
      if (previousState) {
        set({
          ...previousState,
          canUndo: historyManager.canUndo(),
          canRedo: historyManager.canRedo(),
        })
      }
    },
    
    redo: () => {
      const nextState = historyManager.redo()
      if (nextState) {
        set({
          ...nextState,
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
