/**
 * Editor Mode Store
 * 编辑器模式状态管理
 * 
 * Manages the editor mode state including:
 * - Current mode ('flow' | 'block')
 * - Current block label being edited
 * - Mode switching history for navigation
 * 
 * Requirements: 9.1-9.5
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * Editor mode type
 * 'flow' - Flow chart mode (Node Mode)
 * 'block' - Block mode for editing label content
 */
export type BlockEditorMode = 'flow' | 'block'

/**
 * Mode history entry for navigation
 */
export interface ModeHistoryEntry {
  mode: BlockEditorMode
  labelName?: string
  timestamp: number
}

/**
 * Editor Mode State Interface
 */
export interface EditorModeState {
  /** Current editor mode */
  currentMode: BlockEditorMode
  /** Label being edited in block mode */
  currentBlockLabel: string | null
  /** Previous mode before entering block mode */
  previousMode: BlockEditorMode
  /** Mode history for navigation */
  modeHistory: ModeHistoryEntry[]
  /** Maximum history entries to keep */
  maxHistorySize: number
}

/**
 * Editor Mode Actions Interface
 */
export interface EditorModeActions {
  /**
   * Enter block mode for a specific label
   * Implements Requirement 9.2: Double-click label to enter block mode
   */
  enterBlockMode: (labelName: string) => void

  /**
   * Exit block mode and return to flow mode
   * Implements Requirement 9.3: Click back to return to flow mode
   */
  exitBlockMode: () => void

  /**
   * Set the current mode directly
   */
  setMode: (mode: BlockEditorMode) => void

  /**
   * Set the current block label
   */
  setCurrentBlockLabel: (label: string | null) => void

  /**
   * Check if currently in block mode
   */
  isInBlockMode: () => boolean

  /**
   * Get the current label being edited
   */
  getCurrentLabel: () => string | null

  /**
   * Navigate back in mode history
   */
  navigateBack: () => boolean

  /**
   * Clear mode history
   */
  clearHistory: () => void

  /**
   * Reset the store to initial state
   */
  reset: () => void
}

/**
 * Combined store type
 */
export type EditorModeStore = EditorModeState & EditorModeActions

/**
 * Initial state
 */
const initialState: EditorModeState = {
  currentMode: 'flow',
  currentBlockLabel: null,
  previousMode: 'flow',
  modeHistory: [],
  maxHistorySize: 50,
}

/**
 * Create the editor mode store
 */
export const useEditorModeStore = create<EditorModeStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    ...initialState,

    /**
     * Enter block mode for a specific label
     * Implements Requirement 9.2
     */
    enterBlockMode: (labelName) => {
      const state = get()
      
      // Don't re-enter if already editing the same label
      if (state.currentMode === 'block' && state.currentBlockLabel === labelName) {
        return
      }

      // Add current state to history
      const historyEntry: ModeHistoryEntry = {
        mode: state.currentMode,
        labelName: state.currentBlockLabel ?? undefined,
        timestamp: Date.now(),
      }

      const newHistory = [...state.modeHistory, historyEntry]
      // Trim history if it exceeds max size
      if (newHistory.length > state.maxHistorySize) {
        newHistory.shift()
      }

      set({
        previousMode: state.currentMode,
        currentMode: 'block',
        currentBlockLabel: labelName,
        modeHistory: newHistory,
      })
    },

    /**
     * Exit block mode and return to flow mode
     * Implements Requirement 9.3
     */
    exitBlockMode: () => {
      const state = get()
      
      if (state.currentMode !== 'block') {
        return
      }

      // Add current state to history
      const historyEntry: ModeHistoryEntry = {
        mode: state.currentMode,
        labelName: state.currentBlockLabel ?? undefined,
        timestamp: Date.now(),
      }

      const newHistory = [...state.modeHistory, historyEntry]
      if (newHistory.length > state.maxHistorySize) {
        newHistory.shift()
      }

      set({
        currentMode: 'flow',
        currentBlockLabel: null,
        modeHistory: newHistory,
      })
    },

    /**
     * Set the current mode directly
     */
    setMode: (mode) => {
      const state = get()
      
      if (mode === state.currentMode) {
        return
      }

      // If switching away from block mode, clear the label
      if (mode === 'flow' && state.currentMode === 'block') {
        set({
          currentMode: mode,
          currentBlockLabel: null,
        })
      } else {
        set({ currentMode: mode })
      }
    },

    /**
     * Set the current block label
     */
    setCurrentBlockLabel: (label) => {
      set({ currentBlockLabel: label })
    },

    /**
     * Check if currently in block mode
     */
    isInBlockMode: () => {
      return get().currentMode === 'block'
    },

    /**
     * Get the current label being edited
     */
    getCurrentLabel: () => {
      return get().currentBlockLabel
    },

    /**
     * Navigate back in mode history
     */
    navigateBack: () => {
      const state = get()
      
      if (state.modeHistory.length === 0) {
        // No history, just exit block mode if in it
        if (state.currentMode === 'block') {
          set({
            currentMode: 'flow',
            currentBlockLabel: null,
          })
          return true
        }
        return false
      }

      // Pop the last history entry
      const newHistory = [...state.modeHistory]
      const lastEntry = newHistory.pop()

      if (lastEntry) {
        set({
          currentMode: lastEntry.mode,
          currentBlockLabel: lastEntry.labelName ?? null,
          modeHistory: newHistory,
        })
        return true
      }

      return false
    },

    /**
     * Clear mode history
     */
    clearHistory: () => {
      set({ modeHistory: [] })
    },

    /**
     * Reset the store to initial state
     */
    reset: () => {
      set(initialState)
    },
  }))
)

/**
 * Selector hooks for common state access patterns
 */

/** Get current mode */
export const useCurrentMode = () => useEditorModeStore((state) => state.currentMode)

/** Get current block label */
export const useCurrentBlockLabel = () => useEditorModeStore((state) => state.currentBlockLabel)

/** Check if in block mode */
export const useIsInBlockMode = () => useEditorModeStore((state) => state.currentMode === 'block')

/** Get mode history */
export const useModeHistory = () => useEditorModeStore((state) => state.modeHistory)

/** Check if can navigate back */
export const useCanNavigateBack = () => useEditorModeStore((state) => 
  state.modeHistory.length > 0 || state.currentMode === 'block'
)

export default useEditorModeStore
