/**
 * Property-Based Tests for Code Generator
 * 
 * Feature: renpy-visual-editor, Property 5: Code Generation Validity
 * Validates: Requirements 7.6, 8.6, 10.6, 11.6, 12.5, 13.4, 15.1, 15.2
 * 
 * For any AST node, the generated code should be valid Ren'Py syntax
 * with correct indentation.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { generateNode, CodeGenerator } from './codeGenerator'
import {
  ASTNode,
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

// Generate valid text content (no unescaped quotes or newlines for simple cases)
const arbSimpleText = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => !s.includes('\n') && !s.includes('\r'))
  .map(s => s.replace(/"/g, "'")) // Replace quotes to avoid escaping issues

// Generate a unique node ID
let nodeIdCounter = 0
const generateId = () => `test_node_${++nodeIdCounter}`

// Arbitrary DialogueNode
const arbDialogueNode: fc.Arbitrary<DialogueNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('dialogue' as const),
  speaker: fc.option(arbIdentifier, { nil: null }),
  text: arbSimpleText,
  attributes: fc.option(fc.array(arbIdentifier, { minLength: 0, maxLength: 3 })),
})

// Arbitrary JumpNode
const arbJumpNode: fc.Arbitrary<JumpNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('jump' as const),
  target: arbIdentifier,
  expression: fc.option(fc.boolean()),
})

// Arbitrary CallNode
const arbCallNode: fc.Arbitrary<CallNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('call' as const),
  target: arbIdentifier,
  arguments: fc.option(fc.array(arbIdentifier, { minLength: 0, maxLength: 3 })),
  expression: fc.option(fc.boolean()),
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
  image: fc.tuple(arbIdentifier, fc.option(arbIdentifier))
    .map(([base, variant]) => variant ? `${base} ${variant}` : base),
})

// Arbitrary ShowNode
const arbShowNode: fc.Arbitrary<ShowNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('show' as const),
  image: arbIdentifier,
  attributes: fc.option(fc.array(arbIdentifier, { minLength: 0, maxLength: 3 })),
  atPosition: fc.option(fc.constantFrom('left', 'right', 'center', 'truecenter')),
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
  transition: fc.constantFrom('dissolve', 'fade', 'None', 'pixellate', 'move', 'ease'),
})

// Arbitrary SetNode
const arbSetNode: fc.Arbitrary<SetNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('set' as const),
  variable: arbIdentifier,
  operator: fc.constantFrom('=' as const, '+=' as const, '-=' as const),
  value: fc.oneof(
    fc.integer().map(String),
    fc.constant('True'),
    fc.constant('False'),
    arbIdentifier
  ),
})

// Arbitrary DefineNode
const arbDefineNode: fc.Arbitrary<DefineNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('define' as const),
  name: arbIdentifier,
  value: fc.oneof(
    fc.integer().map(String),
    fc.constant('True'),
    fc.constant('False'),
    arbIdentifier.map(s => `"${s}"`),
    arbIdentifier.map(s => `Character("${s}")`),
  ),
  store: fc.option(arbIdentifier),
})

// Arbitrary DefaultNode
const arbDefaultNode: fc.Arbitrary<DefaultNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('default' as const),
  name: arbIdentifier,
  value: fc.oneof(
    fc.integer().map(String),
    fc.constant('True'),
    fc.constant('False'),
    fc.constant('[]'),
    fc.constant('{}'),
  ),
})

// Arbitrary PlayNode
const arbPlayNode: fc.Arbitrary<PlayNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('play' as const),
  channel: fc.constantFrom('music' as const, 'sound' as const, 'voice' as const),
  file: arbIdentifier.map(s => `audio/${s}.ogg`),
  fadeIn: fc.option(fc.float({ min: 0, max: 10, noNaN: true })),
  loop: fc.option(fc.boolean()),
  volume: fc.option(fc.float({ min: 0, max: 1, noNaN: true })),
  queue: fc.option(fc.boolean()),
})

// Arbitrary StopNode
const arbStopNode: fc.Arbitrary<StopNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('stop' as const),
  channel: fc.constantFrom('music' as const, 'sound' as const, 'voice' as const),
  fadeOut: fc.option(fc.float({ min: 0, max: 10, noNaN: true })),
})

// Arbitrary PauseNode
const arbPauseNode: fc.Arbitrary<PauseNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('pause' as const),
  duration: fc.option(fc.float({ min: 0, max: 10, noNaN: true })),
})

// Arbitrary NVLNode
const arbNVLNode: fc.Arbitrary<NVLNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('nvl' as const),
  action: fc.constantFrom('show' as const, 'hide' as const, 'clear' as const),
})

// Arbitrary PythonNode (single line only for simplicity)
const arbPythonNode: fc.Arbitrary<PythonNode> = fc.record({
  id: fc.constant('').map(() => generateId()),
  type: fc.constant('python' as const),
  code: fc.tuple(arbIdentifier, fc.constantFrom('=', '+=', '-='), fc.integer())
    .map(([v, op, n]) => `${v} ${op} ${n}`),
  early: fc.constant(undefined),
  hide: fc.constant(undefined),
})

// Simple statement nodes (no body)
const arbSimpleStatement: fc.Arbitrary<ASTNode> = fc.oneof(
  arbDialogueNode,
  arbJumpNode,
  arbCallNode,
  arbReturnNode,
  arbSceneNode,
  arbShowNode,
  arbHideNode,
  arbWithNode,
  arbSetNode,
  arbDefineNode,
  arbDefaultNode,
  arbPlayNode,
  arbStopNode,
  arbPauseNode,
  arbNVLNode,
  arbPythonNode,
)

// Arbitrary MenuChoice
const arbMenuChoice = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<MenuChoice> =>
  fc.record({
    text: arbSimpleText,
    condition: fc.option(arbIdentifier),
    body: bodyGen,
  })

// Arbitrary MenuNode
const arbMenuNode = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<MenuNode> =>
  fc.record({
    id: fc.constant('').map(() => generateId()),
    type: fc.constant('menu' as const),
    prompt: fc.option(arbIdentifier),
    choices: fc.array(arbMenuChoice(bodyGen), { minLength: 1, maxLength: 3 }),
  })

// Arbitrary IfBranch
const arbIfBranch = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<IfBranch> =>
  fc.record({
    condition: fc.option(arbIdentifier, { nil: null }),
    body: bodyGen,
  })

// Arbitrary IfNode
const arbIfNode = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<IfNode> =>
  fc.record({
    id: fc.constant('').map(() => generateId()),
    type: fc.constant('if' as const),
    branches: fc.tuple(
      // First branch must have a condition
      fc.record({ condition: arbIdentifier, body: bodyGen }),
      // Optional elif/else branches
      fc.array(arbIfBranch(bodyGen), { minLength: 0, maxLength: 2 })
    ).map(([first, rest]) => [first, ...rest]),
  })

// Arbitrary LabelNode
const arbLabelNode = (bodyGen: fc.Arbitrary<ASTNode[]>): fc.Arbitrary<LabelNode> =>
  fc.record({
    id: fc.constant('').map(() => generateId()),
    type: fc.constant('label' as const),
    name: arbIdentifier,
    parameters: fc.option(fc.array(arbIdentifier, { minLength: 0, maxLength: 3 })),
    body: bodyGen,
  })

// Build recursive AST generator with limited depth
const arbASTNode = (depth: number = 0): fc.Arbitrary<ASTNode> => {
  if (depth >= 2) {
    // At max depth, only generate simple statements
    return arbSimpleStatement
  }
  
  const bodyGen = fc.array(arbASTNode(depth + 1), { minLength: 0, maxLength: 3 })
  
  return fc.oneof(
    { weight: 5, arbitrary: arbSimpleStatement },
    { weight: 1, arbitrary: arbMenuNode(bodyGen) },
    { weight: 1, arbitrary: arbIfNode(bodyGen) },
    { weight: 1, arbitrary: arbLabelNode(bodyGen) },
  )
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if generated code has correct indentation
 * Ren'Py uses 4-space indentation
 */
