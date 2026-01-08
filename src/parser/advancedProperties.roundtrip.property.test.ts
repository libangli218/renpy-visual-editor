/**
 * Property-Based Tests for Advanced Properties Round-Trip
 * 
 * Feature: block-advanced-properties, Property 1: Round-trip parsing consistency
 * 
 * For any valid Ren'Py statement with advanced properties (show, scene, hide, play),
 * parsing the statement and then generating code from the AST, then parsing again,
 * SHALL produce an equivalent AST.
 * 
 * ∀ ast ∈ ValidAST: parse(generate(ast)) ≡ ast
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parse } from './renpyParser'
import { generate } from '../generator/codeGenerator'
import {
  createShowNode,
  createSceneNode,
  createHideNode,
  createPlayNode,
  createLabelNode,
  createRenpyScript,
  resetNodeIdCounter,
} from './nodeFactory'
import {
  ShowNode,
  SceneNode,
  HideNode,
  PlayNode,
  LabelNode,
} from '../types/ast'

// ============================================================================
// Arbitrary Generators for Advanced Properties
// ============================================================================

// Generate valid Ren'Py identifiers (image names, tag names, layer names, etc.)
const arbIdentifier = fc.stringMatching(/^[a-z_][a-z0-9_]{0,10}$/)

// Generate valid transition names
const arbTransition = fc.constantFrom('dissolve', 'fade', 'None', 'pixellate', 'move', 'ease')

// Generate valid layer names
const arbLayer = fc.constantFrom('master', 'transient', 'screens', 'overlay')

// Generate valid position names
const arbPosition = fc.constantFrom('left', 'right', 'center', 'truecenter')

// Generate valid zorder values
const arbZorder = fc.integer({ min: -100, max: 100 })

// Generate valid fade times (positive numbers)
const arbFadeTime = fc.integer({ min: 1, max: 10 }).map(n => n * 0.5)

// Generate valid volume values (0.0 to 1.0)
const arbVolume = fc.integer({ min: 0, max: 10 }).map(n => n * 0.1)

// Reset counter before each test
function resetCounter() {
  resetNodeIdCounter()
}

// ============================================================================
// Show Node with Advanced Properties Generator
// ============================================================================

/**
 * Feature: block-advanced-properties, Property 1: Round-trip parsing consistency
 * Validates: Requirements 1.3, 15.6
 * 
 * Generator for ShowNode with all advanced properties
 */
const arbShowNodeAdvanced: fc.Arbitrary<ShowNode> = fc.record({
  image: arbIdentifier,
  attributes: fc.option(fc.array(arbIdentifier, { minLength: 1, maxLength: 2 })),
  atPosition: fc.option(arbPosition),
  asTag: fc.option(arbIdentifier),
  behindTag: fc.option(arbIdentifier),
  onLayer: fc.option(arbLayer),
  zorder: fc.option(arbZorder),
  withTransition: fc.option(arbTransition),
}).map(props => {
  resetCounter()
  return createShowNode(props.image, {
    attributes: props.attributes ?? undefined,
    atPosition: props.atPosition ?? undefined,
    asTag: props.asTag ?? undefined,
    behindTag: props.behindTag ?? undefined,
    onLayer: props.onLayer ?? undefined,
    zorder: props.zorder ?? undefined,
    withTransition: props.withTransition ?? undefined,
  })
})


// ============================================================================
// Scene Node with Advanced Properties Generator
// ============================================================================

/**
 * Feature: block-advanced-properties, Property 1: Round-trip parsing consistency
 * Validates: Requirements 2.3, 15.6
 * 
 * Generator for SceneNode with all advanced properties
 */
const arbSceneNodeAdvanced: fc.Arbitrary<SceneNode> = fc.record({
  image: arbIdentifier,
  onLayer: fc.option(arbLayer),
  withTransition: fc.option(arbTransition),
}).map(props => {
  resetCounter()
  return createSceneNode(props.image, {
    onLayer: props.onLayer ?? undefined,
    withTransition: props.withTransition ?? undefined,
  })
})

// ============================================================================
// Hide Node with Advanced Properties Generator
// ============================================================================

/**
 * Feature: block-advanced-properties, Property 1: Round-trip parsing consistency
 * Validates: Requirements 3.3, 15.6
 * 
 * Generator for HideNode with all advanced properties
 */
const arbHideNodeAdvanced: fc.Arbitrary<HideNode> = fc.record({
  image: arbIdentifier,
  onLayer: fc.option(arbLayer),
  withTransition: fc.option(arbTransition),
}).map(props => {
  resetCounter()
  return createHideNode(props.image, {
    onLayer: props.onLayer ?? undefined,
    withTransition: props.withTransition ?? undefined,
  })
})

