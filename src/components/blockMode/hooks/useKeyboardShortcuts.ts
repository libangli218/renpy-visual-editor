/**
 * useKeyboardShortcuts Hook
 * 键盘快捷键 Hook
 * 
 * Provides keyboard shortcut handling for the block editor.
 * Supports copy/paste, quick block insertion, and navigation.
 * 
 * Requirements: 14.3, 14.5
 * - 14.3: Support copy/paste blocks
 * - 14.5: Support keyboard shortcuts for quick block insertion
 */

import { useEffect, useCallback, useRef } from 'react'
import { Block, BlockType, BlockClipboard } from '../types'
import { useBlockEditorStore } from '../stores/blockEditorStore'
import { createBlockOperationHandler } from '../BlockOperationHandler'
import { RenpyScript } from '../../../types/ast'

/**
 * Shortcut action types
 */
export type ShortcutAction =
  | 'copy'
  | 'paste'
  | 'cut'
  | 'delete'
  | 'undo'
  | 'redo'
  | 'selectAll'
  | 'escape'
  | 'insertDialogue'
  | 'insertScene'
  | 'insertShow'
  | 'insertMenu'
  | 'insertJump'
  | 'moveUp'
  | 'moveDown'

/**
 * Shortcut definition
 */
export interface ShortcutDefinition {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: ShortcutAction
  description: string
}

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // Clipboard operations
  { key: 'c', ctrl: true, action: 'copy', description: '复制选中的积木' },
  { key: 'v', ctrl: true, action: 'paste', description: '粘贴积木' },
  { key: 'x', ctrl: true, action: 'cut', description: '剪切选中的积木' },
  
  // Edit operations
  { key: 'Delete', action: 'delete', description: '删除选中的积木' },
  { key: 'Backspace', action: 'delete', description: '删除选中的积木' },
  { key: 'z', ctrl: true, action: 'undo', description: '撤销' },
  { key: 'y', ctrl: true, action: 'redo', description: '重做' },
  { key: 'z', ctrl: true, shift: true, action: 'redo', description: '重做' },
  
  // Selection
  { key: 'a', ctrl: true, action: 'selectAll', description: '全选' },
  { key: 'Escape', action: 'escape', description: '取消选择' },
  
  // Quick insert shortcuts (Alt + key)
  { key: 'd', alt: true, action: 'insertDialogue', description: '快速插入对话积木' },
  { key: 's', alt: true, action: 'insertScene', description: '快速插入场景积木' },
  { key: 'h', alt: true, action: 'insertShow', description: '快速插入显示角色积木' },
  { key: 'm', alt: true, action: 'insertMenu', description: '快速插入菜单积木' },
  { key: 'j', alt: true, action: 'insertJump', description: '快速插入跳转积木' },
  
  // Navigation
  { key: 'ArrowUp', alt: true, action: 'moveUp', description: '向上移动积木' },
  { key: 'ArrowDown', alt: true, action: 'moveDown', description: '向下移动积木' },
]

/**
 * Props for useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsProps {
  /** Whether shortcuts are enabled */
  enabled?: boolean
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Current block tree */
  blockTree: Block | null
  /** Current AST */
  ast: RenpyScript | null
  /** Current label name */
  labelName: string
  /** Callback when AST changes */
  onAstChange?: (ast: RenpyScript) => void
  /** Callback when block tree changes */
  onBlockTreeChange?: (tree: Block) => void
  /** Callback for undo */
  onUndo?: () => void
  /** Callback for redo */
  onRedo?: () => void
  /** Custom shortcuts to add or override */
  customShortcuts?: ShortcutDefinition[]
}

/**
 * Return type for useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsReturn {
  /** Copy the selected block */
  copySelectedBlock: () => void
  /** Paste from clipboard */
  pasteFromClipboard: () => void
  /** Cut the selected block */
  cutSelectedBlock: () => void
  /** Delete the selected block */
  deleteSelectedBlock: () => void
  /** Insert a block of the given type */
  insertBlock: (type: BlockType) => void
  /** Move selected block up */
  moveBlockUp: () => void
  /** Move selected block down */
  moveBlockDown: () => void
  /** Get all available shortcuts */
  getShortcuts: () => ShortcutDefinition[]
}

/**
 * useKeyboardShortcuts - Hook for handling keyboard shortcuts
 */
