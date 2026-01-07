/**
 * Confirm Dialog Store
 * 
 * Manages the global confirm dialog state.
 * Provides a Promise-based API for showing confirmation dialogs.
 */

import { create } from 'zustand'
import type { ConfirmDialogResult } from '../components/common/ConfirmDialog'

// ============================================================================
// Types
// ============================================================================

export interface ConfirmDialogOptions {
  title: string
  message: string
  showSaveOption?: boolean
  confirmLabel?: string
  cancelLabel?: string
  discardLabel?: string
}

interface ConfirmDialogState {
  isOpen: boolean
  options: ConfirmDialogOptions | null
  resolve: ((result: ConfirmDialogResult) => void) | null
}

interface ConfirmDialogActions {
  showConfirm: (options: ConfirmDialogOptions) => Promise<ConfirmDialogResult>
  handleResult: (result: ConfirmDialogResult) => void
  close: () => void
}

type ConfirmDialogStore = ConfirmDialogState & ConfirmDialogActions

// ============================================================================
// Store
// ============================================================================

export const useConfirmDialogStore = create<ConfirmDialogStore>((set, get) => ({
  // State
  isOpen: false,
  options: null,
  resolve: null,

  // Actions
  showConfirm: (options) => {
    return new Promise<ConfirmDialogResult>((resolve) => {
      set({
        isOpen: true,
        options,
        resolve,
      })
    })
  },

  handleResult: (result) => {
    const { resolve } = get()
    if (resolve) {
      resolve(result)
    }
    set({
      isOpen: false,
      options: null,
      resolve: null,
    })
  },

  close: () => {
    const { resolve } = get()
    if (resolve) {
      resolve('cancel')
    }
    set({
      isOpen: false,
      options: null,
      resolve: null,
    })
  },
}))

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Show a confirmation dialog and wait for user response
 * 
 * @example
 * const result = await showConfirmDialog({
 *   title: '未保存的更改',
 *   message: '当前项目有未保存的修改。是否保存后再继续？',
 *   showSaveOption: true,
 * })
 * 
 * if (result === 'save') {
 *   // Save and continue
 * } else if (result === 'discard') {
 *   // Continue without saving
 * } else {
 *   // Cancel operation
 * }
 */
export function showConfirmDialog(options: ConfirmDialogOptions): Promise<ConfirmDialogResult> {
  return useConfirmDialogStore.getState().showConfirm(options)
}

/**
 * Show unsaved changes confirmation dialog
 * Convenience function for the common "unsaved changes" pattern
 */
export function showUnsavedChangesDialog(itemsDescription: string): Promise<ConfirmDialogResult> {
  return showConfirmDialog({
    title: '未保存的更改',
    message: `当前项目有未保存的修改 (${itemsDescription})。\n\n是否保存后再继续？`,
    showSaveOption: true,
    confirmLabel: '保存',
    discardLabel: '不保存',
    cancelLabel: '取消',
  })
}
