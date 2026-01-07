/**
 * Settings Store - Zustand store for GUI and Project settings management
 * 
 * Manages settings from gui.rpy and options.rpy files.
 * Implements Requirements 9.1, 9.3, 2.5, 8.1, 8.2
 */

import { create } from 'zustand'
import {
  GuiSettings,
  ProjectSettings,
  DEFAULT_GUI_SETTINGS,
  DEFAULT_PROJECT_SETTINGS,
  parseFile,
  toGuiSettings,
  toProjectSettings,
  fromGuiSettings,
  fromProjectSettings,
  updateDefines,
} from './SettingsParser'

// ============================================================================
// Types
// ============================================================================

/**
 * State for a single settings file
 */
export interface FileState<T> {
  settings: T | null
  originalContent: string      // Original file content for format preservation
  modified: boolean            // Whether there are unsaved changes
}

/**
 * Complete settings store state
 */
export interface SettingsState {
  gui: FileState<GuiSettings>
  project: FileState<ProjectSettings>
  isLoading: boolean
  error: string | null
}

/**
 * Settings store actions
 */
export interface SettingsActions {
  loadSettings: (projectPath: string, fs: SettingsFileSystem) => Promise<void>
  updateGuiSetting: <K extends keyof GuiSettings>(key: K, value: GuiSettings[K]) => void
  updateProjectSetting: <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) => void
  saveSettings: (projectPath: string, fs: SettingsFileSystem) => Promise<boolean>
  resetSettings: () => void
}

/**
 * Combined store interface
 */
export interface SettingsStore extends SettingsState, SettingsActions {}

/**
 * File system interface for settings operations
 * Allows testing without Electron
 */
export interface SettingsFileSystem {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  exists(path: string): Promise<boolean>
}

// ============================================================================
// Path Helpers
// ============================================================================

/**
 * Join path segments (cross-platform)
 */
function joinPath(...segments: string[]): string {
  return segments.join('/').replace(/\/+/g, '/')
}

/**
 * Get the path to gui.rpy
 */
export function getGuiRpyPath(projectPath: string): string {
  return joinPath(projectPath, 'game', 'gui.rpy')
}

/**
 * Get the path to options.rpy
 */
