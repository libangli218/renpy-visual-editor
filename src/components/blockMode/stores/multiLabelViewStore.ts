/**
 * Multi-Label View Store
 * 多 Label 视图状态管理
 * 
 * Manages the state for the multi-label view including:
 * - Collapsed labels state
 * - Search query for filtering labels
 * - Layout mode (grid/list)
 * - Selected label for keyboard navigation
 * 
 * Requirements: 2.1, 2.2, 4.3, 6.1
 */

import { create } from 'zustand'

/**
 * Layout mode type
 * 'grid' - Grid layout for label cards
 * 'list' - List layout for label cards
 */
export type LayoutMode = 'grid' | 'list'

/**
 * Multi-Label View State Interface
 */
export interface MultiLabelViewState {
  /** Set of collapsed label names */
  collapsedLabels: Set<string>
  /** Search query for filtering labels */
  searchQuery: string
  /** Layout mode (grid or list) */
  layoutMode: LayoutMode
  /** Selected label name for keyboard navigation */
  selectedLabel: string | null
}

/**
 * Multi-Label View Actions Interface
 */
export interface MultiLabelViewActions {
  /**
   * Toggle the collapsed state of a label
   * Implements Requirement 2.1: Click to collapse/expand
   */
  toggleLabelCollapsed: (labelName: string) => void

  /**
   * Set the collapsed state of a label
   */
  setLabelCollapsed: (labelName: string, collapsed: boolean) => void

  /**
   * Check if a label is collapsed
   */
  isLabelCollapsed: (labelName: string) => boolean

  /**
   * Collapse all labels
   */
  collapseAll: (labelNames: string[]) => void

  /**
   * Expand all labels
   */
  expandAll: () => void

  /**
   * Set the search query
   * Implements Requirement 6.1: Search and filter labels
   */
  setSearchQuery: (query: string) => void

  /**
   * Clear the search query
   */
  clearSearchQuery: () => void

  /**
   * Set the layout mode
   * Implements Requirement 4.3: Layout mode switching
   */
  setLayoutMode: (mode: LayoutMode) => void

  /**
   * Toggle between grid and list layout
   */
  toggleLayoutMode: () => void

  /**
   * Set the selected label
   */
  setSelectedLabel: (labelName: string | null) => void

  /**
   * Reset the store to initial state
   */
  reset: () => void
}

/**
 * Combined store type
 */
export type MultiLabelViewStore = MultiLabelViewState & MultiLabelViewActions

/**
 * Initial state
 */
const initialState: MultiLabelViewState = {
  collapsedLabels: new Set<string>(),
  searchQuery: '',
  layoutMode: 'grid',
  selectedLabel: null,
}

/**
 * Create the multi-label view store
 */
export const useMultiLabelViewStore = create<MultiLabelViewStore>((set, get) => ({
  // Initial state
  ...initialState,

  /**
   * Toggle the collapsed state of a label
   * Implements Requirement 2.1
   */
  toggleLabelCollapsed: (labelName) => {
    set((state) => {
      const newCollapsed = new Set(state.collapsedLabels)
      if (newCollapsed.has(labelName)) {
        newCollapsed.delete(labelName)
      } else {
        newCollapsed.add(labelName)
      }
      return { collapsedLabels: newCollapsed }
    })
  },

  /**
   * Set the collapsed state of a label
   */
  setLabelCollapsed: (labelName, collapsed) => {
    set((state) => {
      const newCollapsed = new Set(state.collapsedLabels)
      if (collapsed) {
        newCollapsed.add(labelName)
      } else {
        newCollapsed.delete(labelName)
      }
      return { collapsedLabels: newCollapsed }
    })
  },

  /**
   * Check if a label is collapsed
   */
  isLabelCollapsed: (labelName) => {
    return get().collapsedLabels.has(labelName)
  },

  /**
   * Collapse all labels
   */
  collapseAll: (labelNames) => {
    set({ collapsedLabels: new Set(labelNames) })
  },

  /**
   * Expand all labels
   */
  expandAll: () => {
    set({ collapsedLabels: new Set() })
  },

  /**
   * Set the search query
   * Implements Requirement 6.1
   */
  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  /**
   * Clear the search query
   */
  clearSearchQuery: () => {
    set({ searchQuery: '' })
  },

  /**
   * Set the layout mode
   * Implements Requirement 4.3
   */
  setLayoutMode: (mode) => {
    set({ layoutMode: mode })
  },

  /**
   * Toggle between grid and list layout
   */
  toggleLayoutMode: () => {
    set((state) => ({
      layoutMode: state.layoutMode === 'grid' ? 'list' : 'grid',
    }))
  },

  /**
   * Set the selected label
   */
  setSelectedLabel: (labelName) => {
    set({ selectedLabel: labelName })
  },

  /**
   * Reset the store to initial state
   */
  reset: () => {
    set({
      collapsedLabels: new Set<string>(),
      searchQuery: '',
      layoutMode: 'grid',
      selectedLabel: null,
    })
  },
}))

/**
 * Selector hooks for common state access patterns
 */

/** Get collapsed labels set */
export const useCollapsedLabels = () => useMultiLabelViewStore((state) => state.collapsedLabels)

/** Get search query */
export const useSearchQuery = () => useMultiLabelViewStore((state) => state.searchQuery)

/** Get layout mode */
export const useLayoutMode = () => useMultiLabelViewStore((state) => state.layoutMode)

/** Get selected label */
export const useSelectedLabel = () => useMultiLabelViewStore((state) => state.selectedLabel)

/** Check if a specific label is collapsed */
export const useIsLabelCollapsed = (labelName: string) => {
  return useMultiLabelViewStore((state) => state.collapsedLabels.has(labelName))
}

/** Check if in grid layout mode */
export const useIsGridLayout = () => useMultiLabelViewStore((state) => state.layoutMode === 'grid')

/** Check if in list layout mode */
export const useIsListLayout = () => useMultiLabelViewStore((state) => state.layoutMode === 'list')

export default useMultiLabelViewStore
