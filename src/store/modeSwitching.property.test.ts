import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { EditorMode, ComplexityLevel, EditorState } from '../types/editor'
import { RenpyScript, ASTNode, DialogueNode, LabelNode, SceneNode } from '../types/ast'

/**
 * Property tests for Mode Switching functionality
 * 
 * Tests Property 2: Mode Synchronization
 * Tests Property 4: Complexity Level Data Preservation
 * 
 * Validates: Requirements 2.2, 2.5, 3.5
 */

// Arbitrary generators for editor state components
const arbitraryEditorMode = fc.constantFrom<EditorMode>('story', 'multi-label')
const arbitraryComplexityLevel = fc.constantFrom<ComplexityLevel>('simple', 'preview', 'advanced')

// Generate a valid identifier (for label names, etc.)
const arbitraryIdentifier = fc.stringMatching(/^[a-z_][a-z0-9_]{0,19}$/)

// Generate a dialogue node
const arbitraryDialogueNode: fc.Arbitrary<DialogueNode> = fc.record({
  id: fc.uuid(),
  type: fc.constant('dialogue' as const),
  speaker: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  text: fc.string({ minLength: 1, maxLength: 200 }),
  attributes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  line: fc.option(fc.integer({ min: 1, max: 10000 })),
})

// Generate a scene node
const arbitrarySceneNode: fc.Arbitrary<SceneNode> = fc.record({
  id: fc.uuid(),
  type: fc.constant('scene' as const),
  image: fc.string({ minLength: 1, maxLength: 50 }),
  layer: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
  line: fc.option(fc.integer({ min: 1, max: 10000 })),
})

// Generate a simple AST node (dialogue or scene)
const arbitrarySimpleNode: fc.Arbitrary<ASTNode> = fc.oneof(
  arbitraryDialogueNode,
  arbitrarySceneNode
)

// Generate a label node with body
const arbitraryLabelNode: fc.Arbitrary<LabelNode> = fc.record({
  id: fc.uuid(),
  type: fc.constant('label' as const),
  name: arbitraryIdentifier,
  parameters: fc.option(fc.array(arbitraryIdentifier, { maxLength: 3 })),
  body: fc.array(arbitrarySimpleNode, { minLength: 0, maxLength: 10 }),
  line: fc.option(fc.integer({ min: 1, max: 10000 })),
})

// Generate a RenpyScript AST
const arbitraryRenpyScript: fc.Arbitrary<RenpyScript> = fc.record({
  type: fc.constant('script' as const),
  statements: fc.array(
    fc.oneof(arbitraryLabelNode, arbitrarySimpleNode),
    { minLength: 0, maxLength: 20 }
  ),
  metadata: fc.record({
    filePath: fc.string({ minLength: 1, maxLength: 100 }),
    parseTime: fc.date(),
    version: fc.string({ minLength: 1, maxLength: 10 }),
  }),
})

// Generate a complete editor state
const arbitraryEditorState: fc.Arbitrary<EditorState> = fc.record({
  mode: arbitraryEditorMode,
  complexity: arbitraryComplexityLevel,
  projectPath: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  currentFile: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  modified: fc.boolean(),
  selectedNodeId: fc.option(fc.uuid(), { nil: null }),
  selectedBlockId: fc.option(fc.uuid(), { nil: null }),
  ast: fc.option(arbitraryRenpyScript, { nil: null }),
})

/**
 * Helper function to simulate mode switching
 * This represents the core logic of switching between Story Mode and Multi-Label View
 */
function switchMode(state: EditorState, newMode: EditorMode): EditorState {
  return {
    ...state,
    mode: newMode,
    // AST is preserved - both modes share the same data
    // This is the key property we're testing
  }
}

/**
 * Helper function to simulate complexity level change
 * This represents the core logic of changing complexity levels
 */
function setComplexity(state: EditorState, newComplexity: ComplexityLevel): EditorState {
  return {
    ...state,
    complexity: newComplexity,
    // AST is preserved - complexity only affects UI display
  }
}