// ============================================================================
// Play Node with Advanced Properties Generator
// ============================================================================

/**
 * Feature: block-advanced-properties, Property 1: Round-trip parsing consistency
 * Validates: Requirements 4.3, 5.3, 15.6
 * 
 * Generator for PlayNode (music) with all advanced properties
 */
const arbPlayMusicNodeAdvanced: fc.Arbitrary<PlayNode> = fc.record({
  file: arbIdentifier.map(s => `audio/${s}.ogg`),
  fadeIn: fc.option(arbFadeTime),
  fadeOut: fc.option(arbFadeTime),
  loop: fc.option(fc.boolean()),
  volume: fc.option(arbVolume),
  ifChanged: fc.option(fc.boolean()),
}).map(props => {
  resetCounter()
  return createPlayNode('music', props.file, {
    fadeIn: props.fadeIn ?? undefined,
    fadeOut: props.fadeOut ?? undefined,
    loop: props.loop ?? undefined,
    volume: props.volume ?? undefined,
    ifChanged: props.ifChanged ?? undefined,
  })
})

/**
 * Generator for PlayNode (sound) with all advanced properties
 */
const arbPlaySoundNodeAdvanced: fc.Arbitrary<PlayNode> = fc.record({
  file: arbIdentifier.map(s => `audio/${s}.ogg`),
  fadeIn: fc.option(arbFadeTime),
  loop: fc.option(fc.boolean()),
  volume: fc.option(arbVolume),
}).map(props => {
  resetCounter()
  return createPlayNode('sound', props.file, {
    fadeIn: props.fadeIn ?? undefined,
    loop: props.loop ?? undefined,
    volume: props.volume ?? undefined,
  })
})

// ============================================================================
// Semantic Equality Functions for Advanced Properties
// ============================================================================

/**
 * Compare two ShowNodes for semantic equality including advanced properties
 */
function semanticallyEqualShow(a: ShowNode, b: ShowNode): boolean {
  if (a.image !== b.image) return false
  if (!arraysEqual(a.attributes, b.attributes)) return false
  if (!optionalEqual(a.atPosition, b.atPosition)) return false
  if (!optionalEqual(a.asTag, b.asTag)) return false
  if (!optionalEqual(a.behindTag, b.behindTag)) return false
  if (!optionalEqual(a.onLayer, b.onLayer)) return false
  if (!numbersEqual(a.zorder, b.zorder)) return false
  if (!optionalEqual(a.withTransition, b.withTransition)) return false
  return true
}

/**
 * Compare two SceneNodes for semantic equality including advanced properties
 */
function semanticallyEqualScene(a: SceneNode, b: SceneNode): boolean {
  if (a.image !== b.image) return false
  if (!optionalEqual(a.onLayer, b.onLayer)) return false
  if (!optionalEqual(a.withTransition, b.withTransition)) return false
  return true
}

/**
 * Compare two HideNodes for semantic equality including advanced properties
 */
function semanticallyEqualHide(a: HideNode, b: HideNode): boolean {
  if (a.image !== b.image) return false
  if (!optionalEqual(a.onLayer, b.onLayer)) return false
  if (!optionalEqual(a.withTransition, b.withTransition)) return false
  return true
}

/**
 * Compare two PlayNodes for semantic equality including advanced properties
 * Note: For ifChanged, we treat false and undefined as equivalent since
 * the generator only outputs if_changed when it's true
 */
function semanticallyEqualPlay(a: PlayNode, b: PlayNode): boolean {
  if (a.channel !== b.channel) return false
  if (a.file !== b.file) return false
  if (!numbersEqual(a.fadeIn, b.fadeIn)) return false
  if (!numbersEqual(a.fadeOut, b.fadeOut)) return false
  if (!booleansEqual(a.loop, b.loop)) return false
  if (!numbersEqual(a.volume, b.volume)) return false
  // For ifChanged, treat false and undefined as equivalent
  // since the generator only outputs if_changed when it's true
  if (!booleansEqualTrueOnly(a.ifChanged, b.ifChanged)) return false
  return true
}

// Helper to compare optional values (treats null and undefined as equivalent)
function optionalEqual<T>(a: T | null | undefined, b: T | null | undefined): boolean {
  const aEmpty = a === null || a === undefined
  const bEmpty = b === null || b === undefined
  if (aEmpty && bEmpty) return true
  if (aEmpty || bEmpty) return false
  return a === b
}

// Helper to compare optional arrays (treats null, undefined, and [] as equivalent)
function arraysEqual(a?: string[] | null, b?: string[] | null): boolean {
  const aEmpty = a === null || a === undefined || a.length === 0
  const bEmpty = b === null || b === undefined || b.length === 0
  if (aEmpty && bEmpty) return true
  if (aEmpty || bEmpty) return false
  if (a!.length !== b!.length) return false
  return a!.every((val, i) => val === b![i])
}

