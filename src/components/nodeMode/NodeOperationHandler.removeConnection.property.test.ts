/**
 * Property-Based Tests for NodeOperationHandler.removeConnection
 * 
 * Feature: node-creation-persistence
 * 
 * Property 7: 连接删除同步正确性
 * Validates: Requirements 5.3
 * 
 * For any connection deletion operation, if the connection corresponds to
 * a jump/call statement in the AST, that statement should be removed from the AST.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { NodeOperationHandler } from './NodeOperationHandler'
import { PendingNodePool } from './PendingNodePool'
import { NodeConnectionResolver } from './NodeConnectionResolver'
import { ASTSynchronizer } from './ASTSynchronizer'
import { FlowGraph, FlowNode, FlowEdge } from './FlowGraphBuilder'
import {
  RenpyScript,
  ASTNode,
  LabelNode,
  DialogueNode,
  JumpNode,
  CallNode,
  MenuNode,
  MenuChoice,
  IfNode,
  IfBranch,
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
 * Helper to create a call node
 */
function createCall(id: string, target: string): CallNode {
  return {
    id,
    type: 'call',
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
 * Helper to create an if node
 */
function createIf(id: string, branches: IfBranch[]): IfNode {
  return {
    id,
    type: 'if',
    branches,
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
      } else if (node.type === 'if') {
        const ifNode = node as IfNode
        for (const branch of ifNode.branches) {
          extractFromBody(branch.body)
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
      } else if (node.type === 'if') {
        const ifNode = node as IfNode
        for (const branch of ifNode.branches) {
          extractFromBody(branch.body)
        }
      }
    }
  }
  
  extractFromBody(ast.statements)
  return calls
}

/**
 * Count jumps to a specific target in an AST
 */
function countJumpsToTarget(ast: RenpyScript, targetLabel: string): number {
  return extractJumps(ast).filter(j => j.target === targetLabel).length
}

/**
 * Count calls to a specific target in an AST
 */
function countCallsToTarget(ast: RenpyScript, targetLabel: string): number {
  return extractCalls(ast).filter(c => c.target === targetLabel).length
}

describe('Property 7: 连接删除同步正确性', () => {
  /**
   * Property 7: Connection Deletion Sync Correctness
   * 
   * For any connection deletion operation:
   * - If the connection corresponds to a jump statement, it should be removed
   * - If the connection corresponds to a call statement, it should be removed
   * - If the connection is from a menu choice, the jump in that choice should be removed
   * - If the connection is from a condition branch, the jump in that branch should be removed
   * 
   * Feature: node-creation-persistence, Property 7: 连接删除同步正确性
   * Validates: Requirements 5.3
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

  it('should remove jump statement when deleting connection from jump node to scene', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        (sourceLabel, targetLabel) => {
          // Ensure labels are different
          if (sourceLabel === targetLabel) return true

          // Create AST with a jump statement
          const jumpNode = createJump('jump-1', targetLabel)
          const sourceAstLabel = createLabel(sourceLabel, [
            createDialogue('d-1', null, 'Some dialogue'),
            jumpNode,
          ])
          const targetAstLabel = createLabel(targetLabel, [
            createDialogue('d-2', null, 'Target dialogue'),
          ])
          const ast = createScript([sourceAstLabel, targetAstLabel])

          // Verify jump exists before removal
          const jumpsBefore = countJumpsToTarget(ast, targetLabel)
          expect(jumpsBefore).toBe(1)

          // Create flow graph with jump node
          const graph: FlowGraph = {
            nodes: [
              {
                id: 'scene-source',
                type: 'scene',
                position: { x: 0, y: 0 },
                data: { label: sourceLabel },
              },
              {
                id: 'jump-node',
                type: 'jump',
                position: { x: 100, y: 100 },
                data: {
                  target: targetLabel,
                  astNodes: [jumpNode],
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
                id: 'e-source-jump',
                source: 'scene-source',
                target: 'jump-node',
                type: 'normal',
              },
              {
                id: 'e-jump-target',
                source: 'jump-node',
                target: 'scene-target',
                type: 'jump',
              },
            ],
          }

          // Remove the connection from jump node to target scene
          const result = handler.removeConnection(
            'jump-node',
            'scene-target',
            undefined,
            graph,
            ast
          )

          // The removal should succeed
          expect(result.success).toBe(true)

          // Verify jump was removed from AST
          const jumpsAfter = countJumpsToTarget(ast, targetLabel)
          expect(jumpsAfter).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should remove call statement when deleting connection from call node to scene', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        (sourceLabel, targetLabel) => {
          // Ensure labels are different
          if (sourceLabel === targetLabel) return true

          // Create AST with a call statement
          const callNode = createCall('call-1', targetLabel)
          const sourceAstLabel = createLabel(sourceLabel, [
            createDialogue('d-1', null, 'Some dialogue'),
            callNode,
          ])
          const targetAstLabel = createLabel(targetLabel, [
            createDialogue('d-2', null, 'Target dialogue'),
          ])
          const ast = createScript([sourceAstLabel, targetAstLabel])

          // Verify call exists before removal
          const callsBefore = countCallsToTarget(ast, targetLabel)
          expect(callsBefore).toBe(1)

          // Create flow graph with call node
          const graph: FlowGraph = {
            nodes: [
              {
                id: 'scene-source',
                type: 'scene',
                position: { x: 0, y: 0 },
                data: { label: sourceLabel },
              },
              {
                id: 'call-node',
                type: 'call',
                position: { x: 100, y: 100 },
                data: {
                  target: targetLabel,
                  isCall: true,
                  astNodes: [callNode],
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
                id: 'e-source-call',
                source: 'scene-source',
                target: 'call-node',
                type: 'normal',
              },
              {
                id: 'e-call-target',
                source: 'call-node',
                target: 'scene-target',
                type: 'call',
              },
            ],
          }

          // Remove the connection from call node to target scene
          const result = handler.removeConnection(
            'call-node',
            'scene-target',
            undefined,
            graph,
            ast
          )

          // The removal should succeed
          expect(result.success).toBe(true)

          // Verify call was removed from AST
          const callsAfter = countCallsToTarget(ast, targetLabel)
          expect(callsAfter).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should remove jump from menu choice when deleting connection from choice to scene', () => {
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

          // Create menu choices with a jump in the selected choice
          const choices: MenuChoice[] = choiceTexts.map((text, i) => ({
            text,
            body: i === choiceIndex ? [createJump(`jump-choice-${i}`, targetLabel)] : [],
          }))

          // Create AST with menu
          const menuNode = createMenu('menu-1', choices)
          const sourceAstLabel = createLabel(sourceLabel, [menuNode])
          const targetAstLabel = createLabel(targetLabel, [
            createDialogue('d-2', null, 'Target dialogue'),
          ])
          const ast = createScript([sourceAstLabel, targetAstLabel])

          // Verify jump exists in choice before removal
          const jumpsBefore = countJumpsToTarget(ast, targetLabel)
          expect(jumpsBefore).toBe(1)

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
                    body: c.body,
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
              {
                id: `e-choice-${choiceIndex}-target`,
                source: 'menu-node',
                sourceHandle: `choice-${choiceIndex}`,
                target: 'scene-target',
                type: 'jump',
              },
            ],
          }

          // Remove the connection from menu choice to target scene
          const result = handler.removeConnection(
            'menu-node',
            'scene-target',
            `choice-${choiceIndex}`,
            graph,
            ast
          )

          // The removal should succeed
          expect(result.success).toBe(true)

          // Verify jump was removed from the choice body
          const jumpsAfter = countJumpsToTarget(ast, targetLabel)
          expect(jumpsAfter).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should remove jump from condition branch when deleting connection from branch to scene', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        fc.integer({ min: 0, max: 1 }),
        (sourceLabel, targetLabel, branchIndex) => {
          // Ensure labels are different
          if (sourceLabel === targetLabel) return true

          // Create if branches with a jump in the selected branch
          const branches: IfBranch[] = [
            {
              condition: 'some_condition',
              body: branchIndex === 0 ? [createJump('jump-branch-0', targetLabel)] : [],
            },
            {
              condition: null, // else branch
              body: branchIndex === 1 ? [createJump('jump-branch-1', targetLabel)] : [],
            },
          ]

          // Create AST with if node
          const ifNode = createIf('if-1', branches)
          const sourceAstLabel = createLabel(sourceLabel, [ifNode])
          const targetAstLabel = createLabel(targetLabel, [
            createDialogue('d-2', null, 'Target dialogue'),
          ])
          const ast = createScript([sourceAstLabel, targetAstLabel])

          // Verify jump exists in branch before removal
          const jumpsBefore = countJumpsToTarget(ast, targetLabel)
          expect(jumpsBefore).toBe(1)

          // Create flow graph with condition node
          const graph: FlowGraph = {
            nodes: [
              {
                id: 'scene-source',
                type: 'scene',
                position: { x: 0, y: 0 },
                data: { label: sourceLabel },
              },
              {
                id: 'condition-node',
                type: 'condition',
                position: { x: 0, y: 100 },
                data: {
                  condition: 'some_condition',
                  branches: branches.map((b, i) => ({
                    condition: b.condition,
                    portId: `branch-${i}`,
                    body: b.body,
                  })),
                  astNodes: [ifNode],
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
                id: 'e-source-condition',
                source: 'scene-source',
                target: 'condition-node',
                type: 'normal',
              },
              {
                id: `e-branch-${branchIndex}-target`,
                source: 'condition-node',
                sourceHandle: `branch-${branchIndex}`,
                target: 'scene-target',
                type: 'jump',
              },
            ],
          }

          // Remove the connection from condition branch to target scene
          const result = handler.removeConnection(
            'condition-node',
            'scene-target',
            `branch-${branchIndex}`,
            graph,
            ast
          )

          // The removal should succeed
          expect(result.success).toBe(true)

          // Verify jump was removed from the branch body
          const jumpsAfter = countJumpsToTarget(ast, targetLabel)
          expect(jumpsAfter).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve other statements when removing a connection', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        fc.array(fc.tuple(fc.constant(null), arbitraryChoiceText), { minLength: 1, maxLength: 3 }),
        (sourceLabel, targetLabel, dialogueData) => {
          // Ensure labels are different
          if (sourceLabel === targetLabel) return true

          // Create AST with dialogues and a jump
          const dialogues = dialogueData.map(([speaker, text], i) =>
            createDialogue(`d-${i}`, speaker, text)
          )
          const jumpNode = createJump('jump-1', targetLabel)
          const sourceAstLabel = createLabel(sourceLabel, [...dialogues, jumpNode])
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
                id: 'jump-node',
                type: 'jump',
                position: { x: 100, y: 100 },
                data: {
                  target: targetLabel,
                  astNodes: [jumpNode],
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
                id: 'e-source-jump',
                source: 'scene-source',
                target: 'jump-node',
                type: 'normal',
              },
              {
                id: 'e-jump-target',
                source: 'jump-node',
                target: 'scene-target',
                type: 'jump',
              },
            ],
          }

          // Remove the connection
          handler.removeConnection('jump-node', 'scene-target', undefined, graph, ast)

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
})
