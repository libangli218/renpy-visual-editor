/**
 * Property-Based Tests for Round-Trip Parsing
 * 
 * Feature: renpy-visual-editor, Property 1: Round-Trip Parsing (核心属性)
 * Validates: Requirements 14.6
 * 
 * For any valid RenpyScript AST, generating code and then parsing it back
 * should produce a semantically equivalent AST.
 * 
 * ∀ ast ∈ ValidAST: parse(generate(ast)) ≡ ast
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parse } from './renpyParser'
import { generate } from '../generator/codeGenerator'
import { createRenpyScript } from './nodeFactory'
import {
  ASTNode,
  RenpyScript,
  LabelNode,
  DialogueNode,
  MenuNode,
  MenuChoice,
  SceneNode,
  ShowNode,
  HideNode,
  WithNode,
  JumpNode,
  CallNode,
  ReturnNode,
  IfNode,
  IfBranch,
  SetNode,
  PythonNode,
  DefineNode,
  DefaultNode,
  PlayNode,
  StopNode,
  PauseNode,
  NVLNode,
} from '../types/ast'


// ============================================================================
// Arbitrary Generators for AST Nodes
// ============================================================================

// Generate valid Ren'Py identifiers (variable names, label names, etc.)
const arbIdentifier = fc.stringMatching(/^[a-z_][a-z0-9_]{0,15}$/)

// Generate valid text content (no unescaped quotes or problematic characters)
const arbSimpleText = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-'),
  { minLength: 1, maxLength: 30 }
)

// Generate a unique node ID
let nodeIdCounter = 0
const generateId = () => `test_node_${++nodeIdCounter}`

// ============================================================================
// Simple Node Generators (no nested body)
// ============================================================================

// Arbitrary DialogueNode (narration - no speaker)
const arbNarrationNode: fc.Arbitrary<DialogueNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('dialogue' as const),
  speaker: fc.constant(null),
  text: arbSimpleText,
})

// Arbitrary DialogueNode (with speaker)
const arbDialogueWithSpeaker: fc.Arbitrary<DialogueNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('dialogue' as const),
  speaker: arbIdentifier,
  text: arbSimpleText,
  attributes: fc.option(fc.array(arbIdentifier, { minLength: 1, maxLength: 2 })),
})

const arbDialogueNode: fc.Arbitrary<DialogueNode> = fc.oneof(
  arbNarrationNode,
  arbDialogueWithSpeaker
)


// Arbitrary JumpNode
const arbJumpNode: fc.Arbitrary<JumpNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('jump' as const),
  target: arbIdentifier,
  expression: fc.constant(undefined), // expression jumps are complex, skip for now
})

// Arbitrary CallNode
const arbCallNode: fc.Arbitrary<CallNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('call' as const),
  target: arbIdentifier,
  arguments: fc.option(fc.array(arbIdentifier, { minLength: 1, maxLength: 2 })),
  expression: fc.constant(undefined),
})

// Arbitrary ReturnNode
const arbReturnNode: fc.Arbitrary<ReturnNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('return' as const),
  value: fc.option(arbIdentifier),
})

// Arbitrary SceneNode
const arbSceneNode: fc.Arbitrary<SceneNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('scene' as const),
  image: arbIdentifier,
})

// Arbitrary ShowNode
const arbShowNode: fc.Arbitrary<ShowNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('show' as const),
  image: arbIdentifier,
  attributes: fc.option(fc.array(arbIdentifier, { minLength: 1, maxLength: 2 })),
  atPosition: fc.option(fc.constantFrom('left', 'right', 'center')),
})

// Arbitrary HideNode
const arbHideNode: fc.Arbitrary<HideNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('hide' as const),
  image: arbIdentifier,
})


// Arbitrary WithNode
const arbWithNode: fc.Arbitrary<WithNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('with' as const),
  transition: fc.constantFrom('dissolve', 'fade', 'None', 'pixellate'),
})

// Arbitrary DefineNode
const arbDefineNode: fc.Arbitrary<DefineNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('define' as const),
  name: arbIdentifier,
  value: fc.oneof(
    fc.integer({ min: 0, max: 100 }).map(String),
    fc.constant('True'),
    fc.constant('False'),
  ),
  store: fc.constant(undefined), // Skip store for simplicity
})

// Arbitrary DefaultNode
const arbDefaultNode: fc.Arbitrary<DefaultNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('default' as const),
  name: arbIdentifier,
  value: fc.oneof(
    fc.integer({ min: 0, max: 100 }).map(String),
    fc.constant('True'),
    fc.constant('False'),
  ),
})

// Arbitrary PlayNode (music/sound only, voice has different syntax)
const arbPlayMusicNode: fc.Arbitrary<PlayNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('play' as const),
  channel: fc.constantFrom('music' as const, 'sound' as const),
  file: arbIdentifier.map(s => `audio/${s}.ogg`),
  fadeIn: fc.option(fc.integer({ min: 1, max: 5 }).map(n => n * 1.0)),
  loop: fc.option(fc.boolean()),
  volume: fc.constant(undefined), // Skip volume for simplicity
  queue: fc.constant(undefined),
})


// Arbitrary VoiceNode
const arbVoiceNode: fc.Arbitrary<PlayNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('play' as const),
  channel: fc.constant('voice' as const),
  file: arbIdentifier.map(s => `voice/${s}.ogg`),
})

// Arbitrary StopNode
const arbStopNode: fc.Arbitrary<StopNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('stop' as const),
  channel: fc.constantFrom('music' as const, 'sound' as const, 'voice' as const),
  fadeOut: fc.option(fc.integer({ min: 1, max: 5 }).map(n => n * 1.0)),
})

// Arbitrary PauseNode
const arbPauseNode: fc.Arbitrary<PauseNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('pause' as const),
  duration: fc.option(fc.integer({ min: 1, max: 10 }).map(n => n * 1.0)),
})

// Arbitrary NVLNode
const arbNVLNode: fc.Arbitrary<NVLNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('nvl' as const),
  action: fc.constantFrom('show' as const, 'hide' as const, 'clear' as const),
})

// Arbitrary SetNode ($ var = value)
const arbSetNode: fc.Arbitrary<SetNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('set' as const),
  variable: arbIdentifier,
  operator: fc.constant('=' as const),
  value: fc.oneof(
    fc.integer({ min: 0, max: 100 }).map(String),
    fc.constant('True'),
    fc.constant('False'),
  ),
})


// Simple statements that don't have nested bodies
const arbSimpleStatement: fc.Arbitrary<ASTNode> = fc.oneof(
  arbDialogueNode,
  arbJumpNode,
  arbCallNode,
  arbReturnNode,
  arbSceneNode,
  arbShowNode,
  arbHideNode,
  arbWithNode,
  arbDefineNode,
  arbDefaultNode,
  arbPlayMusicNode,
  arbVoiceNode,
  arbStopNode,
  arbPauseNode,
  arbNVLNode,
  arbSetNode,
)

// ============================================================================
// Compound Node Generators (with nested bodies)
// ============================================================================

// Arbitrary MenuChoice
const arbMenuChoice = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<MenuChoice> =>
  fc.record({
    text: arbSimpleText,
    condition: fc.constant(undefined), // Skip conditions for simplicity
    body: bodyGen,
  })

// Arbitrary MenuNode
const arbMenuNode = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<MenuNode> =>
  fc.record({
    id: fc.constant('').map(() => generateId()),
    type: fc.constant('menu' as const),
    prompt: fc.constant(undefined),
    choices: fc.array(arbMenuChoice(bodyGen), { minLength: 1, maxLength: 2 }),
  })

// Arbitrary IfBranch
const arbIfBranch = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<IfBranch> =>
  fc.record({
    condition: arbIdentifier, // Always has condition (not else)
    body: bodyGen,
  })


// Arbitrary IfNode (simple - just if, no elif/else for now)
const arbIfNode = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<IfNode> =>
  fc.record({
    id: fc.constant('').map(() => generateId()),
    type: fc.constant('if' as const),
    branches: arbIfBranch(bodyGen).map(branch => [branch]),
  })

// Arbitrary LabelNode
const arbLabelNode = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<LabelNode> =>
  fc.record({
    id: fc.constant('').map(() => generateId()),
    type: fc.constant('label' as const),
    name: arbIdentifier,
    parameters: fc.constant(undefined),
    body: bodyGen,
  })

// Build recursive AST generator with limited depth
// Note: We avoid generating labels inside menu/if bodies as this is unusual in Ren'Py
const arbASTNode = (depth: number = 0): fc.Arbitrary<ASTNode> => {
  if (depth >= 2) {
    return arbSimpleStatement
  }
  
  // For nested bodies (inside menus/ifs), only use simple statements
  const simpleBodyGen = fc.array(arbSimpleStatement, { minLength: 1, maxLength: 2 })
  
  // For top-level, allow labels
  if (depth === 0) {
    return fc.oneof(
      { weight: 6, arbitrary: arbSimpleStatement },
      { weight: 1, arbitrary: arbMenuNode(simpleBodyGen) },
      { weight: 1, arbitrary: arbIfNode(simpleBodyGen) },
      { weight: 2, arbitrary: arbLabelNode(simpleBodyGen) },
    )
  }
  
  // For depth 1, don't generate labels inside menu/if bodies
  return fc.oneof(
    { weight: 6, arbitrary: arbSimpleStatement },
    { weight: 1, arbitrary: arbMenuNode(simpleBodyGen) },
    { weight: 1, arbitrary: arbIfNode(simpleBodyGen) },
  )
}

// Generate a complete RenpyScript
const arbRenpyScript: fc.Arbitrary<RenpyScript> = fc.array(
  arbASTNode(0),
  { minLength: 1, maxLength: 3 }
).map(statements => createRenpyScript(statements))


// ============================================================================
// Semantic Equality Functions
// ============================================================================

/**
 * Compare two AST nodes for semantic equality.
 * Ignores metadata like id, line numbers, and raw fields.
 * Focuses on the semantic content that affects code generation.
 */
