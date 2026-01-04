/**
 * Keyboard Shortcut Types
 * 
 * Type definitions for the keyboard shortcut system.
 * Implements Requirements 17.1, 17.2, 17.3, 17.4
 */

/**
 * Modifier keys that can be combined with a key
 */
export interface ModifierKeys {
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean  // Command key on Mac
}

/**
 * A keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string
  /** The key to press (e.g., 's', 'z', 'F1') */
  key: string
  /** Modifier keys required */
  modifiers: ModifierKeys
  /** Human-readable description */
  description: string
  /** Category for grouping in help panel */
  category: ShortcutCategory
  /** The action to execute */
  action: () => void
  /** Whether the shortcut is enabled */
  enabled?: boolean
}

/**
 * Categories for organizing shortcuts in the help panel
 */
export type ShortcutCategory = 
  | 'file'      // File operations (save, open, etc.)
  | 'edit'      // Edit operations (undo, redo, etc.)
  | 'view'      // View toggles (panels, etc.)
  | 'navigation' // Navigation shortcuts
  | 'help'      // Help shortcuts

/**
 * Category display information
 */
export interface CategoryInfo {
  name: string
  description: string
  order: number
}

/**
 * Map of category to display info
 */
export const SHORTCUT_CATEGORY_INFO: Record<ShortcutCategory, CategoryInfo> = {
  file: {
    name: '文件',
    description: '文件操作',
    order: 1,
  },
  edit: {
    name: '编辑',
    description: '编辑操作',
    order: 2,
  },
  view: {
    name: '视图',
    description: '面板切换',
    order: 3,
  },
  navigation: {
    name: '导航',
    description: '导航操作',
    order: 4,
  },
  help: {
    name: '帮助',
    description: '帮助信息',
    order: 5,
  },
}

/**
 * Format a shortcut for display
 * @param shortcut The shortcut to format
 * @returns Human-readable shortcut string (e.g., "Ctrl+S")
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []
  
  if (shortcut.modifiers.ctrl) {
    parts.push('Ctrl')
  }
  if (shortcut.modifiers.alt) {
    parts.push('Alt')
  }
  if (shortcut.modifiers.shift) {
    parts.push('Shift')
  }
  if (shortcut.modifiers.meta) {
    parts.push('Cmd')
  }
  
  // Capitalize single letter keys
  const key = shortcut.key.length === 1 
    ? shortcut.key.toUpperCase() 
    : shortcut.key
  parts.push(key)
  
  return parts.join('+')
}

/**
 * Check if a keyboard event matches a shortcut
 * @param event The keyboard event
 * @param shortcut The shortcut to check
 * @returns True if the event matches the shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  // Check if shortcut is enabled
  if (shortcut.enabled === false) {
    return false
  }
  
  // Check key (case-insensitive for letters)
  const eventKey = event.key.toLowerCase()
  const shortcutKey = shortcut.key.toLowerCase()
  
  if (eventKey !== shortcutKey) {
    return false
  }
  
  // Check modifiers
  const ctrlMatch = !!shortcut.modifiers.ctrl === (event.ctrlKey || event.metaKey)
  const altMatch = !!shortcut.modifiers.alt === event.altKey
  const shiftMatch = !!shortcut.modifiers.shift === event.shiftKey
  
  return ctrlMatch && altMatch && shiftMatch
}

/**
 * Group shortcuts by category
 * @param shortcuts Array of shortcuts
 * @returns Map of category to shortcuts
 */
export function groupShortcutsByCategory(
  shortcuts: KeyboardShortcut[]
): Map<ShortcutCategory, KeyboardShortcut[]> {
  const grouped = new Map<ShortcutCategory, KeyboardShortcut[]>()
  
  for (const shortcut of shortcuts) {
    const existing = grouped.get(shortcut.category) || []
    existing.push(shortcut)
    grouped.set(shortcut.category, existing)
  }
  
  return grouped
}

/**
 * Get sorted categories based on order
 * @returns Array of categories sorted by order
 */
export function getSortedCategories(): ShortcutCategory[] {
  return (Object.keys(SHORTCUT_CATEGORY_INFO) as ShortcutCategory[])
    .sort((a, b) => SHORTCUT_CATEGORY_INFO[a].order - SHORTCUT_CATEGORY_INFO[b].order)
}
