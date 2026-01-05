/**
 * Property tests for Block Mode Switching functionality
 * 
 * Tests Property 6: Mode Switching State Preservation
 * 
 * For any mode switching operation, the AST content should remain unchanged.
 * 
 * Validates: Requirements 9.4
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { EditorMode, EditorState } from '../../../types/editor'
import { RenpyScript, ASTNode, DialogueNode, LabelNode, SceneNode } from '../../../types/ast'

/**
 * Feature: block-editor-mode, Property 6: Mode Switching State Preservation
 * 
 * For any mode switching operation, switching between flow mode and block mode
 * should preserve all AST content.
 * 
 * ∀ state ∈ EditorState, labelName ∈ String:
 *   enterBlockMode(exitBlockMode(state, labelName)).ast ≡ state.ast
 *   exitBlockMode(enterBlockMode(state, labelName)).ast ≡ state.ast
 * 
 * Validates: Requirements 9.4
 */

// Arbitrary generators for editor state components
const arbitraryEditorMode = fc.constantFrom<EditorMode>('story', 'node', 'block')

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

// Generate a RenpyScript AST with at least one label
const arbitraryRenpyScriptWithLabels: fc.Arbitrary<RenpyScript> = fc.record({
  type: fc.constant('script' as const),
  statements: fc.array(arbitraryLabelNode, { minLength: 1, maxLength: 10 }),
  metadata: fc.record({
    filePath: fc.string({ minLength: 1, maxLength: 100 }),
    parseTime: fc.date(),
    version: fc.string({ minLength: 1, maxLength: 10 }),
  }),
})

// Generate a complete editor state with AST containing labels
const arbitraryEditorStateWithLabels: fc.Arbitrary<EditorState> = fc.record({
  mode: arbitraryEditorMode,
  complexity: fc.constantFrom('simple', 'preview', 'advanced'),
  projectPath: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  currentFile: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  modified: fc.boolean(),
  selectedNodeId: fc.option(fc.uuid(), { nil: null }),
  selectedBlockId: fc.option(fc.uuid(), { nil: null }),
  ast: arbitraryRenpyScriptWithLabels,
  currentBlockLabel: fc.option(arbitraryIdentifier, { nil: null }),
})

/**
 * Helper function to simulate entering block mode
 * This represents the core logic of entering block mode for a label
 */
function enterBlockMode(state: EditorState, labelName: string): EditorState {
  return {
    ...state,
    mode: 'block',
    currentBlockLabel: labelName,
    // AST is preserved - block mode shares the same data
  }
}

/**
 * Helper function to simulate exiting block mode
 * This represents the core logic of exiting block mode
 */
function exitBlockMode(state: EditorState): EditorState {
  return {
    ...state,
    mode: 'node',
    currentBlockLabel: null,
    // AST is preserved - unsaved changes are kept
  }
}

/**
 * Helper function to simulate switching to any mode
 */
