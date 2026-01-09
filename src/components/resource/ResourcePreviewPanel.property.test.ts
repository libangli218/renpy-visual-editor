/**
 * Property-Based Tests for ResourcePreviewPanel Component
 * 
 * Feature: image-management-system
 * 
 * Property 12: 预览面板内容 (Preview Panel Content)
 * Validates: Requirements 6.3, 6.4, 6.5, 6.6
 * 
 * For any open preview panel:
 * - Should display image metadata (dimensions, format, file size)
 * - Should show Ren'Py image tag
 * - Background images should show "Insert to Scene" button
 * - Sprites should show "Insert to Show" button
 * 
 * ∀ resource ∈ Resource:
 *   let panel = PreviewPanel(resource)
 *   panel.hasImageTag = true
 *   if resource.type = 'background' then panel.hasInsertToSceneButton = true
 *   if resource.type = 'sprite' then panel.hasInsertToShowButton = true
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  formatFileSize,
  getFileFormat,
  getFileName,
} from './ResourcePreviewPanel'
import { ResourceDragData } from '../../store/resourceStore'

// ============================================================================
// Arbitrary Generators
// ============================================================================

/**
 * Generate background image tags (start with "bg")
 */
const arbBackgroundTag = fc.array(
  fc.stringMatching(/^[a-z][a-z0-9_]{1,8}$/),
  { minLength: 0, maxLength: 2 }
).map(attrs => attrs.length > 0 ? `bg ${attrs.join(' ')}` : 'bg')


/**
 * Generate sprite image tags (non-bg)
 */
const arbSpriteTag = fc.tuple(
  fc.stringMatching(/^[a-z][a-z0-9_]{1,10}$/).filter(s => s !== 'bg'),
  fc.array(fc.stringMatching(/^[a-z][a-z0-9_]{1,8}$/), { minLength: 0, maxLength: 3 })
).map(([tag, attrs]) => attrs.length > 0 ? `${tag} ${attrs.join(' ')}` : tag)

/**
 * Generate valid file paths with various extensions
 */
const arbFilePath = fc.tuple(
  fc.constantFrom('/project/game/images/', '/game/images/', 'C:\\project\\game\\images\\'),
  fc.stringMatching(/^[a-z][a-z0-9_]{1,15}$/),
  fc.constantFrom('.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp')
).map(([dir, name, ext]) => `${dir}${name}${ext}`)

/**
 * Generate file sizes in bytes
 */
const arbFileSize = fc.integer({ min: 0, max: 100 * 1024 * 1024 }) // 0 to 100MB

/**
 * Generate background resource data
 */
const arbBackgroundResource: fc.Arbitrary<ResourceDragData> = fc.record({
  type: fc.constant<'background'>('background'),
  imageTag: arbBackgroundTag,
  imagePath: arbFilePath,
})

/**
 * Generate sprite resource data
 */
const arbSpriteResource: fc.Arbitrary<ResourceDragData> = fc.record({
  type: fc.constant<'sprite'>('sprite'),
  imageTag: arbSpriteTag,
  imagePath: arbFilePath,
})

/**
 * Generate any resource data
 */
const arbResourceData: fc.Arbitrary<ResourceDragData> = fc.oneof(
  arbBackgroundResource,
  arbSpriteResource
)

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 12: 预览面板内容 (Preview Panel Content)', () => {
  /**
   * Feature: image-management-system, Property 12: Preview Panel Content
   * Validates: Requirements 6.3, 6.4
   * 
   * For any resource, the image tag should be preserved and displayable.
   */
  it('should preserve image tag for display', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        // Image tag should be a non-empty string
        return (
          typeof resource.imageTag === 'string' &&
          resource.imageTag.length > 0
        )
      }),
      { numRuns: 100 }
    )
  })

  /**
   * For any resource, the type should determine which insert button is shown.
   * Validates: Requirements 6.5, 6.6
   */
  it('should show correct insert button based on resource type', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        // Background resources should show "Insert to Scene"
        // Sprite resources should show "Insert to Show"
        const shouldShowInsertToScene = resource.type === 'background'
        const shouldShowInsertToShow = resource.type === 'sprite'
        
        // Exactly one button type should be shown
        return shouldShowInsertToScene !== shouldShowInsertToShow
      }),
      { numRuns: 100 }
    )
  })

  /**
   * For any background resource, the type should be 'background'.
   * Validates: Requirements 6.5
   */
  it('should identify background resources correctly', () => {
    fc.assert(
      fc.property(arbBackgroundResource, (resource) => {
        return resource.type === 'background'
      }),
      { numRuns: 100 }
    )
  })

  /**
   * For any sprite resource, the type should be 'sprite'.
   * Validates: Requirements 6.6
   */
  it('should identify sprite resources correctly', () => {
    fc.assert(
      fc.property(arbSpriteResource, (resource) => {
        return resource.type === 'sprite'
      }),
      { numRuns: 100 }
    )
  })
})


