/**
 * Story Mode Property Tests
 * Feature: renpy-visual-editor, Property 15: Shortcut Input Parsing
 * Validates: Requirements 6.3
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parseShortcutInput, isShortcutInput, getShortcutType } from './shortcutParser'

describe('Property 15: Shortcut Input Parsing', () => {
  /**
   * Property 15: Shortcut Input Parsing
   * For any shortcut input pattern, it should be correctly converted to the corresponding block type.
   * 
   * 's:text' → DialogueBlock(speaker='s', text='text')
   * '>text' → NarrationBlock(text='text')
   * '+text' → ExtendBlock(text='text')
   * '[show character]' → ShowBlock(image='character')
   * '[hide character]' → HideBlock(image='character')
   * '[scene background]' → SceneBlock(image='background')
   * 
   * Validates: Requirements 6.3
   */

  // Arbitrary for valid character names (Ren'Py identifier format)
  const arbitraryCharacterName = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789'),
    { minLength: 1, maxLength: 20 }
  ).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s))

  // Arbitrary for dialogue text (non-empty, no newlines)
  const arbitraryDialogueText = fc.string({ minLength: 0, maxLength: 100 })
    .filter(s => !s.includes('\n') && !s.includes('\r'))

  // Arbitrary for image names (simple alphanumeric)
  const arbitraryImageName = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_0123456789'),
    { minLength: 1, maxLength: 20 }
  ).filter(s => /^[a-z_][a-z0-9_]*$/.test(s))

  it('should parse character dialogue shortcuts correctly', () => {
    fc.assert(
      fc.property(
        arbitraryCharacterName,
        arbitraryDialogueText,
        (speaker, text) => {
          const input = `${speaker}:${text}`
          const result = parseShortcutInput(input)
          
          expect(result.type).toBe('dialogue')
          expect(result.speaker).toBe(speaker)
          expect(result.text).toBe(text.trim())
          expect(result.node).not.toBeNull()
          expect(result.node?.type).toBe('dialogue')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should parse narration shortcuts correctly', () => {
    fc.assert(
      fc.property(
        arbitraryDialogueText,
        (text) => {
          const input = `>${text}`
          const result = parseShortcutInput(input)
          
          expect(result.type).toBe('narration')
          expect(result.text).toBe(text.trim())
          expect(result.node).not.toBeNull()
          expect(result.node?.type).toBe('dialogue')
          if (result.node?.type === 'dialogue') {
            expect(result.node.speaker).toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should parse extend shortcuts correctly', () => {
    fc.assert(
      fc.property(
        arbitraryDialogueText,
        (text) => {
          const input = `+${text}`
          const result = parseShortcutInput(input)
          
          expect(result.type).toBe('extend')
          expect(result.text).toBe(text.trim())
          expect(result.node).not.toBeNull()
          expect(result.node?.type).toBe('dialogue')
          if (result.node?.type === 'dialogue') {
            expect(result.node.extend).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should parse show commands correctly', () => {
    fc.assert(
      fc.property(
        arbitraryImageName,
        (image) => {
          const input = `[show ${image}]`
          const result = parseShortcutInput(input)
          
          expect(result.type).toBe('show')
          expect(result.image).toBe(image)
          expect(result.node).not.toBeNull()
          expect(result.node?.type).toBe('show')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should parse hide commands correctly', () => {
    fc.assert(
      fc.property(
        arbitraryImageName,
        (image) => {
          const input = `[hide ${image}]`
          const result = parseShortcutInput(input)
          
          expect(result.type).toBe('hide')
          expect(result.image).toBe(image)
          expect(result.node).not.toBeNull()
          expect(result.node?.type).toBe('hide')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should parse scene commands correctly', () => {
    fc.assert(
      fc.property(
        arbitraryImageName,
        (image) => {
          const input = `[scene ${image}]`
          const result = parseShortcutInput(input)
          
          expect(result.type).toBe('scene')
          expect(result.image).toBe(image)
          expect(result.node).not.toBeNull()
          expect(result.node?.type).toBe('scene')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return none for non-shortcut inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
          // Filter out strings that match any shortcut pattern
          const trimmed = s.trim()
          if (trimmed.startsWith('>')) return false
          if (trimmed.startsWith('+')) return false
          if (/^\[(show|hide|scene)\s+.+\]$/i.test(trimmed)) return false
          if (/^[a-zA-Z_][a-zA-Z0-9_]*:/.test(trimmed)) return false
          return true
        }),
        (input) => {
          const result = parseShortcutInput(input)
          expect(result.type).toBe('none')
          expect(result.node).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('isShortcutInput should correctly identify shortcut patterns', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Generate valid shortcuts
          fc.tuple(arbitraryCharacterName, arbitraryDialogueText).map(([s, t]) => `${s}:${t}`),
          arbitraryDialogueText.map(t => `>${t}`),
          arbitraryDialogueText.map(t => `+${t}`),
          arbitraryImageName.map(i => `[show ${i}]`),
          arbitraryImageName.map(i => `[hide ${i}]`),
          arbitraryImageName.map(i => `[scene ${i}]`)
        ),
        (input) => {
          expect(isShortcutInput(input)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('getShortcutType should return correct type for shortcuts', () => {
    fc.assert(
      fc.property(
        arbitraryCharacterName,
        arbitraryDialogueText,
        (speaker, text) => {
          expect(getShortcutType(`${speaker}:${text}`)).toBe('dialogue')
          expect(getShortcutType(`>${text}`)).toBe('narration')
          expect(getShortcutType(`+${text}`)).toBe('extend')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('getShortcutType should return correct type for commands', () => {
    fc.assert(
      fc.property(
        arbitraryImageName,
        (image) => {
          expect(getShortcutType(`[show ${image}]`)).toBe('show')
          expect(getShortcutType(`[hide ${image}]`)).toBe('hide')
          expect(getShortcutType(`[scene ${image}]`)).toBe('scene')
        }
      ),
      { numRuns: 100 }
    )
  })
})
