import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import {
  KeyboardShortcut,
  ShortcutCategory,
  ModifierKeys,
  formatShortcut,
  matchesShortcut,
  groupShortcutsByCategory,
  getSortedCategories,
  SHORTCUT_CATEGORY_INFO,
} from './types'
import { useKeyboardStore, createShortcut } from './keyboardStore'

/**
 * Property tests for Keyboard Shortcut functionality
 * 
 * Feature: renpy-visual-editor, Property 17: Keyboard Shortcut Execution
 * 
 * For any registered keyboard shortcut, pressing it should execute 
 * the corresponding action.
 * 
 * ∀ shortcut ∈ RegisteredShortcuts:
 *   let action = getAction(shortcut)
 *   onKeyPress(shortcut) → execute(action)
 * 
 * Validates: Requirements 17.1, 17.3
 */

// Arbitrary generators for keyboard shortcuts
const arbitraryShortcutCategory = fc.constantFrom<ShortcutCategory>(
  'file', 'edit', 'view', 'navigation', 'help'
)

const arbitraryKey = fc.oneof(
  // Single letter keys
  fc.stringMatching(/^[a-z]$/),
  // Function keys
  fc.constantFrom('F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'),
  // Special keys
  fc.constantFrom('Escape', 'Enter', 'Tab', 'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown'),
  // Symbol keys
  fc.constantFrom('?', '/', '[', ']', '\\', '-', '=', '`')
)

const arbitraryModifiers: fc.Arbitrary<ModifierKeys> = fc.record({
  ctrl: fc.boolean(),
  alt: fc.boolean(),
  shift: fc.boolean(),
  // Note: meta key is treated as equivalent to ctrl in matchesShortcut
  // So we don't generate meta-only shortcuts in tests
  meta: fc.constant(false),
})

const arbitraryShortcutId = fc.stringMatching(/^[a-z][a-z0-9-]{0,29}$/)
const arbitraryDescription = fc.string({ minLength: 1, maxLength: 50 })

// Generate a keyboard shortcut (without action for serialization)
interface ShortcutData {
  id: string
  key: string
  modifiers: ModifierKeys
  description: string
  category: ShortcutCategory
  enabled: boolean
}

const arbitraryShortcutData: fc.Arbitrary<ShortcutData> = fc.record({
  id: arbitraryShortcutId,
  key: arbitraryKey,
  modifiers: arbitraryModifiers,
  description: arbitraryDescription,
  category: arbitraryShortcutCategory,
  enabled: fc.boolean(),
})

/**
 * Create a mock KeyboardEvent
 */
