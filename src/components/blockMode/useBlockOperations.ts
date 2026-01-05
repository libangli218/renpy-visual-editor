/**
 * useBlockOperations Hook
 * 积木操作 Hook
 * 
 * Provides block operations with automatic undo/redo support
 * by integrating with the editorStore.
 * 
 * Implements Requirements:
 * - 8.6: 支持撤销/重做操作
 */

import { useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import {
  BlockOperationHandler,
  BlockOperationContext,
  BlockOperationResult,
} from './BlockOperationHandler'
import { Block, BlockType, BlockClipboard } from './types'

/**
 * Hook for block operations with undo/redo support
 */
export function useBlockOperations(
  blockTree: Block | null,
  labelName: string
) {
  const { ast, setAst, pushToHistory, undo, redo, canUndo, canRedo } = useEditorStore()
  
  const handler = new BlockOperationHandler()

  /**
   * Execute an operation and update the store
   */
  const executeOperation = useCallback(
    (
      operation: (context: BlockOperationContext) => BlockOperationResult
    ): BlockOperationResult => {
      if (!blockTree || !ast) {
        return { success: false, error: 'No block tree or AST available' }
      }

      // Create a deep copy of the AST to avoid mutations
      const astCopy = JSON.parse(JSON.stringify(ast))
      const blockTreeCopy = JSON.parse(JSON.stringify(blockTree))

      const context: BlockOperationContext = {
        blockTree: blockTreeCopy,
        ast: astCopy,
        labelName,
      }

      // Push current state to history before making changes
      pushToHistory()

      // Execute the operation
      const result = operation(context)

      if (result.success && result.ast) {
        // Update the AST in the store (this also marks as modified)
        setAst(result.ast)
      }

      return result
    },
    [blockTree, ast, labelName, pushToHistory, setAst]
  )

  /**
   * Add a new block
   */
  const addBlock = useCallback(
    (type: BlockType, parentId: string, index: number): BlockOperationResult => {
      return executeOperation((context) =>
        handler.addBlock(type, parentId, index, context)
      )
    },
    [executeOperation, handler]
  )

  /**
   * Delete a block
   */
  const deleteBlock = useCallback(
    (blockId: string): BlockOperationResult => {
      return executeOperation((context) =>
        handler.deleteBlock(blockId, context)
      )
    },
    [executeOperation, handler]
  )

  /**
   * Move a block
   */
  const moveBlock = useCallback(
    (blockId: string, newParentId: string, newIndex: number): BlockOperationResult => {
      return executeOperation((context) =>
        handler.moveBlock(blockId, newParentId, newIndex, context)
      )
    },
    [executeOperation, handler]
  )

  /**
   * Update a slot value
   */
  const updateSlot = useCallback(
    (blockId: string, slotName: string, value: unknown): BlockOperationResult => {
      return executeOperation((context) =>
        handler.updateSlot(blockId, slotName, value, context)
      )
    },
    [executeOperation, handler]
  )

  /**
   * Copy a block to clipboard
   */
  const copyBlock = useCallback(
    (blockId: string): BlockClipboard | null => {
      if (!blockTree || !ast) {
        return null
      }

      const context: BlockOperationContext = {
        blockTree,
        ast,
        labelName,
      }

      return handler.copyBlock(blockId, context)
    },
    [blockTree, ast, labelName, handler]
  )

  /**
   * Paste blocks from clipboard
   */
  const pasteBlock = useCallback(
    (clipboard: BlockClipboard, parentId: string, index: number): BlockOperationResult => {
      return executeOperation((context) =>
        handler.pasteBlock(clipboard, parentId, index, context)
      )
    },
    [executeOperation, handler]
  )

  /**
   * Find a block by ID
   */
  const findBlockById = useCallback(
    (blockId: string): Block | null => {
      if (!blockTree) {
        return null
      }
      return handler.findBlockById(blockTree, blockId)
    },
    [blockTree, handler]
  )

  return {
    // Operations
    addBlock,
    deleteBlock,
    moveBlock,
    updateSlot,
    copyBlock,
    pasteBlock,
    findBlockById,
    
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
