/**
 * HistoryManager - Manages undo/redo history for the editor
 * 
 * Implements the following correctness properties:
 * - Property 8: Undo/Redo Correctness
 * - Property 9: Undo History Capacity (100 entries)
 * - Property 10: Redo History Clearing
 */

export interface HistoryEntry<T> {
  timestamp: number
  state: T
}

export class HistoryManager<T> {
  private past: HistoryEntry<T>[] = []
  private future: HistoryEntry<T>[] = []
  private readonly maxSize: number
  private currentState: T | null = null

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  /**
   * Initialize the history with an initial state
   */
  initialize(initialState: T): void {
    this.currentState = initialState
    this.past = []
    this.future = []
  }

  /**
   * Get the current state
   */
  getCurrentState(): T | null {
    return this.currentState
  }

  /**
   * Push a new state to history
   * This clears the redo history (Property 10)
   */
  push(newState: T): void {
    if (this.currentState !== null) {
      this.past.push({
        timestamp: Date.now(),
        state: this.currentState,
      })

      // Trim history if it exceeds max size (Property 9)
      while (this.past.length > this.maxSize) {
        this.past.shift()
      }
    }

    this.currentState = newState
    // Clear future when new action is performed (Property 10)
    this.future = []
  }

  /**
   * Undo the last action
   * Returns the previous state or null if nothing to undo
   * (Property 8: Undo restores previous state)
   */
  undo(): T | null {
    if (this.past.length === 0 || this.currentState === null) {
      return null
    }

    const previous = this.past.pop()!
    
    // Push current state to future for redo
    this.future.unshift({
      timestamp: Date.now(),
      state: this.currentState,
    })

    this.currentState = previous.state
    return this.currentState
  }

  /**
   * Redo the last undone action
   * Returns the next state or null if nothing to redo
   * (Property 8: Redo restores undone state)
   */
  redo(): T | null {
    if (this.future.length === 0) {
      return null
    }

    const next = this.future.shift()!

    // Push current state to past
    if (this.currentState !== null) {
      this.past.push({
        timestamp: Date.now(),
        state: this.currentState,
      })
    }

    this.currentState = next.state
    return this.currentState
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.past.length > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.future.length > 0
  }

  /**
   * Get the number of undo steps available
   */
  getUndoCount(): number {
    return this.past.length
  }

  /**
   * Get the number of redo steps available
   */
  getRedoCount(): number {
    return this.future.length
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.past = []
    this.future = []
  }

  /**
   * Get the maximum history size
   */
  getMaxSize(): number {
    return this.maxSize
  }
}

// Export a singleton instance for the editor
export const editorHistory = new HistoryManager<Record<string, unknown>>(100)