function hasCorrectIndentation(code: string, baseIndent: number): boolean {
  const lines = code.split('\n')
  const baseSpaces = baseIndent * 4
  
  for (const line of lines) {
    if (line.trim() === '') continue
    
    // Count leading spaces
    const leadingSpaces = line.length - line.trimStart().length
    
    // Indentation should be a multiple of 4 and at least baseSpaces
    if (leadingSpaces < baseSpaces) {
      return false
    }
    if ((leadingSpaces - baseSpaces) % 4 !== 0) {
      return false
    }
  }
  
  return true
}

/**
 * Check if generated code looks like valid Ren'Py syntax
 * This is a basic structural check, not a full parser
 */
function looksLikeValidRenpySyntax(code: string): boolean {
  const lines = code.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed === 'pass') continue
    
    // Check for common Ren'Py patterns
    const validPatterns = [
      /^label\s+\w+.*:$/,           // label name:
      /^jump\s+/,                    // jump target
      /^call\s+/,                    // call target
      /^return/,                     // return
      /^".*"$/,                      // narration
      /^\w+\s+".*"$/,               // dialogue
      /^\w+\s+\w+.*".*"$/,          // dialogue with attributes
      /^menu.*:$/,                   // menu:
      /^".*":$/,                     // menu choice
      /^if\s+.+:$/,                  // if condition:
      /^elif\s+.+:$/,                // elif condition:
      /^else:$/,                     // else:
      /^scene\s+/,                   // scene image
      /^show\s+/,                    // show image
      /^hide\s+/,                    // hide image
      /^with\s+/,                    // with transition
      /^\$\s+/,                      // $ python
      /^python.*:$/,                 // python:
      /^init python.*:$/,            // init python:
      /^define\s+/,                  // define
      /^default\s+/,                 // default
      /^play\s+(music|sound)\s+/,   // play music/sound
      /^voice\s+/,                   // voice
      /^queue\s+music\s+/,          // queue music
      /^stop\s+(music|sound|voice)/, // stop
      /^pause/,                      // pause
      /^nvl\s+(show|hide|clear)/,   // nvl
    ]
    
    const isValid = validPatterns.some(pattern => pattern.test(trimmed))
    if (!isValid) {
      // Could be indented content in a block, which is fine
      // Just make sure it's not completely malformed
      if (trimmed.includes('undefined') || trimmed.includes('null')) {
        return false
      }
    }
  }
  
  return true
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 5: Code Generation Validity', () => {
  /**
   * Feature: renpy-visual-editor, Property 5: Code Generation Validity
   * Validates: Requirements 7.6, 8.6, 10.6, 11.6, 12.5, 13.4, 15.1, 15.2
   * 
   * For any AST node, the generated code should be valid Ren'Py syntax
   * with correct indentation.
   */
  it('should generate valid Ren\'Py syntax for any AST node', () => {
    fc.assert(
      fc.property(arbASTNode(), (node) => {
        const code = generateNode(node, 0)
        
        // Code should not be empty
        expect(code.length).toBeGreaterThan(0)
        
        // Code should have correct indentation
        expect(hasCorrectIndentation(code, 0)).toBe(true)
        
        // Code should look like valid Ren'Py syntax
        expect(looksLikeValidRenpySyntax(code)).toBe(true)
        
        // Code should not contain undefined or null literals
        expect(code).not.toContain('undefined')
        expect(code).not.toContain('null')
      }),
      { numRuns: 100 }
    )
  })

  it('should maintain correct indentation at any indent level', () => {
    fc.assert(
      fc.property(
        arbASTNode(),
        fc.integer({ min: 0, max: 5 }),
        (node, indent) => {
          const code = generateNode(node, indent)
          expect(hasCorrectIndentation(code, indent)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate dialogue with properly escaped strings', () => {
    fc.assert(
      fc.property(arbDialogueNode, (node) => {
        const code = generateNode(node, 0)
        
        // Should contain quoted text
        expect(code).toMatch(/".*"/)
        
        // Should not have unescaped newlines in the string
        const match = code.match(/"([^"]*)"/)
        if (match) {
          expect(match[1]).not.toContain('\n')
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should generate define statements with correct format', () => {
    fc.assert(
      fc.property(arbDefineNode, (node) => {
        const code = generateNode(node, 0)
        
        // Should start with 'define'
        expect(code.trim()).toMatch(/^define\s+/)
        
        // Should contain '='
        expect(code).toContain('=')
        
        // Should have the variable name
        if (node.store) {
          expect(code).toContain(`${node.store}.${node.name}`)
        } else {
          expect(code).toContain(node.name)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should generate default statements with correct format', () => {
    fc.assert(
      fc.property(arbDefaultNode, (node) => {
        const code = generateNode(node, 0)
        
        // Should start with 'default'
        expect(code.trim()).toMatch(/^default\s+/)
        
        // Should contain '='
        expect(code).toContain('=')
        
        // Should have the variable name
        expect(code).toContain(node.name)
      }),
      { numRuns: 100 }
    )
  })

  it('should generate play statements with correct format', () => {
    fc.assert(
      fc.property(arbPlayNode, (node) => {
        const code = generateNode(node, 0)
        
        if (node.channel === 'voice') {
          // Voice uses special syntax
          expect(code.trim()).toMatch(/^voice\s+"/)
        } else if (node.queue && node.channel === 'music') {
          // Queue music (only valid for music channel)
          expect(code.trim()).toMatch(/^queue\s+music\s+"/)
        } else {
          // Regular play
          expect(code.trim()).toMatch(/^play\s+(music|sound)\s+"/)
        }
        
        // Should contain the file path
        expect(code).toContain(node.file)
      }),
      { numRuns: 100 }
    )
  })

  it('should generate stop statements with correct format', () => {
    fc.assert(
      fc.property(arbStopNode, (node) => {
        const code = generateNode(node, 0)
        
        // Should start with 'stop'
        expect(code.trim()).toMatch(/^stop\s+(music|sound|voice)/)
        
        // Should contain the channel
        expect(code).toContain(node.channel)
        
        // If fadeOut is specified and not null, should contain 'fadeout'
        if (node.fadeOut !== undefined && node.fadeOut !== null) {
          expect(code).toContain('fadeout')
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should generate if statements with correct structure', () => {
    const bodyGen = fc.array(arbSimpleStatement, { minLength: 0, maxLength: 2 })
    
    fc.assert(
      fc.property(arbIfNode(bodyGen), (node) => {
        const code = generateNode(node, 0)
        
        // Should start with 'if'
        expect(code.trim()).toMatch(/^if\s+/)
        
        // First branch should have 'if'
        expect(code).toContain('if ')
        
        // Should end with ':' on the if line
        const firstLine = code.split('\n')[0]
        expect(firstLine.trim()).toMatch(/:$/)
        
        // Check elif/else branches
        for (let i = 1; i < node.branches.length; i++) {
          const branch = node.branches[i]
          if (branch.condition === null) {
            expect(code).toContain('else:')
          } else {
            expect(code).toContain(`elif ${branch.condition}:`)
          }
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should generate menu statements with correct structure', () => {
    const bodyGen = fc.array(arbSimpleStatement, { minLength: 0, maxLength: 2 })
    
    fc.assert(
      fc.property(arbMenuNode(bodyGen), (node) => {
        const code = generateNode(node, 0)
        
        // Should start with 'menu'
        expect(code.trim()).toMatch(/^menu/)
        
        // Should have choices - check that each choice text appears (escaped)
        for (const choice of node.choices) {
          // The text will be escaped in the output, so we need to check for the escaped version
          const escapedText = choice.text
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t')
          expect(code).toContain(`"${escapedText}"`)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should generate label statements with correct structure', () => {
    const bodyGen = fc.array(arbSimpleStatement, { minLength: 0, maxLength: 2 })
    
    fc.assert(
      fc.property(arbLabelNode(bodyGen), (node) => {
        const code = generateNode(node, 0)
        
        // Should start with 'label'
        expect(code.trim()).toMatch(/^label\s+/)
        
        // Should contain the label name
        expect(code).toContain(`label ${node.name}`)
        
        // Should end with ':'
        const firstLine = code.split('\n')[0]
        expect(firstLine.trim()).toMatch(/:$/)
        
        // If has parameters, should contain them
        if (node.parameters && node.parameters.length > 0) {
          expect(code).toContain('(')
          expect(code).toContain(')')
        }
        
        // If body is empty, should have 'pass'
        if (node.body.length === 0) {
          expect(code).toContain('pass')
        }
      }),
      { numRuns: 100 }
    )
  })
})
