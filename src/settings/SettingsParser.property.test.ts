/**
 * Property-Based Tests for SettingsParser
 * 
 * Feature: settings-panels
 * 
 * Property 6: Define Statement Parsing
 * Validates: Requirements 9.2
 * 
 * For any valid define statement in the format `define <variable> = <value>`,
 * the parser should correctly extract the variable name and value.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parseFile, updateDefines } from './SettingsParser'

// ============================================================================
// Arbitrary Generators
// ============================================================================

/**
 * Generate valid Ren'Py variable names
 * Format: namespace.variable_name (e.g., gui.accent_color, config.name)
 */
const arbNamespace = fc.constantFrom('gui', 'config', 'persistent', 'store')
const arbVariableName = fc.stringMatching(/^[a-z_][a-z0-9_]{0,20}$/)
const arbFullVariable = fc.tuple(arbNamespace, arbVariableName)
  .map(([ns, name]) => `${ns}.${name}`)

/**
 * Generate valid string values (single or double quoted)
 */
const arbSimpleString = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-_'),
  { minLength: 0, maxLength: 30 }
)

const arbSingleQuotedString = arbSimpleString.map(s => `'${s}'`)
const arbDoubleQuotedString = arbSimpleString.map(s => `"${s}"`)

/**
 * Generate valid color values
 */
const arbHexColor = fc.hexaString({ minLength: 6, maxLength: 6 })
  .map(hex => `'#${hex}'`)

/**
 * Generate valid number values
 */
const arbIntegerValue = fc.integer({ min: 0, max: 9999 }).map(String)
const arbFloatValue = fc.float({ min: 0, max: 100, noNaN: true })
  .map(n => n.toFixed(2))

/**
 * Generate valid boolean values
 */
const arbBooleanValue = fc.constantFrom('True', 'False')

/**
 * Generate translatable string values _("string")
 */
const arbTranslatableString = arbSimpleString.map(s => `_("${s}")`)

/**
 * Generate any valid Ren'Py value
 */
const arbValue = fc.oneof(
  arbSingleQuotedString,
  arbDoubleQuotedString,
  arbHexColor,
  arbIntegerValue,
  arbFloatValue,
  arbBooleanValue,
  arbTranslatableString
)

/**
 * Generate valid indentation (0, 4, or 8 spaces)
 */
const arbIndent = fc.constantFrom('', '    ', '        ')

/**
 * Generate a complete define statement
 */
const arbDefineStatement = fc.tuple(arbIndent, arbFullVariable, arbValue)
  .map(([indent, variable, value]) => `${indent}define ${variable} = ${value}`)

/**
 * Generate a comment line
 */
const arbComment = arbSimpleString.map(s => `# ${s}`)

/**
 * Generate an empty line
 */
const arbEmptyLine = fc.constant('')

/**
 * Generate a non-define line (comment, empty, or other code)
 */