function createMockKeyboardEvent(
  key: string,
  modifiers: ModifierKeys
): KeyboardEvent {
  return {
    key,
    ctrlKey: !!modifiers.ctrl,
    altKey: !!modifiers.alt,
    shiftKey: !!modifiers.shift,
    metaKey: !!modifiers.meta,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as KeyboardEvent
}

describe('Keyboard Shortcut Property Tests', () => {
  beforeEach(() => {
    // Reset the store before each test
    useKeyboardStore.setState({ shortcuts: [], helpPanelOpen: false })
  })

  /**
   * Feature: renpy-visual-editor, Property 17: Keyboard Shortcut Execution
   * 
   * For any registered keyboard shortcut, pressing it should execute 
   * the corresponding action.
   * 
   * Validates: Requirements 17.1, 17.3
   */
  describe('Property 17: Keyboard Shortcut Execution', () => {
    it('registered shortcuts execute their actions when matched', () => {
      fc.assert(
        fc.property(
          arbitraryShortcutData,
          (shortcutData) => {
            // Skip disabled shortcuts for this test
            if (!shortcutData.enabled) {
              return true
            }

            // Track if action was called
            let actionCalled = false
            const action = () => {
              actionCalled = true
            }

            // Create and register the shortcut
            const shortcut = createShortcut(
              shortcutData.id,
              shortcutData.key,
              shortcutData.modifiers,
              shortcutData.description,
              shortcutData.category,
              action,
              shortcutData.enabled
            )

            useKeyboardStore.getState().registerShortcut(shortcut)

            // Create a matching keyboard event
            const event = createMockKeyboardEvent(
              shortcutData.key,
              shortcutData.modifiers
            )

            // Handle the event
            const handled = useKeyboardStore.getState().handleKeyDown(event)

            // Verify the action was called
            expect(handled).toBe(true)
            expect(actionCalled).toBe(true)

            // Clean up
            useKeyboardStore.getState().unregisterShortcut(shortcutData.id)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('disabled shortcuts do not execute their actions', () => {
      fc.assert(
        fc.property(
          arbitraryShortcutData,
          (shortcutData) => {
            // Track if action was called
            let actionCalled = false
            const action = () => {
              actionCalled = true
            }

            // Create and register a disabled shortcut
            const shortcut = createShortcut(
              shortcutData.id,
              shortcutData.key,
              shortcutData.modifiers,
              shortcutData.description,
              shortcutData.category,
              action,
              false // disabled
            )

            useKeyboardStore.getState().registerShortcut(shortcut)

            // Create a matching keyboard event
            const event = createMockKeyboardEvent(
              shortcutData.key,
              shortcutData.modifiers
            )

            // Handle the event
            const handled = useKeyboardStore.getState().handleKeyDown(event)

            // Verify the action was NOT called
            expect(handled).toBe(false)
            expect(actionCalled).toBe(false)

            // Clean up
            useKeyboardStore.getState().unregisterShortcut(shortcutData.id)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('non-matching events do not trigger shortcuts', () => {
      fc.assert(
        fc.property(
          arbitraryShortcutData,
          arbitraryKey,
          arbitraryModifiers,
          (shortcutData, differentKey, differentModifiers) => {
            // Skip if the keys happen to match
            if (
              differentKey.toLowerCase() === shortcutData.key.toLowerCase() &&
              !!differentModifiers.ctrl === !!shortcutData.modifiers.ctrl &&
              !!differentModifiers.alt === !!shortcutData.modifiers.alt &&
              !!differentModifiers.shift === !!shortcutData.modifiers.shift
            ) {
              return true
            }

            // Track if action was called
            let actionCalled = false
            const action = () => {
              actionCalled = true
            }

            // Create and register the shortcut
            const shortcut = createShortcut(
              shortcutData.id,
              shortcutData.key,
              shortcutData.modifiers,
              shortcutData.description,
              shortcutData.category,
              action,
              true
            )

            useKeyboardStore.getState().registerShortcut(shortcut)

            // Create a NON-matching keyboard event
            const event = createMockKeyboardEvent(differentKey, differentModifiers)

            // Handle the event
            const handled = useKeyboardStore.getState().handleKeyDown(event)

            // Verify the action was NOT called
            expect(handled).toBe(false)
            expect(actionCalled).toBe(false)

            // Clean up
            useKeyboardStore.getState().unregisterShortcut(shortcutData.id)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('multiple shortcuts can be registered and executed independently', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryShortcutData, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (shortcutsData, targetIndex) => {
            // Ensure unique IDs and keys, and all enabled
            const uniqueShortcuts = shortcutsData.reduce((acc, s, i) => {
              const uniqueId = `${s.id}-${i}`
              const uniqueKey = String.fromCharCode(97 + (i % 26)) // a-z
              // Use unique modifiers to avoid collisions
              const uniqueModifiers: ModifierKeys = {
                ctrl: i % 2 === 0,
                alt: i % 3 === 0,
                shift: i % 5 === 0,
                meta: false,
              }
              acc.push({ ...s, id: uniqueId, key: uniqueKey, modifiers: uniqueModifiers, enabled: true })
              return acc
            }, [] as ShortcutData[])

            if (uniqueShortcuts.length === 0) {
              return true
            }

            const actualTargetIndex = targetIndex % uniqueShortcuts.length
            const targetShortcut = uniqueShortcuts[actualTargetIndex]

            // Track which actions were called
            const actionsCalled: string[] = []

            // Register all shortcuts
            for (const data of uniqueShortcuts) {
              const shortcut = createShortcut(
                data.id,
                data.key,
                data.modifiers,
                data.description,
                data.category,
                () => {
                  actionsCalled.push(data.id)
                },
                data.enabled
              )
              useKeyboardStore.getState().registerShortcut(shortcut)
            }

            // Create event matching the target shortcut
            const event = createMockKeyboardEvent(
              targetShortcut.key,
              targetShortcut.modifiers
            )

            // Handle the event
            useKeyboardStore.getState().handleKeyDown(event)

            // Verify only the target action was called
            expect(actionsCalled).toContain(targetShortcut.id)
            expect(actionsCalled.length).toBe(1)

            // Clean up
            for (const data of uniqueShortcuts) {
              useKeyboardStore.getState().unregisterShortcut(data.id)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional property tests for shortcut formatting and matching
   */
  describe('Shortcut Formatting Properties', () => {
    it('formatShortcut produces consistent output for same input', () => {
      fc.assert(
        fc.property(
          arbitraryShortcutData,
          (shortcutData) => {
            const shortcut = createShortcut(
              shortcutData.id,
              shortcutData.key,
              shortcutData.modifiers,
              shortcutData.description,
              shortcutData.category,
              () => {},
              shortcutData.enabled
            )

            const formatted1 = formatShortcut(shortcut)
            const formatted2 = formatShortcut(shortcut)

            expect(formatted1).toBe(formatted2)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('formatShortcut includes all active modifiers', () => {
      fc.assert(
        fc.property(
          arbitraryShortcutData,
          (shortcutData) => {
            const shortcut = createShortcut(
              shortcutData.id,
              shortcutData.key,
              shortcutData.modifiers,
              shortcutData.description,
              shortcutData.category,
              () => {},
              shortcutData.enabled
            )

            const formatted = formatShortcut(shortcut)

            if (shortcutData.modifiers.ctrl) {
              expect(formatted).toContain('Ctrl')
            }
            if (shortcutData.modifiers.alt) {
              expect(formatted).toContain('Alt')
            }
            if (shortcutData.modifiers.shift) {
              expect(formatted).toContain('Shift')
            }
            if (shortcutData.modifiers.meta) {
              expect(formatted).toContain('Cmd')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Shortcut matching properties
   */
  describe('Shortcut Matching Properties', () => {
    it('matchesShortcut is reflexive for enabled shortcuts', () => {
      fc.assert(
        fc.property(
          arbitraryShortcutData,
          (shortcutData) => {
            const shortcut = createShortcut(
              shortcutData.id,
              shortcutData.key,
              shortcutData.modifiers,
              shortcutData.description,
              shortcutData.category,
              () => {},
              true // enabled
            )

            const event = createMockKeyboardEvent(
              shortcutData.key,
              shortcutData.modifiers
            )

            expect(matchesShortcut(event, shortcut)).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('matchesShortcut is case-insensitive for letter keys', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-z]$/),
          arbitraryModifiers,
          (key, modifiers) => {
            const shortcut = createShortcut(
              'test',
              key.toLowerCase(),
              modifiers,
              'Test',
              'edit',
              () => {},
              true
            )

            // Test with uppercase key
            const upperEvent = createMockKeyboardEvent(key.toUpperCase(), modifiers)
            // Test with lowercase key
            const lowerEvent = createMockKeyboardEvent(key.toLowerCase(), modifiers)

            expect(matchesShortcut(upperEvent, shortcut)).toBe(true)
            expect(matchesShortcut(lowerEvent, shortcut)).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Category grouping properties
   */
  describe('Category Grouping Properties', () => {
    it('groupShortcutsByCategory preserves all shortcuts', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryShortcutData, { minLength: 0, maxLength: 20 }),
          (shortcutsData) => {
            const shortcuts = shortcutsData.map((data, i) =>
              createShortcut(
                `${data.id}-${i}`,
                data.key,
                data.modifiers,
                data.description,
                data.category,
                () => {},
                data.enabled
              )
            )

            const grouped = groupShortcutsByCategory(shortcuts)

            // Count total shortcuts in grouped map
            let totalGrouped = 0
            grouped.forEach((categoryShortcuts) => {
              totalGrouped += categoryShortcuts.length
            })

            expect(totalGrouped).toBe(shortcuts.length)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('groupShortcutsByCategory groups by correct category', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryShortcutData, { minLength: 1, maxLength: 20 }),
          (shortcutsData) => {
            const shortcuts = shortcutsData.map((data, i) =>
              createShortcut(
                `${data.id}-${i}`,
                data.key,
                data.modifiers,
                data.description,
                data.category,
                () => {},
                data.enabled
              )
            )

            const grouped = groupShortcutsByCategory(shortcuts)

            // Verify each shortcut is in the correct category
            grouped.forEach((categoryShortcuts, category) => {
              for (const shortcut of categoryShortcuts) {
                expect(shortcut.category).toBe(category)
              }
            })

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('getSortedCategories returns all categories in order', () => {
      const sorted = getSortedCategories()
      
      // Verify all categories are present
      const allCategories: ShortcutCategory[] = ['file', 'edit', 'view', 'navigation', 'help']
      expect(sorted.length).toBe(allCategories.length)
      
      for (const category of allCategories) {
        expect(sorted).toContain(category)
      }

      // Verify order is correct based on SHORTCUT_CATEGORY_INFO
      for (let i = 1; i < sorted.length; i++) {
        const prevOrder = SHORTCUT_CATEGORY_INFO[sorted[i - 1]].order
        const currOrder = SHORTCUT_CATEGORY_INFO[sorted[i]].order
        expect(prevOrder).toBeLessThanOrEqual(currOrder)
      }
    })
  })
})