function semanticallyEqual(a: ASTNode, b: ASTNode): boolean {
  if (a.type !== b.type) return false
  
  switch (a.type) {
    case 'dialogue':
      return semanticallyEqualDialogue(a, b as DialogueNode)
    case 'jump':
      return semanticallyEqualJump(a, b as JumpNode)
    case 'call':
      return semanticallyEqualCall(a, b as CallNode)
    case 'return':
      return semanticallyEqualReturn(a, b as ReturnNode)
    case 'scene':
      return semanticallyEqualScene(a, b as SceneNode)
    case 'show':
      return semanticallyEqualShow(a, b as ShowNode)
    case 'hide':
      return semanticallyEqualHide(a, b as HideNode)
    case 'with':
      return semanticallyEqualWith(a, b as WithNode)
    case 'define':
      return semanticallyEqualDefine(a, b as DefineNode)
    case 'default':
      return semanticallyEqualDefault(a, b as DefaultNode)
    case 'play':
      return semanticallyEqualPlay(a, b as PlayNode)
    case 'stop':
      return semanticallyEqualStop(a, b as StopNode)
    case 'pause':
      return semanticallyEqualPause(a, b as PauseNode)
    case 'nvl':
      return semanticallyEqualNVL(a, b as NVLNode)
    case 'set':
      return semanticallyEqualSet(a, b as SetNode)
    case 'python':
      return semanticallyEqualPython(a, b as PythonNode)
    case 'menu':
      return semanticallyEqualMenu(a, b as MenuNode)
    case 'if':
      return semanticallyEqualIf(a, b as IfNode)
    case 'label':
      return semanticallyEqualLabel(a, b as LabelNode)
    case 'raw':
      return true // Raw nodes are preserved as-is
    default:
      return false
  }
}


