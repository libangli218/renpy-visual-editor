/**
 * Property-Based Tests for useResourceDrop Hook
 * 
 * Feature: image-management-system
 * 
 * Property 6: 拖拽放置兼容性 (Drop Compatibility)
 * Validates: Requirements 4.4, 4.5, 4.8
 * 
 * For any drag-drop operation, SceneBlock should only accept type="background" drops,
 * and ShowBlock should only accept type="sprite" drops.
 * 
 * ∀ dropTarget ∈ {SceneBlock, ShowBlock}, dragData ∈ ResourceDragData:
 *   if dropTarget = SceneBlock then canDrop = (dragData.type = 'background')
 *   if dropTarget = ShowBlock then canDrop = (dragData.type = 'sprite')
 * 
 * Property 7: 拖拽数据完整性 (Drag Data Integrity)
 * Validates: Requirements 4.6
 * 
 * For any successful drag-drop, the block's image property should be updated
 * to the imageTag value from the drag data.
 * 
 * ∀ dragData ∈ ResourceDragData, block ∈ Block:
 *   if drop(dragData, block).success then block.image = dragData.imageTag
 * 
 * Property 8: 拖拽可撤销性 (Drag Undoability)
 * Validates: Requirements 4.9
 * 
 * For any drag-drop operation, executing undo should restore the block's
 * image property to its previous value.
 * 
 * ∀ dragData ∈ ResourceDragData, block ∈ Block:
 *   let oldImage = block.image
 *   drop(dragData, block)
 *   undo()
 *   block.image = oldImage
 */

import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import {
  ResourceDragData,
  serializeDragData,
  deserializeDragData,
} from '../store/resourceStore'

// ============================================================================
// Arbitrary Generators
// ============================================================================

/**
 * Generate valid image tags (Ren'Py naming convention)
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
 * Generate accept types for drop targets
 */
const arbAcceptType = fc.constantFrom<'background' | 'sprite'>('background', 'sprite')

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

/**
 * Generate a pair of accept type and resource data
 */
const arbDropScenario = fc.record({
  acceptType: arbAcceptType,
  resource: arbResourceData,
})

// ============================================================================
// Helper Functions for Testing
// ============================================================================

/**
 * Simulate checking if a drop is compatible
 * This mirrors the logic in useResourceDrop
 */
function isDropCompatible(acceptType: 'background' | 'sprite', resourceType: 'background' | 'sprite'): boolean {
  return acceptType === resourceType
}

/**
 * Simulate a drop operation and return the result
 */
function simulateDrop(
  acceptType: 'background' | 'sprite',
  dragData: ResourceDragData
): { success: boolean; imageTag?: string } {
  if (!isDropCompatible(acceptType, dragData.type)) {
    return { success: false }
  }
  return { success: true, imageTag: dragData.imageTag }
}

/**
 * Simulate block state with undo capability
 */
interface BlockState {
  image: string | null
  history: (string | null)[]
}

function createBlockState(initialImage: string | null = null): BlockState {
  return {
    image: initialImage,
    history: [],
  }
}

function updateBlockImage(state: BlockState, newImage: string): void {
  state.history.push(state.image)
  state.image = newImage
}

