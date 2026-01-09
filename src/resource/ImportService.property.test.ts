/**
 * Property-Based Tests for Import Service
 * 
 * Feature: image-management-system
 * 
 * Property 10: Import File Completeness
 * Validates: Requirements 3.5, 3.6
 * 
 * For any valid import operation, the file should be correctly copied to the target directory,
 * and the resource index should contain the newly imported resource.
 * 
 * ∀ sourcePath ∈ ValidImagePath, targetDir ∈ ValidDirectory:
 *   let result = importFile(sourcePath, { targetDir })
 *   result.success = true ⟹ fileExists(result.targetPath) = true
 * 
 * Property 11: File Name Validation
 * Validates: Requirements 3.8, 3.9
 * 
 * For any file name, the validation function should correctly identify:
 * - Files with spaces (warning)
 * - Files with invalid characters (error)
 * - Files with valid Ren'Py naming conventions (valid)
 * 
 * ∀ fileName ∈ String:
 *   let result = validateFileName(fileName)
 *   hasSpaces(fileName) ⟹ result.warnings.length > 0
 *   hasInvalidChars(fileName) ⟹ result.valid = false
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validateFileName,
  hasSpaces,
  convertSpacesToUnderscores,
  isValidRenpyFileName,
} from './ImportService'
import { IMAGE_EXTENSIONS } from '../project/types'

// ============================================================================
// Arbitrary Generators
// ============================================================================

// Generate valid Ren'Py file names (letters, numbers, underscores)
const arbValidBaseName = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/)

// Generate file names with spaces
const arbBaseNameWithSpaces = fc.tuple(
  fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,8}$/),
  fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,8}$/)
).map(([a, b]) => `${a} ${b}`)

// Generate file names with invalid characters
const arbBaseNameWithInvalidChars = fc.tuple(
  fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,8}$/),
  fc.constantFrom('@', '#', '$', '%', '&', '*', '!', '?', '<', '>', '|', ':', ';')
).map(([name, char]) => `${name}${char}`)

// Generate valid image extensions
const arbImageExtension = fc.constantFrom(...IMAGE_EXTENSIONS)

// Generate valid file names with extensions
const arbValidFileName = fc.tuple(arbValidBaseName, arbImageExtension)
  .map(([name, ext]) => `${name}${ext}`)

// Generate file names with spaces and extensions
const arbFileNameWithSpaces = fc.tuple(arbBaseNameWithSpaces, arbImageExtension)
  .map(([name, ext]) => `${name}${ext}`)

// Generate file names with invalid characters and extensions
const arbFileNameWithInvalidChars = fc.tuple(arbBaseNameWithInvalidChars, arbImageExtension)
  .map(([name, ext]) => `${name}${ext}`)

// Generate whitespace-only strings
const arbWhitespaceOnly = fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 5 })

// Generate empty or whitespace file names
const arbEmptyOrWhitespaceFileName = fc.oneof(
  fc.constant(''),
  arbWhitespaceOnly,
  fc.tuple(arbWhitespaceOnly, arbImageExtension).map(([ws, ext]) => `${ws}${ext}`)
)

// Generate file names with leading/trailing spaces
const arbFileNameWithLeadingTrailingSpaces = fc.tuple(
  fc.constantFrom(' ', '  '),
  arbValidBaseName,
  fc.constantFrom(' ', '  '),
  arbImageExtension
).map(([lead, name, trail, ext]) => `${lead}${name}${trail}${ext}`)

// Generate file names with consecutive underscores or spaces
const arbFileNameWithConsecutiveSpaces = fc.tuple(
  fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,5}$/),
  fc.constantFrom('  ', '   ', '__', '___'),
  fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,5}$/),
  arbImageExtension
).map(([a, sep, b, ext]) => `${a}${sep}${b}${ext}`)

// Generate file names with invalid extensions
const arbFileNameWithInvalidExtension = fc.tuple(
  arbValidBaseName,
  fc.constantFrom('.txt', '.doc', '.pdf', '.exe', '.zip', '')
).map(([name, ext]) => `${name}${ext}`)

// Generate Chinese characters for file names (valid in Ren'Py)
const arbChineseBaseName = fc.stringMatching(/^[\u4e00-\u9fa5]{1,10}$/)

const arbFileNameWithChinese = fc.tuple(arbChineseBaseName, arbImageExtension)
  .map(([name, ext]) => `${name}${ext}`)

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 10: Import File Completeness', () => {
  /**
   * Feature: image-management-system, Property 10: Import File Completeness
   * Validates: Requirements 3.5, 3.6
   * 
   * Note: This property tests the validation logic, not actual file operations.
   * File operations require Electron APIs which are not available in unit tests.
   */
  
  it('should validate that valid file names pass validation', () => {
    fc.assert(
      fc.property(arbValidFileName, (fileName) => {
        const result = validateFileName(fileName)
        // Valid file names should pass validation (no errors)
        return result.valid === true && result.errors.length === 0
      }),
      { numRuns: 100 }
    )
  })

  it('should validate that file names with valid extensions are accepted', () => {
    fc.assert(
      fc.property(arbValidBaseName, arbImageExtension, (baseName, ext) => {
        const fileName = `${baseName}${ext}`
        const result = validateFileName(fileName)
        // Should not have extension-related errors
        const hasExtensionError = result.errors.some(e => e.includes('格式'))
        return !hasExtensionError
      }),
      { numRuns: 100 }
    )
  })

  it('should reject file names with invalid extensions', () => {
    fc.assert(
      fc.property(arbFileNameWithInvalidExtension, (fileName) => {
        const result = validateFileName(fileName)
        // Should have an error about unsupported format
        return result.valid === false && result.errors.some(e => e.includes('格式') || e.includes('扩展名'))
      }),
      { numRuns: 100 }
    )
  })

  it('should accept file names with Chinese characters', () => {
    fc.assert(
      fc.property(arbFileNameWithChinese, (fileName) => {
        const result = validateFileName(fileName)
        // Chinese characters are valid in Ren'Py
        return result.valid === true
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 11: File Name Validation', () => {
  /**
   * Feature: image-management-system, Property 11: File Name Validation
   * Validates: Requirements 3.8, 3.9
   */

  it('should warn when file name contains spaces', () => {
    fc.assert(
      fc.property(arbFileNameWithSpaces, (fileName) => {
        const result = validateFileName(fileName)
        // Should have a warning about spaces
        const hasSpaceWarning = result.warnings.some(w => w.includes('空格'))
        return hasSpaceWarning
      }),
      { numRuns: 100 }
    )
  })

  it('should correctly detect spaces in file names', () => {
    fc.assert(
      fc.property(arbFileNameWithSpaces, (fileName) => {
        return hasSpaces(fileName) === true
      }),
      { numRuns: 100 }
    )
  })

  it('should correctly detect no spaces in valid file names', () => {
    fc.assert(
      fc.property(arbValidFileName, (fileName) => {
        return hasSpaces(fileName) === false
      }),
      { numRuns: 100 }
    )
  })

  it('should reject file names with invalid characters', () => {
    fc.assert(
      fc.property(arbFileNameWithInvalidChars, (fileName) => {
        const result = validateFileName(fileName)
        // Should be invalid due to invalid characters
        return result.valid === false && result.errors.some(e => e.includes('无效字符'))
      }),
      { numRuns: 100 }
    )
  })

  it('should reject empty or whitespace-only file names', () => {
    fc.assert(
      fc.property(arbEmptyOrWhitespaceFileName, (fileName) => {
        const result = validateFileName(fileName)
        // Should be invalid
        return result.valid === false
      }),
      { numRuns: 100 }
    )
  })

  it('should warn about leading/trailing spaces', () => {
    fc.assert(
      fc.property(arbFileNameWithLeadingTrailingSpaces, (fileName) => {
        const result = validateFileName(fileName)
        // Should have a warning about leading/trailing spaces or spaces in general
        const hasRelevantWarning = result.warnings.some(w => 
          w.includes('空格') || w.includes('前导') || w.includes('尾随')
        )
        return hasRelevantWarning
      }),
      { numRuns: 100 }
    )
  })

  it('should warn about consecutive spaces or underscores', () => {
    fc.assert(
      fc.property(arbFileNameWithConsecutiveSpaces, (fileName) => {
        const result = validateFileName(fileName)
        // Should have a warning about consecutive spaces/underscores
        const hasConsecutiveWarning = result.warnings.some(w => 
          w.includes('连续') || w.includes('空格')
        )
        return hasConsecutiveWarning
      }),
      { numRuns: 100 }
    )
  })

  it('should convert spaces to underscores correctly', () => {
    fc.assert(
      fc.property(arbFileNameWithSpaces, (fileName) => {
        const converted = convertSpacesToUnderscores(fileName)
        // Converted name should not have spaces
        return !hasSpaces(converted)
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve extension when converting spaces', () => {
    fc.assert(
      fc.property(arbFileNameWithSpaces, (fileName) => {
        const converted = convertSpacesToUnderscores(fileName)
        // Should have the same extension
        const originalExt = fileName.substring(fileName.lastIndexOf('.'))
        const convertedExt = converted.substring(converted.lastIndexOf('.'))
        return originalExt === convertedExt
      }),
      { numRuns: 100 }
    )
  })

  it('should suggest a valid name when file name has issues', () => {
    fc.assert(
      fc.property(arbFileNameWithSpaces, (fileName) => {
        const result = validateFileName(fileName)
        // Should suggest a name without spaces
        if (result.suggestedName) {
          return !hasSpaces(result.suggestedName)
        }
        // If no suggestion, the original should be valid
        return result.valid
      }),
      { numRuns: 100 }
    )
  })

  it('should return valid=true for isValidRenpyFileName with valid names', () => {
    fc.assert(
      fc.property(arbValidFileName, (fileName) => {
        return isValidRenpyFileName(fileName) === true
      }),
      { numRuns: 100 }
    )
  })

  it('should return valid=false for isValidRenpyFileName with invalid names', () => {
    fc.assert(
      fc.property(arbFileNameWithInvalidChars, (fileName) => {
        return isValidRenpyFileName(fileName) === false
      }),
      { numRuns: 100 }
    )
  })

  it('should handle mixed valid and invalid characters correctly', () => {
    fc.assert(
      fc.property(
        arbValidBaseName,
        fc.constantFrom('@', '#', '$'),
        arbValidBaseName,
        arbImageExtension,
        (prefix, invalidChar, suffix, ext) => {
          const fileName = `${prefix}${invalidChar}${suffix}${ext}`
          const result = validateFileName(fileName)
          // Should be invalid due to the invalid character
          return result.valid === false
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('File Name Validation Edge Cases', () => {
  it('should handle single character file names', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z]$/),
        arbImageExtension,
        (char, ext) => {
          const fileName = `${char}${ext}`
          const result = validateFileName(fileName)
          return result.valid === true
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should handle very long file names', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{50,100}$/),
        arbImageExtension,
        (baseName, ext) => {
          const fileName = `${baseName}${ext}`
          const result = validateFileName(fileName)
          // Long names should still be valid if they follow conventions
          return result.valid === true
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should handle file names with numbers', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*[0-9]+$/),
        arbImageExtension,
        (baseName, ext) => {
          const fileName = `${baseName}${ext}`
          const result = validateFileName(fileName)
          return result.valid === true
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should handle file names starting with numbers', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9][a-zA-Z0-9_]*$/),
        arbImageExtension,
        (baseName, ext) => {
          const fileName = `${baseName}${ext}`
          const result = validateFileName(fileName)
          // File names starting with numbers are actually valid in Ren'Py
          // The validation only checks for invalid characters
          return result.valid === true
        }
      ),
      { numRuns: 50 }
    )
  })
})
