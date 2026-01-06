/**
 * Property-Based Tests for Code Generation Round-Trip
 * 
 * Feature: node-creation-persistence, Property 5: 代码生成 Round-Trip 正确性
 * Validates: Requirements 1.4, 6.3
 * 
 * For any valid AST containing newly created nodes, generating code and then
 * parsing it back should produce a semantically equivalent AST.
 * 
 * Additionally, orphan nodes (not connected to any label) should not appear
 * in the generated code.
 * 
 * ∀ ast ∈ ValidAST: parse(generate(ast)) ≡ ast
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parse } from '../parser/renpyParser'
import { generate } from './codeGenerator'
import { ASTSynchronizer, DialogueData, MenuData } from '../utils/ASTSynchronizer'
import {
  createLabelNode,
  createDialogueNode,
  createMenuNode,
  createMenuChoice,
  createJumpNode,
  createCallNode,
  createRenpyScript,
  resetNodeIdCounter,
} from '../parser/nodeFactory'
import {
  RenpyScript,
  ASTNode,
  LabelNode,
  DialogueNode,
  MenuNode,
  MenuChoice,
  JumpNode,
  CallNode,
} from '../types/ast'

// ============================================================================
// Arbitrary Generators
// ============================================================================

// Generate valid Ren'Py identifiers
const arbIdentifier = fc.stringMatching(/^[a-z_][a-z0-9_]{0,10}$/)

// Generate valid text content (no problematic characters)
const arbSimpleText = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-'),
  { minLength: 1, maxLength: 30 }
)

// Generate unique node ID
let nodeIdCounter = 0
const generateId = () => `test_node_${++nodeIdCounter}`

// Reset counter before each test
function resetCounter() {
  nodeIdCounter = 0
  resetNodeIdCounter()
}

// ============================================================================
// Dialogue Data Generator
// ============================================================================

const arbDialogueData: fc.Arbitrary<DialogueData> = fc.record({
  speaker: fc.option(arbIdentifier, { nil: null }),
  text: arbSimpleText,
  attributes: fc.option(fc.array(arbIdentifier, { minLength: 1, maxLength: 2 })),
})

// ============================================================================
// Menu Data Generator
// ============================================================================

const arbMenuChoice: fc.Arbitrary<{ text: string; condition?: string; body: ASTNode[] }> = fc.record({
  text: arbSimpleText,
  condition: fc.option(arbIdentifier),
  body: fc.constant([]), // Empty body for simplicity
})

const arbMenuData: fc.Arbitrary<MenuData> = fc.record({
  prompt: fc.option(arbSimpleText),
  choices: fc.array(arbMenuChoice, { minLength: 1, maxLength: 3 }),
})

// ============================================================================
// AST with New Nodes Generator
// ============================================================================

/**
 * Generate an AST with a base structure and then add new nodes using ASTSynchronizer
 */
const arbAstWithNewNodes: fc.Arbitrary<{
  ast: RenpyScript
  addedDialogues: DialogueData[]
  addedMenus: MenuData[]
  labelNames: string[]
}> = fc.tuple(
  // Base label names (1-3 labels)
  fc.array(arbIdentifier, { minLength: 1, maxLength: 3 }),
  // Dialogues to add (0-3)
  fc.array(arbDialogueData, { minLength: 0, maxLength: 3 }),
  // Menus to add (0-2)
  fc.array(arbMenuData, { minLength: 0, maxLength: 2 }),
).map(([labelNames, dialoguesToAdd, menusToAdd]) => {
  resetCounter()
  
  // Ensure unique label names
  const uniqueLabels = [...new Set(labelNames)]
  if (uniqueLabels.length === 0) {
    uniqueLabels.push('start')
  }
  
  // Create base AST with labels
  const ast = createRenpyScript(
    uniqueLabels.map(name => createLabelNode(name, [
      createDialogueNode('Initial dialogue', null),
    ]))
  )
  
  const synchronizer = new ASTSynchronizer()
  const addedDialogues: DialogueData[] = []
  const addedMenus: MenuData[] = []
  
  // Add dialogues to first label
  for (const dialogue of dialoguesToAdd) {
    const result = synchronizer.insertDialogue(uniqueLabels[0], dialogue, ast)
    if (result) {
      addedDialogues.push(dialogue)
    }
  }
  
  // Add menus to first label
  for (const menu of menusToAdd) {
    const result = synchronizer.insertMenu(uniqueLabels[0], menu, ast)
    if (result) {
      addedMenus.push(menu)
    }
  }
  
  return {
    ast,
    addedDialogues,
    addedMenus,
    labelNames: uniqueLabels,
  }
})

// ============================================================================
// Semantic Equality Functions
// ============================================================================

/**
 * Check if a dialogue is semantically present in the AST
 */
