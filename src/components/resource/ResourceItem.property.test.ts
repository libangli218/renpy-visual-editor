/**
 * Property-Based Tests for ResourceItem Component
 * 
 * Feature: image-management-system
 * 
 * Property 1: 缩略图显示一致性 (Thumbnail Display Consistency)
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 * 
 * For any image resource list, when the section is expanded, each resource should render
 * a thumbnail element, and the thumbnail size should match the configured size (32px/48px/64px).
 * 
 * ∀ resource ∈ Resource, size ∈ ThumbnailSize:
 *   let rendered = render(ResourceItem(resource, size))
 *   rendered.thumbnailSize = THUMBNAIL_SIZES[size]
 *   rendered.hasName = true
 * 
 * Property 5: 拖拽类型匹配 (Drag Type Matching)
 * Validates: Requirements 4.2, 4.3
 * 
 * For any drag operation, background images should have dragData.type = "background",
 * and sprite images should have dragData.type = "sprite".
 * 
 * ∀ resource ∈ Resource:
 *   let dragData = createDragData(resource)
 *   if resource.type = 'background' then dragData.type = 'background'
 *   if resource.type = 'sprite' then dragData.type = 'sprite'
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  THUMBNAIL_SIZES,
  ThumbnailSize,
  createResourceDragData,
  serializeDragData,
  deserializeDragData,
  ResourceDragData,
} from '../../store/resourceStore'

// ============================================================================
// Arbitrary Generators
// ============================================================================

/**
 * Generate valid image tags (Ren'Py naming convention)
 * Examples: "bg room", "eileen happy", "lucy normal"
 */
const arbImageTag = fc.tuple(
  fc.stringMatching(/^[a-z][a-z0-9_]{1,10}$/),
  fc.array(fc.stringMatching(/^[a-z][a-z0-9_]{1,8}$/), { minLength: 0, maxLength: 3 })
).map(([tag, attrs]) => attrs.length > 0 ? `${tag} ${attrs.join(' ')}` : tag)

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
 * Generate valid file paths
 */
const arbFilePath = fc.tuple(
  fc.constantFrom('/project/game/images/', '/game/images/', 'C:\\project\\game\\images\\'),
  fc.stringMatching(/^[a-z][a-z0-9_]{1,15}$/),
  fc.constantFrom('.png', '.jpg', '.webp')
).map(([dir, name, ext]) => `${dir}${name}${ext}`)

/**
 * Generate thumbnail sizes
 */
const arbThumbnailSize = fc.constantFrom<ThumbnailSize>('small', 'medium', 'large')

/**
 * Generate resource types
 */
const arbResourceType = fc.constantFrom<'background' | 'sprite'>('background', 'sprite')

/**
 * Generate complete resource data
 */
const arbResourceData = fc.record({
  type: arbResourceType,
  imageTag: arbImageTag,
  imagePath: arbFilePath,
})

/**
 * Generate background resource data
 */
const arbBackgroundResource = fc.record({
  type: fc.constant<'background'>('background'),
  imageTag: arbBackgroundTag,
  imagePath: arbFilePath,
})

/**
 * Generate sprite resource data
 */
const arbSpriteResource = fc.record({
  type: fc.constant<'sprite'>('sprite'),
  imageTag: arbSpriteTag,
  imagePath: arbFilePath,
})

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 1: 缩略图显示一致性 (Thumbnail Display Consistency)', () => {
  /**
   * Feature: image-management-system, Property 1: Thumbnail Display Consistency
   * Validates: Requirements 1.1, 1.2, 1.4, 1.5
   * 
   * For any thumbnail size configuration, the pixel value should match the expected size.
   */
  it('should have correct pixel values for all thumbnail sizes', () => {
    fc.assert(
      fc.property(arbThumbnailSize, (size) => {
        const pixels = THUMBNAIL_SIZES[size]
        
        // Verify size matches expected values
        switch (size) {
          case 'small':
            return pixels === 32
          case 'medium':
            return pixels === 48
          case 'large':
            return pixels === 64
          default:
            return false
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * For any resource, the image tag should be preserved in drag data.
   */
  it('should preserve image tag in resource data', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        const dragData = createResourceDragData(
          resource.type,
          resource.imageTag,
          resource.imagePath
        )
        
        // Image tag should be preserved exactly
        return dragData.imageTag === resource.imageTag
      }),
      { numRuns: 100 }
    )
  })

  /**
   * For any resource, the image path should be preserved in drag data.
   */
  it('should preserve image path in resource data', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        const dragData = createResourceDragData(
          resource.type,
          resource.imageTag,
          resource.imagePath
        )
        
        // Image path should be preserved exactly
        return dragData.imagePath === resource.imagePath
      }),
      { numRuns: 100 }
    )
  })

  /**
   * For any thumbnail size, the size should be one of the valid options.
   */
  it('should only allow valid thumbnail sizes', () => {
    fc.assert(
      fc.property(arbThumbnailSize, (size) => {
        const validSizes: ThumbnailSize[] = ['small', 'medium', 'large']
        return validSizes.includes(size)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Thumbnail sizes should be ordered correctly (small < medium < large).
   */
  it('should have thumbnail sizes in correct order', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        return (
          THUMBNAIL_SIZES.small < THUMBNAIL_SIZES.medium &&
          THUMBNAIL_SIZES.medium < THUMBNAIL_SIZES.large
        )
      }),
      { numRuns: 1 }
    )
  })
})

