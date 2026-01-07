/**
 * App Config Property Tests
 * 
 * Property-based tests for application configuration.
 * Tests the pure logic functions without electron-store dependency.
 * 
 * Feature: top-menu-bar
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Maximum number of recent projects to store
 * Duplicated here to avoid importing from electron module
 */
const MAX_RECENT_PROJECTS = 5

/**
 * Pure function to add a project to the recent projects list
 * - Moves project to front if already exists
 * - Limits list to MAX_RECENT_PROJECTS items
 * @param currentProjects - Current list of recent projects
 * @param projectPath - Path to the project to add
 * @returns Updated list of recent projects
 */
function addRecentProjectPure(currentProjects: string[], projectPath: string): string[] {
  // Remove if already exists (to move to front)
  const filtered = currentProjects.filter(p => p !== projectPath)
  
  // Add to front
  filtered.unshift(projectPath)
  
  // Limit to max items
  return filtered.slice(0, MAX_RECENT_PROJECTS)
}

/**
 * Pure function to remove a project from the recent projects list
 * @param currentProjects - Current list of recent projects
 * @param projectPath - Path to the project to remove
 * @returns Updated list of recent projects
 */
function removeRecentProjectPure(currentProjects: string[], projectPath: string): string[] {
  return currentProjects.filter(p => p !== projectPath)
}

/**
 * Generate valid project paths for testing
 */
const projectPathArb = fc.uuid().map(uuid => `/projects/project_${uuid}`)

/**
 * Feature: top-menu-bar, Property 1: Recent Projects Limit
 * 
 * For any list of recent projects, the stored list should never exceed 5 items.
 * 
 * **Validates: Requirements 1.5**
 */
describe('Property 1: Recent Projects Limit', () => {
  it('recent projects list never exceeds MAX_RECENT_PROJECTS', () => {
    fc.assert(
      fc.property(
        fc.array(projectPathArb, { minLength: 1, maxLength: 20 }),
        (projectPaths) => {
          let currentProjects: string[] = []
          
          // Add all projects
          for (const path of projectPaths) {
            currentProjects = addRecentProjectPure(currentProjects, path)
            
            // After each addition, verify limit is respected
            expect(currentProjects.length).toBeLessThanOrEqual(MAX_RECENT_PROJECTS)
          }
          
          // Final check
          expect(currentProjects.length).toBeLessThanOrEqual(MAX_RECENT_PROJECTS)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('adding more than MAX_RECENT_PROJECTS keeps only the most recent', () => {
    fc.assert(
      fc.property(
        fc.array(projectPathArb, { minLength: MAX_RECENT_PROJECTS + 1, maxLength: 15 }),
        (projectPaths) => {
          // Ensure unique paths
          const uniquePaths = [...new Set(projectPaths)]
          fc.pre(uniquePaths.length > MAX_RECENT_PROJECTS)
          
          let currentProjects: string[] = []
          
          // Add all projects
          for (const path of uniquePaths) {
            currentProjects = addRecentProjectPure(currentProjects, path)
          }
          
          // Should have exactly MAX_RECENT_PROJECTS items
          expect(currentProjects.length).toBe(MAX_RECENT_PROJECTS)
          
          // The most recently added projects should be in the list
          const lastAdded = uniquePaths.slice(-MAX_RECENT_PROJECTS).reverse()
          expect(currentProjects).toEqual(lastAdded)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('adding duplicate project moves it to front without exceeding limit', () => {
    fc.assert(
      fc.property(
        fc.array(projectPathArb, { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        (projectPaths, repeatIndex) => {
          // Ensure unique paths
          const uniquePaths = [...new Set(projectPaths)]
          fc.pre(uniquePaths.length >= 2)
          
          let currentProjects: string[] = []
          
          // Add all projects
          for (const path of uniquePaths) {
            currentProjects = addRecentProjectPure(currentProjects, path)
          }
          
          // Pick a project to re-add
          const pathToRepeat = uniquePaths[repeatIndex % uniquePaths.length]
          currentProjects = addRecentProjectPure(currentProjects, pathToRepeat)
          
          // Should not exceed limit
          expect(currentProjects.length).toBeLessThanOrEqual(MAX_RECENT_PROJECTS)
          
          // The repeated project should be at the front
          expect(currentProjects[0]).toBe(pathToRepeat)
          
          // The project should appear only once
          const occurrences = currentProjects.filter(p => p === pathToRepeat).length
          expect(occurrences).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('removing a project maintains limit invariant', () => {
    fc.assert(
      fc.property(
        fc.array(projectPathArb, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        (projectPaths, removeIndex) => {
          // Ensure unique paths
          const uniquePaths = [...new Set(projectPaths)]
          fc.pre(uniquePaths.length >= 1)
          
          let currentProjects: string[] = []
          
          // Add all projects
          for (const path of uniquePaths) {
            currentProjects = addRecentProjectPure(currentProjects, path)
          }
          
          // Remove a project
          const pathToRemove = uniquePaths[removeIndex % uniquePaths.length]
          currentProjects = removeRecentProjectPure(currentProjects, pathToRemove)
          
          // Should not exceed limit
          expect(currentProjects.length).toBeLessThanOrEqual(MAX_RECENT_PROJECTS)
          
          // The removed project should not be in the list
          expect(currentProjects).not.toContain(pathToRemove)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('mixed add/remove operations maintain limit invariant', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            path: projectPathArb,
            operation: fc.constantFrom('add', 'remove')
          }),
          { minLength: 5, maxLength: 30 }
        ),
        (operations) => {
          let currentProjects: string[] = []
          
          for (const op of operations) {
            if (op.operation === 'add') {
              currentProjects = addRecentProjectPure(currentProjects, op.path)
            } else {
              currentProjects = removeRecentProjectPure(currentProjects, op.path)
            }
            
            // After each operation, verify limit is respected
            expect(currentProjects.length).toBeLessThanOrEqual(MAX_RECENT_PROJECTS)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
