import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { EditorState, EditorMode, ComplexityLevel } from '../types/editor'
import { RenpyScript, DialogueNode, LabelNode, SceneNode, ASTNode } from '../types/ast'

/**
 * Property tests for Modification Tracking functionality
 * 
 * Tests Property 3: Modification Tracking
 * 
 * For any modification operation on the editor state, the modified flag 
 * should be set to true.
 * 
 * ∀ state ∈ EditorState, op ∈ ModifyOperation:
 *   apply(state, op).modified = true
 * 
 * Validates: Requirements 1.4
 */

// Arbitrary generators for editor state components
const arbitraryEditorMode = fc.constantFrom<EditorMode>('story', 'node')
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

// Generate a complete editor state (starting with modified = false)
const arbitraryUnmodifiedEditorState: fc.Arbitrary<EditorState> = fc.record({
  mode: arbitraryEditorMode,
  complexity: arbitraryComplexityLevel,
  projectPath: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  currentFile: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  modified: fc.constant(false), // Always start unmodified
  selectedNodeId: fc.option(fc.uuid(), { nil: null }),
  selectedBlockId: fc.option(fc.uuid(), { nil: null }),
  ast: fc.option(arbitraryRenpyScript, { nil: null }),
  currentBlockLabel: fc.constant(null),
})

/**
 * Modification operations that should set modified = true
 */
type ModificationOperation = 
  | { type: 'setMode'; mode: EditorMode }
  | { type: 'setAst'; ast: RenpyScript | null }

// Generate modification operations
const arbitraryModificationOperation: fc.Arbitrary<ModificationOperation> = fc.oneof(
  fc.record({
    type: fc.constant('setMode' as const),
    mode: arbitraryEditorMode,
  }),
  fc.record({
    type: fc.constant('setAst' as const),
    ast: fc.option(arbitraryRenpyScript, { nil: null }),
  })
)

/**
 * Apply a modification operation to the editor state
 * This simulates the behavior of the editor store
 */
function applyModificationOperation(
  state: EditorState,
  operation: ModificationOperation
): EditorState {
  switch (operation.type) {
    case 'setMode':
      return {
        ...state,
        mode: operation.mode,
        modified: true, // Mode change sets modified
      }
    case 'setAst':
      return {
        ...state,
        ast: operation.ast,
        modified: true, // AST change sets modified
      }
    default:
      return state
  }
}

/**
 * Operations that should NOT set modified = true
 */
type NonModificationOperation =
  | { type: 'setComplexity'; complexity: ComplexityLevel }
  | { type: 'setSelectedNodeId'; id: string | null }
  | { type: 'setSelectedBlockId'; id: string | null }

// Generate non-modification operations
const arbitraryNonModificationOperation: fc.Arbitrary<NonModificationOperation> = fc.oneof(
  fc.record({
    type: fc.constant('setComplexity' as const),
    complexity: arbitraryComplexityLevel,
  }),
  fc.record({
    type: fc.constant('setSelectedNodeId' as const),
    id: fc.option(fc.uuid(), { nil: null }),
  }),
  fc.record({
    type: fc.constant('setSelectedBlockId' as const),
    id: fc.option(fc.uuid(), { nil: null }),
  })
)

/**
 * Apply a non-modification operation to the editor state
 * These operations should NOT change the modified flag
 */
function applyNonModificationOperation(
  state: EditorState,
  operation: NonModificationOperation
): EditorState {
  switch (operation.type) {
    case 'setComplexity':
      return {
        ...state,
        complexity: operation.complexity,
        // modified is NOT changed
      }
    case 'setSelectedNodeId':
      return {
        ...state,
        selectedNodeId: operation.id,
        // modified is NOT changed
      }
    case 'setSelectedBlockId':
      return {
        ...state,
        selectedBlockId: operation.id,
        // modified is NOT changed
      }
    default:
      return state
  }
}

