import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { PreviewEngine, sceneAtNode, charactersAtNode } from './PreviewEngine'
import {
  RenpyScript,
  ASTNode,
  DialogueNode,
  LabelNode,
  SceneNode,
  ShowNode,
  HideNode,
  NVLNode,
  PlayNode,
  StopNode,
} from '../types/ast'

/**
 * Property tests for Preview Engine
 * 
 * Feature: renpy-visual-editor, Property 16: Preview State Synchronization
 * 
 * For any selected node, the preview state should reflect the scene state at that point.
 * 
 * ∀ node ∈ ASTNode:
 *   let previewState = computePreviewState(node)
 *   previewState.scene = sceneAtNode(node)
 *   previewState.characters = charactersAtNode(node)
 * 
 * Validates: Requirements 4.2
 */

// Arbitrary generators for AST nodes

// Generate a valid identifier
const arbitraryIdentifier = fc.stringMatching(/^[a-z_][a-z0-9_]{0,19}$/)

// Generate a valid image name (no spaces, alphanumeric with underscores)
const arbitraryImageName = fc.stringMatching(/^[a-z][a-z0-9_]{0,14}$/)

// Generate a dialogue node
const arbitraryDialogueNode: fc.Arbitrary<DialogueNode> = fc.record({
  id: fc.uuid(),
  type: fc.constant('dialogue' as const),
  speaker: fc.option(arbitraryIdentifier, { nil: null }),
  text: fc.string({ minLength: 1, maxLength: 100 }),
  attributes: fc.array(arbitraryIdentifier, { maxLength: 3 }),
  line: fc.option(fc.integer({ min: 1, max: 10000 })),
})

// Generate a scene node
const arbitrarySceneNode: fc.Arbitrary<SceneNode> = fc.record({
  id: fc.uuid(),
  type: fc.constant('scene' as const),
  image: arbitraryImageName,
  layer: fc.option(arbitraryIdentifier),
  line: fc.option(fc.integer({ min: 1, max: 10000 })),
})

// Generate a show node
const arbitraryShowNode: fc.Arbitrary<ShowNode> = fc.record({
  id: fc.uuid(),
  type: fc.constant('show' as const),
  image: arbitraryImageName,
  attributes: fc.array(arbitraryIdentifier, { maxLength: 3 }),
  atPosition: fc.option(fc.constantFrom('left', 'center', 'right', 'at left', 'at right')),
  line: fc.option(fc.integer({ min: 1, max: 10000 })),
})

// Generate a hide node
const arbitraryHideNode: fc.Arbitrary<HideNode> = fc.record({
  id: fc.uuid(),
  type: fc.constant('hide' as const),
  image: arbitraryImageName,
  line: fc.option(fc.integer({ min: 1, max: 10000 })),
})

// Generate an NVL node
const arbitraryNVLNode: fc.Arbitrary<NVLNode> = fc.record({
  id: fc.uuid(),
  type: fc.constant('nvl' as const),
  action: fc.constantFrom('show', 'hide', 'clear'),
  line: fc.option(fc.integer({ min: 1, max: 10000 })),
})

// Generate a play node
const arbitraryPlayNode: fc.Arbitrary<PlayNode> = fc.record({
  id: fc.uuid(),
  type: fc.constant('play' as const),
  channel: fc.constantFrom('music', 'sound', 'voice'),
  file: fc.string({ minLength: 1, maxLength: 50 }),
  fadeIn: fc.option(fc.float({ min: 0, max: 10 })),
  loop: fc.option(fc.boolean()),
  volume: fc.option(fc.float({ min: 0, max: 1 })),
  line: fc.option(fc.integer({ min: 1, max: 10000 })),
})

// Generate a stop node
const arbitraryStopNode: fc.Arbitrary<StopNode> = fc.record({
  id: fc.uuid(),
  type: fc.constant('stop' as const),
  channel: fc.constantFrom('music', 'sound', 'voice'),
  fadeOut: fc.option(fc.float({ min: 0, max: 10 })),
  line: fc.option(fc.integer({ min: 1, max: 10000 })),
})

