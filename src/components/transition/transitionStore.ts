/**
 * Transition Store
 * 
 * Zustand store for managing transition selections in the editor.
 * Implements Requirements 11.2, 11.3, 11.5, 11.6
 */

import { create } from 'zustand'
import {
  TransitionSelection,
  TransitionDefinition,
  TransitionCategory,
  BUILT_IN_TRANSITIONS,
  CATEGORY_INFO,
  getTransitionDefinition,
  getTransitionsByCategory,
  generateTransitionCode,
  parseTransitionCode,
} from './types'
import { WithNode } from '../../types/ast'
import { createWithNode } from '../../parser/nodeFactory'

export interface TransitionStore {
  // State
  selectedTransition: TransitionSelection | null
  dialogOpen: boolean
  previewTransition: string | null
  recentTransitions: string[]

  // Actions
  selectTransition: (selection: TransitionSelection) => void
  clearSelection: () => void
  openDialog: (initialTransition?: string) => void
  closeDialog: () => void
  setPreviewTransition: (transition: string | null) => void
  addToRecent: (transition: string) => void

  // Helpers
  getTransitionCode: () => string
  getBuiltInTransitions: () => TransitionDefinition[]
  getTransitionsByCategory: (category: TransitionCategory) => TransitionDefinition[]
  getCategoryInfo: () => typeof CATEGORY_INFO

  // AST integration
  generateWithNode: () => WithNode | null
  parseFromWithNode: (node: WithNode) => void
}

const MAX_RECENT_TRANSITIONS = 5

export const useTransitionStore = create<TransitionStore>((set, get) => ({
  // Initial state
  selectedTransition: null,
  dialogOpen: false,
  previewTransition: null,
  recentTransitions: [],

  // Actions
  selectTransition: (selection) => {
    set({ selectedTransition: selection })
    
    // Add to recent transitions
    const code = generateTransitionCode(selection)
    get().addToRecent(code)
  },

  clearSelection: () => {
    set({ selectedTransition: null })
  },

  openDialog: (initialTransition) => {
    if (initialTransition) {
      const selection = parseTransitionCode(initialTransition)
      set({ 
        dialogOpen: true, 
        selectedTransition: selection,
        previewTransition: initialTransition,
      })
    } else {
      set({ dialogOpen: true })
    }
  },

  closeDialog: () => {
    set({ 
      dialogOpen: false,
      previewTransition: null,
    })
  },

  setPreviewTransition: (transition) => {
    set({ previewTransition: transition })
  },

  addToRecent: (transition) => {
    set((state) => {
      const filtered = state.recentTransitions.filter((t) => t !== transition)
      const updated = [transition, ...filtered].slice(0, MAX_RECENT_TRANSITIONS)
      return { recentTransitions: updated }
    })
  },

  // Helpers
  getTransitionCode: () => {
    const { selectedTransition } = get()
    if (!selectedTransition) {
      return ''
    }
    return generateTransitionCode(selectedTransition)
  },

  getBuiltInTransitions: () => {
    return BUILT_IN_TRANSITIONS
  },

  getTransitionsByCategory: (category) => {
    return getTransitionsByCategory(category)
  },

  getCategoryInfo: () => {
    return CATEGORY_INFO
  },

  // AST integration (Requirement 11.6)
  generateWithNode: () => {
    const { selectedTransition } = get()
    if (!selectedTransition) {
      return null
    }
    
    const code = generateTransitionCode(selectedTransition)
    return createWithNode(code)
  },

  parseFromWithNode: (node) => {
    const selection = parseTransitionCode(node.transition)
    set({ selectedTransition: selection })
  },
}))

/**
 * Get the current transition code
 */
export function getCurrentTransitionCode(): string {
  return useTransitionStore.getState().getTransitionCode()
}

/**
 * Create a with node from current selection
 */
export function createWithNodeFromSelection(): WithNode | null {
  return useTransitionStore.getState().generateWithNode()
}

/**
 * Get all built-in transitions
 */
export function getAllBuiltInTransitions(): TransitionDefinition[] {
  return BUILT_IN_TRANSITIONS
}

/**
 * Get transition definition by name
 */
export function getTransitionByName(name: string): TransitionDefinition | undefined {
  return getTransitionDefinition(name)
}
