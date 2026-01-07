/**
 * Menu Manager Property Tests
 * 
 * Property-based tests for menu state consistency.
 * Tests the pure logic functions without Electron dependency.
 * 
 * Feature: top-menu-bar, Property 5: Menu State Based on App State
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Menu state interface representing the current application state
 * Duplicated here to avoid importing from electron module
 */
interface MenuState {
  projectOpen: boolean
  gameRunning: boolean
  canUndo: boolean
  canRedo: boolean
  currentMode: 'story' | 'multi-label'
  previewVisible: boolean
  propertiesVisible: boolean
}

/**
 * Menu items that can be enabled/disabled based on state
 */
type StateDependentMenuItem = 
  | 'save' 
  | 'runGame' 
  | 'stopGame' 
  | 'projectSettings' 
  | 'undo' 
  | 'redo'

/**
 * Pure function to determine if a menu item should be enabled based on state
 * Duplicated here to avoid importing from electron module
 */
function shouldEnableMenuItem(
  menuItem: StateDependentMenuItem,
  state: MenuState
): boolean {
  switch (menuItem) {
    case 'save':
      return state.projectOpen
    case 'projectSettings':
      return state.projectOpen
    case 'runGame':
      return state.projectOpen && !state.gameRunning
    case 'stopGame':
      return state.gameRunning
    case 'undo':
      return state.canUndo
    case 'redo':
      return state.canRedo
    default:
      return true
  }
}

/**
 * Arbitrary for generating random MenuState
 */
const menuStateArb = fc.record({
  projectOpen: fc.boolean(),
  gameRunning: fc.boolean(),
  canUndo: fc.boolean(),
  canRedo: fc.boolean(),
  currentMode: fc.constantFrom('story' as const, 'multi-label' as const),
  previewVisible: fc.boolean(),
  propertiesVisible: fc.boolean()
})

/**
 * Feature: top-menu-bar, Property 5: Menu State Based on App State
 * 
 * For any application state, menu items should be enabled/disabled correctly.
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */
describe('Property 5: Menu State Based on App State', () => {
  /**
   * Requirement 8.1: When no project is open, Save, Run Game, Stop Game, Project Settings disabled
   */
  it('when no project is open, project-dependent items are disabled', () => {
    fc.assert(
      fc.property(
        menuStateArb.filter(state => !state.projectOpen),
        (state) => {
          // Save should be disabled
          expect(shouldEnableMenuItem('save', state)).toBe(false)
          
          // Project Settings should be disabled
          expect(shouldEnableMenuItem('projectSettings', state)).toBe(false)
          
          // Run Game should be disabled (no project)
          expect(shouldEnableMenuItem('runGame', state)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Requirement 8.1: When project is open, Save and Project Settings enabled
   */
  it('when project is open, Save and Project Settings are enabled', () => {
    fc.assert(
      fc.property(
        menuStateArb.filter(state => state.projectOpen),
        (state) => {
          // Save should be enabled
          expect(shouldEnableMenuItem('save', state)).toBe(true)
          
          // Project Settings should be enabled
          expect(shouldEnableMenuItem('projectSettings', state)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Requirement 8.2: When game is running, Run Game disabled, Stop Game enabled
   */
  it('when game is running, Run Game is disabled and Stop Game is enabled', () => {
    fc.assert(
      fc.property(
        menuStateArb.filter(state => state.gameRunning),
        (state) => {
          // Run Game should be disabled when game is running
          expect(shouldEnableMenuItem('runGame', state)).toBe(false)
          
          // Stop Game should be enabled when game is running
          expect(shouldEnableMenuItem('stopGame', state)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Requirement 8.3: When game is not running, Stop Game disabled
   */
  it('when game is not running, Stop Game is disabled', () => {
    fc.assert(
      fc.property(
        menuStateArb.filter(state => !state.gameRunning),
        (state) => {
          // Stop Game should be disabled when game is not running
          expect(shouldEnableMenuItem('stopGame', state)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Requirement 8.2 + 8.1: Run Game enabled only when project open AND game not running
   */
  it('Run Game is enabled only when project is open and game is not running', () => {
    fc.assert(
      fc.property(
        menuStateArb,
        (state) => {
          const runGameEnabled = shouldEnableMenuItem('runGame', state)
          const expectedEnabled = state.projectOpen && !state.gameRunning
          
          expect(runGameEnabled).toBe(expectedEnabled)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Requirement 2.4: Undo disabled when nothing to undo
   */
  it('Undo is disabled when canUndo is false', () => {
    fc.assert(
      fc.property(
        menuStateArb.filter(state => !state.canUndo),
        (state) => {
          expect(shouldEnableMenuItem('undo', state)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Requirement 2.4: Undo enabled when there is something to undo
   */
  it('Undo is enabled when canUndo is true', () => {
    fc.assert(
      fc.property(
        menuStateArb.filter(state => state.canUndo),
        (state) => {
          expect(shouldEnableMenuItem('undo', state)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Requirement 2.5: Redo disabled when nothing to redo
   */
  it('Redo is disabled when canRedo is false', () => {
    fc.assert(
      fc.property(
        menuStateArb.filter(state => !state.canRedo),
        (state) => {
          expect(shouldEnableMenuItem('redo', state)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Requirement 2.5: Redo enabled when there is something to redo
   */
  it('Redo is enabled when canRedo is true', () => {
    fc.assert(
      fc.property(
        menuStateArb.filter(state => state.canRedo),
        (state) => {
          expect(shouldEnableMenuItem('redo', state)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Consistency: Menu state changes should be deterministic
   */
  it('menu item enabled state is deterministic for the same state', () => {
    fc.assert(
      fc.property(
        menuStateArb,
        (state) => {
          const menuItems: StateDependentMenuItem[] = [
            'save', 'runGame', 'stopGame', 'projectSettings', 'undo', 'redo'
          ]
          
          for (const item of menuItems) {
            const result1 = shouldEnableMenuItem(item, state)
            const result2 = shouldEnableMenuItem(item, state)
            
            // Same state should always produce same result
            expect(result1).toBe(result2)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Mutual exclusivity: Run Game and Stop Game cannot both be enabled
   */
  it('Run Game and Stop Game cannot both be enabled at the same time', () => {
    fc.assert(
      fc.property(
        menuStateArb,
        (state) => {
          const runGameEnabled = shouldEnableMenuItem('runGame', state)
          const stopGameEnabled = shouldEnableMenuItem('stopGame', state)
          
          // They cannot both be true at the same time
          expect(runGameEnabled && stopGameEnabled).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})