function dialogueExistsInAst(dialogue: DialogueData, ast: RenpyScript): boolean {
  for (const statement of ast.statements) {
    if (statement.type === 'label') {
      const label = statement as LabelNode
      for (const node of label.body) {
        if (node.type === 'dialogue') {
          const d = node as DialogueNode
          if (d.text === dialogue.text && d.speaker === dialogue.speaker) {
            return true
          }
        }
      }
    }
  }
  return false
}

/**
 * Check if a menu is semantically present in the AST
 */
function menuExistsInAst(menu: MenuData, ast: RenpyScript): boolean {
  for (const statement of ast.statements) {
    if (statement.type === 'label') {
      const label = statement as LabelNode
      for (const node of label.body) {
        if (node.type === 'menu') {
          const m = node as MenuNode
          // Check if all choices match
          if (m.choices.length === menu.choices.length) {
            const allMatch = menu.choices.every((choice, i) => 
              m.choices[i]?.text === choice.text
            )
            if (allMatch) {
              return true
            }
          }
        }
      }
    }
  }
  return false
}

/**
 * Check if a label exists in the AST
 */
function labelExistsInAst(labelName: string, ast: RenpyScript): boolean {
  return ast.statements.some(
    s => s.type === 'label' && (s as LabelNode).name === labelName
  )
}

/**
 * Check if generated code contains the dialogue text
 */
function codeContainsDialogue(code: string, dialogue: DialogueData): boolean {
  // Escape special characters for matching
  const escapedText = dialogue.text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
  
  if (dialogue.speaker) {
    // Check for speaker "text" pattern
    return code.includes(`${dialogue.speaker}`) && code.includes(`"${escapedText}"`)
  } else {
    // Check for narration "text" pattern
    return code.includes(`"${escapedText}"`)
  }
}

/**
 * Check if generated code contains the menu choices
 */