function semanticallyEqualDialogue(a: DialogueNode, b: DialogueNode): boolean {
  if (a.speaker !== b.speaker) return false
  if (a.text !== b.text) return false
  return arraysEqual(a.attributes, b.attributes)
}

function semanticallyEqualJump(a: JumpNode, b: JumpNode): boolean {
  if (a.target !== b.target) return false
  // Treat undefined and false as equivalent for expression
  const aExpr = a.expression === true
  const bExpr = b.expression === true
  return aExpr === bExpr
}

function semanticallyEqualCall(a: CallNode, b: CallNode): boolean {
  if (a.target !== b.target) return false
  // Treat undefined and false as equivalent for expression
  const aExpr = a.expression === true
  const bExpr = b.expression === true
  if (aExpr !== bExpr) return false
  return arraysEqual(a.arguments, b.arguments)
}

function semanticallyEqualReturn(a: ReturnNode, b: ReturnNode): boolean {
  // Treat null and undefined as equivalent for optional value
  const aEmpty = a.value === null || a.value === undefined
  const bEmpty = b.value === null || b.value === undefined
  if (aEmpty && bEmpty) return true
  if (aEmpty || bEmpty) return false
  return a.value === b.value
}

function semanticallyEqualScene(a: SceneNode, b: SceneNode): boolean {
  return a.image === b.image
}