// Generate a simple AST node (previewable types)
const arbitraryPreviewableNode: fc.Arbitrary<ASTNode> = fc.oneof(
  arbitraryDialogueNode,
  arbitrarySceneNode,
  arbitraryShowNode,
  arbitraryHideNode,
  arbitraryNVLNode,
  arbitraryPlayNode,
  arbitraryStopNode
)

// Generate a label node with body
const arbitraryLabelNode: fc.Arbitrary<LabelNode> = fc.record({
  id: fc.uuid(),
  type: fc.constant('label' as const),
  name: arbitraryIdentifier,
  parameters: fc.option(fc.array(arbitraryIdentifier, { maxLength: 3 })),
  body: fc.array(arbitraryPreviewableNode, { minLength: 0, maxLength: 10 }),
  line: fc.option(fc.integer({ min: 1, max: 10000 })),
})

// Generate a RenpyScript AST
const arbitraryRenpyScript: fc.Arbitrary<RenpyScript> = fc.record({
  type: fc.constant('script' as const),
  statements: fc.array(
    fc.oneof(arbitraryLabelNode, arbitraryPreviewableNode),
    { minLength: 1, maxLength: 15 }
  ),
  metadata: fc.record({
    filePath: fc.string({ minLength: 1, maxLength: 50 }),
    parseTime: fc.date(),
    version: fc.constant('1.0'),
  }),
})

// Generate a script with at least one scene node
const arbitraryScriptWithScene: fc.Arbitrary<RenpyScript> = fc.record({
  type: fc.constant('script' as const),
  statements: fc.tuple(
    arbitrarySceneNode,
    fc.array(arbitraryPreviewableNode, { minLength: 0, maxLength: 10 })
  ).map(([scene, rest]) => [scene, ...rest]),
  metadata: fc.record({
    filePath: fc.string({ minLength: 1, maxLength: 50 }),
    parseTime: fc.date(),
    version: fc.constant('1.0'),
  }),
})

// Generate a script with show/hide sequence
const arbitraryScriptWithCharacters: fc.Arbitrary<RenpyScript> = fc.record({
  type: fc.constant('script' as const),
  statements: fc.tuple(
    arbitrarySceneNode,
    fc.array(fc.oneof(arbitraryShowNode, arbitraryDialogueNode), { minLength: 1, maxLength: 8 })
  ).map(([scene, rest]) => [scene, ...rest]),
  metadata: fc.record({
    filePath: fc.string({ minLength: 1, maxLength: 50 }),
    parseTime: fc.date(),
    version: fc.constant('1.0'),
  }),
})

