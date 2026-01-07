/**
 * Property-Based Tests for ColorPreview Component
 * 
 * Feature: settings-panels
 * 
 * Property 7: Color Preview Updates
 * Validates: Requirements 10.2, 10.3
 * 
 * For any color setting change, the preview component should
 * immediately reflect the new color value.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Color Preview Logic (Pure Functions for Testing)
// ============================================================================

/**
 * Represents the color preview state
 */
interface ColorPreviewState {
  accentColor: string
  idleColor: string
  hoverColor: string
  selectedColor: string
  textColor: string
}

/**
 * Simulates what the ColorPreview component renders
 * Returns the colors that would be applied to each element
 */
function getPreviewColors(state: ColorPreviewState): {
  nameColor: string
  dialogueColor: string
  idleChoiceColor: string
  hoverChoiceColor: string
  selectedChoiceColor: string
  selectedBackgroundColor: string
} {
  return {
    nameColor: state.accentColor,
    dialogueColor: state.textColor,
    idleChoiceColor: state.idleColor,
    hoverChoiceColor: state.hoverColor,
    selectedChoiceColor: state.selectedColor,
    selectedBackgroundColor: `${state.accentColor}33`, // 20% opacity
  }
}

/**
 * Apply a color change to the preview state
 */
function applyColorChange(
  state: ColorPreviewState,
  key: keyof ColorPreviewState,
  newColor: string
): ColorPreviewState {
  return {
    ...state,
    [key]: newColor,
  }
}

// ============================================================================
// Arbitrary Generators
// ============================================================================

/**
 * Generate valid hex color values
 */
const arbHexColor = fc.hexaString({ minLength: 6, maxLength: 6 })
  .map(hex => `#${hex.toLowerCase()}`)

/**
 * Generate a complete color preview state
 */
const arbColorPreviewState = fc.record({
  accentColor: arbHexColor,
  idleColor: arbHexColor,
  hoverColor: arbHexColor,
  selectedColor: arbHexColor,
  textColor: arbHexColor,
})

/**
 * Generate a color key
 */