function semanticallyEqualShow(a: ShowNode, b: ShowNode): boolean {
  if (a.image !== b.image) return false
  // Treat null and undefined as equivalent for optional atPosition
  const aPos = a.atPosition === null ? undefined : a.atPosition
  const bPos = b.atPosition === null ? undefined : b.atPosition
  if (aPos !== bPos) return false
  return arraysEqual(a.attributes, b.attributes)
}

function semanticallyEqualHide(a: HideNode, b: HideNode): boolean {
  return a.image === b.image
}

function semanticallyEqualWith(a: WithNode, b: WithNode): boolean {
  return a.transition === b.transition
}

function semanticallyEqualDefine(a: DefineNode, b: DefineNode): boolean {
  return a.name === b.name && a.value === b.value && a.store === b.store
}

function semanticallyEqualDefault(a: DefaultNode, b: DefaultNode): boolean {
  return a.name === b.name && a.value === b.value
}


function semanticallyEqualPlay(a: PlayNode, b: PlayNode): boolean {
  if (a.channel !== b.channel) return false
  if (a.file !== b.file) return false
  // Compare fadeIn with tolerance for floating point
  if (!numbersEqual(a.fadeIn, b.fadeIn)) return false
  if (!booleansEqual(a.loop, b.loop)) return false
  if (!numbersEqual(a.volume, b.volume)) return false
  if (!booleansEqual(a.queue, b.queue)) return false
  return true
}

function semanticallyEqualStop(a: StopNode, b: StopNode): boolean {
  if (a.channel !== b.channel) return false
  return numbersEqual(a.fadeOut, b.fadeOut)
}

function semanticallyEqualPause(a: PauseNode, b: PauseNode): boolean {
  return numbersEqual(a.duration, b.duration)
}

function semanticallyEqualNVL(a: NVLNode, b: NVLNode): boolean {
  return a.action === b.action
}

function semanticallyEqualSet(a: SetNode, b: SetNode): boolean {
  return a.variable === b.variable && a.operator === b.operator && a.value === b.value
}

function semanticallyEqualPython(a: PythonNode, b: PythonNode): boolean {
  // Normalize whitespace for comparison
  const normalizeCode = (code: string) => code.trim().replace(/\s+/g, ' ')
  return normalizeCode(a.code) === normalizeCode(b.code)
}

function semanticallyEqualMenu(a: MenuNode, b: MenuNode): boolean {
  if (a.choices.length !== b.choices.length) return false
  for (let i = 0; i < a.choices.length; i++) {
    if (!semanticallyEqualMenuChoice(a.choices[i], b.choices[i])) return false
  }
  return true
}


function semanticallyEqualMenuChoice(a: MenuChoice, b: MenuChoice): boolean {
  if (a.text !== b.text) return false
  if (a.condition !== b.condition) return false
  return semanticallyEqualNodeArrays(a.body, b.body)
}

function semanticallyEqualIf(a: IfNode, b: IfNode): boolean {
  if (a.branches.length !== b.branches.length) return false
  for (let i = 0; i < a.branches.length; i++) {
    if (!semanticallyEqualIfBranch(a.branches[i], b.branches[i])) return false
  }
  return true
}

function semanticallyEqualIfBranch(a: IfBranch, b: IfBranch): boolean {
  if (a.condition !== b.condition) return false
  return semanticallyEqualNodeArrays(a.body, b.body)
}

function semanticallyEqualLabel(a: LabelNode, b: LabelNode): boolean {
  if (a.name !== b.name) return false
  if (!arraysEqual(a.parameters, b.parameters)) return false
  return semanticallyEqualNodeArrays(a.body, b.body)
}

function semanticallyEqualNodeArrays(a: ASTNode[], b: ASTNode[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!semanticallyEqual(a[i], b[i])) return false
  }
  return true
}

// Helper to check if value is "empty" (null, undefined, or empty array)
function isEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (Array.isArray(val) && val.length === 0) return true
  return false
}

// Helper to compare optional arrays (treats null, undefined, and [] as equivalent)
function arraysEqual(a?: string[] | null, b?: string[] | null): boolean {
  const aEmpty = isEmpty(a)
  const bEmpty = isEmpty(b)
  if (aEmpty && bEmpty) return true
  if (aEmpty || bEmpty) return false
  if (a!.length !== b!.length) return false
  return a!.every((val, i) => val === b![i])
}