describe('Preview Engine Property Tests', () => {
  /**
   * Feature: renpy-visual-editor, Property 16: Preview State Synchronization
   * 
   * For any selected node, the preview state should reflect the scene state at that point.
   * 
   * Validates: Requirements 4.2
   */
  describe('Property 16: Preview State Synchronization', () => {
    it('scene state at any node reflects cumulative scene changes', () => {
      fc.assert(
        fc.property(
          arbitraryScriptWithScene,
          (ast) => {
            const engine = new PreviewEngine()
            engine.buildSteps(ast)
            const steps = engine.getSteps()
            
            if (steps.length === 0) return true
            
            // Track expected scene through steps
            let expectedScene: string | null = null
            
            for (const step of steps) {
              if (step.sceneChange !== undefined) {
                expectedScene = step.sceneChange
              }
              
              // Compute state at this step
              const state = engine.computeStateAtStep(step.index)
              
              // Scene should match expected
              expect(state.scene).toBe(expectedScene)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('characters at any node reflect cumulative show/hide changes', () => {
      fc.assert(
        fc.property(
          arbitraryScriptWithCharacters,
          (ast) => {
            const engine = new PreviewEngine()
            engine.buildSteps(ast)
            const steps = engine.getSteps()
            
            if (steps.length === 0) return true
            
            // Track expected characters through steps
            const expectedCharacters = new Set<string>()
            
            for (const step of steps) {
              // Scene change clears characters
              if (step.sceneChange !== undefined) {
                expectedCharacters.clear()
              }
              
              // Apply character changes
              if (step.characterChanges) {
                for (const change of step.characterChanges) {
                  if (change.action === 'show') {
                    expectedCharacters.add(change.name)
                  } else if (change.action === 'hide') {
                    expectedCharacters.delete(change.name)
                  }
                }
              }
              
              // Compute state at this step
              const state = engine.computeStateAtStep(step.index)
              const actualCharacters = new Set(state.characters.keys())
              
              // Characters should match expected
              expect(actualCharacters).toEqual(expectedCharacters)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('sceneAtNode helper returns correct scene for any node', () => {
      fc.assert(
        fc.property(
          arbitraryScriptWithScene,
          (ast) => {
            const engine = new PreviewEngine()
            engine.buildSteps(ast)
            const steps = engine.getSteps()
            
            if (steps.length === 0) return true
            
            // For each step, verify sceneAtNode matches computed state
            for (const step of steps) {
              const stateScene = engine.computeStateAtStep(step.index).scene
              const helperScene = sceneAtNode(ast, step.nodeId)
              
              expect(helperScene).toBe(stateScene)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('charactersAtNode helper returns correct characters for any node', () => {
      fc.assert(
        fc.property(
          arbitraryScriptWithCharacters,
          (ast) => {
            const engine = new PreviewEngine()
            engine.buildSteps(ast)
            const steps = engine.getSteps()
            
            if (steps.length === 0) return true
            
            // For each step, verify charactersAtNode matches computed state
            for (const step of steps) {
              const stateCharacters = Array.from(
                engine.computeStateAtStep(step.index).characters.values()
              )
              const helperCharacters = charactersAtNode(ast, step.nodeId)
              
              // Compare character names
              const stateNames = stateCharacters.map(c => c.name).sort()
              const helperNames = helperCharacters.map(c => c.name).sort()
              
              expect(helperNames).toEqual(stateNames)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('preview state is deterministic for same AST', () => {
      fc.assert(
        fc.property(
          arbitraryRenpyScript,
          fc.integer({ min: 0, max: 20 }),
          (ast, stepIndex) => {
            const engine1 = new PreviewEngine()
            const engine2 = new PreviewEngine()
            
            engine1.buildSteps(ast)
            engine2.buildSteps(ast)
            
            const steps1 = engine1.getSteps()
            const steps2 = engine2.getSteps()
            
            // Same number of steps
            expect(steps1.length).toBe(steps2.length)
            
            if (steps1.length === 0) return true
            
            // Compute state at same index
            const safeIndex = stepIndex % steps1.length
            const state1 = engine1.computeStateAtStep(safeIndex)
            const state2 = engine2.computeStateAtStep(safeIndex)
            
            // States should be identical
            expect(state1.scene).toBe(state2.scene)
            expect(state1.nvlMode).toBe(state2.nvlMode)
            expect(state1.currentMusic).toBe(state2.currentMusic)
            expect(Array.from(state1.characters.keys()).sort())
              .toEqual(Array.from(state2.characters.keys()).sort())
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('stepping forward then backward returns to same state', () => {
      fc.assert(
        fc.property(
          arbitraryRenpyScript,
          fc.integer({ min: 1, max: 10 }),
          (ast, stepsToTake) => {
            const engine = new PreviewEngine()
            engine.buildSteps(ast)
            const totalSteps = engine.getStepCount()
            
            if (totalSteps < 2) return true
            
            // Start at step 0
            const initialState = engine.computeStateAtStep(0)
            
            // Step forward
            const safeSteps = Math.min(stepsToTake, totalSteps - 1)
            engine.computeStateAtStep(safeSteps)
            
            // Step back to 0
            const backState = engine.computeStateAtStep(0)
            
            // Should be same as initial
            expect(backState.scene).toBe(initialState.scene)
            expect(backState.nvlMode).toBe(initialState.nvlMode)
            expect(Array.from(backState.characters.keys()).sort())
              .toEqual(Array.from(initialState.characters.keys()).sort())
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Preview Engine Edge Cases', () => {
    it('handles empty AST gracefully', () => {
      const engine = new PreviewEngine()
      const emptyAst: RenpyScript = {
        type: 'script',
        statements: [],
        metadata: {
          filePath: 'test.rpy',
          parseTime: new Date(),
          version: '1.0',
        },
      }
      
      const steps = engine.buildSteps(emptyAst)
      expect(steps.length).toBe(0)
      
      const state = engine.computeStateAtStep(0)
      expect(state.scene).toBeNull()
      expect(state.characters.size).toBe(0)
    })

    it('handles null AST gracefully', () => {
      const engine = new PreviewEngine()
      const steps = engine.buildSteps(null)
      expect(steps.length).toBe(0)
    })

    it('returns default state for non-existent node ID', () => {
      const engine = new PreviewEngine()
      const ast: RenpyScript = {
        type: 'script',
        statements: [{
          id: 'test-id',
          type: 'scene',
          image: 'bg_room',
        }],
        metadata: {
          filePath: 'test.rpy',
          parseTime: new Date(),
          version: '1.0',
        },
      }
      
      engine.buildSteps(ast)
      const state = engine.computeStateForNode('non-existent-id')
      
      // Should return default state
      expect(state.currentIndex).toBe(0)
      expect(state.scene).toBeNull()
    })

    it('NVL mode state is correctly tracked', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryNVLNode, { minLength: 1, maxLength: 10 }),
          (nvlNodes) => {
            const ast: RenpyScript = {
              type: 'script',
              statements: nvlNodes,
              metadata: {
                filePath: 'test.rpy',
                parseTime: new Date(),
                version: '1.0',
              },
            }
            
            const engine = new PreviewEngine()
            engine.buildSteps(ast)
            
            // Track expected NVL mode
            let expectedNvlMode = false
            
            for (let i = 0; i < nvlNodes.length; i++) {
              const node = nvlNodes[i] as NVLNode
              
              if (node.action === 'show') {
                expectedNvlMode = true
              } else if (node.action === 'hide') {
                expectedNvlMode = false
              }
              // 'clear' doesn't change nvlMode
              
              const state = engine.computeStateAtStep(i)
              expect(state.nvlMode).toBe(expectedNvlMode)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('audio state is correctly tracked', () => {
      fc.assert(
        fc.property(
          fc.array(fc.oneof(arbitraryPlayNode, arbitraryStopNode), { minLength: 1, maxLength: 10 }),
          (audioNodes) => {
            const ast: RenpyScript = {
              type: 'script',
              statements: audioNodes,
              metadata: {
                filePath: 'test.rpy',
                parseTime: new Date(),
                version: '1.0',
              },
            }
            
            const engine = new PreviewEngine()
            engine.buildSteps(ast)
            
            // Track expected audio state
            let expectedMusic: string | null = null
            let expectedSound: string | null = null
            
            for (let i = 0; i < audioNodes.length; i++) {
              const node = audioNodes[i]
              
              if (node.type === 'play') {
                const playNode = node as PlayNode
                if (playNode.channel === 'music') {
                  expectedMusic = playNode.file
                } else if (playNode.channel === 'sound') {
                  expectedSound = playNode.file
                }
              } else if (node.type === 'stop') {
                const stopNode = node as StopNode
                if (stopNode.channel === 'music') {
                  expectedMusic = null
                } else if (stopNode.channel === 'sound') {
                  expectedSound = null
                }
              }
              
              const state = engine.computeStateAtStep(i)
              expect(state.currentMusic).toBe(expectedMusic)
              expect(state.currentSound).toBe(expectedSound)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
