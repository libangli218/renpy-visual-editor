import { create } from 'zustand'
import { HistoryManager } from './HistoryManager'
import { EditorMode, ComplexityLevel, EditorState } from '../types/editor'

// Create a history manager instance
const historyManager = new HistoryManager<EditorState>(100)

export interface EditorStore {
  // Editor mode state
  mode: EditorMode
  complexity: ComplexityLevel
  
  // Project state
  projectPath: string | null
  currentFile: string | null
  modified: boolean
  
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
    canUndo: false,
    canRedo: false,
    
    // Actions that modify state and push to history
    setMode: (mode) => {
      const state = get()
      // Push current state to history before change
      historyManager.push(createStateSnapshot(state))
      set({ 
        mode, 
        modified: true,
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo(),
      })
    },
    
    setComplexity: (complexity) => {
      // Complexity change doesn't affect data, no history push needed
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