// Helper to compare optional numbers with tolerance (treats null and undefined as equivalent)
function numbersEqual(a?: number | null, b?: number | null): boolean {
  const aEmpty = a === null || a === undefined
  const bEmpty = b === null || b === undefined
  if (aEmpty && bEmpty) return true
  if (aEmpty || bEmpty) return false
  return Math.abs(a! - b!) < 0.01
}

// Helper to compare optional booleans (treats null and undefined as equivalent)
function booleansEqual(a?: boolean | null, b?: boolean | null): boolean {
  const aEmpty = a === null || a === undefined
  const bEmpty = b === null || b === undefined
  if (aEmpty && bEmpty) return true
  if (aEmpty || bEmpty) return false
  return a === b
}


/**
 * Compare two RenpyScript ASTs for semantic equality
 */
function scriptsSemanticEqual(original: RenpyScript, reparsed: RenpyScript): boolean {
  return semanticallyEqualNodeArrays(original.statements, reparsed.statements)
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 1: Round-Trip Parsing', () => {
  /**
   * Feature: renpy-visual-editor, Property 1: Round-Trip Parsing (核心属性)
   * Validates: Requirements 14.6
   * 
   * For any valid RenpyScript AST, generating code and then parsing it back
   * should produce a semantically equivalent AST.
   */
  it('should preserve AST through generate -> parse round-trip', () => {
    fc.assert(
      fc.property(arbRenpyScript, (originalAst) => {
        // Generate code from AST
        const generatedCode = generate(originalAst)
        
        // Parse the generated code back
        const parseResult = parse(generatedCode)
        
        // Should have no parse errors
        expect(parseResult.errors).toHaveLength(0)
        
        // The reparsed AST should be semantically equivalent
        const isEqual = scriptsSemanticEqual(originalAst, parseResult.ast)
        
        if (!isEqual) {
          console.log('Original AST:', JSON.stringify(originalAst, null, 2))
          console.log('Generated code:\n', generatedCode)
          console.log('Reparsed AST:', JSON.stringify(parseResult.ast, null, 2))
        }
        
        expect(isEqual).toBe(true)
      }),
      { numRuns: 100 }
    )
  })


  it('should preserve simple dialogue through round-trip', () => {
    fc.assert(
      fc.property(arbDialogueNode, (dialogue) => {
        const ast = createRenpyScript([dialogue])
        const code = generate(ast)
        const reparsed = parse(code)
        
        expect(reparsed.errors).toHaveLength(0)
        expect(reparsed.ast.statements).toHaveLength(1)
        expect(semanticallyEqual(dialogue, reparsed.ast.statements[0])).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve labels with body through round-trip', () => {
    const bodyGen = fc.array(arbSimpleStatement, { minLength: 1, maxLength: 3 })
    
    fc.assert(
      fc.property(arbLabelNode(bodyGen), (label) => {
        const ast = createRenpyScript([label])
        const code = generate(ast)
        const reparsed = parse(code)
        
        expect(reparsed.errors).toHaveLength(0)
        expect(reparsed.ast.statements).toHaveLength(1)
        expect(semanticallyEqual(label, reparsed.ast.statements[0])).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve menus through round-trip', () => {
    const bodyGen = fc.array(arbSimpleStatement, { minLength: 1, maxLength: 2 })
    
    fc.assert(
      fc.property(arbMenuNode(bodyGen), (menu) => {
        const ast = createRenpyScript([menu])
        const code = generate(ast)
        const reparsed = parse(code)
        
        expect(reparsed.errors).toHaveLength(0)
        expect(reparsed.ast.statements).toHaveLength(1)
        expect(semanticallyEqual(menu, reparsed.ast.statements[0])).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve if statements through round-trip', () => {
    const bodyGen = fc.array(arbSimpleStatement, { minLength: 1, maxLength: 2 })
    
    fc.assert(
      fc.property(arbIfNode(bodyGen), (ifNode) => {
        const ast = createRenpyScript([ifNode])
        const code = generate(ast)
        const reparsed = parse(code)
        
        expect(reparsed.errors).toHaveLength(0)
        expect(reparsed.ast.statements).toHaveLength(1)
        expect(semanticallyEqual(ifNode, reparsed.ast.statements[0])).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
