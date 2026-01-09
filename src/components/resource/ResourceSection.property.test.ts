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