export function getOptionsRpyPath(projectPath: string): string {
  return joinPath(projectPath, 'game', 'options.rpy')
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: SettingsState = {
  gui: {
    settings: null,
    originalContent: '',
    modified: false,
  },
  project: {
    settings: null,
    originalContent: '',
    modified: false,
  },
  isLoading: false,
  error: null,
}

// ============================================================================
// Store Creation
// ============================================================================

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // Initial state
  ...initialState,

  /**
   * Load settings from gui.rpy and options.rpy
   * Implements Requirements 9.1, 9.3
   */
  loadSettings: async (projectPath: string, fs: SettingsFileSystem) => {
    set({ isLoading: true, error: null })

    try {
      // Load gui.rpy
      const guiPath = getGuiRpyPath(projectPath)
      let guiContent = ''
      let guiSettings: GuiSettings = { ...DEFAULT_GUI_SETTINGS }

      if (await fs.exists(guiPath)) {
        guiContent = await fs.readFile(guiPath)
        const defines = parseFile(guiContent)
        guiSettings = toGuiSettings(defines)
      }

      // Load options.rpy
      const optionsPath = getOptionsRpyPath(projectPath)
      let optionsContent = ''
      let projectSettings: ProjectSettings = { ...DEFAULT_PROJECT_SETTINGS }

      if (await fs.exists(optionsPath)) {
        optionsContent = await fs.readFile(optionsPath)
        const defines = parseFile(optionsContent)
        projectSettings = toProjectSettings(defines)
      }

      set({
        gui: {
          settings: guiSettings,
          originalContent: guiContent,
          modified: false,
        },
        project: {
          settings: projectSettings,
          originalContent: optionsContent,
          modified: false,
        },
        isLoading: false,
        error: null,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: `Failed to load settings: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  },

  /**
   * Update a GUI setting
   * Implements Requirements 2.5, 8.1
   */
  updateGuiSetting: <K extends keyof GuiSettings>(key: K, value: GuiSettings[K]) => {
    const { gui } = get()
    if (!gui.settings) return

    set({
      gui: {
        ...gui,
        settings: {
          ...gui.settings,
          [key]: value,
        },
        modified: true,
      },
    })
  },

  /**
   * Update a project setting
   * Implements Requirements 2.5, 8.1
   */
  updateProjectSetting: <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) => {
    const { project } = get()
    if (!project.settings) return

    set({
      project: {
        ...project,
        settings: {
          ...project.settings,
          [key]: value,
        },
        modified: true,
      },
    })
  },

  /**
   * Save settings to gui.rpy and options.rpy
   * Implements Requirement 8.2
   */
  saveSettings: async (projectPath: string, fs: SettingsFileSystem) => {
    const { gui, project } = get()

    try {
      // Save gui.rpy if modified
      if (gui.modified && gui.settings) {
        const guiPath = getGuiRpyPath(projectPath)
        const updates = fromGuiSettings(gui.settings)
        
        let newContent: string
        if (gui.originalContent) {
          // Update existing file, preserving format
          newContent = updateDefines(gui.originalContent, updates)
        } else {
          // Create new file with default content
          newContent = generateGuiRpyContent(gui.settings)
        }

        await fs.writeFile(guiPath, newContent)

        set({
          gui: {
            ...gui,
            originalContent: newContent,
            modified: false,
          },
        })
      }

      // Save options.rpy if modified
      if (project.modified && project.settings) {
        const optionsPath = getOptionsRpyPath(projectPath)
        const updates = fromProjectSettings(project.settings)
        
        let newContent: string
        if (project.originalContent) {
          // Update existing file, preserving format
          newContent = updateDefines(project.originalContent, updates)
        } else {
          // Create new file with default content
          newContent = generateOptionsRpyContent(project.settings)
        }

        await fs.writeFile(optionsPath, newContent)

        set({
          project: {
            ...project,
            originalContent: newContent,
            modified: false,
          },
        })
      }

      set({ error: null })
      return true
    } catch (error) {
      set({
        error: `Failed to save settings: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  },

  /**
   * Reset settings to original values from files
   * Clears modified flags
   */
  resetSettings: () => {
    const { gui, project } = get()

    // Re-parse original content to get original settings
    let guiSettings: GuiSettings | null = null
    if (gui.originalContent) {
      const defines = parseFile(gui.originalContent)
      guiSettings = toGuiSettings(defines)
    }

    let projectSettings: ProjectSettings | null = null
    if (project.originalContent) {
      const defines = parseFile(project.originalContent)
      projectSettings = toProjectSettings(defines)
    }

    set({
      gui: {
        ...gui,
        settings: guiSettings,
        modified: false,
      },
      project: {
        ...project,
        settings: projectSettings,
        modified: false,
      },
      error: null,
    })
  },
}))

// ============================================================================
// Helper Functions for New File Generation
// ============================================================================

/**
 * Generate gui.rpy content for a new file
 */
function generateGuiRpyContent(settings: GuiSettings): string {
  const lines = [
    '# GUI Configuration',
    '# This file was generated by Ren\'Py Visual Editor',
    '',
    '# Colors',
    `define gui.accent_color = '${settings.accentColor}'`,
    `define gui.idle_color = '${settings.idleColor}'`,
    `define gui.hover_color = '${settings.hoverColor}'`,
    `define gui.selected_color = '${settings.selectedColor}'`,
    `define gui.text_color = '${settings.textColor}'`,
    '',
    '# Font Sizes',
    `define gui.text_size = ${settings.textSize}`,
    `define gui.name_text_size = ${settings.nameTextSize}`,
    `define gui.interface_text_size = ${settings.interfaceTextSize}`,
    '',
    '# Dialogue Box',
    `define gui.textbox_height = ${settings.textboxHeight}`,
    `define gui.textbox_yalign = ${settings.textboxYalign}`,
    `define gui.dialogue_width = ${settings.dialogueWidth}`,
  ]
  return lines.join('\n')
}

/**
 * Generate options.rpy content for a new file
 */
function generateOptionsRpyContent(settings: ProjectSettings): string {
  const lines = [
    '# Project Options',
    '# This file was generated by Ren\'Py Visual Editor',
    '',
    '# Basic Info',
    `define config.name = _("${settings.name}")`,
    `define config.version = '${settings.version}'`,
    '',
    '# Audio',
    `define config.has_sound = ${settings.hasSound ? 'True' : 'False'}`,
    `define config.has_music = ${settings.hasMusic ? 'True' : 'False'}`,
    `define config.has_voice = ${settings.hasVoice ? 'True' : 'False'}`,
    '',
    '# Display',
    `define gui.show_name = ${settings.showName ? 'True' : 'False'}`,
    `define config.window = '${settings.windowMode}'`,
  ]
  return lines.join('\n')
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Get the current settings state (for testing)
 */
export function getSettingsState(): SettingsState {
  return useSettingsStore.getState()
}

/**
 * Check if any settings have been modified
 */
export function hasModifiedSettings(): boolean {
  const state = useSettingsStore.getState()
  return state.gui.modified || state.project.modified
}