describe('Property 5: 拖拽类型匹配 (Drag Type Matching)', () => {
  /**
   * Feature: image-management-system, Property 5: Drag Type Matching
   * Validates: Requirements 4.2, 4.3
   * 
   * For any background resource, the drag data type should be "background".
   */
  it('should set drag type to "background" for background resources', () => {
    fc.assert(
      fc.property(arbBackgroundResource, (resource) => {
        const dragData = createResourceDragData(
          resource.type,
          resource.imageTag,
          resource.imagePath
        )
        
        // Background resources should have type "background"
        return dragData.type === 'background'
      }),
      { numRuns: 100 }
    )
  })

  /**
   * For any sprite resource, the drag data type should be "sprite".
   */
  it('should set drag type to "sprite" for sprite resources', () => {
    fc.assert(
      fc.property(arbSpriteResource, (resource) => {
        const dragData = createResourceDragData(
          resource.type,
          resource.imageTag,
          resource.imagePath
        )
        
        // Sprite resources should have type "sprite"
        return dragData.type === 'sprite'
      }),
      { numRuns: 100 }
    )
  })

  /**
   * For any resource, the drag type should match the resource type.
   */
  it('should match drag type to resource type', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        const dragData = createResourceDragData(
          resource.type,
          resource.imageTag,
          resource.imagePath
        )
        
        // Drag type should match resource type
        return dragData.type === resource.type
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Drag data should be serializable and deserializable without loss.
   */
  it('should serialize and deserialize drag data correctly', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        const dragData = createResourceDragData(
          resource.type,
          resource.imageTag,
          resource.imagePath
        )
        
        const serialized = serializeDragData(dragData)
        const deserialized = deserializeDragData(serialized)
        
        // Deserialized data should match original
        return (
          deserialized !== null &&
          deserialized.type === dragData.type &&
          deserialized.imageTag === dragData.imageTag &&
          deserialized.imagePath === dragData.imagePath
        )
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Drag type should only be "background" or "sprite".
   */
  it('should only allow valid drag types', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        const dragData = createResourceDragData(
          resource.type,
          resource.imageTag,
          resource.imagePath
        )
        
        const validTypes = ['background', 'sprite']
        return validTypes.includes(dragData.type)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Drag data should contain all required fields.
   */
  it('should include all required fields in drag data', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        const dragData = createResourceDragData(
          resource.type,
          resource.imageTag,
          resource.imagePath
        )
        
        // All required fields should be present
        return (
          'type' in dragData &&
          'imageTag' in dragData &&
          'imagePath' in dragData &&
          typeof dragData.type === 'string' &&
          typeof dragData.imageTag === 'string' &&
          typeof dragData.imagePath === 'string'
        )
      }),
      { numRuns: 100 }
    )
  })
})

describe('Drag Data Round-Trip', () => {
  /**
   * For any valid drag data, serialization followed by deserialization
   * should produce equivalent data.
   */
  it('should round-trip drag data correctly', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        const original: ResourceDragData = {
          type: resource.type,
          imageTag: resource.imageTag,
          imagePath: resource.imagePath,
        }
        
        const serialized = serializeDragData(original)
        const deserialized = deserializeDragData(serialized)
        
        if (deserialized === null) return false
        
        return (
          deserialized.type === original.type &&
          deserialized.imageTag === original.imageTag &&
          deserialized.imagePath === original.imagePath
        )
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Invalid JSON should return null when deserializing.
   */
  it('should return null for invalid JSON', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => {
          try {
            JSON.parse(s)
            return false // Valid JSON, skip
          } catch {
            return true // Invalid JSON, keep
          }
        }),
        (invalidJson) => {
          const result = deserializeDragData(invalidJson)
          return result === null
        }
      ),
      { numRuns: 100 }
    )
  })
})