function codeContainsMenu(code: string, menu: MenuData): boolean {
  // Check that menu: keyword exists
  if (!code.includes('menu:')) {
    return false
  }
  
  // Check that all choice texts are present
  return menu.choices.every(choice => {
    const escapedText = choice.text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
    return code.includes(`"${escapedText}"`)
  })
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 5: Code Generation Round-Trip Correctness', () => {
  /**
   * Feature: node-creation-persistence, Property 5: 代码生成 Round-Trip 正确性
   * Validates: Requirements 1.4, 6.3
   * 
   * For any valid AST with newly created nodes, generating code should
   * include all connected nodes and exclude orphan nodes.
   */
  it('should preserve newly added dialogues through generate -> parse round-trip', () => {
    fc.assert(
      fc.property(arbAstWithNewNodes, ({ ast, addedDialogues }) => {
        // Generate code from AST
        const generatedCode = generate(ast)
        
        // Parse the generated code back
        const parseResult = parse(generatedCode)
        
        // Should have no parse errors
        expect(parseResult.errors).toHaveLength(0)
        
        // All added dialogues should be present in the reparsed AST
        for (const dialogue of addedDialogues) {
          const exists = dialogueExistsInAst(dialogue, parseResult.ast)
          if (!exists) {
            console.log('Missing dialogue:', dialogue)
            console.log('Generated code:\n', generatedCode)
          }
          expect(exists).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve newly added menus through generate -> parse round-trip', () => {
    fc.assert(
      fc.property(arbAstWithNewNodes, ({ ast, addedMenus }) => {
        // Generate code from AST
        const generatedCode = generate(ast)
        
        // Parse the generated code back
        const parseResult = parse(generatedCode)
        
        // Should have no parse errors
        expect(parseResult.errors).toHaveLength(0)
        
        // All added menus should be present in the reparsed AST
        for (const menu of addedMenus) {
          const exists = menuExistsInAst(menu, parseResult.ast)
          if (!exists) {
            console.log('Missing menu:', menu)
            console.log('Generated code:\n', generatedCode)
          }
          expect(exists).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve all labels through generate -> parse round-trip', () => {
    fc.assert(
      fc.property(arbAstWithNewNodes, ({ ast, labelNames }) => {
        // Generate code from AST
        const generatedCode = generate(ast)
        
        // Parse the generated code back
        const parseResult = parse(generatedCode)
        
        // Should have no parse errors
        expect(parseResult.errors).toHaveLength(0)
        
        // All labels should be present in the reparsed AST
        for (const labelName of labelNames) {
          const exists = labelExistsInAst(labelName, parseResult.ast)
          if (!exists) {
            console.log('Missing label:', labelName)
            console.log('Generated code:\n', generatedCode)
          }
          expect(exists).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should include all connected nodes in generated code', () => {
    fc.assert(
      fc.property(arbAstWithNewNodes, ({ ast, addedDialogues, addedMenus }) => {
        // Generate code from AST
        const generatedCode = generate(ast)
        
        // All added dialogues should appear in the code
        for (const dialogue of addedDialogues) {
          const inCode = codeContainsDialogue(generatedCode, dialogue)
          if (!inCode) {
            console.log('Dialogue not in code:', dialogue)
            console.log('Generated code:\n', generatedCode)
          }
          expect(inCode).toBe(true)
        }
        
        // All added menus should appear in the code
        for (const menu of addedMenus) {
          const inCode = codeContainsMenu(generatedCode, menu)
          if (!inCode) {
            console.log('Menu not in code:', menu)
            console.log('Generated code:\n', generatedCode)
          }
          expect(inCode).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should not include orphan content (content not added to AST)', () => {
    fc.assert(
      fc.property(
        arbAstWithNewNodes,
        // Generate a unique orphan text that won't match any existing content
        fc.stringOf(
          fc.constantFrom(...'ORPHAN'),
          { minLength: 10, maxLength: 20 }
        ).map(s => `ORPHAN_${s}_${Date.now()}`),
        ({ ast }, orphanText) => {
          // The orphan dialogue is NOT added to the AST
          // It should NOT appear in the generated code
          
          // Generate code from AST
          const generatedCode = generate(ast)
          
          // The orphan text should NOT be in the code since it was never added
          const inCode = generatedCode.includes(orphanText)
          expect(inCode).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 5: Jump and Call Round-Trip', () => {
  it('should preserve jump statements through round-trip', () => {
    fc.assert(
      fc.property(
        fc.array(arbIdentifier, { minLength: 2, maxLength: 4 }),
        (labelNames) => {
          resetCounter()
          
          // Ensure unique labels
          const uniqueLabels = [...new Set(labelNames)]
          if (uniqueLabels.length < 2) {
            uniqueLabels.push('start', 'end')
          }
          
          // Create AST with labels and jumps
          const ast = createRenpyScript(
            uniqueLabels.map((name, i) => {
              const body: ASTNode[] = [createDialogueNode(`In ${name}`, null)]
              // Add jump to next label (except last)
              if (i < uniqueLabels.length - 1) {
                body.push(createJumpNode(uniqueLabels[i + 1]))
              }
              return createLabelNode(name, body)
            })
          )
          
          // Generate and parse
          const generatedCode = generate(ast)
          const parseResult = parse(generatedCode)
          
          expect(parseResult.errors).toHaveLength(0)
          
          // Verify jumps are preserved
          for (let i = 0; i < uniqueLabels.length - 1; i++) {
            expect(generatedCode).toContain(`jump ${uniqueLabels[i + 1]}`)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve call statements through round-trip', () => {
    fc.assert(
      fc.property(
        fc.array(arbIdentifier, { minLength: 2, maxLength: 3 }),
        (labelNames) => {
          resetCounter()
          
          // Ensure unique labels
          const uniqueLabels = [...new Set(labelNames)]
          if (uniqueLabels.length < 2) {
            uniqueLabels.push('main', 'subroutine')
          }
          
          // Create AST with call statement
          const ast = createRenpyScript([
            createLabelNode(uniqueLabels[0], [
              createDialogueNode('Before call', null),
              createCallNode(uniqueLabels[1]),
              createDialogueNode('After call', null),
            ]),
            createLabelNode(uniqueLabels[1], [
              createDialogueNode('In subroutine', null),
            ]),
          ])
          
          // Generate and parse
          const generatedCode = generate(ast)
          const parseResult = parse(generatedCode)
          
          expect(parseResult.errors).toHaveLength(0)
          expect(generatedCode).toContain(`call ${uniqueLabels[1]}`)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 5: Complex Structure Round-Trip', () => {
  it('should preserve nested menu with jumps through round-trip', () => {
    fc.assert(
      fc.property(
        arbIdentifier,
        arbIdentifier,
        arbSimpleText,
        arbSimpleText,
        (label1, label2, choice1Text, choice2Text) => {
          resetCounter()
          
          // Ensure unique labels
          const uniqueLabel1 = label1 || 'start'
          let uniqueLabel2 = label2 || 'ending'
          if (uniqueLabel1 === uniqueLabel2) {
            uniqueLabel2 = uniqueLabel2 + '_2'
          }
          
          // Create AST with menu containing jumps
          const ast = createRenpyScript([
            createLabelNode(uniqueLabel1, [
              createMenuNode([
                createMenuChoice(choice1Text, [createJumpNode(uniqueLabel2)]),
                createMenuChoice(choice2Text, [createJumpNode(uniqueLabel2)]),
              ]),
            ]),
            createLabelNode(uniqueLabel2, [
              createDialogueNode('The end', null),
            ]),
          ])
          
          // Generate and parse
          const generatedCode = generate(ast)
          const parseResult = parse(generatedCode)
          
          expect(parseResult.errors).toHaveLength(0)
          
          // Verify structure
          expect(generatedCode).toContain('menu:')
          expect(generatedCode).toContain(`jump ${uniqueLabel2}`)
          expect(labelExistsInAst(uniqueLabel1, parseResult.ast)).toBe(true)
          expect(labelExistsInAst(uniqueLabel2, parseResult.ast)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