const arbNonDefineLine = fc.oneof(
  arbComment,
  arbEmptyLine,
  fc.constant('init python:'),
  fc.constant('    pass'),
  arbSimpleString.map(s => `label ${s}:`)
)

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 6: Define Statement Parsing', () => {
  /**
   * Feature: settings-panels, Property 6: Define Statement Parsing
   * Validates: Requirements 9.2
   * 
   * For any valid define statement, the parser should correctly extract
   * the variable name and value.
   */
  it('should correctly parse any valid define statement', () => {
    fc.assert(
      fc.property(
        arbFullVariable,
        arbValue,
        arbIndent,
        (variable, value, indent) => {
          const line = `${indent}define ${variable} = ${value}`
          const result = parseFile(line)
          
          expect(result).toHaveLength(1)
          expect(result[0].variable).toBe(variable)
          expect(result[0].value).toBe(value)
          expect(result[0].lineNumber).toBe(1)
          expect(result[0].originalLine).toBe(line)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should parse multiple define statements in order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(arbFullVariable, arbValue), { minLength: 1, maxLength: 5 }),
        (defines) => {
          const lines = defines.map(([v, val]) => `define ${v} = ${val}`)
          const content = lines.join('\n')
          const result = parseFile(content)
          
          expect(result).toHaveLength(defines.length)
          
          for (let i = 0; i < defines.length; i++) {
            expect(result[i].variable).toBe(defines[i][0])
            expect(result[i].value).toBe(defines[i][1])
            expect(result[i].lineNumber).toBe(i + 1)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should ignore non-define lines', () => {
    fc.assert(
      fc.property(
        fc.array(arbNonDefineLine, { minLength: 1, maxLength: 5 }),
        (nonDefineLines) => {
          const content = nonDefineLines.join('\n')
          const result = parseFile(content)
          
          // Should not parse any defines from non-define lines
          expect(result).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly track line numbers with mixed content', () => {
    fc.assert(
      fc.property(
        fc.tuple(arbFullVariable, arbValue),
        fc.array(arbNonDefineLine, { minLength: 0, maxLength: 3 }),
        fc.array(arbNonDefineLine, { minLength: 0, maxLength: 3 }),
        ([variable, value], beforeLines, afterLines) => {
          const defineLine = `define ${variable} = ${value}`
          const allLines = [...beforeLines, defineLine, ...afterLines]
          const content = allLines.join('\n')
          const result = parseFile(content)
          
          expect(result).toHaveLength(1)
          expect(result[0].variable).toBe(variable)
          expect(result[0].value).toBe(value)
          // Line number should be 1-indexed position of the define line
          expect(result[0].lineNumber).toBe(beforeLines.length + 1)
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 5: Settings File Round-Trip
// ============================================================================

describe('Property 5: Settings File Round-Trip', () => {
  /**
   * Feature: settings-panels, Property 5: Settings File Round-Trip
   * Validates: Requirements 8.3, 8.4
   * 
   * For any valid gui.rpy or options.rpy file content, parsing the file
   * and then serializing the settings back should preserve all comments,
   * formatting, and unchanged define statements.
   */
  it('should preserve comments and non-define lines through round-trip', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            arbDefineStatement,
            arbComment,
            arbEmptyLine
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (lines) => {
          const content = lines.join('\n')
          const defines = parseFile(content)
          
          // Create updates map with same values (no actual changes)
          const updates = new Map<string, string>()
          for (const define of defines) {
            updates.set(define.variable, define.value)
          }
          
          // Apply updates
          const result = updateDefines(content, updates)
          
          // Split both into lines for comparison
          const originalLines = content.split('\n')
          const resultLines = result.split('\n')
          
          // Should have same number of lines
          expect(resultLines.length).toBe(originalLines.length)
          
          // Non-define lines should be preserved exactly
          for (let i = 0; i < originalLines.length; i++) {
            const originalLine = originalLines[i]
            const isDefine = originalLine.match(/^\s*define\s+[\w.]+\s*=/)
            
            if (!isDefine) {
              // Non-define lines should be exactly preserved
              expect(resultLines[i]).toBe(originalLine)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should only modify the value portion of define statements', () => {
    fc.assert(
      fc.property(
        arbFullVariable,
        arbValue,
        arbValue,
        arbIndent,
        (variable, originalValue, newValue, indent) => {
          const originalLine = `${indent}define ${variable} = ${originalValue}`
          const expectedLine = `${indent}define ${variable} = ${newValue}`
          
          const updates = new Map<string, string>()
          updates.set(variable, newValue)
          
          const result = updateDefines(originalLine, updates)
          
          expect(result).toBe(expectedLine)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve unchanged define statements', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(arbFullVariable, arbValue), { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 0, max: 4 }),
        (defines, updateIndex) => {
          // Ensure updateIndex is within bounds
          const safeIndex = updateIndex % defines.length
          
          const lines = defines.map(([v, val]) => `define ${v} = ${val}`)
          const content = lines.join('\n')
          
          // Only update one define
          const updates = new Map<string, string>()
          const [varToUpdate] = defines[safeIndex]
          updates.set(varToUpdate, "'new_value'")
          
          const result = updateDefines(content, updates)
          const resultLines = result.split('\n')
          
          // Check that unchanged defines are preserved
          for (let i = 0; i < defines.length; i++) {
            if (i !== safeIndex) {
              expect(resultLines[i]).toBe(lines[i])
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle files with no matching defines gracefully', () => {
    fc.assert(
      fc.property(
        fc.array(arbNonDefineLine, { minLength: 1, maxLength: 5 }),
        arbFullVariable,
        arbValue,
        (lines, variable, value) => {
          const content = lines.join('\n')
          
          const updates = new Map<string, string>()
          updates.set(variable, value)
          
          const result = updateDefines(content, updates)
          
          // Content should be unchanged
          expect(result).toBe(content)
        }
      ),
      { numRuns: 100 }
    )
  })
})
