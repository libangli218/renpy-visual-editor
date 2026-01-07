/**
 * Settings Module Index
 * 
 * Exports all settings-related functionality including:
 * - Settings store (Zustand)
 * - Settings parser for gui.rpy and options.rpy files
 * - Type definitions
 */

// ============================================================================
// Store Exports
// ============================================================================

export {
  useSettingsStore,
  getSettingsState,
  hasModifiedSettings,
  getGuiRpyPath,
  getOptionsRpyPath,
} from './settingsStore'

export type {
  FileState,
  SettingsState,
  SettingsActions,
  SettingsStore,
  SettingsFileSystem,
} from './settingsStore'

// ============================================================================
// Parser Exports
// ============================================================================

export {
  parseFile,
  updateDefines,
  toGuiSettings,
  toProjectSettings,
  fromGuiSettings,
  fromProjectSettings,
  DEFAULT_GUI_SETTINGS,
  DEFAULT_PROJECT_SETTINGS,
} from './SettingsParser'

export type {
  ParsedDefine,
  GuiSettings,
  ProjectSettings,
} from './SettingsParser'
