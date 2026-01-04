/**
 * Property-Based Tests for Flow Node Components
 * 
 * Feature: node-editor-redesign
 * 
 * Property 6: Scene Node Completeness
 * Validates: Requirements 2.1, 2.2, 2.3
 * 
 * For any label in the AST, there should be exactly one scene node in the flow graph,
 * and the scene node should contain all statements within that label.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { FlowGraphBuilder } from '../FlowGraphBuilder'
import { 
  RenpyScript, 
  ASTNode, 
  LabelNode, 
  DialogueNode, 
  SceneNode, 
  ShowNode, 
  JumpNode,
  MenuNode,
  MenuChoice,
} from '../../../types/ast'

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

describe('Property 6: Scene Node Completeness', () => {
  /**
   * Property 6: Scene Node Completeness
   * For any label in the AST, there should be exactly one scene node in the flow graph,
   * and the scene node should contain all statements within that label.
   * 
   * Feature: node-editor-redesign, Property 6: Scene Node Completeness
   * Validates: Requirements 2.1, 2.2, 2.3
   */

  // Arbitrary for label names (valid Ren'Py identifiers)
  const arbitraryLabelName = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'),
    { minLength: 1, maxLength: 15 }
  ).filter(s => /^[a-z_][a-z0-9_]*$/.test(s))

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

  // Arbitrary for a scene node
  const arbitrarySceneNode = fc.tuple(
    fc.uuid(),
    arbitraryImage
  ).map(([id, image]) => createScene(id, image))

  // Arbitrary for a show node
  const arbitraryShowNode = fc.tuple(
    fc.uuid(),
    arbitraryImage
  ).map(([id, image]) => createShow(id, image))

  // Arbitrary for label body statements (mix of dialogues and visual commands)
  const arbitraryLabelBody = fc.array(
    fc.oneof(
      arbitraryDialogueNode,
      arbitrarySceneNode,
      arbitraryShowNode
    ),
    { minLength: 0, maxLength: 10 }
  )

  it('should create exactly one scene node per label', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(arbitraryLabelName, arbitraryLabelBody),
          { minLength: 1, maxLength: 5 }
        ).filter(labels => {
          // Ensure unique label names
          const names = labels.map(([name]) => name)
          return new Set(names).size === names.length
        }),
        (labelData) => {
          const builder = new FlowGraphBuilder()
          
          // Create labels from the generated data
          const labels = labelData.map(([name, body]) => createLabel(name, body))
          const ast = createScript(labels)
          
          const graph = builder.buildGraph(ast)
          
          // Count scene nodes
          const sceneNodes = graph.nodes.filter(n => n.type === 'scene')
          
          // Should have exactly one scene node per label
          expect(sceneNodes.length).toBe(labelData.length)
          
          // Each label name should appear in exactly one scene node
          const sceneLabels = sceneNodes.map(n => n.data.label)
          const labelNames = labelData.map(([name]) => name)
          
          for (const name of labelNames) {
            const count = sceneLabels.filter(l => l === name).length
            expect(count).toBe(1)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should display label name prominently in scene node', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelBody,
        (labelName, body) => {
          const builder = new FlowGraphBuilder()
          const label = createLabel(labelName, body)
          const ast = createScript([label])
          
          const graph = builder.buildGraph(ast)
          const sceneNodes = graph.nodes.filter(n => n.type === 'scene')
          
          expect(sceneNodes.length).toBe(1)
          
          // Scene node should have the label name
          expect(sceneNodes[0].data.label).toBe(labelName)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate preview from label content', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        fc.array(arbitraryDialogueNode, { minLength: 1, maxLength: 5 }),
        (labelName, dialogues) => {
          const builder = new FlowGraphBuilder()
          const label = createLabel(labelName, dialogues)
          const ast = createScript([label])
          
          const graph = builder.buildGraph(ast)
          const sceneNodes = graph.nodes.filter(n => n.type === 'scene')
          
          expect(sceneNodes.length).toBe(1)
          
          // Scene node should have a preview
          const preview = sceneNodes[0].data.preview
          expect(preview).toBeDefined()
          expect(typeof preview).toBe('string')
          
          // Preview should contain content from the first dialogue(s)
          // At least the first dialogue's speaker or text should appear
          if (dialogues.length > 0) {
            const firstDialogue = dialogues[0]
            const speaker = firstDialogue.speaker || '旁白'
            // Preview should mention the speaker
            expect(preview).toContain(speaker)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should include visual commands in preview', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitrarySceneNode,
        fc.array(arbitraryDialogueNode, { minLength: 0, maxLength: 3 }),
        (labelName, sceneNode, dialogues) => {
          const builder = new FlowGraphBuilder()
          const body: ASTNode[] = [sceneNode, ...dialogues]
          const label = createLabel(labelName, body)
          const ast = createScript([label])
          
          const graph = builder.buildGraph(ast)
          const sceneNodes = graph.nodes.filter(n => n.type === 'scene')
          
          expect(sceneNodes.length).toBe(1)
          
          // Preview should mention the scene command
          const preview = sceneNodes[0].data.preview
          expect(preview).toBeDefined()
          expect(preview).toContain('scene')
          expect(preview).toContain(sceneNode.image)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should determine correct exit type based on label content', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        fc.array(arbitraryDialogueNode, { minLength: 1, maxLength: 3 }),
        arbitraryLabelName,
        (labelName, dialogues, jumpTarget) => {
          const builder = new FlowGraphBuilder()
          
          // Label ending with jump
          const bodyWithJump: ASTNode[] = [...dialogues, createJump('jump-1', jumpTarget)]
          const labelWithJump = createLabel(labelName, bodyWithJump)
          const astWithJump = createScript([labelWithJump])
          
          const graphWithJump = builder.buildGraph(astWithJump)
          const sceneNodesWithJump = graphWithJump.nodes.filter(n => n.type === 'scene')
          
          expect(sceneNodesWithJump.length).toBe(1)
          expect(sceneNodesWithJump[0].data.exitType).toBe('jump')
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should detect menu exit type', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        fc.array(arbitraryDialogueNode, { minLength: 0, maxLength: 2 }),
        fc.array(
          arbitraryText.map(text => ({ text, body: [] as ASTNode[] })),
          { minLength: 1, maxLength: 3 }
        ),
        (labelName, dialogues, choices) => {
          const builder = new FlowGraphBuilder()
          
          // Label ending with menu
          const menu = createMenu('menu-1', choices)
          const bodyWithMenu: ASTNode[] = [...dialogues, menu]
          const labelWithMenu = createLabel(labelName, bodyWithMenu)
          const astWithMenu = createScript([labelWithMenu])
          
          const graphWithMenu = builder.buildGraph(astWithMenu)
          const sceneNodesWithMenu = graphWithMenu.nodes.filter(n => n.type === 'scene')
          
          expect(sceneNodesWithMenu.length).toBe(1)
          expect(sceneNodesWithMenu[0].data.exitType).toBe('menu')
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should detect fall-through exit type for labels without explicit exit', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        fc.array(arbitraryDialogueNode, { minLength: 1, maxLength: 5 }),
        (labelName, dialogues) => {
          const builder = new FlowGraphBuilder()
          
          // Label with only dialogues (no explicit exit)
          const label = createLabel(labelName, dialogues)
          const ast = createScript([label])
          
          const graph = builder.buildGraph(ast)
          const sceneNodes = graph.nodes.filter(n => n.type === 'scene')
          
          expect(sceneNodes.length).toBe(1)
          expect(sceneNodes[0].data.exitType).toBe('fall-through')
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve all statements from label in child nodes', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        fc.array(arbitraryDialogueNode, { minLength: 1, maxLength: 8 }),
        (labelName, dialogues) => {
          const builder = new FlowGraphBuilder()
          const label = createLabel(labelName, dialogues)
          const ast = createScript([label])
          
          const graph = builder.buildGraph(ast)
          
          // Count total dialogues in all dialogue-block nodes
          const dialogueBlocks = graph.nodes.filter(n => n.type === 'dialogue-block')
          const totalDialogues = dialogueBlocks.reduce(
            (sum, block) => sum + (block.data.dialogues?.length || 0),
            0
          )
          
          // All dialogues should be preserved
          expect(totalDialogues).toBe(dialogues.length)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
