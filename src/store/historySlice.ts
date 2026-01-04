import { StateCreator } from 'zustand'

// Maximum number of history entries
const MAX_HISTORY_SIZE = 100

// State snapshot for history
export interface HistorySnapshot {
  timestamp: number
  data: Record<string, unknown>
}

export interface HistorySlice {
  // History state
  past: HistorySnapshot[]
  future: HistorySnapshot[]
  
  // History actions
  pushHistory: (snapshot: Record<string, unknown>) => void
  undo: () => Record<string, unknown> | null
  redo: () => Record<string, unknown> | null
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void
  getHistoryLength: () => number
}

export const createHistorySlice: StateCreator<HistorySlice> = (set, get) => ({
  past: [],
  future: [],
  
  pushHistory: (snapshot) => {
    set((state) => {
      const newPast = [...state.past, { timestamp: Date.now(), data: snapshot }]
      
      // Trim history if it exceeds max size
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift()
      }
      
      return {
        past: newPast,
        // Clear future when new action is performed (Property 10)
        future: [],
      }
    })
  },
  
  undo: () => {
    const { past, future } = get()
    
    if (past.length === 0) {
      return null
    }
    
    const previous = past[past.length - 1]
    const newPast = past.slice(0, -1)
    
    // Get current state to push to future
    // This will be handled by the caller
    
    set({
      past: newPast,
      future: [previous, ...future],
    })
    
    return previous.data
  },
  
  redo: () => {
    const { past, future } = get()
    
    if (future.length === 0) {
      return null
    }
    
    const next = future[0]
    const newFuture = future.slice(1)
    
    set({
      past: [...past, next],
      future: newFuture,
    })
    
    return next.data
  },
  
  canUndo: () => {
    return get().past.length > 0
  },
  
  canRedo: () => {
    return get().future.length > 0
  },
  
  clearHistory: () => {
    set({
      past: [],
      future: [],
    })
  },
  
  getHistoryLength: () => {
    return get().past.length
  },
})
