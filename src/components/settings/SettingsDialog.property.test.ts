/**
 * Property-Based Tests for SettingsDialog
 * 
 * Feature: top-menu-bar
 * 
 * Property 6: Settings Dialog Cancel Discards Changes
 * Validates: Requirements 6.6
 * 
 * Property 7: Settings Dialog Unsaved Changes Confirmation
 * Validates: Requirements 6.8
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { useSettingsStore } from '../../settings/settingsStore'
import { 
  DEFAULT_GUI_SETTINGS, 
  DEFAULT_PROJECT_SETTINGS,
  type GuiSettings,
  type ProjectSettings 
} from '../../settings/SettingsParser'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Reset the store to initial state before each test
 */
function resetStore(): void {
  useSettingsStore.setState({
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
  })
}

/**
 * Initialize store with default settings (simulating loaded state)
 */
function initializeWithDefaults(): void {
  useSettingsStore.setState({
    gui: {
      settings: { ...DEFAULT_GUI_SETTINGS },
      originalContent: 'define gui.accent_color = \'#0099cc\'',
      modified: false,
    },
    project: {
      settings: { ...DEFAULT_PROJECT_SETTINGS },
      originalContent: 'define config.name = _("My Game")',
      modified: false,
    },
    isLoading: false,
    error: null,
  })
}

/**
 * Deep clone settings for comparison
 */
function cloneSettings<T>(settings: T | null): T | null {
  if (settings === null) return null
  return JSON.parse(JSON.stringify(settings))
}

/**
 * Compare two settings objects for equality
 */
function settingsEqual<T>(a: T | null, b: T | null): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

// ============================================================================
// Arbitrary Generators
// ============================================================================

/**
 * Generate valid hex color values
 */
const arbHexColor = fc.hexaString({ minLength: 6, maxLength: 6 })
  .map(hex => `#${hex}`)

/**
 * Generate valid font size values (10-100)
 */
const arbFontSize = fc.integer({ min: 10, max: 100 })

/**
 * Generate valid textbox height values
 */
const arbTextboxHeight = fc.integer({ min: 50, max: 500 })

/**
 * Generate valid textbox yalign values (0.0 to 1.0)
 */
const arbTextboxYalign = fc.float({ min: 0, max: 1, noNaN: true })

/**
 * Generate valid dialogue width values
 */
const arbDialogueWidth = fc.integer({ min: 100, max: 2000 })

/**
 * Generate valid game name strings
 */
const arbGameName = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '),
  { minLength: 1, maxLength: 50 }
)

/**
 * Generate valid version strings
 */
const arbVersion = fc.tuple(
  fc.integer({ min: 0, max: 99 }),
  fc.integer({ min: 0, max: 99 })
).map(([major, minor]) => `${major}.${minor}`)

/**
 * Generate valid window mode values
 */
const arbWindowMode = fc.constantFrom('auto', 'show', 'hide') as fc.Arbitrary<'auto' | 'show' | 'hide'>

/**
 * Generate GUI setting key-value pairs
 */
const arbGuiColorSetting = fc.tuple(
  fc.constantFrom('accentColor', 'idleColor', 'hoverColor', 'selectedColor', 'textColor') as fc.Arbitrary<keyof GuiSettings>,
  arbHexColor
)

const arbGuiFontSetting = fc.tuple(
  fc.constantFrom('textSize', 'nameTextSize', 'interfaceTextSize') as fc.Arbitrary<keyof GuiSettings>,
  arbFontSize
)

const arbGuiDialogueSetting = fc.oneof(
  fc.tuple(fc.constant('textboxHeight' as keyof GuiSettings), arbTextboxHeight),
  fc.tuple(fc.constant('textboxYalign' as keyof GuiSettings), arbTextboxYalign),
  fc.tuple(fc.constant('dialogueWidth' as keyof GuiSettings), arbDialogueWidth)
)

/**
 * Generate any GUI setting change
 */
const arbGuiSettingChange = fc.oneof(
  arbGuiColorSetting,
  arbGuiFontSetting,
  arbGuiDialogueSetting
)

/**
 * Generate Project setting key-value pairs
 */
const arbProjectStringSetting = fc.oneof(
  fc.tuple(fc.constant('name' as keyof ProjectSettings), arbGameName),
  fc.tuple(fc.constant('version' as keyof ProjectSettings), arbVersion)
)

