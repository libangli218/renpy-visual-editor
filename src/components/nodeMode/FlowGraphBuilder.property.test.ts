/**
 * Property-Based Tests for FlowGraphBuilder
 * 
 * Feature: node-editor-redesign
 * 
 * Property 3: Dialogue Block Merging Preserves Content
 * Validates: Requirements 3.1, 3.2, 3.6
 * 
 * For any sequence of AST statements, merging into dialogue blocks and then
 * expanding should contain all original dialogue statements in order.
 * 
 * Property 5: Menu Choice Port Mapping
 * Validates: Requirements 4.1, 4.2, 4.3
 * 
 * For any menu node, the number of output ports should equal the number of
 * menu choices, and each port should be labeled with the correct choice text.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { FlowGraphBuilder, DialogueItem, VisualCommand } from './FlowGraphBuilder'
import { 
  RenpyScript, 
  ASTNode, 
  LabelNode, 
  DialogueNode, 
  MenuNode, 
  SceneNode, 
  ShowNode, 
  HideNode,
  JumpNode,
  MenuChoice,
} from '../../types/ast'

/**
 * Helper to create a minimal RenpyScript
 */
function createScript(statements: ASTNode[], filePath: string = 'test.rpy'): RenpyScript {
  return {
    type: 'script',
    statements,
    metadata: {
      filePath,
      parseTime: new Date(),
      version: '1.0',
    },
  }
}

/**
 * Helper to create a dialogue node
 */
function createDialogue(id: string, speaker: string | null, text: string): DialogueNode {
  return {
    id,
    type: 'dialogue',
    speaker,
    text,
  }
}

/**
 * Helper to create a scene node
 */
function createScene(id: string, image: string): SceneNode {
  return {
    id,
    type: 'scene',
    image,
  }
}

/**
 * Helper to create a show node
 */
function createShow(id: string, image: string): ShowNode {
  return {
    id,
    type: 'show',
    image,
  }
}

/**
 * Helper to create a hide node
 */
function createHide(id: string, image: string): HideNode {
  return {
    id,
    type: 'hide',
    image,
  }
}

/**
 * Helper to create a jump node
 */
function createJump(id: string, target: string): JumpNode {
  return {
    id,
    type: 'jump',
    target,
  }
}

/**
 * Helper to create a menu node
 */
function createMenu(id: string, choices: MenuChoice[], prompt?: string): MenuNode {
  return {
    id,
    type: 'menu',
    prompt,
    choices,
  }
}

/**
 * Helper to create a label node
 */
function createLabel(name: string, body: ASTNode[]): LabelNode {
  return {
    id: `label-${name}`,
    type: 'label',
    name,
    body,
  }
}

/**
 * Extract all dialogues from flow graph nodes
 */
function extractDialoguesFromGraph(builder: FlowGraphBuilder, ast: RenpyScript): DialogueItem[] {
  const graph = builder.buildGraph(ast)
  const dialogues: DialogueItem[] = []
  
  for (const node of graph.nodes) {
    if (node.type === 'dialogue-block' && node.data.dialogues) {
      dialogues.push(...node.data.dialogues)
    }
  }
  
  return dialogues
}

/**
 * Extract all visual commands from flow graph nodes
 */
function extractVisualCommandsFromGraph(builder: FlowGraphBuilder, ast: RenpyScript): VisualCommand[] {
  const graph = builder.buildGraph(ast)
  const commands: VisualCommand[] = []
  
  for (const node of graph.nodes) {
    if (node.type === 'dialogue-block' && node.data.visualCommands) {
      commands.push(...node.data.visualCommands)
    }
  }
  
  return commands
}