// Helper to compare optional numbers with tolerance
function numbersEqual(a?: number | null, b?: number | null): boolean {
  const aEmpty = a === null || a === undefined
  const bEmpty = b === null || b === undefined
  if (aEmpty && bEmpty) return true
  if (aEmpty || bEmpty) return false
  return Math.abs(a! - b!) < 0.01
}

// Helper to compare optional booleans
function booleansEqual(a?: boolean | null, b?: boolean | null): boolean {
  const aEmpty = a === null || a === undefined
  const bEmpty = b === null || b === undefined
  if (aEmpty && bEmpty) return true
  if (aEmpty || bEmpty) return false
  return a === b
}

// Helper to compare optional booleans where only true is significant
// (false and undefined are treated as equivalent)
function booleansEqualTrueOnly(a?: boolean | null, b?: boolean | null): boolean {
  const aTrue = a === true
  const bTrue = b === true
  return aTrue === bTrue
}


// ============================================================================
// Property Tests
// ============================================================================

describe('Property 1: Show Statement Round-Trip with Advanced Properties', () => {
  /**
   * Feature: block-advanced-properties, Property 1: Round-trip parsing consistency
   * Validates: Requirements 1.3, 15.6
   * 
   * For any valid ShowNode with advanced properties, generating code and then
   * parsing it back should produce a semantically equivalent AST.
   */
  it('should preserve ShowNode with advanced properties through round-trip', () => {
    fc.assert(
      fc.property(arbShowNodeAdvanced, (showNode) => {
        // Wrap in a label for valid script structure
        const ast = createRenpyScript([
          createLabelNode('test', [showNode])
        ])
        
        // Generate code from AST
        const generatedCode = generate(ast)
        
        // Parse the generated code back
        const parseResult = parse(generatedCode)
        
        // Should have no parse errors
        expect(parseResult.errors).toHaveLength(0)
        
        // Extract the show node from the reparsed AST
        const reparsedLabel = parseResult.ast.statements[0] as LabelNode
        expect(reparsedLabel.type).toBe('label')
        expect(reparsedLabel.body.length).toBeGreaterThan(0)
        
        const reparsedShow = reparsedLabel.body[0] as ShowNode
        expect(reparsedShow.type).toBe('show')
        
        // The reparsed ShowNode should be semantically equivalent
        const isEqual = semanticallyEqualShow(showNode, reparsedShow)
        
        if (!isEqual) {
          console.log('Original ShowNode:', JSON.stringify(showNode, null, 2))
          console.log('Generated code:\n', generatedCode)
          console.log('Reparsed ShowNode:', JSON.stringify(reparsedShow, null, 2))
        }
        
        expect(isEqual).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 1: Scene Statement Round-Trip with Advanced Properties', () => {
  /**
   * Feature: block-advanced-properties, Property 1: Round-trip parsing consistency
   * Validates: Requirements 2.3, 15.6
   * 
   * For any valid SceneNode with advanced properties, generating code and then
   * parsing it back should produce a semantically equivalent AST.
   */
  it('should preserve SceneNode with advanced properties through round-trip', () => {
    fc.assert(
      fc.property(arbSceneNodeAdvanced, (sceneNode) => {
        // Wrap in a label for valid script structure
        const ast = createRenpyScript([
          createLabelNode('test', [sceneNode])
        ])
        
        // Generate code from AST
        const generatedCode = generate(ast)
        
        // Parse the generated code back
        const parseResult = parse(generatedCode)
        
        // Should have no parse errors
        expect(parseResult.errors).toHaveLength(0)
        
        // Extract the scene node from the reparsed AST
        const reparsedLabel = parseResult.ast.statements[0] as LabelNode
        expect(reparsedLabel.type).toBe('label')
        expect(reparsedLabel.body.length).toBeGreaterThan(0)
        
        const reparsedScene = reparsedLabel.body[0] as SceneNode
        expect(reparsedScene.type).toBe('scene')
        
        // The reparsed SceneNode should be semantically equivalent
        const isEqual = semanticallyEqualScene(sceneNode, reparsedScene)
        
        if (!isEqual) {
          console.log('Original SceneNode:', JSON.stringify(sceneNode, null, 2))
          console.log('Generated code:\n', generatedCode)
          console.log('Reparsed SceneNode:', JSON.stringify(reparsedScene, null, 2))
        }
        
        expect(isEqual).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 1: Hide Statement Round-Trip with Advanced Properties', () => {
  /**
   * Feature: block-advanced-properties, Property 1: Round-trip parsing consistency
   * Validates: Requirements 3.3, 15.6
   * 
   * For any valid HideNode with advanced properties, generating code and then
   * parsing it back should produce a semantically equivalent AST.
   */
  it('should preserve HideNode with advanced properties through round-trip', () => {
    fc.assert(
      fc.property(arbHideNodeAdvanced, (hideNode) => {
        // Wrap in a label for valid script structure
        const ast = createRenpyScript([
          createLabelNode('test', [hideNode])
        ])
        
        // Generate code from AST
        const generatedCode = generate(ast)
        
        // Parse the generated code back
        const parseResult = parse(generatedCode)
        
        // Should have no parse errors
        expect(parseResult.errors).toHaveLength(0)
        
        // Extract the hide node from the reparsed AST
        const reparsedLabel = parseResult.ast.statements[0] as LabelNode
        expect(reparsedLabel.type).toBe('label')
        expect(reparsedLabel.body.length).toBeGreaterThan(0)
        
        const reparsedHide = reparsedLabel.body[0] as HideNode
        expect(reparsedHide.type).toBe('hide')
        
        // The reparsed HideNode should be semantically equivalent
        const isEqual = semanticallyEqualHide(hideNode, reparsedHide)
        
        if (!isEqual) {
          console.log('Original HideNode:', JSON.stringify(hideNode, null, 2))
          console.log('Generated code:\n', generatedCode)
          console.log('Reparsed HideNode:', JSON.stringify(reparsedHide, null, 2))
        }
        
        expect(isEqual).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 1: Play Statement Round-Trip with Advanced Properties', () => {
  /**
   * Feature: block-advanced-properties, Property 1: Round-trip parsing consistency
   * Validates: Requirements 4.3, 5.3, 15.6
   * 
   * For any valid PlayNode (music) with advanced properties, generating code and then
   * parsing it back should produce a semantically equivalent AST.
   */
  it('should preserve PlayNode (music) with advanced properties through round-trip', () => {
    fc.assert(
      fc.property(arbPlayMusicNodeAdvanced, (playNode) => {
        // Wrap in a label for valid script structure
        const ast = createRenpyScript([
          createLabelNode('test', [playNode])
        ])
        
        // Generate code from AST
        const generatedCode = generate(ast)
        
        // Parse the generated code back
        const parseResult = parse(generatedCode)
        
        // Should have no parse errors
        expect(parseResult.errors).toHaveLength(0)
        
        // Extract the play node from the reparsed AST
        const reparsedLabel = parseResult.ast.statements[0] as LabelNode
        expect(reparsedLabel.type).toBe('label')
        expect(reparsedLabel.body.length).toBeGreaterThan(0)
        
        const reparsedPlay = reparsedLabel.body[0] as PlayNode
        expect(reparsedPlay.type).toBe('play')
        
        // The reparsed PlayNode should be semantically equivalent
        const isEqual = semanticallyEqualPlay(playNode, reparsedPlay)
        
        if (!isEqual) {
          console.log('Original PlayNode:', JSON.stringify(playNode, null, 2))
          console.log('Generated code:\n', generatedCode)
          console.log('Reparsed PlayNode:', JSON.stringify(reparsedPlay, null, 2))
        }
        
        expect(isEqual).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: block-advanced-properties, Property 1: Round-trip parsing consistency
   * Validates: Requirements 5.3, 15.6
   * 
   * For any valid PlayNode (sound) with advanced properties, generating code and then
   * parsing it back should produce a semantically equivalent AST.
   */
  it('should preserve PlayNode (sound) with advanced properties through round-trip', () => {
    fc.assert(
      fc.property(arbPlaySoundNodeAdvanced, (playNode) => {
        // Wrap in a label for valid script structure
        const ast = createRenpyScript([
          createLabelNode('test', [playNode])
        ])
        
        // Generate code from AST
        const generatedCode = generate(ast)
        
        // Parse the generated code back
        const parseResult = parse(generatedCode)
        
        // Should have no parse errors
        expect(parseResult.errors).toHaveLength(0)
        
        // Extract the play node from the reparsed AST
        const reparsedLabel = parseResult.ast.statements[0] as LabelNode
        expect(reparsedLabel.type).toBe('label')
        expect(reparsedLabel.body.length).toBeGreaterThan(0)
        
        const reparsedPlay = reparsedLabel.body[0] as PlayNode
        expect(reparsedPlay.type).toBe('play')
        
        // The reparsed PlayNode should be semantically equivalent
        const isEqual = semanticallyEqualPlay(playNode, reparsedPlay)
        
        if (!isEqual) {
          console.log('Original PlayNode:', JSON.stringify(playNode, null, 2))
          console.log('Generated code:\n', generatedCode)
          console.log('Reparsed PlayNode:', JSON.stringify(reparsedPlay, null, 2))
        }
        
        expect(isEqual).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