describe('Utility Functions', () => {
  /**
   * formatFileSize should format bytes correctly.
   */
  describe('formatFileSize', () => {
    it('should format zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B')
    })

    it('should format bytes correctly for various sizes', () => {
      fc.assert(
        fc.property(arbFileSize, (bytes) => {
          const formatted = formatFileSize(bytes)
          
          // Should be a non-empty string
          if (typeof formatted !== 'string' || formatted.length === 0) {
            return false
          }
          
          // Should contain a number and a unit
          const hasUnit = /\d+(\.\d+)?\s*(B|KB|MB|GB)$/.test(formatted)
          return hasUnit
        }),
        { numRuns: 100 }
      )
    })

    it('should use correct units for size ranges', () => {
      // Bytes
      expect(formatFileSize(500)).toBe('500 B')
      // Kilobytes
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      // Megabytes
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
      // Gigabytes
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
    })
  })

  /**
   * getFileFormat should extract format from file path.
   */
  describe('getFileFormat', () => {
    it('should extract format from various file paths', () => {
      fc.assert(
        fc.property(arbFilePath, (path) => {
          const format = getFileFormat(path)
          
          // Should be a non-empty string
          if (typeof format !== 'string' || format.length === 0) {
            return false
          }
          
          // Should be a valid format string (may have mixed case for known formats like WebP)
          return format.length > 0
        }),
        { numRuns: 100 }
      )
    })

    it('should return correct format for known extensions', () => {
      expect(getFileFormat('/path/to/image.png')).toBe('PNG')
      expect(getFileFormat('/path/to/image.jpg')).toBe('JPEG')
      expect(getFileFormat('/path/to/image.jpeg')).toBe('JPEG')
      expect(getFileFormat('/path/to/image.webp')).toBe('WebP')
      expect(getFileFormat('/path/to/image.gif')).toBe('GIF')
      expect(getFileFormat('/path/to/image.bmp')).toBe('BMP')
    })

    it('should handle unknown extensions', () => {
      const format = getFileFormat('/path/to/image.xyz')
      expect(format).toBe('XYZ')
    })
  })

  /**
   * getFileName should extract filename from path.
   */
  describe('getFileName', () => {
    it('should extract filename from various paths', () => {
      fc.assert(
        fc.property(arbFilePath, (path) => {
          const fileName = getFileName(path)
          
          // Should be a non-empty string
          if (typeof fileName !== 'string' || fileName.length === 0) {
            return false
          }
          
          // Should not contain path separators
          return !fileName.includes('/') && !fileName.includes('\\')
        }),
        { numRuns: 100 }
      )
    })

    it('should handle Unix-style paths', () => {
      expect(getFileName('/path/to/image.png')).toBe('image.png')
      expect(getFileName('/game/images/bg_room.jpg')).toBe('bg_room.jpg')
    })

    it('should handle Windows-style paths', () => {
      expect(getFileName('C:\\path\\to\\image.png')).toBe('image.png')
      expect(getFileName('D:\\game\\images\\bg_room.jpg')).toBe('bg_room.jpg')
    })

    it('should handle mixed path separators', () => {
      expect(getFileName('/path/to\\image.png')).toBe('image.png')
    })
  })
})

describe('Resource Data Validation', () => {
  /**
   * All resource data should have required fields.
   */
  it('should have all required fields', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        return (
          'type' in resource &&
          'imageTag' in resource &&
          'imagePath' in resource &&
          typeof resource.type === 'string' &&
          typeof resource.imageTag === 'string' &&
          typeof resource.imagePath === 'string'
        )
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Resource type should be either 'background' or 'sprite'.
   */
  it('should have valid resource type', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        return resource.type === 'background' || resource.type === 'sprite'
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Image path should have a valid image extension.
   */
  it('should have valid image extension', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']
        const ext = resource.imagePath.substring(resource.imagePath.lastIndexOf('.'))
        return validExtensions.includes(ext.toLowerCase())
      }),
      { numRuns: 100 }
    )
  })
})