describe('Property 3: Dialogue Block Merging Preserves Content', () => {
  /**
   * Property 3: Dialogue Block Merging Preserves Content
   * For any sequence of AST statements, merging into dialogue blocks and then
   * expanding should contain all original dialogue statements in order.
   * 
   * Feature: node-editor-redesign, Property 3: Dialogue Block Merging Preserves Content
   * Validates: Requirements 3.1, 3.2, 3.6
   */

  // Arbitrary for speaker names
  const arbitrarySpeaker = fc.oneof(
    fc.constant(null),
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 10 })
  )

  // Arbitrary for dialogue text
  const arbitraryText = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '),
    { minLength: 1, maxLength: 50 }
  )

  // Arbitrary for image names
  const arbitraryImage = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'),
    { minLength: 1, maxLength: 20 }
  )

  // Arbitrary for a dialogue node
  const arbitraryDialogueNode = fc.tuple(
    fc.uuid(),
    arbitrarySpeaker,
    arbitraryText
  ).map(([id, speaker, text]) => createDialogue(id, speaker, text))

  // Arbitrary for a sequence of dialogues
  const arbitraryDialogueSequence = fc.array(arbitraryDialogueNode, { minLength: 1, maxLength: 10 })

  it('should preserve all dialogues when merging consecutive dialogues', () => {
    fc.assert(
      fc.property(
        arbitraryDialogueSequence,
        (dialogues) => {
          const builder = new FlowGraphBuilder()
          const label = createLabel('test', dialogues)
          const ast = createScript([label])
          
          const extractedDialogues = extractDialoguesFromGraph(builder, ast)
          
          // All original dialogues should be present
          expect(extractedDialogues.length).toBe(dialogues.length)
          
          // Dialogues should be in the same order
          for (let i = 0; i < dialogues.length; i++) {
            expect(extractedDialogues[i].speaker).toBe(dialogues[i].speaker)
            expect(extractedDialogues[i].text).toBe(dialogues[i].text)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve dialogues when interspersed with visual commands', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            arbitraryDialogueNode.map(d => ({ type: 'dialogue' as const, node: d })),
            fc.tuple(fc.uuid(), arbitraryImage).map(([id, img]) => ({ 
              type: 'show' as const, 
              node: createShow(id, img) 
            })),
            fc.tuple(fc.uuid(), arbitraryImage).map(([id, img]) => ({ 
              type: 'hide' as const, 
              node: createHide(id, img) 
            }))
          ),
          { minLength: 1, maxLength: 15 }
        ),
        (items) => {
          const builder = new FlowGraphBuilder()
          const statements = items.map(item => item.node)
          const label = createLabel('test', statements)
          const ast = createScript([label])
          
          const extractedDialogues = extractDialoguesFromGraph(builder, ast)
          const originalDialogues = items
            .filter(item => item.type === 'dialogue')
            .map(item => item.node as DialogueNode)
          
          // All original dialogues should be present
          expect(extractedDialogues.length).toBe(originalDialogues.length)
          
          // Dialogues should be in the same order
          for (let i = 0; i < originalDialogues.length; i++) {
            expect(extractedDialogues[i].speaker).toBe(originalDialogues[i].speaker)
            expect(extractedDialogues[i].text).toBe(originalDialogues[i].text)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve visual commands when merging', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.tuple(fc.uuid(), arbitraryImage).map(([id, img]) => createScene(id, img)),
            fc.tuple(fc.uuid(), arbitraryImage).map(([id, img]) => createShow(id, img)),
            fc.tuple(fc.uuid(), arbitraryImage).map(([id, img]) => createHide(id, img))
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (visualNodes) => {
          const builder = new FlowGraphBuilder()
          const label = createLabel('test', visualNodes)
          const ast = createScript([label])
          
          const extractedCommands = extractVisualCommandsFromGraph(builder, ast)
          
          // All visual commands should be present
          expect(extractedCommands.length).toBe(visualNodes.length)
          
          // Commands should be in the same order with correct types
          for (let i = 0; i < visualNodes.length; i++) {
            expect(extractedCommands[i].type).toBe(visualNodes[i].type)
            if (visualNodes[i].type === 'scene') {
              expect(extractedCommands[i].target).toBe((visualNodes[i] as SceneNode).image)
            } else if (visualNodes[i].type === 'show') {
              expect(extractedCommands[i].target).toBe((visualNodes[i] as ShowNode).image)
            } else if (visualNodes[i].type === 'hide') {
              expect(extractedCommands[i].target).toBe((visualNodes[i] as HideNode).image)
            }
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should create separate blocks when scene command appears', () => {
    fc.assert(
      fc.property(
        arbitraryDialogueSequence,
        fc.tuple(fc.uuid(), arbitraryImage),
        arbitraryDialogueSequence,
        (dialoguesBefore, [sceneId, sceneImage], dialoguesAfter) => {
          const builder = new FlowGraphBuilder()
          const statements: ASTNode[] = [
            ...dialoguesBefore,
            createScene(sceneId, sceneImage),
            ...dialoguesAfter,
          ]
          const label = createLabel('test', statements)
          const ast = createScript([label])
          
          const graph = builder.buildGraph(ast)
          const dialogueBlocks = graph.nodes.filter(n => n.type === 'dialogue-block')
          
          // Should have at least 2 dialogue blocks (before and after scene)
          // The scene command starts a new block, so dialogues after scene are in a new block
          expect(dialogueBlocks.length).toBeGreaterThanOrEqual(2)
          
          // Total dialogues should be preserved
          const totalDialogues = dialogueBlocks.reduce(
            (sum, block) => sum + (block.data.dialogues?.length || 0),
            0
          )
          expect(totalDialogues).toBe(dialoguesBefore.length + dialoguesAfter.length)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should end dialogue block when flow control statement appears', () => {
    fc.assert(
      fc.property(
        arbitraryDialogueSequence,
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'), { minLength: 1, maxLength: 10 }),
        (dialogues, jumpTarget) => {
          const builder = new FlowGraphBuilder()
          const statements: ASTNode[] = [
            ...dialogues,
            createJump('jump-1', jumpTarget),
          ]
          const label = createLabel('test', statements)
          const ast = createScript([label])
          
          const graph = builder.buildGraph(ast)
          const dialogueBlocks = graph.nodes.filter(n => n.type === 'dialogue-block')
          const jumpNodes = graph.nodes.filter(n => n.type === 'jump')
          
          // Should have exactly 1 dialogue block and 1 jump node
          expect(dialogueBlocks.length).toBe(1)
          expect(jumpNodes.length).toBe(1)
          
          // Dialogue block should contain all dialogues
          expect(dialogueBlocks[0].data.dialogues?.length).toBe(dialogues.length)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 5: Menu Choice Port Mapping', () => {
  /**
   * Property 5: Menu Choice Port Mapping
   * For any menu node, the number of output ports should equal the number of
   * menu choices, and each port should be labeled with the correct choice text.
   * 
   * Feature: node-editor-redesign, Property 5: Menu Choice Port Mapping
   * Validates: Requirements 4.1, 4.2, 4.3
   */

  // Arbitrary for choice text
  const arbitraryChoiceText = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '),
    { minLength: 1, maxLength: 30 }
  )

  // Arbitrary for label name
  const arbitraryLabelName = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'),
    { minLength: 1, maxLength: 15 }
  ).filter(s => /^[a-z_][a-z0-9_]*$/.test(s))

  // Arbitrary for a menu choice
  const arbitraryMenuChoice = fc.tuple(
    arbitraryChoiceText,
    fc.option(arbitraryLabelName, { nil: undefined })
  ).map(([text, jumpTarget]): MenuChoice => ({
    text,
    body: jumpTarget ? [createJump(`jump-${text}`, jumpTarget)] : [],
  }))

  // Arbitrary for menu choices array
  const arbitraryMenuChoices = fc.array(arbitraryMenuChoice, { minLength: 1, maxLength: 6 })

  it('should create one port per menu choice', () => {
    fc.assert(
      fc.property(
        arbitraryMenuChoices,
        fc.option(arbitraryChoiceText, { nil: undefined }),
        (choices, prompt) => {
          const builder = new FlowGraphBuilder()
          const menu = createMenu('menu-1', choices, prompt)
          const label = createLabel('start', [menu])
          const ast = createScript([label])
          
          const graph = builder.buildGraph(ast)
          const menuNodes = graph.nodes.filter(n => n.type === 'menu')
          
          // Should have exactly one menu node
          expect(menuNodes.length).toBe(1)
          
          const menuNode = menuNodes[0]
          
          // Number of choices should match
          expect(menuNode.data.choices?.length).toBe(choices.length)
          
          // Each choice should have a unique port ID
          const portIds = menuNode.data.choices?.map(c => c.portId) || []
          const uniquePortIds = new Set(portIds)
          expect(uniquePortIds.size).toBe(choices.length)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should label each port with the correct choice text', () => {
    fc.assert(
      fc.property(
        arbitraryMenuChoices,
        (choices) => {
          const builder = new FlowGraphBuilder()
          const menu = createMenu('menu-1', choices)
          const label = createLabel('start', [menu])
          const ast = createScript([label])
          
          const graph = builder.buildGraph(ast)
          const menuNodes = graph.nodes.filter(n => n.type === 'menu')
          
          expect(menuNodes.length).toBe(1)
          const menuNode = menuNodes[0]
          
          // Each choice text should match the original
          for (let i = 0; i < choices.length; i++) {
            expect(menuNode.data.choices?.[i].text).toBe(choices[i].text)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve menu prompt text', () => {
    fc.assert(
      fc.property(
        arbitraryMenuChoices,
        arbitraryChoiceText,
        (choices, prompt) => {
          const builder = new FlowGraphBuilder()
          const menu = createMenu('menu-1', choices, prompt)
          const label = createLabel('start', [menu])
          const ast = createScript([label])
          
          const graph = builder.buildGraph(ast)
          const menuNodes = graph.nodes.filter(n => n.type === 'menu')
          
          expect(menuNodes.length).toBe(1)
          expect(menuNodes[0].data.prompt).toBe(prompt)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should extract jump targets from menu choices', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(arbitraryChoiceText, arbitraryLabelName).map(([text, target]): MenuChoice => ({
            text,
            body: [createJump(`jump-${text}`, target)],
          })),
          { minLength: 1, maxLength: 5 }
        ),
        (choices) => {
          const builder = new FlowGraphBuilder()
          const menu = createMenu('menu-1', choices)
          const label = createLabel('start', [menu])
          const ast = createScript([label])
          
          const graph = builder.buildGraph(ast)
          const menuNodes = graph.nodes.filter(n => n.type === 'menu')
          
          expect(menuNodes.length).toBe(1)
          const menuNode = menuNodes[0]
          
          // Each choice should have the correct target label extracted
          for (let i = 0; i < choices.length; i++) {
            const expectedTarget = (choices[i].body[0] as JumpNode).target
            expect(menuNode.data.choices?.[i].targetLabel).toBe(expectedTarget)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should create edges from menu choices to target labels', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 2, maxLength: 4 }),
        (labelNames) => {
          const builder = new FlowGraphBuilder()
          
          // Create menu with choices that jump to different labels
          const choices: MenuChoice[] = labelNames.slice(1).map((target, i) => ({
            text: `Go to ${target}`,
            body: [createJump(`jump-${i}`, target)],
          }))
          
          const menu = createMenu('menu-1', choices)
          const startLabel = createLabel(labelNames[0], [menu])
          
          // Create target labels
          const targetLabels = labelNames.slice(1).map(name => 
            createLabel(name, [createDialogue(`d-${name}`, null, `In ${name}`)])
          )
          
          const ast = createScript([startLabel, ...targetLabels])
          const graph = builder.buildGraph(ast)
          
          // Should have edges from menu to each target
          const menuNodes = graph.nodes.filter(n => n.type === 'menu')
          expect(menuNodes.length).toBe(1)
          
          // Count edges originating from menu node
          const menuEdges = graph.edges.filter(e => e.source === menuNodes[0].id)
          
          // Should have at least one edge per choice (may have more for nested content)
          expect(menuEdges.length).toBeGreaterThanOrEqual(choices.length)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
