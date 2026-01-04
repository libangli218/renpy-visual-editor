/**
 * Property-Based Tests for NodeOperationHandler
 * 
 * Feature: node-creation-persistence
 * 
 * Property 3: 流程控制语句创建正确性
 * Validates: Requirements 2.3, 3.4, 4.1, 4.2
 * 
 * For any connection from node A to Scene node B, if A is a Menu choice or
 * a normal flow node, a jump statement pointing to B's label should be created
 * in A's body; if it's a Call node, a call statement should be created.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { NodeOperationHandler } from './NodeOperationHandler'
import { PendingNodePool } from './PendingNodePool'
import { NodeConnectionResolver } from './NodeConnectionResolver'
import { ASTSynchronizer } from './ASTSynchronizer'
import { FlowGraph, FlowNode } from './FlowGraphBuilder'
import {
  RenpyScript,
  ASTNode,
  LabelNode,
  DialogueNode,
  JumpNode,
  CallNode,
  MenuNode,
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
 * Extract all jump statements from an AST
 */
function extractJumps(ast: RenpyScript): { target: string; id: string }[] {
  const jumps: { target: string; id: string }[] = []
  
  function extractFromBody(body: ASTNode[]): void {
    for (const node of body) {
      if (node.type === 'jump') {
        const j = node as JumpNode
        jumps.push({ target: j.target, id: j.id })
      } else if (node.type === 'label') {
        extractFromBody((node as LabelNode).body)
      } else if (node.type === 'menu') {
        const menu = node as MenuNode
        for (const choice of menu.choices) {
          extractFromBody(choice.body)
        }
      }
    }
  }
  
  extractFromBody(ast.statements)
  return jumps
}

/**
 * Extract all call statements from an AST
 */
function extractCalls(ast: RenpyScript): { target: string; id: string }[] {
  const calls: { target: string; id: string }[] = []
  
  function extractFromBody(body: ASTNode[]): void {
    for (const node of body) {
      if (node.type === 'call') {
        const c = node as CallNode
        calls.push({ target: c.target, id: c.id })
      } else if (node.type === 'label') {
        extractFromBody((node as LabelNode).body)
      } else if (node.type === 'menu') {
        const menu = node as MenuNode
        for (const choice of menu.choices) {
          extractFromBody(choice.body)
        }
      }
    }
  }
  
  extractFromBody(ast.statements)
  return calls
}