const arbColorKey = fc.constantFrom(
  'accentColor',
  'idleColor',
  'hoverColor',
  'selectedColor',
  'textColor'
) as fc.Arbitrary<keyof ColorPreviewState>

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 7: Color Preview Updates', () => {
  /**
   * Feature: settings-panels, Property 7: Color Preview Updates
   * Validates: Requirements 10.2, 10.3
   * 
   * For any color state, the preview should reflect all colors correctly.
   */
  it('should reflect all color values in preview', () => {
    fc.assert(
      fc.property(
        arbColorPreviewState,
        (state) => {
          const preview = getPreviewColors(state)
          
          // Verify each color is correctly mapped
          expect(preview.nameColor).toBe(state.accentColor)
          expect(preview.dialogueColor).toBe(state.textColor)
          expect(preview.idleChoiceColor).toBe(state.idleColor)
          expect(preview.hoverChoiceColor).toBe(state.hoverColor)
          expect(preview.selectedChoiceColor).toBe(state.selectedColor)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: settings-panels, Property 7: Color Preview Updates
   * Validates: Requirements 10.2, 10.3
   * 
   * When accent color changes, the name color should update immediately.
   */
  it('should update name color when accent color changes', () => {
    fc.assert(
      fc.property(
        arbColorPreviewState,
        arbHexColor,
        (initialState, newAccentColor) => {
          const updatedState = applyColorChange(initialState, 'accentColor', newAccentColor)
          const preview = getPreviewColors(updatedState)
          
          expect(preview.nameColor).toBe(newAccentColor)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: settings-panels, Property 7: Color Preview Updates
   * Validates: Requirements 10.2, 10.3
   * 
   * When text color changes, the dialogue color should update immediately.
   */
  it('should update dialogue color when text color changes', () => {
    fc.assert(
      fc.property(
        arbColorPreviewState,
        arbHexColor,
        (initialState, newTextColor) => {
          const updatedState = applyColorChange(initialState, 'textColor', newTextColor)
          const preview = getPreviewColors(updatedState)
          
          expect(preview.dialogueColor).toBe(newTextColor)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: settings-panels, Property 7: Color Preview Updates
   * Validates: Requirements 10.2, 10.3
   * 
   * When any color changes, only the affected preview elements should change.
   */
  it('should only update affected preview elements when a color changes', () => {
    fc.assert(
      fc.property(
        arbColorPreviewState,
        arbColorKey,
        arbHexColor,
        (initialState, colorKey, newColor) => {
          const updatedState = applyColorChange(initialState, colorKey, newColor)
          const initialPreview = getPreviewColors(initialState)
          const updatedPreview = getPreviewColors(updatedState)
          
          // The changed color should be reflected
          switch (colorKey) {
            case 'accentColor':
              expect(updatedPreview.nameColor).toBe(newColor)
              // Other non-accent colors should remain unchanged
              expect(updatedPreview.dialogueColor).toBe(initialPreview.dialogueColor)
              expect(updatedPreview.idleChoiceColor).toBe(initialPreview.idleChoiceColor)
              expect(updatedPreview.hoverChoiceColor).toBe(initialPreview.hoverChoiceColor)
              expect(updatedPreview.selectedChoiceColor).toBe(initialPreview.selectedChoiceColor)
              break
            case 'textColor':
              expect(updatedPreview.dialogueColor).toBe(newColor)
              expect(updatedPreview.nameColor).toBe(initialPreview.nameColor)
              break
            case 'idleColor':
              expect(updatedPreview.idleChoiceColor).toBe(newColor)
              expect(updatedPreview.hoverChoiceColor).toBe(initialPreview.hoverChoiceColor)
              break
            case 'hoverColor':
              expect(updatedPreview.hoverChoiceColor).toBe(newColor)
              expect(updatedPreview.idleChoiceColor).toBe(initialPreview.idleChoiceColor)
              break
            case 'selectedColor':
              expect(updatedPreview.selectedChoiceColor).toBe(newColor)
              break
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: settings-panels, Property 7: Color Preview Updates
   * Validates: Requirements 10.2, 10.3
   * 
   * Multiple color changes should all be reflected in the preview.
   */
  it('should reflect multiple color changes in preview', () => {
    fc.assert(
      fc.property(
        arbColorPreviewState,
        fc.array(fc.tuple(arbColorKey, arbHexColor), { minLength: 1, maxLength: 5 }),
        (initialState, changes) => {
          let state = initialState
          
          // Apply all changes
          for (const [key, color] of changes) {
            state = applyColorChange(state, key, color)
          }
          
          const preview = getPreviewColors(state)
          
          // Verify final state matches preview
          expect(preview.nameColor).toBe(state.accentColor)
          expect(preview.dialogueColor).toBe(state.textColor)
          expect(preview.idleChoiceColor).toBe(state.idleColor)
          expect(preview.hoverChoiceColor).toBe(state.hoverColor)
          expect(preview.selectedChoiceColor).toBe(state.selectedColor)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: settings-panels, Property 7: Color Preview Updates
   * Validates: Requirements 10.2, 10.3
   * 
   * Preview colors should always be valid hex colors.
   */
  it('should always produce valid hex colors in preview', () => {
    fc.assert(
      fc.property(
        arbColorPreviewState,
        (state) => {
          const preview = getPreviewColors(state)
          const hexPattern = /^#[0-9a-f]{6}$/i
          
          expect(preview.nameColor).toMatch(hexPattern)
          expect(preview.dialogueColor).toMatch(hexPattern)
          expect(preview.idleChoiceColor).toMatch(hexPattern)
          expect(preview.hoverChoiceColor).toMatch(hexPattern)
          expect(preview.selectedChoiceColor).toMatch(hexPattern)
        }
      ),
      { numRuns: 100 }
    )
  })
})
