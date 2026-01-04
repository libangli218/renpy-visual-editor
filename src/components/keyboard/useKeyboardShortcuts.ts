/**
 * useKeyboardShortcuts Hook
 * 
 * React hook for registering and managing keyboard shortcuts.
 * Implements Requirements 17.1, 17.3
 */

import { useEffect } from 'react'
import { useKeyboardStore, createShortcut } from './keyboardStore'
import { useEditorStore } from '../../store/editorStore'
import { KeyboardShortcut, ShortcutCategory, ModifierKeys } from './types'

/**
 * Hook to register the default editor shortcuts
 * Should be called once at the app level
 */
export function useDefaultShortcuts(): void {
  const { 
    undo, 
    redo, 
    canUndo, 
    canRedo,
  } = useEditorStore()
  
  const { 
    registerShortcut, 
    toggleHelpPanel,
  } = useKeyboardStore()
  
  useEffect(() => {
    // File shortcuts
    registerShortcut(createShortcut(
      'save',
      's',
      { ctrl: true },
      '保存项目',
      'file',
      () => {
        // Trigger save action
        console.log('Save triggered')
        // The actual save will be handled by the project manager
        window.dispatchEvent(new CustomEvent('editor:save'))
      }
    ))
    
    // Edit shortcuts
    registerShortcut(createShortcut(
      'undo',
      'z',
      { ctrl: true },
      '撤销',
      'edit',
      () => {
        if (canUndo) {
          undo()
        }
      }
    ))
    
    registerShortcut(createShortcut(
      'redo',
      'y',
      { ctrl: true },
      '重做',
      'edit',
      () => {
        if (canRedo) {
          redo()
        }
      }
    ))
    
    // Also support Ctrl+Shift+Z for redo (common alternative)
    registerShortcut(createShortcut(
      'redo-alt',
      'z',
      { ctrl: true, shift: true },
      '重做 (备选)',
      'edit',
      () => {
        if (canRedo) {
          redo()
        }
      }
    ))
    
    // View shortcuts
    registerShortcut(createShortcut(
      'toggle-resource-browser',
      'b',
      { ctrl: true },
      '资源浏览器',
      'view',
      () => {
        console.log('Toggle resource browser')
        window.dispatchEvent(new CustomEvent('editor:toggle-resource-browser'))
      }
    ))
    
    registerShortcut(createShortcut(
      'toggle-dialogue-history',
      'h',
      { ctrl: true },
      '对话历史',
      'view',
      () => {
        console.log('Toggle dialogue history')
        window.dispatchEvent(new CustomEvent('editor:toggle-dialogue-history'))
      }
    ))
    
    registerShortcut(createShortcut(
      'toggle-transition-panel',
      't',
      { ctrl: true },
      '转场效果',
      'view',
      () => {
        console.log('Toggle transition panel')
        window.dispatchEvent(new CustomEvent('editor:toggle-transition-panel'))
      }
    ))
    
    registerShortcut(createShortcut(
      'toggle-audio-tracks',
      'm',
      { ctrl: true },
      '音频轨道',
      'view',
      () => {
        console.log('Toggle audio tracks')
        window.dispatchEvent(new CustomEvent('editor:toggle-audio-tracks'))
      }
    ))
    
    registerShortcut(createShortcut(
      'toggle-director-mode',
      'd',
      { ctrl: true },
      '导演模式',
      'view',
      () => {
        console.log('Toggle director mode')
        window.dispatchEvent(new CustomEvent('editor:toggle-director-mode'))
      }
    ))
    
    // Help shortcuts
    registerShortcut(createShortcut(
      'show-help',
      '?',
      {},
      '显示快捷键帮助',
      'help',
      () => {
        toggleHelpPanel()
      }
    ))
    
    // Also support Shift+/ for ? key (since ? is Shift+/ on most keyboards)
    registerShortcut(createShortcut(
      'show-help-alt',
      '/',
      { shift: true },
      '显示快捷键帮助 (备选)',
      'help',
      () => {
        toggleHelpPanel()
      }
    ))
    
    // Escape to close help panel
    registerShortcut(createShortcut(
      'close-help',
      'Escape',
      {},
      '关闭帮助面板',
      'help',
      () => {
        useKeyboardStore.getState().closeHelpPanel()
      }
    ))
  }, [canUndo, canRedo, undo, redo, registerShortcut, toggleHelpPanel])
}

/**
 * Hook to set up the global keyboard event listener
 * Should be called once at the app level
 */
export function useKeyboardEventListener(): void {
  const { handleKeyDown } = useKeyboardStore()
  
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      const target = event.target as HTMLElement
      const isInputField = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.monaco-editor') !== null
      
      // Allow some shortcuts even in input fields
      const allowInInput = 
        (event.ctrlKey || event.metaKey) && 
        ['s', 'z', 'y'].includes(event.key.toLowerCase())
      
      if (isInputField && !allowInInput) {
        return
      }
      
      handleKeyDown(event)
    }
    
    window.addEventListener('keydown', handler)
    
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [handleKeyDown])
}

/**
 * Hook to register a custom shortcut
 * Automatically unregisters when component unmounts
 */
export function useShortcut(
  id: string,
  key: string,
  modifiers: ModifierKeys,
  description: string,
  category: ShortcutCategory,
  action: () => void,
  enabled = true
): void {
  const { registerShortcut, unregisterShortcut } = useKeyboardStore()
  
  useEffect(() => {
    registerShortcut(createShortcut(
      id,
      key,
      modifiers,
      description,
      category,
      action,
      enabled
    ))
    
    return () => {
      unregisterShortcut(id)
    }
  }, [id, key, modifiers, description, category, action, enabled, registerShortcut, unregisterShortcut])
}

/**
 * Hook to get all registered shortcuts
 */
export function useShortcuts(): KeyboardShortcut[] {
  return useKeyboardStore((state) => state.shortcuts)
}

/**
 * Hook to check if help panel is open
 */
export function useHelpPanelOpen(): boolean {
  return useKeyboardStore((state) => state.helpPanelOpen)
}