describe('Property 3: 流程控制语句创建正确性', () => {
  /**
   * Property 3: Flow Control Statement Creation Correctness
   * 
   * For any connection from node A to Scene node B:
   * - If A is a Menu choice, a jump statement to B's label should be created in the choice body
   * - If A is a Jump node, a jump statement to B's label should be created
   * - If A is a Call node, a call statement to B's label should be created
   * 
   * Feature: node-creation-persistence, Property 3: 流程控制语句创建正确性
   * Validates: Requirements 2.3, 3.4, 4.1, 4.2
   */

  // Arbitrary for valid label names
  const arbitraryLabelName = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'),
    { minLength: 1, maxLength: 15 }
  ).filter(s => /^[a-z_][a-z0-9_]*$/.test(s))

  // Arbitrary for choice text
  const arbitraryChoiceText = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '),
    { minLength: 1, maxLength: 30 }
  )

  let handler: NodeOperationHandler
  let pendingPool: PendingNodePool
  let resolver: NodeConnectionResolver
  let synchronizer: ASTSynchronizer

  beforeEach(() => {
    pendingPool = new PendingNodePool()
    resolver = new NodeConnectionResolver()
    synchronizer = new ASTSynchronizer()
    handler = new NodeOperationHandler(pendingPool, resolver, synchronizer)
  })

  it('should create jump statement when connecting Jump node to Scene', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        (sourceLabel, targetLabel) => {
          // Ensure labels are different
          if (sourceLabel === targetLabel) return true

          // Create AST with source label
          const sourceAstLabel = createLabel(sourceLabel, [
            createDialogue('d-1', null, 'Some dialogue'),
          ])
          const targetAstLabel = createLabel(targetLabel, [
            createDialogue('d-2', null, 'Target dialogue'),
          ])
          const ast = createScript([sourceAstLabel, targetAstLabel])

          // Create flow graph
          const graph: FlowGraph = {
            nodes: [
              {
                id: 'scene-source',
                type: 'scene',
                position: { x: 0, y: 0 },
                data: { label: sourceLabel },
              },
              {
                id: 'scene-target',
                type: 'scene',
                position: { x: 0, y: 200 },
                data: { label: targetLabel },
              },
            ],
            edges: [],
          }

          // Create a pending jump node
          const jumpNodeId = handler.createNode('jump', { x: 100, y: 100 }, {
            target: targetLabel,
          })

          // Verify the node was created in the pending pool
          expect(handler.isPendingNode(jumpNodeId)).toBe(true)

          // Connect the jump node to the source scene
          const connectResult = handler.connectNodes(
            'scene-source',
            jumpNodeId,
            undefined,
            graph,
            ast
          )

          // The connection should succeed
          expect(connectResult.success).toBe(true)

          // Verify a jump statement was created in the AST
          const jumps = extractJumps(ast)
          const jumpToTarget = jumps.find(j => j.target === targetLabel)
          expect(jumpToTarget).toBeDefined()

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should create call statement when connecting Call node to Scene', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        (sourceLabel, targetLabel) => {
          // Ensure labels are different
          if (sourceLabel === targetLabel) return true

          // Create AST with source label
          const sourceAstLabel = createLabel(sourceLabel, [
            createDialogue('d-1', null, 'Some dialogue'),
          ])
          const targetAstLabel = createLabel(targetLabel, [
            createDialogue('d-2', null, 'Target dialogue'),
          ])
          const ast = createScript([sourceAstLabel, targetAstLabel])

          // Create flow graph
          const graph: FlowGraph = {
            nodes: [
              {
                id: 'scene-source',
                type: 'scene',
                position: { x: 0, y: 0 },
                data: { label: sourceLabel },
              },
              {
                id: 'scene-target',
                type: 'scene',
                position: { x: 0, y: 200 },
                data: { label: targetLabel },
              },
            ],
            edges: [],
          }

          // Create a pending call node
          const callNodeId = handler.createNode('call', { x: 100, y: 100 }, {
            target: targetLabel,
          })

          // Verify the node was created in the pending pool
          expect(handler.isPendingNode(callNodeId)).toBe(true)

          // Connect the call node to the source scene
          const connectResult = handler.connectNodes(
            'scene-source',
            callNodeId,
            undefined,
            graph,
            ast
          )

          // The connection should succeed
          expect(connectResult.success).toBe(true)

          // Verify a call statement was created in the AST
          const calls = extractCalls(ast)
          const callToTarget = calls.find(c => c.target === targetLabel)
          expect(callToTarget).toBeDefined()

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should create jump in menu choice body when connecting choice to Scene', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        fc.array(arbitraryChoiceText, { minLength: 1, maxLength: 4 }),
        fc.integer({ min: 0, max: 3 }),
        (sourceLabel, targetLabel, choiceTexts, choiceIndexRaw) => {
          // Ensure labels are different
          if (sourceLabel === targetLabel) return true
          if (choiceTexts.length === 0) return true

          const choiceIndex = choiceIndexRaw % choiceTexts.length

          // Create menu choices
          const choices: MenuChoice[] = choiceTexts.map((text) => ({
            text,
            body: [],
          }))

          // Create AST with menu
          const menuNode = createMenu('menu-1', choices)
          const sourceAstLabel = createLabel(sourceLabel, [menuNode])
          const targetAstLabel = createLabel(targetLabel, [
            createDialogue('d-2', null, 'Target dialogue'),
          ])
          const ast = createScript([sourceAstLabel, targetAstLabel])

          // Create flow graph with menu node
          const graph: FlowGraph = {
            nodes: [
              {
                id: 'scene-source',
                type: 'scene',
                position: { x: 0, y: 0 },
                data: { label: sourceLabel },
              },
              {
                id: 'menu-node',
                type: 'menu',
                position: { x: 0, y: 100 },
                data: {
                  choices: choices.map((c, i) => ({
                    text: c.text,
                    portId: `choice-${i}`,
                    body: [],
                  })),
                  astNodes: [menuNode],
                },
              },
              {
                id: 'scene-target',
                type: 'scene',
                position: { x: 0, y: 200 },
                data: { label: targetLabel },
              },
            ],
            edges: [
              {
                id: 'e-source-menu',
                source: 'scene-source',
                target: 'menu-node',
                type: 'normal',
              },
            ],
          }

          // Connect menu choice to target scene
          const connectResult = handler.connectNodes(
            'menu-node',
            'scene-target',
            `choice-${choiceIndex}`,
            graph,
            ast
          )

          // The connection should succeed
          expect(connectResult.success).toBe(true)

          // Verify a jump statement was created in the menu choice body
          const menuInAst = ast.statements
            .filter(s => s.type === 'label')
            .flatMap(l => (l as LabelNode).body)
            .find(n => n.type === 'menu') as MenuNode | undefined

          if (menuInAst) {
            const choice = menuInAst.choices[choiceIndex]
            const jumpInChoice = choice.body.find(n => n.type === 'jump') as JumpNode | undefined
            expect(jumpInChoice).toBeDefined()
            expect(jumpInChoice?.target).toBe(targetLabel)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve existing statements when adding jump/call', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        fc.array(fc.tuple(fc.constant(null), arbitraryChoiceText), { minLength: 1, maxLength: 3 }),
        (sourceLabel, targetLabel, dialogueData) => {
          // Ensure labels are different
          if (sourceLabel === targetLabel) return true

          // Create AST with existing dialogues
          const dialogues = dialogueData.map(([speaker, text], i) =>
            createDialogue(`d-${i}`, speaker, text)
          )
          const sourceAstLabel = createLabel(sourceLabel, dialogues)
          const targetAstLabel = createLabel(targetLabel, [
            createDialogue('d-target', null, 'Target dialogue'),
          ])
          const ast = createScript([sourceAstLabel, targetAstLabel])

          // Count original dialogues
          const originalDialogueCount = dialogueData.length

          // Create flow graph
          const graph: FlowGraph = {
            nodes: [
              {
                id: 'scene-source',
                type: 'scene',
                position: { x: 0, y: 0 },
                data: { label: sourceLabel },
              },
              {
                id: 'scene-target',
                type: 'scene',
                position: { x: 0, y: 200 },
                data: { label: targetLabel },
              },
            ],
            edges: [],
          }

          // Create and connect a jump node
          const jumpNodeId = handler.createNode('jump', { x: 100, y: 100 }, {
            target: targetLabel,
          })

          handler.connectNodes('scene-source', jumpNodeId, undefined, graph, ast)

          // Verify original dialogues are preserved
          const sourceLabelInAst = ast.statements.find(
            s => s.type === 'label' && (s as LabelNode).name === sourceLabel
          ) as LabelNode | undefined

          if (sourceLabelInAst) {
            const dialoguesInLabel = sourceLabelInAst.body.filter(n => n.type === 'dialogue')
            expect(dialoguesInLabel.length).toBe(originalDialogueCount)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle multiple jump/call nodes to different targets', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 3, maxLength: 5 }),
        (labelNames) => {
          const uniqueLabels = [...new Set(labelNames)]
          if (uniqueLabels.length < 3) return true

          // First label is source, rest are targets
          const targetLabels = uniqueLabels.slice(1)

          // Create AST with all labels
          const labels = uniqueLabels.map(name =>
            createLabel(name, [createDialogue(`d-${name}`, null, `In ${name}`)])
          )
          const ast = createScript(labels)

          // Create flow graph
          const nodes: FlowNode[] = uniqueLabels.map((name, i) => ({
            id: `scene-${i}`,
            type: 'scene' as const,
            position: { x: 0, y: i * 200 },
            data: { label: name },
          }))

          const graph: FlowGraph = { nodes, edges: [] }

          // Create jump nodes to each target
          for (const targetLabel of targetLabels) {
            const jumpNodeId = handler.createNode('jump', { x: 100, y: 100 }, {
              target: targetLabel,
            })

            handler.connectNodes('scene-0', jumpNodeId, undefined, graph, ast)
          }

          // Verify all jumps were created
          const jumps = extractJumps(ast)
          for (const targetLabel of targetLabels) {
            const jumpToTarget = jumps.find(j => j.target === targetLabel)
            expect(jumpToTarget).toBeDefined()
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