export function useKeyboardShortcuts({
  enabled = true,
  readOnly = false,
  blockTree,
  ast,
  labelName,
  onAstChange,
  onBlockTreeChange,
  onUndo,
  onRedo,
  customShortcuts = [],
}: UseKeyboardShortcutsProps): UseKeyboardShortcutsReturn {
  const {
    selectedBlockId,
    clipboard,
    setSelectedBlockId,
    setClipboard,
    setBlockTree,
  } = useBlockEditorStore()

  const operationHandlerRef = useRef(createBlockOperationHandler())

  // Merge default and custom shortcuts
  const shortcuts = [...DEFAULT_SHORTCUTS, ...customShortcuts]

  /**
   * Find parent block and index of a block
   */
  const findBlockParentAndIndex = useCallback((
    root: Block,
    blockId: string,
    parent: Block | null = null
  ): { parent: Block | null; index: number } | null => {
    if (root.id === blockId) {
      return { parent, index: -1 }
    }

    if (root.children) {
      for (let i = 0; i < root.children.length; i++) {
        if (root.children[i].id === blockId) {
          return { parent: root, index: i }
        }
        const found = findBlockParentAndIndex(root.children[i], blockId, root.children[i])
        if (found) return found
      }
    }

    return null
  }, [])

  /**
   * Copy the selected block to clipboard
   */
  const copySelectedBlock = useCallback(() => {
    if (!selectedBlockId || !blockTree) return

    const handler = operationHandlerRef.current
    const block = handler.findBlockById(blockTree, selectedBlockId)
    if (!block) return

    const clipboardData: BlockClipboard = {
      blocks: [JSON.parse(JSON.stringify(block))],
      sourceLabel: labelName,
      timestamp: Date.now(),
    }

    setClipboard(clipboardData)
  }, [selectedBlockId, blockTree, labelName, setClipboard])

  /**
   * Paste from clipboard
   */
  const pasteFromClipboard = useCallback(() => {
    if (readOnly || !clipboard || !blockTree || !ast) return

    const handler = operationHandlerRef.current
    
    // Determine paste target
    let parentId = blockTree.id
    let index = blockTree.children?.length ?? 0

    if (selectedBlockId) {
      const result = findBlockParentAndIndex(blockTree, selectedBlockId)
      if (result && result.parent) {
        parentId = result.parent.id
        index = result.index + 1
      }
    }

    const pasteResult = handler.pasteBlock(clipboard, parentId, index, {
      blockTree,
      ast,
      labelName,
    })

    if (pasteResult.success && pasteResult.blockTree) {
      setBlockTree(pasteResult.blockTree)
      onBlockTreeChange?.(pasteResult.blockTree)
      
      if (pasteResult.blockId) {
        setSelectedBlockId(pasteResult.blockId)
      }
      
      if (pasteResult.ast) {
        onAstChange?.(pasteResult.ast)
      }
    }
  }, [readOnly, clipboard, blockTree, ast, selectedBlockId, labelName, findBlockParentAndIndex, setBlockTree, setSelectedBlockId, onBlockTreeChange, onAstChange])

  /**
   * Cut the selected block
   */
  const cutSelectedBlock = useCallback(() => {
    if (readOnly || !selectedBlockId || !blockTree || !ast) return

    // First copy
    copySelectedBlock()

    // Then delete
    const handler = operationHandlerRef.current
    const deleteResult = handler.deleteBlock(selectedBlockId, {
      blockTree,
      ast,
      labelName,
    })

    if (deleteResult.success && deleteResult.blockTree) {
      setBlockTree(deleteResult.blockTree)
      onBlockTreeChange?.(deleteResult.blockTree)
      setSelectedBlockId(null)
      
      if (deleteResult.ast) {
        onAstChange?.(deleteResult.ast)
      }
    }
  }, [readOnly, selectedBlockId, blockTree, ast, labelName, copySelectedBlock, setBlockTree, setSelectedBlockId, onBlockTreeChange, onAstChange])

  /**
   * Delete the selected block
   */
  const deleteSelectedBlock = useCallback(() => {
    if (readOnly || !selectedBlockId || !blockTree || !ast) return

    const handler = operationHandlerRef.current
    const deleteResult = handler.deleteBlock(selectedBlockId, {
      blockTree,
      ast,
      labelName,
    })

    if (deleteResult.success && deleteResult.blockTree) {
      setBlockTree(deleteResult.blockTree)
      onBlockTreeChange?.(deleteResult.blockTree)
      setSelectedBlockId(null)
      
      if (deleteResult.ast) {
        onAstChange?.(deleteResult.ast)
      }
    }
  }, [readOnly, selectedBlockId, blockTree, ast, labelName, setBlockTree, setSelectedBlockId, onBlockTreeChange, onAstChange])

  /**
   * Insert a block of the given type
   */
  const insertBlock = useCallback((type: BlockType) => {
    if (readOnly || !blockTree || !ast) return

    const handler = operationHandlerRef.current
    
    // Determine insert target
    let parentId = blockTree.id
    let index = blockTree.children?.length ?? 0

    if (selectedBlockId) {
      const result = findBlockParentAndIndex(blockTree, selectedBlockId)
      if (result && result.parent) {
        parentId = result.parent.id
        index = result.index + 1
      }
    }

    const addResult = handler.addBlock(type, parentId, index, {
      blockTree,
      ast,
      labelName,
    })

    if (addResult.success && addResult.blockTree) {
      setBlockTree(addResult.blockTree)
      onBlockTreeChange?.(addResult.blockTree)
      
      if (addResult.blockId) {
        setSelectedBlockId(addResult.blockId)
      }
      
      if (addResult.ast) {
        onAstChange?.(addResult.ast)
      }
    }
  }, [readOnly, blockTree, ast, selectedBlockId, labelName, findBlockParentAndIndex, setBlockTree, setSelectedBlockId, onBlockTreeChange, onAstChange])

  /**
   * Move selected block up
   */
  const moveBlockUp = useCallback(() => {
    if (readOnly || !selectedBlockId || !blockTree || !ast) return

    const result = findBlockParentAndIndex(blockTree, selectedBlockId)
    if (!result || !result.parent || result.index <= 0) return

    const handler = operationHandlerRef.current
    const moveResult = handler.moveBlock(
      selectedBlockId,
      result.parent.id,
      result.index - 1,
      { blockTree, ast, labelName }
    )

    if (moveResult.success && moveResult.blockTree) {
      setBlockTree(moveResult.blockTree)
      onBlockTreeChange?.(moveResult.blockTree)
      
      if (moveResult.ast) {
        onAstChange?.(moveResult.ast)
      }
    }
  }, [readOnly, selectedBlockId, blockTree, ast, labelName, findBlockParentAndIndex, setBlockTree, onBlockTreeChange, onAstChange])

  /**
   * Move selected block down
   */
  const moveBlockDown = useCallback(() => {
    if (readOnly || !selectedBlockId || !blockTree || !ast) return

    const result = findBlockParentAndIndex(blockTree, selectedBlockId)
    if (!result || !result.parent || !result.parent.children) return
    if (result.index >= result.parent.children.length - 1) return

    const handler = operationHandlerRef.current
    const moveResult = handler.moveBlock(
      selectedBlockId,
      result.parent.id,
      result.index + 2, // +2 because we're moving after the next item
      { blockTree, ast, labelName }
    )

    if (moveResult.success && moveResult.blockTree) {
      setBlockTree(moveResult.blockTree)
      onBlockTreeChange?.(moveResult.blockTree)
      
      if (moveResult.ast) {
        onAstChange?.(moveResult.ast)
      }
    }
  }, [readOnly, selectedBlockId, blockTree, ast, labelName, findBlockParentAndIndex, setBlockTree, onBlockTreeChange, onAstChange])

  /**
   * Handle shortcut action
   */
  const handleAction = useCallback((action: ShortcutAction) => {
    switch (action) {
      case 'copy':
        copySelectedBlock()
        break
      case 'paste':
        pasteFromClipboard()
        break
      case 'cut':
        cutSelectedBlock()
        break
      case 'delete':
        deleteSelectedBlock()
        break
      case 'undo':
        onUndo?.()
        break
      case 'redo':
        onRedo?.()
        break
      case 'selectAll':
        // Select all is not typically applicable in block editor
        break
      case 'escape':
        setSelectedBlockId(null)
        break
      case 'insertDialogue':
        insertBlock('dialogue')
        break
      case 'insertScene':
        insertBlock('scene')
        break
      case 'insertShow':
        insertBlock('show')
        break
      case 'insertMenu':
        insertBlock('menu')
        break
      case 'insertJump':
        insertBlock('jump')
        break
      case 'moveUp':
        moveBlockUp()
        break
      case 'moveDown':
        moveBlockDown()
        break
    }
  }, [
    copySelectedBlock,
    pasteFromClipboard,
    cutSelectedBlock,
    deleteSelectedBlock,
    insertBlock,
    moveBlockUp,
    moveBlockDown,
    setSelectedBlockId,
    onUndo,
    onRedo,
  ])

  /**
   * Check if a keyboard event matches a shortcut
   */
  const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: ShortcutDefinition): boolean => {
    const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey)
    const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
    const altMatch = shortcut.alt ? event.altKey : !event.altKey
    const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

    return ctrlMatch && shiftMatch && altMatch && keyMatch
  }, [])

  /**
   * Handle keydown event
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't handle shortcuts when typing in input fields
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault()
        event.stopPropagation()
        handleAction(shortcut.action)
        return
      }
    }
  }, [enabled, shortcuts, matchesShortcut, handleAction])

  // Set up event listener
  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  /**
   * Get all available shortcuts
   */
  const getShortcuts = useCallback(() => shortcuts, [shortcuts])

  return {
    copySelectedBlock,
    pasteFromClipboard,
    cutSelectedBlock,
    deleteSelectedBlock,
    insertBlock,
    moveBlockUp,
    moveBlockDown,
    getShortcuts,
  }
}

export default useKeyboardShortcuts
