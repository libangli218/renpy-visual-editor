/**
 * Undo/Redo State Consistency Property Tests
 * 
 * Property-based tests for undo/redo state consistency between
 * HistoryManager and menu state.
 * 
 * Feature: top-menu-bar, Property 2: Undo/Redo State Consistency
 * 
 * **Validates: Requirements 2.4, 2.5**
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { HistoryManager } from '../store/HistoryManager'

/**
 * Simple state type for testing
 */
interface TestState {
  value: number
  name: string
}

/**
 * Arbitrary for generating random test states
 */
const testStateArb = fc.record({
  value: fc.integer({ min: -1000, max: 1000 }),
  name: fc.string({ minLength: 1, maxLength: 20 })
})

/**
 * Arbitrary for generating a sequence of operations
 */
type Operation = 
  | { type: 'push'; state: TestState }
  | { type: 'undo' }
  | { type: 'redo' }

const operationArb: fc.Arbitrary<Operation> = fc.oneof(
  testStateArb.map(state => ({ type: 'push' as const, state })),
  fc.constant({ type: 'undo' as const }),
  fc.constant({ type: 'redo' as const })
)

/**
 * Feature: top-menu-bar, Property 2: Undo/Redo State Consistency
 * 
 * For any history state, Undo/Redo menu items should be enabled/disabled correctly.
 * 
 * **Validates: Requirements 2.4, 2.5**
 */
