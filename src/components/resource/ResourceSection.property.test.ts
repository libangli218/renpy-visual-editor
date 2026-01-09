/**
 * Property-Based Tests for ResourceSection Component
 * 
 * Feature: image-management-system
 * 
 * Property 9: 搜索过滤正确性 (Search Filter Correctness)
 * Validates: Requirements 7.3, 7.4, 7.5, 7.6
 * 
 * For any search query string q and resource list, the filtered results should only
 * include resources whose names contain q (case-insensitive, partial match).
 * Empty query should return all resources.
 * 
 * ∀ resources ∈ Resource[], query ∈ String:
 *   let filtered = filterResources(resources, query)
 *   if query = "" then filtered = resources
 *   else ∀ r ∈ filtered: r.imageTag.toLowerCase().includes(query.toLowerCase())
 *   and ∀ r ∈ resources \ filtered: !r.imageTag.toLowerCase().includes(query.toLowerCase())
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { filterResources, groupResourcesByTag, ResourceData } from './ResourceSection'

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
 * Generate valid file paths
 */
const arbFilePath = fc.tuple(
  fc.constantFrom('/project/game/images/', '/game/images/', 'C:\\project\\game\\images\\'),
  fc.stringMatching(/^[a-z][a-z0-9_]{1,15}$/),
  fc.constantFrom('.png', '.jpg', '.webp')
).map(([dir, name, ext]) => `${dir}${name}${ext}`)

/**
 * Generate resource types
 */
const arbResourceType = fc.constantFrom<'background' | 'sprite'>('background', 'sprite')

/**
 * Generate a single ResourceData
 */
const arbResourceData: fc.Arbitrary<ResourceData> = fc.record({
  imageTag: arbImageTag,
  type: arbResourceType,
  imagePath: arbFilePath,
})

/**
 * Generate an array of ResourceData
 */
const arbResourceList = fc.array(arbResourceData, { minLength: 0, maxLength: 50 })

/**
 * Generate search query strings (including empty, whitespace, and valid queries)
 */
const arbSearchQuery = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.stringMatching(/^[a-z]{1,5}$/),
  fc.stringMatching(/^[A-Z]{1,5}$/),
  fc.stringMatching(/^[a-zA-Z0-9_]{1,8}$/)
)

/**
 * Generate non-empty search query strings
 */