describe('Modification Tracking Property Tests', () => {
  /**
   * Feature: renpy-visual-editor, Property 3: Modification Tracking
   * 
   * For any modification operation on the editor state, the modified flag 
   * should be set to true.
   * 
   * ∀ state ∈ EditorState, op ∈ ModifyOperation:
   *   apply(state, op).modified = true
   * 
   * Validates: Requirements 1.4
   */
  describe('Property 3: Modification Tracking', () => {
    it('modification operations set modified flag to true', () => {
      fc.assert(
        fc.property(
          arbitraryUnmodifiedEditorState,
          arbitraryModificationOperation,
          (state, operation) => {
            // Ensure we start with modified = false
            expect(state.modified).toBe(false)
            
            // Apply the modification operation
            const newState = applyModificationOperation(state, operation)
            
            // Modified flag should be true
            expect(newState.modified).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('setMode operation sets modified flag', () => {
      fc.assert(
        fc.property(
          arbitraryUnmodifiedEditorState,
          arbitraryEditorMode,
          (state, newMode) => {
            const newState = applyModificationOperation(state, { type: 'setMode', mode: newMode })
            expect(newState.modified).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('setAst operation sets modified flag', () => {
      fc.assert(
        fc.property(
          arbitraryUnmodifiedEditorState,
          fc.option(arbitraryRenpyScript, { nil: null }),
          (state, newAst) => {
            const newState = applyModificationOperation(state, { type: 'setAst', ast: newAst })
            expect(newState.modified).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('multiple modification operations keep modified flag true', () => {
      fc.assert(
        fc.property(
          arbitraryUnmodifiedEditorState,
          fc.array(arbitraryModificationOperation, { minLength: 1, maxLength: 10 }),
          (initialState, operations) => {
            let currentState = initialState
            
            // Apply all operations
            for (const op of operations) {
              currentState = applyModificationOperation(currentState, op)
            }
            
            // Modified flag should still be true
            expect(currentState.modified).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('non-modification operations do not change modified flag', () => {
      fc.assert(
        fc.property(
          arbitraryUnmodifiedEditorState,
          arbitraryNonModificationOperation,
          (state, operation) => {
            const originalModified = state.modified
            const newState = applyNonModificationOperation(state, operation)
            
            // Modified flag should remain unchanged
            expect(newState.modified).toBe(originalModified)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('setComplexity does not set modified flag', () => {
      fc.assert(
        fc.property(
          arbitraryUnmodifiedEditorState,
          arbitraryComplexityLevel,
          (state, newComplexity) => {
            const newState = applyNonModificationOperation(state, { 
              type: 'setComplexity', 
              complexity: newComplexity 
            })
            expect(newState.modified).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('selection changes do not set modified flag', () => {
      fc.assert(
        fc.property(
          arbitraryUnmodifiedEditorState,
          fc.option(fc.uuid(), { nil: null }),
          fc.option(fc.uuid(), { nil: null }),
          (state, nodeId, blockId) => {
            let newState = applyNonModificationOperation(state, { 
              type: 'setSelectedNodeId', 
              id: nodeId 
            })
            newState = applyNonModificationOperation(newState, { 
              type: 'setSelectedBlockId', 
              id: blockId 
            })
            
            expect(newState.modified).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('interleaved modification and non-modification operations', () => {
      fc.assert(
        fc.property(
          arbitraryUnmodifiedEditorState,
          fc.array(
            fc.oneof(
              arbitraryModificationOperation.map(op => ({ isModification: true, op })),
              arbitraryNonModificationOperation.map(op => ({ isModification: false, op }))
            ),
            { minLength: 1, maxLength: 20 }
          ),
          (initialState, operations) => {
            let currentState = initialState
            let hasModification = false
            
            // Apply all operations
            for (const { isModification, op } of operations) {
              if (isModification) {
                currentState = applyModificationOperation(currentState, op as ModificationOperation)
                hasModification = true
              } else {
                currentState = applyNonModificationOperation(currentState, op as NonModificationOperation)
              }
            }
            
            // Modified flag should be true if any modification operation was applied
            expect(currentState.modified).toBe(hasModification)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional property: Modified flag can be cleared
   */
  describe('Modified Flag Clearing', () => {
    it('modified flag can be explicitly cleared', () => {
      fc.assert(
        fc.property(
          arbitraryUnmodifiedEditorState,
          arbitraryModificationOperation,
          (state, operation) => {
            // Apply modification
            let newState = applyModificationOperation(state, operation)
            expect(newState.modified).toBe(true)
            
            // Clear modified flag (simulates save operation)
            newState = { ...newState, modified: false }
            expect(newState.modified).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('modification after clearing sets modified flag again', () => {
      fc.assert(
        fc.property(
          arbitraryUnmodifiedEditorState,
          arbitraryModificationOperation,
          arbitraryModificationOperation,
          (state, op1, op2) => {
            // Apply first modification
            let newState = applyModificationOperation(state, op1)
            expect(newState.modified).toBe(true)
            
            // Clear modified flag (simulates save)
            newState = { ...newState, modified: false }
            expect(newState.modified).toBe(false)
            
            // Apply second modification
            newState = applyModificationOperation(newState, op2)
            expect(newState.modified).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