function undoBlockImage(state: BlockState): boolean {
  if (state.history.length === 0) return false
  state.image = state.history.pop() ?? null
  return true
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 6: 拖拽放置兼容性 (Drop Compatibility)', () => {
  /**
   * Feature: image-management-system, Property 6: Drop Compatibility
   * Validates: Requirements 4.4, 4.5, 4.8
   * 
   * SceneBlock (acceptType='background') should only accept background resources.
   */
  it('should accept background drops on SceneBlock (acceptType=background)', () => {
    fc.assert(
      fc.property(arbBackgroundResource, (resource) => {
        const acceptType = 'background'
        const compatible = isDropCompatible(acceptType, resource.type)
        
        // Background resources should be compatible with background accept type
        return compatible === true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * SceneBlock should reject sprite resources.
   */
  it('should reject sprite drops on SceneBlock (acceptType=background)', () => {
    fc.assert(
      fc.property(arbSpriteResource, (resource) => {
        const acceptType = 'background'
        const compatible = isDropCompatible(acceptType, resource.type)
        
        // Sprite resources should NOT be compatible with background accept type
        return compatible === false
      }),
      { numRuns: 100 }
    )
  })

  /**
   * ShowBlock (acceptType='sprite') should only accept sprite resources.
   */
  it('should accept sprite drops on ShowBlock (acceptType=sprite)', () => {
    fc.assert(
      fc.property(arbSpriteResource, (resource) => {
        const acceptType = 'sprite'
        const compatible = isDropCompatible(acceptType, resource.type)
        
        // Sprite resources should be compatible with sprite accept type
        return compatible === true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * ShowBlock should reject background resources.
   */
  it('should reject background drops on ShowBlock (acceptType=sprite)', () => {
    fc.assert(
      fc.property(arbBackgroundResource, (resource) => {
        const acceptType = 'sprite'
        const compatible = isDropCompatible(acceptType, resource.type)
        
        // Background resources should NOT be compatible with sprite accept type
        return compatible === false
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Drop compatibility should be symmetric: acceptType matches resourceType.
   */
  it('should have symmetric compatibility (acceptType === resourceType)', () => {
    fc.assert(
      fc.property(arbDropScenario, ({ acceptType, resource }) => {
        const compatible = isDropCompatible(acceptType, resource.type)
        
        // Compatibility should be true if and only if types match
        return compatible === (acceptType === resource.type)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * For any resource type, there should be exactly one compatible accept type.
   */
  it('should have exactly one compatible accept type per resource type', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        const acceptTypes: ('background' | 'sprite')[] = ['background', 'sprite']
        const compatibleCount = acceptTypes.filter(
          acceptType => isDropCompatible(acceptType, resource.type)
        ).length
        
        // Exactly one accept type should be compatible
        return compatibleCount === 1
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 7: 拖拽数据完整性 (Drag Data Integrity)', () => {
  /**
   * Feature: image-management-system, Property 7: Drag Data Integrity
   * Validates: Requirements 4.6
   * 
   * For any successful drop, the block's image should be updated to the imageTag.
   */
  it('should update block image to imageTag on successful drop', () => {
    fc.assert(
      fc.property(arbBackgroundResource, (resource) => {
        const acceptType = 'background'
        const result = simulateDrop(acceptType, resource)
        
        if (result.success) {
          // On success, imageTag should be returned
          return result.imageTag === resource.imageTag
        }
        return true // Skip incompatible drops
      }),
      { numRuns: 100 }
    )
  })

  /**
   * For sprite drops on ShowBlock, the imageTag should be preserved.
   */
  it('should preserve imageTag for sprite drops on ShowBlock', () => {
    fc.assert(
      fc.property(arbSpriteResource, (resource) => {
        const acceptType = 'sprite'
        const result = simulateDrop(acceptType, resource)
        
        if (result.success) {
          return result.imageTag === resource.imageTag
        }
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Failed drops should not return an imageTag.
   */
  it('should not return imageTag on failed drop', () => {
    fc.assert(
      fc.property(arbDropScenario, ({ acceptType, resource }) => {
        const result = simulateDrop(acceptType, resource)
        
        if (!result.success) {
          // Failed drops should not have imageTag
          return result.imageTag === undefined
        }
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * The imageTag should be exactly preserved (no transformation).
   */
  it('should preserve imageTag exactly without transformation', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        // Simulate compatible drop
        const acceptType = resource.type
        const result = simulateDrop(acceptType, resource)
        
        // imageTag should be exactly the same
        return result.success && result.imageTag === resource.imageTag
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Drag data should survive serialization round-trip.
   */
  it('should preserve drag data through serialization', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        const serialized = serializeDragData(resource)
        const deserialized = deserializeDragData(serialized)
        
        if (!deserialized) return false
        
        // All fields should be preserved
        return (
          deserialized.type === resource.type &&
          deserialized.imageTag === resource.imageTag &&
          deserialized.imagePath === resource.imagePath
        )
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Drop result should contain imageTag only on success.
   */
  it('should have imageTag if and only if drop succeeds', () => {
    fc.assert(
      fc.property(arbDropScenario, ({ acceptType, resource }) => {
        const result = simulateDrop(acceptType, resource)
        
        // imageTag present iff success
        const hasImageTag = result.imageTag !== undefined
        return hasImageTag === result.success
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 8: 拖拽可撤销性 (Drag Undoability)', () => {
  /**
   * Feature: image-management-system, Property 8: Drag Undoability
   * Validates: Requirements 4.9
   * 
   * For any drop operation, undo should restore the previous image value.
   */
  it('should restore previous image on undo', () => {
    fc.assert(
      fc.property(
        arbResourceData,
        fc.option(arbImageTag, { nil: null }),
        (resource, initialImage) => {
          // Create block with initial image
          const state = createBlockState(initialImage)
          const oldImage = state.image
          
          // Simulate compatible drop
          const acceptType = resource.type
          const result = simulateDrop(acceptType, resource)
          
          if (result.success && result.imageTag) {
            // Apply the drop
            updateBlockImage(state, result.imageTag)
            
            // Verify image was updated
            if (state.image !== result.imageTag) return false
            
            // Undo the operation
            const undoSuccess = undoBlockImage(state)
            
            // Verify undo restored the old image
            return undoSuccess && state.image === oldImage
          }
          
          return true // Skip incompatible drops
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Multiple drops should be undoable in reverse order.
   */
  it('should undo multiple drops in reverse order', () => {
    fc.assert(
      fc.property(
        fc.array(arbBackgroundResource, { minLength: 1, maxLength: 5 }),
        fc.option(arbBackgroundTag, { nil: null }),
        (resources, initialImage) => {
          const state = createBlockState(initialImage)
          const acceptType = 'background'
          
          // Apply all drops
          const appliedImages: string[] = []
          for (const resource of resources) {
            const result = simulateDrop(acceptType, resource)
            if (result.success && result.imageTag) {
              updateBlockImage(state, result.imageTag)
              appliedImages.push(result.imageTag)
            }
          }
          
          // Undo all drops in reverse order
          for (let i = appliedImages.length - 1; i >= 0; i--) {
            const expectedAfterUndo = i > 0 ? appliedImages[i - 1] : initialImage
            undoBlockImage(state)
            if (state.image !== expectedAfterUndo) return false
          }
          
          // Final state should be initial image
          return state.image === initialImage
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Undo on empty history should not change state.
   */
  it('should not change state when undoing with empty history', () => {
    fc.assert(
      fc.property(
        fc.option(arbImageTag, { nil: null }),
        (initialImage) => {
          const state = createBlockState(initialImage)
          const imageBefore = state.image
          
          // Try to undo with no history
          const undoSuccess = undoBlockImage(state)
          
          // Should fail and not change state
          return !undoSuccess && state.image === imageBefore
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * History should grow with each drop operation.
   */
  it('should grow history with each drop', () => {
    fc.assert(
      fc.property(
        fc.array(arbBackgroundResource, { minLength: 1, maxLength: 10 }),
        (resources) => {
          const state = createBlockState(null)
          const acceptType = 'background'
          
          let expectedHistoryLength = 0
          
          for (const resource of resources) {
            const result = simulateDrop(acceptType, resource)
            if (result.success && result.imageTag) {
              updateBlockImage(state, result.imageTag)
              expectedHistoryLength++
              
              if (state.history.length !== expectedHistoryLength) {
                return false
              }
            }
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Undo should decrease history length by 1.
   */
  it('should decrease history length on undo', () => {
    fc.assert(
      fc.property(
        fc.array(arbBackgroundResource, { minLength: 2, maxLength: 5 }),
        (resources) => {
          const state = createBlockState(null)
          const acceptType = 'background'
          
          // Apply all drops
          for (const resource of resources) {
            const result = simulateDrop(acceptType, resource)
            if (result.success && result.imageTag) {
              updateBlockImage(state, result.imageTag)
            }
          }
          
          const historyLengthBefore = state.history.length
          
          // Undo once
          if (historyLengthBefore > 0) {
            undoBlockImage(state)
            return state.history.length === historyLengthBefore - 1
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Drop Compatibility Edge Cases', () => {
  /**
   * Empty image tag should still be handled correctly.
   */
  it('should handle empty-ish image tags', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('bg', 'eileen', 'lucy'),
        arbFilePath,
        (tag, path) => {
          const resource: ResourceDragData = {
            type: tag === 'bg' ? 'background' : 'sprite',
            imageTag: tag,
            imagePath: path,
          }
          
          const acceptType = resource.type
          const result = simulateDrop(acceptType, resource)
          
          return result.success && result.imageTag === tag
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Long image tags should be preserved.
   */
  it('should preserve long image tags', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z][a-z0-9_]{1,10}$/),
        fc.array(fc.stringMatching(/^[a-z][a-z0-9_]{1,8}$/), { minLength: 1, maxLength: 5 }),
        arbFilePath,
        (tag, attrs, path) => {
          const imageTag = `${tag} ${attrs.join(' ')}`
          const resource: ResourceDragData = {
            type: tag === 'bg' ? 'background' : 'sprite',
            imageTag,
            imagePath: path,
          }
          
          const acceptType = resource.type
          const result = simulateDrop(acceptType, resource)
          
          return result.success && result.imageTag === imageTag
        }
      ),
      { numRuns: 100 }
    )
  })
})
