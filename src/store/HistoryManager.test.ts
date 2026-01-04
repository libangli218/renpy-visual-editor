import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { HistoryManager } from './HistoryManager'

// Test state type
interface TestState {
  value: number
  name: string
}

// Arbitrary generator for test states
const arbitraryTestState = fc.record({
  value: fc.integer({ min: -1000, max: 1000 }),
  name: fc.string({ minLength: 0, maxLength: 50 }),
})

describe('HistoryManager', () => {
  let historyManager: HistoryManager<TestState>

  beforeEach(() => {
    historyManager = new HistoryManager<TestState>(100)
  })

  describe('Basic functionality', () => {
    it('should initialize with empty history', () => {
      expect(historyManager.canUndo()).toBe(false)
      expect(historyManager.canRedo()).toBe(false)
      expect(historyManager.getUndoCount()).toBe(0)
      expect(historyManager.getRedoCount()).toBe(0)
    })

    it('should store initial state', () => {
      const initialState: TestState = { value: 42, name: 'initial' }
      historyManager.initialize(initialState)
      expect(historyManager.getCurrentState()).toEqual(initialState)
    })
  })

  /**
   * Feature: renpy-visual-editor, Property 8: Undo/Redo Correctness
   * 
   * For any sequence of operations followed by undo, the state should return 
   * to the previous state. Redo should restore the undone state.
   * 
   * Validates: Requirements 18.2, 18.3
   */
  describe('Property 8: Undo/Redo Correctness', () => {
    it('undo restores previous state', () => {
      fc.assert(
        fc.property(
          arbitraryTestState,
          arbitraryTestState,
          (initialState, newState) => {
            // Setup
            const manager = new HistoryManager<TestState>(100)
            manager.initialize(initialState)
            
            // Perform operation
            manager.push(newState)
            
            // Undo should restore initial state
            const restoredState = manager.undo()
            
            expect(restoredState).toEqual(initialState)
            expect(manager.getCurrentState()).toEqual(initialState)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('redo restores undone state', () => {
      fc.assert(
        fc.property(
          arbitraryTestState,
          arbitraryTestState,
          (initialState, newState) => {
            // Setup
            const manager = new HistoryManager<TestState>(100)
            manager.initialize(initialState)
            
            // Perform operation
            manager.push(newState)
            
            // Undo
            manager.undo()
            
            // Redo should restore the new state
            const redoneState = manager.redo()
            
            expect(redoneState).toEqual(newState)
            expect(manager.getCurrentState()).toEqual(newState)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('multiple undo/redo operations maintain consistency', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryTestState, { minLength: 2, maxLength: 10 }),
          (states) => {
            const manager = new HistoryManager<TestState>(100)
            manager.initialize(states[0])
            
            // Push all states
            for (let i = 1; i < states.length; i++) {
              manager.push(states[i])
            }
            
            // Undo all operations
            for (let i = states.length - 1; i > 0; i--) {
              const undoneState = manager.undo()
              expect(undoneState).toEqual(states[i - 1])
            }
            
            // Redo all operations
            for (let i = 1; i < states.length; i++) {
              const redoneState = manager.redo()
              expect(redoneState).toEqual(states[i])
            }
            
            // Final state should match last pushed state
            expect(manager.getCurrentState()).toEqual(states[states.length - 1])
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: renpy-visual-editor, Property 9: Undo History Capacity
   * 
   * For any sequence of N operations where N ≤ 100, all operations should be undoable.
   * 
   * Validates: Requirements 18.4
   */
  describe('Property 9: Undo History Capacity', () => {
    it('supports at least 100 undo operations', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryTestState, { minLength: 1, maxLength: 100 }),
          (states) => {
            const manager = new HistoryManager<TestState>(100)
            manager.initialize({ value: 0, name: 'initial' })
            
            // Push all states
            for (const state of states) {
              manager.push(state)
            }
            
            // Should be able to undo all operations
            expect(manager.getUndoCount()).toBe(Math.min(states.length, 100))
            
            // Verify we can undo all of them
            let undoCount = 0
            while (manager.canUndo()) {
              manager.undo()
              undoCount++
            }
            
            expect(undoCount).toBe(Math.min(states.length, 100))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('trims history when exceeding max size', () => {
      const manager = new HistoryManager<TestState>(100)
      manager.initialize({ value: 0, name: 'initial' })
      
      // Push 150 states (more than max)
      for (let i = 1; i <= 150; i++) {
        manager.push({ value: i, name: `state-${i}` })
      }
      
      // History should be capped at 100
      expect(manager.getUndoCount()).toBe(100)
      
      // The oldest states should have been trimmed
      // After 150 pushes with max 100, we should have states 51-150 in history
      // Current state is 150, undo should give us 149
      const undoneState = manager.undo()
      expect(undoneState?.value).toBe(149)
    })
  })

  /**
   * Feature: renpy-visual-editor, Property 10: Redo History Clearing
   * 
   * For any state after undo, performing a new operation should clear the redo history.
   * 
   * Validates: Requirements 18.5
   */
  describe('Property 10: Redo History Clearing', () => {
    it('new operation after undo clears redo history', () => {
      fc.assert(
        fc.property(
          arbitraryTestState,
          arbitraryTestState,
          arbitraryTestState,
          (initialState, state1, state2) => {
            const manager = new HistoryManager<TestState>(100)
            manager.initialize(initialState)
            
            // Push first state
            manager.push(state1)
            
            // Undo
            manager.undo()
            expect(manager.canRedo()).toBe(true)
            
            // Push new state (should clear redo)
            manager.push(state2)
            
            // Redo should no longer be available
            expect(manager.canRedo()).toBe(false)
            expect(manager.getRedoCount()).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('redo history is preserved until new operation', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryTestState, { minLength: 3, maxLength: 10 }),
          fc.integer({ min: 1, max: 5 }),
          (states, undoCount) => {
            const manager = new HistoryManager<TestState>(100)
            manager.initialize(states[0])
            
            // Push all states
            for (let i = 1; i < states.length; i++) {
              manager.push(states[i])
            }
            
            // Undo some operations
            const actualUndoCount = Math.min(undoCount, states.length - 1)
            for (let i = 0; i < actualUndoCount; i++) {
              manager.undo()
            }
            
            // Redo history should have the undone states
            expect(manager.getRedoCount()).toBe(actualUndoCount)
            expect(manager.canRedo()).toBe(actualUndoCount > 0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