const arbProjectBoolSetting = fc.tuple(
  fc.constantFrom('hasSound', 'hasMusic', 'hasVoice', 'showName') as fc.Arbitrary<keyof ProjectSettings>,
  fc.boolean()
)

const arbProjectWindowSetting = fc.tuple(
  fc.constant('windowMode' as keyof ProjectSettings),
  arbWindowMode
)

/**
 * Generate any Project setting change
 */
const arbProjectSettingChange = fc.oneof(
  arbProjectStringSetting,
  arbProjectBoolSetting,
  arbProjectWindowSetting
)

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 6: Settings Dialog Cancel Discards Changes', () => {
  beforeEach(() => {
    resetStore()
  })

  /**
   * Feature: top-menu-bar, Property 6: Settings Dialog Cancel Discards Changes
   * Validates: Requirements 6.6
   * 
   * For any GUI settings modification, calling resetSettings should restore
   * the original values from the file content.
   */
  it('should restore original GUI settings when resetSettings is called', () => {
    fc.assert(
      fc.property(
        arbGuiSettingChange,
        ([key, value]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Capture original settings
          const originalSettings = cloneSettings(useSettingsStore.getState().gui.settings)
          
          // Apply the setting change
          useSettingsStore.getState().updateGuiSetting(key, value as never)
          
          // Verify settings were changed
          const changedState = useSettingsStore.getState()
          expect(changedState.gui.modified).toBe(true)
          
          // Call resetSettings (simulates cancel action)
          useSettingsStore.getState().resetSettings()
          
          // Verify settings were restored to original
          const finalState = useSettingsStore.getState()
          expect(finalState.gui.modified).toBe(false)
          expect(settingsEqual(finalState.gui.settings, originalSettings)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: top-menu-bar, Property 6: Settings Dialog Cancel Discards Changes
   * Validates: Requirements 6.6
   * 
   * For any Project settings modification, calling resetSettings should restore
   * the original values from the file content.
   */
  it('should restore original Project settings when resetSettings is called', () => {
    fc.assert(
      fc.property(
        arbProjectSettingChange,
        ([key, value]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Capture original settings
          const originalSettings = cloneSettings(useSettingsStore.getState().project.settings)
          
          // Apply the setting change
          useSettingsStore.getState().updateProjectSetting(key, value as never)
          
          // Verify settings were changed
          const changedState = useSettingsStore.getState()
          expect(changedState.project.modified).toBe(true)
          
          // Call resetSettings (simulates cancel action)
          useSettingsStore.getState().resetSettings()
          
          // Verify settings were restored to original
          const finalState = useSettingsStore.getState()
          expect(finalState.project.modified).toBe(false)
          expect(settingsEqual(finalState.project.settings, originalSettings)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: top-menu-bar, Property 6: Settings Dialog Cancel Discards Changes
   * Validates: Requirements 6.6
   * 
   * Multiple setting changes should all be discarded when resetSettings is called.
   */
  it('should discard all GUI changes when resetSettings is called after multiple changes', () => {
    fc.assert(
      fc.property(
        fc.array(arbGuiSettingChange, { minLength: 2, maxLength: 5 }),
        (changes) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Capture original settings
          const originalSettings = cloneSettings(useSettingsStore.getState().gui.settings)
          
          // Apply all changes
          for (const [key, value] of changes) {
            useSettingsStore.getState().updateGuiSetting(key, value as never)
          }
          
          // Verify settings were changed
          expect(useSettingsStore.getState().gui.modified).toBe(true)
          
          // Call resetSettings
          useSettingsStore.getState().resetSettings()
          
          // Verify all settings were restored
          const finalState = useSettingsStore.getState()
          expect(finalState.gui.modified).toBe(false)
          expect(settingsEqual(finalState.gui.settings, originalSettings)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: top-menu-bar, Property 6: Settings Dialog Cancel Discards Changes
   * Validates: Requirements 6.6
   * 
   * Mixed GUI and Project changes should all be discarded when resetSettings is called.
   */
  it('should discard both GUI and Project changes when resetSettings is called', () => {
    fc.assert(
      fc.property(
        arbGuiSettingChange,
        arbProjectSettingChange,
        ([guiKey, guiValue], [projectKey, projectValue]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Capture original settings
          const originalGuiSettings = cloneSettings(useSettingsStore.getState().gui.settings)
          const originalProjectSettings = cloneSettings(useSettingsStore.getState().project.settings)
          
          // Apply both changes
          useSettingsStore.getState().updateGuiSetting(guiKey, guiValue as never)
          useSettingsStore.getState().updateProjectSetting(projectKey, projectValue as never)
          
          // Verify both were changed
          const changedState = useSettingsStore.getState()
          expect(changedState.gui.modified).toBe(true)
          expect(changedState.project.modified).toBe(true)
          
          // Call resetSettings
          useSettingsStore.getState().resetSettings()
          
          // Verify both were restored
          const finalState = useSettingsStore.getState()
          expect(finalState.gui.modified).toBe(false)
          expect(finalState.project.modified).toBe(false)
          expect(settingsEqual(finalState.gui.settings, originalGuiSettings)).toBe(true)
          expect(settingsEqual(finalState.project.settings, originalProjectSettings)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 7: Settings Dialog Unsaved Changes Confirmation', () => {
  beforeEach(() => {
    resetStore()
  })

  /**
   * Feature: top-menu-bar, Property 7: Settings Dialog Unsaved Changes Confirmation
   * Validates: Requirements 6.8
   * 
   * For any GUI settings modification, hasUnsavedChanges should return true.
   */
  it('should detect unsaved GUI changes', () => {
    fc.assert(
      fc.property(
        arbGuiSettingChange,
        ([key, value]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Capture original settings for comparison
          const originalSettings = cloneSettings(useSettingsStore.getState().gui.settings)
          
          // Apply the setting change
          useSettingsStore.getState().updateGuiSetting(key, value as never)
          
          // Check if settings are different from original
          const currentSettings = useSettingsStore.getState().gui.settings
          const hasChanges = !settingsEqual(currentSettings, originalSettings)
          
          // If the value is different from original, there should be unsaved changes
          // Note: If the random value happens to equal the original, hasChanges will be false
          if (hasChanges) {
            expect(useSettingsStore.getState().gui.modified).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: top-menu-bar, Property 7: Settings Dialog Unsaved Changes Confirmation
   * Validates: Requirements 6.8
   * 
   * For any Project settings modification, hasUnsavedChanges should return true.
   */
  it('should detect unsaved Project changes', () => {
    fc.assert(
      fc.property(
        arbProjectSettingChange,
        ([key, value]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Capture original settings for comparison
          const originalSettings = cloneSettings(useSettingsStore.getState().project.settings)
          
          // Apply the setting change
          useSettingsStore.getState().updateProjectSetting(key, value as never)
          
          // Check if settings are different from original
          const currentSettings = useSettingsStore.getState().project.settings
          const hasChanges = !settingsEqual(currentSettings, originalSettings)
          
          // If the value is different from original, there should be unsaved changes
          if (hasChanges) {
            expect(useSettingsStore.getState().project.modified).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: top-menu-bar, Property 7: Settings Dialog Unsaved Changes Confirmation
   * Validates: Requirements 6.8
   * 
   * After resetSettings, there should be no unsaved changes.
   */
  it('should have no unsaved changes after resetSettings', () => {
    fc.assert(
      fc.property(
        arbGuiSettingChange,
        arbProjectSettingChange,
        ([guiKey, guiValue], [projectKey, projectValue]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Apply changes
          useSettingsStore.getState().updateGuiSetting(guiKey, guiValue as never)
          useSettingsStore.getState().updateProjectSetting(projectKey, projectValue as never)
          
          // Reset settings
          useSettingsStore.getState().resetSettings()
          
          // Verify no unsaved changes
          const state = useSettingsStore.getState()
          expect(state.gui.modified).toBe(false)
          expect(state.project.modified).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: top-menu-bar, Property 7: Settings Dialog Unsaved Changes Confirmation
   * Validates: Requirements 6.8
   * 
   * The modified flag should accurately reflect whether there are unsaved changes.
   */
  it('should have modified flag true only when settings differ from original', () => {
    fc.assert(
      fc.property(
        fc.array(arbGuiSettingChange, { minLength: 1, maxLength: 3 }),
        (changes) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Apply changes
          for (const [key, value] of changes) {
            useSettingsStore.getState().updateGuiSetting(key, value as never)
          }
          
          // The modified flag should be true after any change
          expect(useSettingsStore.getState().gui.modified).toBe(true)
          
          // Reset and verify modified is false
          useSettingsStore.getState().resetSettings()
          expect(useSettingsStore.getState().gui.modified).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})
