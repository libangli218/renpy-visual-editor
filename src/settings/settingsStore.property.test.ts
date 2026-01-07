/**
 * Property-Based Tests for SettingsStore
 * 
 * Feature: settings-panels
 * 
 * Property 3: Setting Changes Mark Modified
 * Validates: Requirements 2.5, 8.1
 * 
 * For any setting change (color, font size, or project setting),
 * the project should be marked as modified after the change.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { useSettingsStore } from './settingsStore'
import { GuiSettings, ProjectSettings, DEFAULT_GUI_SETTINGS, DEFAULT_PROJECT_SETTINGS } from './SettingsParser'

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
      originalContent: 'define gui.accent_color = \'#cc6600\'',
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

describe('Property 3: Setting Changes Mark Modified', () => {
  beforeEach(() => {
    resetStore()
  })

  /**
   * Feature: settings-panels, Property 3: Setting Changes Mark Modified
   * Validates: Requirements 2.5, 8.1
   * 
   * For any GUI setting change, the gui.modified flag should be set to true.
   */
  it('should mark gui as modified when any GUI setting is changed', () => {
    fc.assert(
      fc.property(
        arbGuiSettingChange,
        ([key, value]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Verify initial state is not modified
          const initialState = useSettingsStore.getState()
          expect(initialState.gui.modified).toBe(false)
          
          // Apply the setting change
          useSettingsStore.getState().updateGuiSetting(key, value as never)
          
          // Verify modified flag is set
          const finalState = useSettingsStore.getState()
          expect(finalState.gui.modified).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: settings-panels, Property 3: Setting Changes Mark Modified
   * Validates: Requirements 2.5, 8.1
   * 
   * For any Project setting change, the project.modified flag should be set to true.
   */
  it('should mark project as modified when any Project setting is changed', () => {
    fc.assert(
      fc.property(
        arbProjectSettingChange,
        ([key, value]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Verify initial state is not modified
          const initialState = useSettingsStore.getState()
          expect(initialState.project.modified).toBe(false)
          
          // Apply the setting change
          useSettingsStore.getState().updateProjectSetting(key, value as never)
          
          // Verify modified flag is set
          const finalState = useSettingsStore.getState()
          expect(finalState.project.modified).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: settings-panels, Property 3: Setting Changes Mark Modified
   * Validates: Requirements 2.5, 8.1
   * 
   * Multiple setting changes should all result in modified being true.
   */
  it('should keep modified flag true after multiple GUI setting changes', () => {
    fc.assert(
      fc.property(
        fc.array(arbGuiSettingChange, { minLength: 2, maxLength: 5 }),
        (changes) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Apply all changes
          for (const [key, value] of changes) {
            useSettingsStore.getState().updateGuiSetting(key, value as never)
          }
          
          // Verify modified flag is still true
          const finalState = useSettingsStore.getState()
          expect(finalState.gui.modified).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: settings-panels, Property 3: Setting Changes Mark Modified
   * Validates: Requirements 2.5, 8.1
   * 
   * GUI changes should not affect project modified flag and vice versa.
   */
  it('should keep gui and project modified flags independent', () => {
    fc.assert(
      fc.property(
        arbGuiSettingChange,
        ([key, value]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Apply GUI setting change
          useSettingsStore.getState().updateGuiSetting(key, value as never)
          
          // Verify only gui is modified, not project
          const state = useSettingsStore.getState()
          expect(state.gui.modified).toBe(true)
          expect(state.project.modified).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should keep project and gui modified flags independent', () => {
    fc.assert(
      fc.property(
        arbProjectSettingChange,
        ([key, value]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Apply Project setting change
          useSettingsStore.getState().updateProjectSetting(key, value as never)
          
          // Verify only project is modified, not gui
          const state = useSettingsStore.getState()
          expect(state.project.modified).toBe(true)
          expect(state.gui.modified).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: settings-panels, Property 3: Setting Changes Mark Modified
   * Validates: Requirements 2.5, 8.1
   * 
   * Setting changes should update the actual setting value.
   */
  it('should update the actual GUI setting value', () => {
    fc.assert(
      fc.property(
        arbGuiColorSetting,
        ([key, value]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Apply the setting change
          useSettingsStore.getState().updateGuiSetting(key, value)
          
          // Verify the value was updated
          const state = useSettingsStore.getState()
          expect(state.gui.settings?.[key]).toBe(value)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should update the actual Project setting value', () => {
    fc.assert(
      fc.property(
        arbProjectStringSetting,
        ([key, value]) => {
          // Initialize with defaults
          initializeWithDefaults()
          
          // Apply the setting change
          useSettingsStore.getState().updateProjectSetting(key, value)
          
          // Verify the value was updated
          const state = useSettingsStore.getState()
          expect(state.project.settings?.[key]).toBe(value)
        }
      ),
      { numRuns: 100 }
    )
  })
})
