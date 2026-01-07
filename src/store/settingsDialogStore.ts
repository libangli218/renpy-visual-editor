/**
 * Settings Dialog Store
 * 
 * Manages the open/close state of the Settings Dialog.
 * Provides a centralized way to control the dialog from menu actions
 * and other parts of the application.
 * 
 * Implements Requirement 6.1: WHEN the user opens Project Settings, 
 * THE Settings_Dialog SHALL appear as a modal window
 */

import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

/**
 * Settings Dialog Store State
 */
export interface SettingsDialogState {
  /** Whether the settings dialog is currently open */
  isOpen: boolean
}

/**
 * Settings Dialog Store Actions
 */
export interface SettingsDialogActions {
  /** Open the settings dialog */
  openSettingsDialog: () => void
  /** Close the settings dialog */
  closeSettingsDialog: () => void
  /** Toggle the settings dialog open/close state */
  toggleSettingsDialog: () => void
}

/**
 * Combined Settings Dialog Store interface
 */
export interface SettingsDialogStore extends SettingsDialogState, SettingsDialogActions {}

// ============================================================================
// Initial State
// ============================================================================

const initialState: SettingsDialogState = {
  isOpen: false,
}

// ============================================================================
// Store Creation
// ============================================================================

/**
 * Zustand store for Settings Dialog state management
 */
export const useSettingsDialogStore = create<SettingsDialogStore>((set) => ({
  // Initial state
  ...initialState,

  /**
   * Open the settings dialog
   * Requirement 6.1: Settings dialog appears as modal window
   */
  openSettingsDialog: () => {
    set({ isOpen: true })
  },

  /**
   * Close the settings dialog
   */
  closeSettingsDialog: () => {
    set({ isOpen: false })
  },

  /**
   * Toggle the settings dialog open/close state
   */
  toggleSettingsDialog: () => {
    set((state) => ({ isOpen: !state.isOpen }))
  },
}))

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the current settings dialog state (for testing)
 */
export function getSettingsDialogState(): SettingsDialogState {
  return useSettingsDialogStore.getState()
}

/**
 * Check if the settings dialog is currently open
 */
export function isSettingsDialogOpen(): boolean {
  return useSettingsDialogStore.getState().isOpen
}

/**
 * Open the settings dialog (imperative API)
 */
export function openSettingsDialog(): void {
  useSettingsDialogStore.getState().openSettingsDialog()
}

/**
 * Close the settings dialog (imperative API)
 */
export function closeSettingsDialog(): void {
  useSettingsDialogStore.getState().closeSettingsDialog()
}
