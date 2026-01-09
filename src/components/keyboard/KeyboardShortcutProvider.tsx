/**
 * KeyboardShortcutProvider Component
 * 
 * Provider component that sets up keyboard shortcuts for the application.
 * Should wrap the main app component.
 * Implements Requirements 17.1, 17.3
 * 
 * Multi-script editing shortcuts (Requirements 6.1, 6.2, 6.3):
 * - Alt+]: Switch to next script
 * - Alt+[: Switch to previous script
 * - Ctrl+N: Open new script dialog
 */

import React, { useEffect } from 'react'
import { useKeyboardStore, createShortcut } from './keyboardStore'
import { useEditorStore } from '../../store/editorStore'
import { KeyboardHelpPanel } from './KeyboardHelpPanel'

interface KeyboardShortcutProviderProps {
  children: React.ReactNode
}

/**
 * KeyboardShortcutProvider - Sets up global keyboard shortcuts
 */
export const KeyboardShortcutProvider: React.FC<KeyboardShortcutProviderProps> = ({ 
  children 
}) => {
  const { 
    registerShortcut, 
    handleKeyDown,
    toggleHelpPanel,
    closeHelpPanel,
  } = useKeyboardStore()
  
  // Register default shortcuts
  useEffect(() => {
    // File shortcuts (Requirement 17.1)
    registerShortcut(createShortcut(
      'save',
      's',
      { ctrl: true },
      '保存项目',
      'file',
      () => {
        console.log('Save triggered')
        window.dispatchEvent(new CustomEvent('editor:save'))
      }
    ))
    
    // Edit shortcuts (Requirement 17.1)
    registerShortcut(createShortcut(
      'undo',
      'z',
      { ctrl: true },
      '撤销',
      'edit',
      () => {
        const state = useEditorStore.getState()
        if (state.canUndo) {
          state.undo()
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
        const state = useEditorStore.getState()
        if (state.canRedo) {
          state.redo()
        }
      }
    ))
    
    // Alternative redo shortcut (Ctrl+Shift+Z)
    registerShortcut(createShortcut(
      'redo-alt',
      'z',
      { ctrl: true, shift: true },
      '重做 (备选)',
      'edit',
      () => {
        const state = useEditorStore.getState()
        if (state.canRedo) {
          state.redo()
        }
      }
    ))
    
    // View shortcuts (Requirement 17.1)
    registerShortcut(createShortcut(
      'toggle-resource-browser',
      'b',
      { ctrl: true },
      '资源浏览器',
      'view',
      () => {
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
        window.dispatchEvent(new CustomEvent('editor:toggle-director-mode'))
      }
    ))
    
    // Help shortcuts (Requirement 17.2)
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
    
    // Alternative help shortcut (Shift+/)
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
        closeHelpPanel()
      }
    ))
    
    // Game launch shortcut (F5)
    registerShortcut(createShortcut(
      'launch-game',
      'F5',
      {},
      '运行游戏',
      'file',
      () => {
        window.dispatchEvent(new CustomEvent('editor:launch-game'))
      }
    ))
    
    // Stop game shortcut (Shift+F5)
    registerShortcut(createShortcut(
      'stop-game',
      'F5',
      { shift: true },
      '停止游戏',
      'file',
      () => {
        window.dispatchEvent(new CustomEvent('editor:stop-game'))
      }
    ))
    
    // Multi-script navigation shortcuts (Requirements 6.1, 6.2, 6.3)
    
    // Alt+]: Switch to next script (Requirement 6.1)
    registerShortcut(createShortcut(
      'next-script',
      ']',
      { alt: true },
      '下一个脚本',
      'navigation',
      () => {
        const state = useEditorStore.getState()
        state.switchToNextScript()
      }
    ))
    
    // Alt+[: Switch to previous script (Requirement 6.2)
    registerShortcut(createShortcut(
      'prev-script',
      '[',
      { alt: true },
      '上一个脚本',
      'navigation',
      () => {
        const state = useEditorStore.getState()
        state.switchToPrevScript()
      }
    ))
    
    // Ctrl+N: Open new script dialog (Requirement 6.3)
    registerShortcut(createShortcut(
      'new-script',
      'n',
      { ctrl: true },
      '新建脚本',
      'file',
      () => {
        window.dispatchEvent(new CustomEvent('editor:new-script'))
      }
    ))
  }, [registerShortcut, toggleHelpPanel, closeHelpPanel])
  
  // Set up global keyboard event listener
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
      
      // Always allow Escape
      const isEscape = event.key === 'Escape'
      
      if (isInputField && !allowInInput && !isEscape) {
        return
      }
      
      handleKeyDown(event)
    }
    
    window.addEventListener('keydown', handler)
    
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [handleKeyDown])
  
  return (
    <>
      {children}
      <KeyboardHelpPanel />
    </>
  )
}

export default KeyboardShortcutProvider
