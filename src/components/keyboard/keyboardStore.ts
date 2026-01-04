/**
 * Keyboard Shortcut Store
 * 
 * Zustand store for managing keyboard shortcuts.
 * Implements Requirements 17.1, 17.2, 17.3, 17.4
 */

import { create } from 'zustand'
import {
  KeyboardShortcut,
  ShortcutCategory,
  ModifierKeys,
  matchesShortcut,
  groupShortcutsByCategory,
  getSortedCategories,
  SHORTCUT_CATEGORY_INFO,
} from './types'

export interface KeyboardStore {
  // State
  shortcuts: KeyboardShortcut[]
  helpPanelOpen: boolean
  
  // Actions
  registerShortcut: (shortcut: KeyboardShortcut) => void
  unregisterShortcut: (id: string) => void
  updateShortcut: (id: string, updates: Partial<KeyboardShortcut>) => void
  setShortcutEnabled: (id: string, enabled: boolean) => void
  openHelpPanel: () => void
  closeHelpPanel: () => void
  toggleHelpPanel: () => void
  
  // Handlers
  handleKeyDown: (event: KeyboardEvent) => boolean
  
  // Getters
  getShortcut: (id: string) => KeyboardShortcut | undefined
  getShortcutsByCategory: (category: ShortcutCategory) => KeyboardShortcut[]
  getGroupedShortcuts: () => Map<ShortcutCategory, KeyboardShortcut[]>
  getSortedCategories: () => ShortcutCategory[]
  getCategoryInfo: () => typeof SHORTCUT_CATEGORY_INFO
}

export const useKeyboardStore = create<KeyboardStore>((set, get) => ({
  // Initial state
  shortcuts: [],
  helpPanelOpen: false,
  
  // Actions
  registerShortcut: (shortcut) => {
    set((state) => {
      // Check if shortcut with same ID already exists
      const existing = state.shortcuts.find((s) => s.id === shortcut.id)
      if (existing) {
        // Update existing shortcut
        return {
          shortcuts: state.shortcuts.map((s) =>
            s.id === shortcut.id ? { ...s, ...shortcut } : s
          ),
        }
      }
      // Add new shortcut
      return {
        shortcuts: [...state.shortcuts, { ...shortcut, enabled: shortcut.enabled ?? true }],
      }
    })
  },
  
  unregisterShortcut: (id) => {
    set((state) => ({
      shortcuts: state.shortcuts.filter((s) => s.id !== id),
    }))
  },
  
  updateShortcut: (id, updates) => {
    set((state) => ({
      shortcuts: state.shortcuts.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }))
  },
  
  setShortcutEnabled: (id, enabled) => {
    set((state) => ({
      shortcuts: state.shortcuts.map((s) =>
        s.id === id ? { ...s, enabled } : s
      ),
    }))
  },
  
  openHelpPanel: () => {
    set({ helpPanelOpen: true })
  },
  
  closeHelpPanel: () => {
    set({ helpPanelOpen: false })
  },
  
  toggleHelpPanel: () => {
    set((state) => ({ helpPanelOpen: !state.helpPanelOpen }))
  },
  
  // Handle keyboard events
  handleKeyDown: (event) => {
    const { shortcuts } = get()
    
    // Find matching shortcut
    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut)) {
        // Prevent default browser behavior
        event.preventDefault()
        event.stopPropagation()
        
        // Execute the action
        shortcut.action()
        
        return true
      }
    }
    
    return false
  },
  
  // Getters
  getShortcut: (id) => {
    return get().shortcuts.find((s) => s.id === id)
  },
  
  getShortcutsByCategory: (category) => {
    return get().shortcuts.filter((s) => s.category === category)
  },
  
  getGroupedShortcuts: () => {
    return groupShortcutsByCategory(get().shortcuts)
  },
  
  getSortedCategories: () => {
    return getSortedCategories()
  },
  
  getCategoryInfo: () => {
    return SHORTCUT_CATEGORY_INFO
  },
}))

/**
 * Register a keyboard shortcut
 */
export function registerShortcut(shortcut: KeyboardShortcut): void {
  useKeyboardStore.getState().registerShortcut(shortcut)
}

/**
 * Unregister a keyboard shortcut
 */
export function unregisterShortcut(id: string): void {
  useKeyboardStore.getState().unregisterShortcut(id)
}

/**
 * Create a shortcut definition helper
 */
export function createShortcut(
  id: string,
  key: string,
  modifiers: ModifierKeys,
  description: string,
  category: ShortcutCategory,
  action: () => void,
  enabled = true
): KeyboardShortcut {
  return {
    id,
    key,
    modifiers,
    description,
    category,
    action,
    enabled,
  }
}

/**
 * Check if help panel is open
 */
export function isHelpPanelOpen(): boolean {
  return useKeyboardStore.getState().helpPanelOpen
}

/**
 * Toggle help panel
 */
export function toggleHelpPanel(): void {
  useKeyboardStore.getState().toggleHelpPanel()
}