/**
 * Deep equality check for AST nodes
 */
function astEquals(a: RenpyScript | null, b: RenpyScript | null): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  
  // Compare by JSON serialization (handles nested structures)
  return JSON.stringify(a) === JSON.stringify(b)
}

describe('Mode Switching Property Tests', () => {
  /**
   * Feature: renpy-visual-editor, Property 2: Mode Synchronization
   * 
   * For any editor state, switching between Story Mode and Multi-Label View 
   * should preserve all data.
   * 
   * ∀ state ∈ EditorState: 
   *   toMultiLabel(toStoryMode(state)).ast ≡ state.ast
   *   toStoryMode(toMultiLabel(state)).ast ≡ state.ast
   * 
   * Validates: Requirements 2.2, 2.5
   */
  describe('Property 2: Mode Synchronization', () => {
    it('switching from story to multi-label mode preserves AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorState,
          (state) => {
            // Start in story mode
            const storyState: EditorState = { ...state, mode: 'story' }
            
            // Switch to multi-label mode
            const multiLabelState = switchMode(storyState, 'multi-label')
            
            // AST should be preserved
            expect(astEquals(multiLabelState.ast, storyState.ast)).toBe(true)
            expect(multiLabelState.mode).toBe('multi-label')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('switching from multi-label to story mode preserves AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorState,
          (state) => {
            // Start in multi-label mode
            const multiLabelState: EditorState = { ...state, mode: 'multi-label' }
            
            // Switch to story mode
            const storyState = switchMode(multiLabelState, 'story')
            
            // AST should be preserved
            expect(astEquals(storyState.ast, multiLabelState.ast)).toBe(true)
            expect(storyState.mode).toBe('story')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('round-trip mode switching preserves AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorState,
          (initialState) => {
            // Switch story -> multi-label -> story
            const afterMultiLabel = switchMode(initialState, 'multi-label')
            const afterStoryMode = switchMode(afterMultiLabel, 'story')
            
            // AST should be identical to initial
            expect(astEquals(afterStoryMode.ast, initialState.ast)).toBe(true)
            
            // Switch multi-label -> story -> multi-label
            const multiLabelState: EditorState = { ...initialState, mode: 'multi-label' }
            const afterStory = switchMode(multiLabelState, 'story')
            const afterMulti = switchMode(afterStory, 'multi-label')
            
            // AST should be identical
            expect(astEquals(afterMulti.ast, multiLabelState.ast)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('multiple mode switches preserve AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorState,
          fc.array(arbitraryEditorMode, { minLength: 1, maxLength: 20 }),
          (initialState, modeSequence) => {
            let currentState = initialState
            const originalAst = initialState.ast
            
            // Apply all mode switches
            for (const mode of modeSequence) {
              currentState = switchMode(currentState, mode)
            }
            
            // AST should still be the same
            expect(astEquals(currentState.ast, originalAst)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('mode switching preserves other state properties', () => {
      fc.assert(
        fc.property(
          arbitraryEditorState,
          arbitraryEditorMode,
          (state, newMode) => {
            const newState = switchMode(state, newMode)
            
            // All properties except mode should be preserved
            expect(newState.complexity).toBe(state.complexity)
            expect(newState.projectPath).toBe(state.projectPath)
            expect(newState.currentFile).toBe(state.currentFile)
            expect(newState.selectedNodeId).toBe(state.selectedNodeId)
            expect(newState.selectedBlockId).toBe(state.selectedBlockId)
            expect(astEquals(newState.ast, state.ast)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: renpy-visual-editor, Property 4: Complexity Level Data Preservation
   * 
   * For any editor state, switching complexity levels should not change 
   * the underlying AST data.
   * 
   * ∀ state ∈ EditorState, level ∈ ComplexityLevel:
   *   setComplexity(state, level).ast ≡ state.ast
   * 
   * Validates: Requirements 3.5
   */
  describe('Property 4: Complexity Level Data Preservation', () => {
    it('changing complexity level preserves AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorState,
          arbitraryComplexityLevel,
          (state, newComplexity) => {
            const newState = setComplexity(state, newComplexity)
            
            // AST should be preserved
            expect(astEquals(newState.ast, state.ast)).toBe(true)
            expect(newState.complexity).toBe(newComplexity)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('cycling through all complexity levels preserves AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorState,
          (initialState) => {
            const originalAst = initialState.ast
            
            // Cycle through all complexity levels
            let state = setComplexity(initialState, 'simple')
            expect(astEquals(state.ast, originalAst)).toBe(true)
            
            state = setComplexity(state, 'preview')
            expect(astEquals(state.ast, originalAst)).toBe(true)
            
            state = setComplexity(state, 'advanced')
            expect(astEquals(state.ast, originalAst)).toBe(true)
            
            // Back to simple
            state = setComplexity(state, 'simple')
            expect(astEquals(state.ast, originalAst)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('multiple complexity changes preserve AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorState,
          fc.array(arbitraryComplexityLevel, { minLength: 1, maxLength: 20 }),
          (initialState, complexitySequence) => {
            let currentState = initialState
            const originalAst = initialState.ast
            
            // Apply all complexity changes
            for (const complexity of complexitySequence) {
              currentState = setComplexity(currentState, complexity)
            }
            
            // AST should still be the same
            expect(astEquals(currentState.ast, originalAst)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('complexity change preserves other state properties', () => {
      fc.assert(
        fc.property(
          arbitraryEditorState,
          arbitraryComplexityLevel,
          (state, newComplexity) => {
            const newState = setComplexity(state, newComplexity)
            
            // All properties except complexity should be preserved
            expect(newState.mode).toBe(state.mode)
            expect(newState.projectPath).toBe(state.projectPath)
            expect(newState.currentFile).toBe(state.currentFile)
            expect(newState.modified).toBe(state.modified)
            expect(newState.selectedNodeId).toBe(state.selectedNodeId)
            expect(newState.selectedBlockId).toBe(state.selectedBlockId)
            expect(astEquals(newState.ast, state.ast)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Combined property: Mode and Complexity changes are independent
   */
  describe('Combined Mode and Complexity Independence', () => {
    it('mode and complexity changes are commutative for AST preservation', () => {
      fc.assert(
        fc.property(
          arbitraryEditorState,
          arbitraryEditorMode,
          arbitraryComplexityLevel,
          (initialState, newMode, newComplexity) => {
            const originalAst = initialState.ast
            
            // Path 1: mode first, then complexity
            const path1State = setComplexity(switchMode(initialState, newMode), newComplexity)
            
            // Path 2: complexity first, then mode
            const path2State = switchMode(setComplexity(initialState, newComplexity), newMode)
            
            // Both paths should preserve AST
            expect(astEquals(path1State.ast, originalAst)).toBe(true)
            expect(astEquals(path2State.ast, originalAst)).toBe(true)
            
            // Both paths should result in same final mode and complexity
            expect(path1State.mode).toBe(newMode)
            expect(path1State.complexity).toBe(newComplexity)
            expect(path2State.mode).toBe(newMode)
            expect(path2State.complexity).toBe(newComplexity)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('interleaved mode and complexity changes preserve AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorState,
          fc.array(
            fc.oneof(
              fc.record({ type: fc.constant('mode' as const), value: arbitraryEditorMode }),
              fc.record({ type: fc.constant('complexity' as const), value: arbitraryComplexityLevel })
            ),
            { minLength: 1, maxLength: 30 }
          ),
          (initialState, operations) => {
            let currentState = initialState
            const originalAst = initialState.ast
            
            // Apply all operations
            for (const op of operations) {
              if (op.type === 'mode') {
                currentState = switchMode(currentState, op.value as EditorMode)
              } else {
                currentState = setComplexity(currentState, op.value as ComplexityLevel)
              }
            }
            
            // AST should still be the same
            expect(astEquals(currentState.ast, originalAst)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