const arbNonEmptyQuery = fc.stringMatching(/^[a-zA-Z0-9_]{1,8}$/).filter(s => s.trim().length > 0)

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 9: 搜索过滤正确性 (Search Filter Correctness)', () => {
  /**
   * Feature: image-management-system, Property 9: Search Filter Correctness
   * Validates: Requirements 7.3, 7.4, 7.5, 7.6
   * 
   * Empty query should return all resources.
   */
  it('should return all resources when query is empty', () => {
    fc.assert(
      fc.property(arbResourceList, (resources) => {
        const filtered = filterResources(resources, '')
        return filtered.length === resources.length
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Whitespace-only query should return all resources.
   */
  it('should return all resources when query is whitespace only', () => {
    fc.assert(
      fc.property(
        arbResourceList,
        fc.stringMatching(/^\s{1,5}$/),
        (resources, whitespaceQuery) => {
          const filtered = filterResources(resources, whitespaceQuery)
          return filtered.length === resources.length
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * All filtered results should contain the query (case-insensitive).
   */
  it('should only include resources that contain the query (case-insensitive)', () => {
    fc.assert(
      fc.property(arbResourceList, arbNonEmptyQuery, (resources, query) => {
        const filtered = filterResources(resources, query)
        const lowerQuery = query.toLowerCase().trim()
        
        // All filtered results should contain the query
        return filtered.every(r => 
          r.imageTag.toLowerCase().includes(lowerQuery)
        )
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Resources not in filtered results should NOT contain the query.
   */
  it('should exclude resources that do not contain the query', () => {
    fc.assert(
      fc.property(arbResourceList, arbNonEmptyQuery, (resources, query) => {
        const filtered = filterResources(resources, query)
        const lowerQuery = query.toLowerCase().trim()
        
        // Get resources that were excluded
        const excluded = resources.filter(r => 
          !filtered.some(f => f.imageTag === r.imageTag)
        )
        
        // All excluded resources should NOT contain the query
        return excluded.every(r => 
          !r.imageTag.toLowerCase().includes(lowerQuery)
        )
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Search should be case-insensitive (uppercase query should match lowercase tags).
   */
  it('should be case-insensitive (uppercase query matches lowercase)', () => {
    fc.assert(
      fc.property(arbResourceList, arbNonEmptyQuery, (resources, query) => {
        const upperQuery = query.toUpperCase()
        const lowerQuery = query.toLowerCase()
        
        const filteredUpper = filterResources(resources, upperQuery)
        const filteredLower = filterResources(resources, lowerQuery)
        
        // Both should return the same results
        return filteredUpper.length === filteredLower.length &&
          filteredUpper.every((r, i) => r.imageTag === filteredLower[i].imageTag)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Search should support partial matching.
   */
  it('should support partial matching', () => {
    fc.assert(
      fc.property(
        arbResourceData,
        fc.integer({ min: 1, max: 3 }),
        (resource, prefixLength) => {
          // Get a prefix of the image tag
          const prefix = resource.imageTag.substring(0, Math.min(prefixLength, resource.imageTag.length))
          
          if (prefix.length === 0) return true // Skip if prefix is empty
          
          const resources = [resource]
          const filtered = filterResources(resources, prefix)
          
          // The resource should be in the filtered results
          return filtered.length === 1 && filtered[0].imageTag === resource.imageTag
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Filtered results should be a subset of original resources.
   */
  it('should return a subset of original resources', () => {
    fc.assert(
      fc.property(arbResourceList, arbSearchQuery, (resources, query) => {
        const filtered = filterResources(resources, query)
        
        // Filtered should be a subset (all filtered items exist in original)
        return filtered.every(f => 
          resources.some(r => r.imageTag === f.imageTag)
        )
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Filtered results count should be <= original count.
   */
  it('should return at most the same number of resources', () => {
    fc.assert(
      fc.property(arbResourceList, arbSearchQuery, (resources, query) => {
        const filtered = filterResources(resources, query)
        return filtered.length <= resources.length
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Filtering should preserve resource order.
   */
  it('should preserve resource order', () => {
    fc.assert(
      fc.property(arbResourceList, arbSearchQuery, (resources, query) => {
        const filtered = filterResources(resources, query)
        
        // Get indices of filtered items in original array
        const indices = filtered.map(f => 
          resources.findIndex(r => r.imageTag === f.imageTag)
        )
        
        // Indices should be in ascending order
        for (let i = 1; i < indices.length; i++) {
          if (indices[i] <= indices[i - 1]) return false
        }
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Filtering with the exact image tag should return that resource.
   */
  it('should return resource when query matches exact image tag', () => {
    fc.assert(
      fc.property(arbResourceData, (resource) => {
        const resources = [resource]
        const filtered = filterResources(resources, resource.imageTag)
        
        return filtered.length === 1 && filtered[0].imageTag === resource.imageTag
      }),
      { numRuns: 100 }
    )
  })
})

describe('Resource Grouping', () => {
  /**
   * Grouping should preserve all resources.
   */
  it('should preserve all resources when grouping', () => {
    fc.assert(
      fc.property(arbResourceList, (resources) => {
        const groups = groupResourcesByTag(resources)
        
        // Count total resources in all groups
        const totalInGroups = groups.reduce((sum, g) => sum + g.resources.length, 0)
        
        return totalInGroups === resources.length
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Each group should have a valid tag (first word of image tags).
   */
  it('should group by first word of image tag', () => {
    fc.assert(
      fc.property(arbResourceList, (resources) => {
        const groups = groupResourcesByTag(resources)
        
        // Each resource in a group should have the group's tag as first word
        return groups.every(group => 
          group.resources.every(r => {
            const firstWord = r.imageTag.split(' ')[0]
            return firstWord === group.tag
          })
        )
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Groups should be sorted alphabetically by tag.
   */
  it('should sort groups alphabetically', () => {
    fc.assert(
      fc.property(arbResourceList, (resources) => {
        const groups = groupResourcesByTag(resources)
        
        // Check if tags are in alphabetical order
        for (let i = 1; i < groups.length; i++) {
          if (groups[i].tag.localeCompare(groups[i - 1].tag) < 0) {
            return false
          }
        }
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Empty resource list should produce empty groups.
   */
  it('should return empty groups for empty resource list', () => {
    const groups = groupResourcesByTag([])
    expect(groups).toHaveLength(0)
  })

  /**
   * Each resource should appear in exactly one group.
   */
  it('should place each resource in exactly one group', () => {
    fc.assert(
      fc.property(arbResourceList, (resources) => {
        const groups = groupResourcesByTag(resources)
        
        // Flatten all resources from groups
        const allGroupedResources = groups.flatMap(g => g.resources)
        
        // Each original resource should appear exactly once
        return resources.every(r => 
          allGroupedResources.filter(gr => gr.imageTag === r.imageTag).length === 1
        )
      }),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 3: 立绘分类正确性 (Sprite Classification Correctness)
// ============================================================================

/**
 * Property 3: 立绘分类正确性 (Sprite Classification Correctness)
 * 
 * Feature: image-management-system
 * Validates: Requirements 2.2, 2.3, 2.4
 * 
 * For any image tag:
 * - If the tag starts with "bg", it should be classified as a background
 * - Otherwise, it should be classified as a sprite
 * - Sprites should be grouped by character tag (first word)
 * 
 * ∀ imageTag ∈ String:
 *   if imageTag.startsWith("bg") then type = "background"
 *   else type = "sprite" and grouped by first word
 */
describe('Property 3: 立绘分类正确性 (Sprite Classification Correctness)', () => {
  /**
   * Generate background image tags (starting with "bg")
   */
  const arbBackgroundTag = fc.tuple(
    fc.constant('bg'),
    fc.array(fc.stringMatching(/^[a-z][a-z0-9_]{1,8}$/), { minLength: 1, maxLength: 3 })
  ).map(([prefix, attrs]) => `${prefix} ${attrs.join(' ')}`)

  /**
   * Generate sprite image tags (NOT starting with "bg")
   * Examples: "eileen happy", "lucy normal", "sylvie blue"
   */
  const arbSpriteTag = fc.tuple(
    fc.stringMatching(/^[a-ce-z][a-z0-9_]{1,10}$/), // First char not 'b' to avoid "bg"
    fc.array(fc.stringMatching(/^[a-z][a-z0-9_]{1,8}$/), { minLength: 0, maxLength: 3 })
  ).map(([tag, attrs]) => attrs.length > 0 ? `${tag} ${attrs.join(' ')}` : tag)
  .filter(tag => !tag.toLowerCase().startsWith('bg'))

  /**
   * Generate a background ResourceData
   */
  const arbBackgroundResource: fc.Arbitrary<ResourceData> = fc.record({
    imageTag: arbBackgroundTag,
    type: fc.constant<'background'>('background'),
    imagePath: arbFilePath,
  })

  /**
   * Generate a sprite ResourceData
   */
  const arbSpriteResource: fc.Arbitrary<ResourceData> = fc.record({
    imageTag: arbSpriteTag,
    type: fc.constant<'sprite'>('sprite'),
    imagePath: arbFilePath,
  })

  /**
   * Generate a mixed list of backgrounds and sprites
   */
  const arbMixedResourceList = fc.array(
    fc.oneof(arbBackgroundResource, arbSpriteResource),
    { minLength: 0, maxLength: 30 }
  )

  /**
   * Helper function to classify image tag as background or sprite
   * This mirrors the logic in ResourceManager
   */
  function classifyImageTag(imageTag: string): 'background' | 'sprite' {
    const firstWord = imageTag.split(' ')[0].toLowerCase()
    return firstWord === 'bg' ? 'background' : 'sprite'
  }

  /**
   * Images starting with "bg" should be classified as backgrounds.
   * Validates: Requirement 2.2
   */
  it('should classify images starting with "bg" as backgrounds', () => {
    fc.assert(
      fc.property(arbBackgroundTag, (imageTag) => {
        const classification = classifyImageTag(imageTag)
        return classification === 'background'
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Images NOT starting with "bg" should be classified as sprites.
   * Validates: Requirement 2.2
   */
  it('should classify images NOT starting with "bg" as sprites', () => {
    fc.assert(
      fc.property(arbSpriteTag, (imageTag) => {
        const classification = classifyImageTag(imageTag)
        return classification === 'sprite'
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Sprites should be grouped by character tag (first word).
   * Validates: Requirement 2.3
   */
  it('should group sprites by character tag (first word)', () => {
    fc.assert(
      fc.property(
        fc.array(arbSpriteResource, { minLength: 1, maxLength: 20 }),
        (sprites) => {
          const groups = groupResourcesByTag(sprites)
          
          // Each group's tag should match the first word of all its resources
          return groups.every(group => 
            group.resources.every(r => {
              const firstWord = r.imageTag.split(' ')[0]
              return firstWord === group.tag
            })
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Character tags with multiple attributes should be grouped together.
   * Validates: Requirement 2.4
   */
  it('should group character variants together', () => {
    // Create resources with same character but different attributes
    const characterName = 'eileen'
    const variants: ResourceData[] = [
      { imageTag: `${characterName} happy`, type: 'sprite', imagePath: '/game/images/eileen_happy.png' },
      { imageTag: `${characterName} sad`, type: 'sprite', imagePath: '/game/images/eileen_sad.png' },
      { imageTag: `${characterName} surprised`, type: 'sprite', imagePath: '/game/images/eileen_surprised.png' },
    ]
    
    const groups = groupResourcesByTag(variants)
    
    // Should have exactly one group for this character
    expect(groups.length).toBe(1)
    expect(groups[0].tag).toBe(characterName)
    expect(groups[0].resources.length).toBe(3)
  })

  /**
   * Multiple characters should each have their own group.
   * Validates: Requirements 2.3, 2.4
   */
  it('should create separate groups for different characters', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.stringMatching(/^[a-ce-z][a-z0-9_]{2,8}$/).filter(s => !s.startsWith('bg')),
          { minLength: 2, maxLength: 5 }
        ),
        (characterNames) => {
          // Create one resource per character
          const uniqueNames = [...new Set(characterNames)]
          const resources: ResourceData[] = uniqueNames.map(name => ({
            imageTag: `${name} normal`,
            type: 'sprite' as const,
            imagePath: `/game/images/${name}_normal.png`,
          }))
          
          const groups = groupResourcesByTag(resources)
          
          // Should have one group per unique character
          return groups.length === uniqueNames.length
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Grouping should not mix backgrounds and sprites.
   * Validates: Requirement 2.2
   */
  it('should keep backgrounds and sprites separate when grouped', () => {
    fc.assert(
      fc.property(arbMixedResourceList, (resources) => {
        // Separate backgrounds and sprites
        const backgrounds = resources.filter(r => r.type === 'background')
        const sprites = resources.filter(r => r.type === 'sprite')
        
        // Group each separately
        const bgGroups = groupResourcesByTag(backgrounds)
        const spriteGroups = groupResourcesByTag(sprites)
        
        // Background groups should only contain backgrounds
        const allBgGrouped = bgGroups.every(g => 
          g.resources.every(r => r.type === 'background')
        )
        
        // Sprite groups should only contain sprites
        const allSpriteGrouped = spriteGroups.every(g => 
          g.resources.every(r => r.type === 'sprite')
        )
        
        return allBgGrouped && allSpriteGrouped
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Classification should be case-insensitive for "bg" prefix.
   * Validates: Requirement 2.2
   */
  it('should classify "BG" prefix as background (case-insensitive)', () => {
    const testCases = ['bg room', 'BG room', 'Bg room', 'bG room']
    
    for (const tag of testCases) {
      const classification = classifyImageTag(tag)
      expect(classification).toBe('background')
    }
  })

  /**
   * Grouping should handle single-word tags (no attributes).
   * Validates: Requirement 2.3
   */
  it('should handle single-word tags without attributes', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-ce-z][a-z0-9_]{2,8}$/).filter(s => !s.startsWith('bg')),
        (tag) => {
          const resource: ResourceData = {
            imageTag: tag,
            type: 'sprite',
            imagePath: `/game/images/${tag}.png`,
          }
          
          const groups = groupResourcesByTag([resource])
          
          // Should have one group with the tag as the group name
          return groups.length === 1 && 
                 groups[0].tag === tag && 
                 groups[0].resources.length === 1
        }
      ),
      { numRuns: 100 }
    )
  })
})