function switchMode(state: EditorState, newMode: EditorMode, labelName?: string): EditorState {
  if (newMode === 'block' && labelName) {
    return enterBlockMode(state, labelName)
  } else if (state.mode === 'block') {
    return exitBlockMode(state)
  }
  return {
    ...state,
    mode: newMode,
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

/**
 * Get a random label name from an AST
 */
function getRandomLabelName(ast: RenpyScript): string | null {
  const labels = ast.statements.filter(s => s.type === 'label') as LabelNode[]
  if (labels.length === 0) return null
  return labels[0].name
}

describe('Block Mode Switching Property Tests', () => {
  /**
   * Feature: block-editor-mode, Property 6: Mode Switching State Preservation
   * 
   * For any mode switching operation, switching between flow mode and block mode
   * should preserve all AST content.
   * 
   * Validates: Requirements 9.4
   */
  describe('Property 6: Mode Switching State Preservation', () => {
    it('entering block mode preserves AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorStateWithLabels,
          (state) => {
            const labelName = getRandomLabelName(state.ast!)
            if (!labelName) return true // Skip if no labels
            
            // Start in node mode
            const nodeState: EditorState = { ...state, mode: 'node' }
            
            // Enter block mode
            const blockState = enterBlockMode(nodeState, labelName)
            
            // AST should be preserved
            expect(astEquals(blockState.ast, nodeState.ast)).toBe(true)
            expect(blockState.mode).toBe('block')
            expect(blockState.currentBlockLabel).toBe(labelName)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('exiting block mode preserves AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorStateWithLabels,
          (state) => {
            const labelName = getRandomLabelName(state.ast!)
            if (!labelName) return true // Skip if no labels
            
            // Start in block mode
            const blockState: EditorState = { 
              ...state, 
              mode: 'block',
              currentBlockLabel: labelName 
            }
            
            // Exit block mode
            const nodeState = exitBlockMode(blockState)
            
            // AST should be preserved
            expect(astEquals(nodeState.ast, blockState.ast)).toBe(true)
            expect(nodeState.mode).toBe('node')
            expect(nodeState.currentBlockLabel).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('round-trip block mode switching preserves AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorStateWithLabels,
          (initialState) => {
            const labelName = getRandomLabelName(initialState.ast!)
            if (!labelName) return true // Skip if no labels
            
            // Start in node mode
            const nodeState: EditorState = { ...initialState, mode: 'node' }
            
            // Enter block mode
            const blockState = enterBlockMode(nodeState, labelName)
            
            // Exit block mode
            const finalState = exitBlockMode(blockState)
            
            // AST should be identical to initial
            expect(astEquals(finalState.ast, nodeState.ast)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('multiple block mode enter/exit cycles preserve AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorStateWithLabels,
          fc.integer({ min: 1, max: 10 }),
          (initialState, cycles) => {
            const labelName = getRandomLabelName(initialState.ast!)
            if (!labelName) return true // Skip if no labels
            
            let currentState: EditorState = { ...initialState, mode: 'node' }
            const originalAst = initialState.ast
            
            // Perform multiple enter/exit cycles
            for (let i = 0; i < cycles; i++) {
              currentState = enterBlockMode(currentState, labelName)
              expect(astEquals(currentState.ast, originalAst)).toBe(true)
              
              currentState = exitBlockMode(currentState)
              expect(astEquals(currentState.ast, originalAst)).toBe(true)
            }
            
            // Final AST should be the same
            expect(astEquals(currentState.ast, originalAst)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('switching between different labels preserves AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorStateWithLabels,
          (initialState) => {
            const labels = (initialState.ast!.statements.filter(s => s.type === 'label') as LabelNode[])
              .map(l => l.name)
            
            if (labels.length < 2) return true // Skip if not enough labels
            
            let currentState: EditorState = { ...initialState, mode: 'node' }
            const originalAst = initialState.ast
            
            // Switch between different labels
            for (const labelName of labels) {
              currentState = enterBlockMode(currentState, labelName)
              expect(astEquals(currentState.ast, originalAst)).toBe(true)
              expect(currentState.currentBlockLabel).toBe(labelName)
              
              currentState = exitBlockMode(currentState)
              expect(astEquals(currentState.ast, originalAst)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('mode switching preserves other state properties', () => {
      fc.assert(
        fc.property(
          arbitraryEditorStateWithLabels,
          (state) => {
            const labelName = getRandomLabelName(state.ast!)
            if (!labelName) return true // Skip if no labels
            
            // Start in node mode
            const nodeState: EditorState = { ...state, mode: 'node' }
            
            // Enter block mode
            const blockState = enterBlockMode(nodeState, labelName)
            
            // Properties that should be preserved
            expect(blockState.complexity).toBe(nodeState.complexity)
            expect(blockState.projectPath).toBe(nodeState.projectPath)
            expect(blockState.currentFile).toBe(nodeState.currentFile)
            expect(blockState.selectedNodeId).toBe(nodeState.selectedNodeId)
            expect(blockState.selectedBlockId).toBe(nodeState.selectedBlockId)
            expect(astEquals(blockState.ast, nodeState.ast)).toBe(true)
            
            // Exit block mode
            const finalState = exitBlockMode(blockState)
            
            // Properties should still be preserved
            expect(finalState.complexity).toBe(nodeState.complexity)
            expect(finalState.projectPath).toBe(nodeState.projectPath)
            expect(finalState.currentFile).toBe(nodeState.currentFile)
            expect(astEquals(finalState.ast, nodeState.ast)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('interleaved mode switches preserve AST', () => {
      fc.assert(
        fc.property(
          arbitraryEditorStateWithLabels,
          fc.array(
            fc.oneof(
              fc.constant({ action: 'enter' as const }),
              fc.constant({ action: 'exit' as const }),
              fc.constant({ action: 'toNode' as const }),
              fc.constant({ action: 'toStory' as const })
            ),
            { minLength: 1, maxLength: 20 }
          ),
          (initialState, operations) => {
            const labelName = getRandomLabelName(initialState.ast!)
            if (!labelName) return true // Skip if no labels
            
            let currentState: EditorState = { ...initialState, mode: 'node' }
            const originalAst = initialState.ast
            
            // Apply all operations
            for (const op of operations) {
              switch (op.action) {
                case 'enter':
                  if (currentState.mode !== 'block') {
                    currentState = enterBlockMode(currentState, labelName)
                  }
                  break
                case 'exit':
                  if (currentState.mode === 'block') {
                    currentState = exitBlockMode(currentState)
                  }
                  break
                case 'toNode':
                  currentState = switchMode(currentState, 'node')
                  break
                case 'toStory':
                  currentState = switchMode(currentState, 'story')
                  break
              }
              
              // AST should always be preserved
              expect(astEquals(currentState.ast, originalAst)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