describe('Property 2: Undo/Redo State Consistency', () => {
  let historyManager: HistoryManager<TestState>

  beforeEach(() => {
    historyManager = new HistoryManager<TestState>(100)
  })

  /**
   * Requirement 2.4: When there is nothing to undo, the "Undo" item SHALL be disabled
   * 
   * For any sequence of operations, canUndo should be false when past is empty
   */
  it('canUndo is false when no operations have been performed', () => {
    fc.assert(
      fc.property(
        testStateArb,
        (initialState) => {
          historyManager.initialize(initialState)
          
          // After initialization with no pushes, canUndo should be false
          expect(historyManager.canUndo()).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Requirement 2.4: When there is something to undo, the "Undo" item SHALL be enabled
   * 
   * For any state, after pushing a new state, canUndo should be true
   */
  it('canUndo is true after pushing a state', () => {
    fc.assert(
      fc.property(
        testStateArb,
        testStateArb,
        (initialState, newState) => {
          historyManager.initialize(initialState)
          historyManager.push(newState)
          
          // After pushing, canUndo should be true
          expect(historyManager.canUndo()).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Requirement 2.5: When there is nothing to redo, the "Redo" item SHALL be disabled
   * 
   * For any sequence of pushes without undo, canRedo should be false
   */
  it('canRedo is false when no undo has been performed', () => {
    fc.assert(
      fc.property(
        testStateArb,
        fc.array(testStateArb, { minLength: 0, maxLength: 10 }),
        (initialState, states) => {
          historyManager.initialize(initialState)
          
          // Push multiple states
          for (const state of states) {
            historyManager.push(state)
          }
          
          // Without any undo, canRedo should be false
          expect(historyManager.canRedo()).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Requirement 2.5: When there is something to redo, the "Redo" item SHALL be enabled
   * 
   * For any state, after undo, canRedo should be true
   */
  it('canRedo is true after undo', () => {
    fc.assert(
      fc.property(
        testStateArb,
        testStateArb,
        (initialState, newState) => {
          historyManager.initialize(initialState)
          historyManager.push(newState)
          historyManager.undo()
          
          // After undo, canRedo should be true
          expect(historyManager.canRedo()).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Consistency: canUndo and canRedo should be consistent with actual undo/redo availability
   * 
   * For any sequence of operations, canUndo/canRedo should match actual availability
   */
  it('canUndo/canRedo are consistent with actual undo/redo availability', () => {
    fc.assert(
      fc.property(
        testStateArb,
        fc.array(operationArb, { minLength: 1, maxLength: 20 }),
        (initialState, operations) => {
          historyManager.initialize(initialState)
          
          for (const op of operations) {
            switch (op.type) {
              case 'push':
                historyManager.push(op.state)
                break
              case 'undo':
                historyManager.undo()
                break
              case 'redo':
                historyManager.redo()
                break
            }
            
            // After each operation, verify consistency
            const canUndo = historyManager.canUndo()
            const canRedo = historyManager.canRedo()
            
            // If canUndo is true, undo should return a state
            if (canUndo) {
              const undoResult = historyManager.undo()
              expect(undoResult).not.toBeNull()
              // Redo to restore state
              historyManager.redo()
            }
            
            // If canRedo is true, redo should return a state
            if (canRedo) {
              const redoResult = historyManager.redo()
              expect(redoResult).not.toBeNull()
              // Undo to restore state
              historyManager.undo()
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Consistency: After undo, canUndo count decreases and canRedo count increases
   */
  it('undo decreases undo count and increases redo count', () => {
    fc.assert(
      fc.property(
        testStateArb,
        fc.array(testStateArb, { minLength: 2, maxLength: 10 }),
        (initialState, states) => {
          historyManager.initialize(initialState)
          
          // Push multiple states
          for (const state of states) {
            historyManager.push(state)
          }
          
          const undoCountBefore = historyManager.getUndoCount()
          const redoCountBefore = historyManager.getRedoCount()
          
          // Perform undo
          historyManager.undo()
          
          const undoCountAfter = historyManager.getUndoCount()
          const redoCountAfter = historyManager.getRedoCount()
          
          // Undo count should decrease by 1
          expect(undoCountAfter).toBe(undoCountBefore - 1)
          // Redo count should increase by 1
          expect(redoCountAfter).toBe(redoCountBefore + 1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Consistency: After redo, canRedo count decreases and canUndo count increases
   */
  it('redo decreases redo count and increases undo count', () => {
    fc.assert(
      fc.property(
        testStateArb,
        fc.array(testStateArb, { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (initialState, states, undoCount) => {
          historyManager.initialize(initialState)
          
          // Push multiple states
          for (const state of states) {
            historyManager.push(state)
          }
          
          // Perform some undos to have redo available
          const actualUndoCount = Math.min(undoCount, states.length)
          for (let i = 0; i < actualUndoCount; i++) {
            historyManager.undo()
          }
          
          if (historyManager.canRedo()) {
            const undoCountBefore = historyManager.getUndoCount()
            const redoCountBefore = historyManager.getRedoCount()
            
            // Perform redo
            historyManager.redo()
            
            const undoCountAfter = historyManager.getUndoCount()
            const redoCountAfter = historyManager.getRedoCount()
            
            // Undo count should increase by 1
            expect(undoCountAfter).toBe(undoCountBefore + 1)
            // Redo count should decrease by 1
            expect(redoCountAfter).toBe(redoCountBefore - 1)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Consistency: Push clears redo history
   * 
   * For any state with redo available, pushing a new state should clear redo
   */
  it('push clears redo history', () => {
    fc.assert(
      fc.property(
        testStateArb,
        testStateArb,
        testStateArb,
        (initialState, state1, state2) => {
          historyManager.initialize(initialState)
          historyManager.push(state1)
          historyManager.undo()
          
          // Now we have redo available
          expect(historyManager.canRedo()).toBe(true)
          
          // Push a new state
          historyManager.push(state2)
          
          // Redo should be cleared
          expect(historyManager.canRedo()).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Menu state consistency: canUndo/canRedo should match menu item enabled state
   * 
   * This simulates the menu state sync logic
   */
  it('menu item enabled state matches history manager state', () => {
    fc.assert(
      fc.property(
        testStateArb,
        fc.array(operationArb, { minLength: 0, maxLength: 20 }),
        (initialState, operations) => {
          historyManager.initialize(initialState)
          
          for (const op of operations) {
            switch (op.type) {
              case 'push':
                historyManager.push(op.state)
                break
              case 'undo':
                historyManager.undo()
                break
              case 'redo':
                historyManager.redo()
                break
            }
          }
          
          // Simulate menu state
          const menuState = {
            canUndo: historyManager.canUndo(),
            canRedo: historyManager.canRedo()
          }
          
          // Menu item enabled state should match
          // Requirement 2.4: Undo disabled when nothing to undo
          expect(menuState.canUndo).toBe(historyManager.getUndoCount() > 0)
          
          // Requirement 2.5: Redo disabled when nothing to redo
          expect(menuState.canRedo).toBe(historyManager.getRedoCount() > 0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
