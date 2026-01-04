/**
 * Property-Based Tests for ASTSynchronizer
 * 
 * Feature: node-editor-redesign
 * 
 * Property 2: Graph-AST Round Trip
 * Validates: Requirements 8.1, 8.3
 * 
 * For any valid story script AST, converting to flow graph and back to AST
 * should preserve all semantic content (labels, dialogues, jumps, menus).
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { ASTSynchronizer } from './ASTSynchronizer'
import { FlowGraphBuilder } from './FlowGraphBuilder'
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
 * Extract all labels from an AST
 */
function extractLabels(ast: RenpyScript): string[] {
  return ast.statements
    .filter(s => s.type === 'label')
    .map(s => (s as LabelNode).name)
}

/**
 * Extract all dialogues from an AST (recursively)
 */
function extractDialogues(ast: RenpyScript): { speaker: string | null; text: string }[] {
  const dialogues: { speaker: string | null; text: string }[] = []
  
  function extractFromBody(body: ASTNode[]): void {
    for (const node of body) {
      if (node.type === 'dialogue') {
        const d = node as DialogueNode
        dialogues.push({ speaker: d.speaker, text: d.text })
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
  return dialogues
}

describe('Property 2: Graph-AST Round Trip', () => {
  /**
   * Property 2: Graph-AST Round Trip
   * For any valid story script AST, converting to flow graph and back to AST
   * should preserve all semantic content (labels, dialogues, jumps, menus).
   * 
   * Feature: node-editor-redesign, Property 2: Graph-AST Round Trip
   * Validates: Requirements 8.1, 8.3
   */

  // Arbitrary for valid label names
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

  it('should preserve label names through graph conversion', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 1, maxLength: 5 }),
        (labelNames) => {
          // Create unique label names
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length === 0) return true

          const builder = new FlowGraphBuilder()

          // Create labels with simple dialogue content
          const labels = uniqueNames.map(name =>
            createLabel(name, [createDialogue(`d-${name}`, null, `Content of ${name}`)])
          )

          const ast = createScript(labels)
          const graph = builder.buildGraph(ast)

          // Extract label names from the graph
          const graphLabelNames = graph.nodes
            .filter(n => n.type === 'scene' && n.data.label)
            .map(n => n.data.label!)

          // All original labels should be present in the graph
          for (const name of uniqueNames) {
            expect(graphLabelNames).toContain(name)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve dialogue content through graph conversion', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(arbitrarySpeaker, arbitraryText),
          { minLength: 1, maxLength: 5 }
        ),
        (dialogueData) => {
          const builder = new FlowGraphBuilder()

          // Create dialogues
          const dialogues = dialogueData.map(([speaker, text], i) =>
            createDialogue(`d-${i}`, speaker, text)
          )

          const label = createLabel('test', dialogues)
          const ast = createScript([label])
          const graph = builder.buildGraph(ast)

          // Extract dialogues from the graph
          const graphDialogues: { speaker: string | null; text: string }[] = []
          for (const node of graph.nodes) {
            if (node.type === 'dialogue-block' && node.data.dialogues) {
              for (const d of node.data.dialogues) {
                graphDialogues.push({ speaker: d.speaker, text: d.text })
              }
            }
          }

          // All original dialogues should be present
          expect(graphDialogues.length).toBe(dialogueData.length)

          for (let i = 0; i < dialogueData.length; i++) {
            expect(graphDialogues[i].speaker).toBe(dialogueData[i][0])
            expect(graphDialogues[i].text).toBe(dialogueData[i][1])
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve jump targets through graph conversion', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 2, maxLength: 4 }),
        (labelNames) => {
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length < 2) return true

          const builder = new FlowGraphBuilder()

          // Create labels where each jumps to the next
          const labels = uniqueNames.map((name, i) => {
            const nextLabel = uniqueNames[(i + 1) % uniqueNames.length]
            return createLabel(name, [
              createDialogue(`d-${name}`, null, `In ${name}`),
              createJump(`j-${name}`, nextLabel),
            ])
          })

          const ast = createScript(labels)
          const graph = builder.buildGraph(ast)

          // Extract jump targets from the graph
          const graphJumpTargets: string[] = []
          for (const node of graph.nodes) {
            if (node.type === 'jump' && node.data.target) {
              graphJumpTargets.push(node.data.target)
            }
          }

          // All jump targets should be present
          expect(graphJumpTargets.length).toBe(uniqueNames.length)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve call targets through graph conversion', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 2, maxLength: 4 }),
        (labelNames) => {
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length < 2) return true

          const builder = new FlowGraphBuilder()

          // Create labels where each calls the next
          const labels = uniqueNames.map((name, i) => {
            const nextLabel = uniqueNames[(i + 1) % uniqueNames.length]
            return createLabel(name, [
              createDialogue(`d-${name}`, null, `In ${name}`),
              createCall(`c-${name}`, nextLabel),
            ])
          })

          const ast = createScript(labels)
          const graph = builder.buildGraph(ast)

          // Extract call targets from the graph
          const graphCallTargets: string[] = []
          for (const node of graph.nodes) {
            if (node.type === 'call' && node.data.target) {
              graphCallTargets.push(node.data.target)
            }
          }

          // All call targets should be present
          expect(graphCallTargets.length).toBe(uniqueNames.length)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve menu choices through graph conversion', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryText, { minLength: 1, maxLength: 4 }),
        fc.array(arbitraryLabelName, { minLength: 1, maxLength: 4 }),
        (choiceTexts, targetLabels) => {
          const uniqueTargets = [...new Set(targetLabels)]
          if (uniqueTargets.length === 0 || choiceTexts.length === 0) return true

          const builder = new FlowGraphBuilder()

          // Create menu choices
          const choices: MenuChoice[] = choiceTexts.map((text, i) => ({
            text,
            body: [createJump(`j-choice-${i}`, uniqueTargets[i % uniqueTargets.length])],
          }))

          const menu = createMenu('menu-1', choices)
          const startLabel = createLabel('start', [menu])

          // Create target labels
          const targetLabelNodes = uniqueTargets.map(name =>
            createLabel(name, [createDialogue(`d-${name}`, null, `In ${name}`)])
          )

          const ast = createScript([startLabel, ...targetLabelNodes])
          const graph = builder.buildGraph(ast)

          // Find menu node in graph
          const menuNodes = graph.nodes.filter(n => n.type === 'menu')
          expect(menuNodes.length).toBe(1)

          const menuNode = menuNodes[0]
          expect(menuNode.data.choices?.length).toBe(choiceTexts.length)

          // Verify choice texts are preserved
          for (let i = 0; i < choiceTexts.length; i++) {
            expect(menuNode.data.choices?.[i].text).toBe(choiceTexts[i])
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve AST structure when syncing unchanged graph', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        fc.array(fc.tuple(arbitrarySpeaker, arbitraryText), { minLength: 1, maxLength: 3 }),
        (labelName, dialogueData) => {
          const builder = new FlowGraphBuilder()
          const synchronizer = new ASTSynchronizer()

          // Create a simple AST
          const dialogues = dialogueData.map(([speaker, text], i) =>
            createDialogue(`d-${i}`, speaker, text)
          )
          const label = createLabel(labelName, dialogues)
          const originalAst = createScript([label])

          // Convert to graph and sync back
          const graph = builder.buildGraph(originalAst)
          const syncResult = synchronizer.syncToAst(graph, originalAst)

          // Extract content from both ASTs
          const originalLabels = extractLabels(originalAst)
          const syncedLabels = extractLabels(syncResult.ast)

          const originalDialogues = extractDialogues(originalAst)
          const syncedDialogues = extractDialogues(syncResult.ast)

          // Labels should be preserved
          expect(syncedLabels).toEqual(originalLabels)

          // Dialogues should be preserved
          expect(syncedDialogues.length).toBe(originalDialogues.length)
          for (let i = 0; i < originalDialogues.length; i++) {
            expect(syncedDialogues[i].speaker).toBe(originalDialogues[i].speaker)
            expect(syncedDialogues[i].text).toBe(originalDialogues[i].text)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve raw content when available', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryText,
        (labelName, dialogueText) => {
          const synchronizer = new ASTSynchronizer()

          // Create AST with raw content
          const dialogue: DialogueNode = {
            id: 'd-1',
            type: 'dialogue',
            speaker: null,
            text: dialogueText,
            raw: `    "${dialogueText}"`,
            line: 2,
          }

          const label: LabelNode = {
            id: `label-${labelName}`,
            type: 'label',
            name: labelName,
            body: [dialogue],
            raw: `label ${labelName}:`,
            line: 1,
          }

          const originalAst = createScript([label])

          // Clone and modify slightly
          const modifiedAst = JSON.parse(JSON.stringify(originalAst))

          // Preserve raw content
          const preserved = synchronizer.preserveRawContent(originalAst, modifiedAst)

          // Raw content should be preserved
          const preservedLabel = preserved.statements[0] as LabelNode
          expect(preservedLabel.raw).toBe(`label ${labelName}:`)
          expect(preservedLabel.line).toBe(1)

          const preservedDialogue = preservedLabel.body[0] as DialogueNode
          expect(preservedDialogue.raw).toBe(`    "${dialogueText}"`)
          expect(preservedDialogue.line).toBe(2)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


describe('Property 4: Edge-Jump Correspondence', () => {
  /**
   * Property 4: Edge-Jump Correspondence
   * For any flow graph, every edge of type 'jump' or 'call' should correspond
   * to exactly one jump/call statement in the AST, and vice versa.
   * 
   * Feature: node-editor-redesign, Property 4: Edge-Jump Correspondence
   * Validates: Requirements 5.1, 5.2, 8.4, 8.5
   */

  // Arbitrary for valid label names
  const arbitraryLabelName = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'),
    { minLength: 1, maxLength: 15 }
  ).filter(s => /^[a-z_][a-z0-9_]*$/.test(s))

  // Arbitrary for dialogue text
  const arbitraryText = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '),
    { minLength: 1, maxLength: 30 }
  )

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

  it('should create jump edges for all jump statements', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 2, maxLength: 5 }),
        (labelNames) => {
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length < 2) return true

          const builder = new FlowGraphBuilder()

          // Create labels where each jumps to the next
          const labels = uniqueNames.map((name, i) => {
            const nextLabel = uniqueNames[(i + 1) % uniqueNames.length]
            return createLabel(name, [
              createDialogue(`d-${name}`, null, `In ${name}`),
              createJump(`j-${name}`, nextLabel),
            ])
          })

          const ast = createScript(labels)
          const graph = builder.buildGraph(ast)

          // Count jump statements in AST
          const astJumps = extractJumps(ast)

          // Count jump edges in graph
          const jumpEdges = graph.edges.filter(e => e.type === 'jump')

          // Each jump statement should have a corresponding edge
          // Note: The graph may have additional edges from menu choices
          expect(jumpEdges.length).toBeGreaterThanOrEqual(astJumps.length)

          // Each jump node in the graph should have the correct target
          const jumpNodes = graph.nodes.filter(n => n.type === 'jump')
          for (const jumpNode of jumpNodes) {
            const target = jumpNode.data.target
            expect(target).toBeDefined()
            // The target should be one of our labels
            expect(uniqueNames).toContain(target)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should create call edges for all call statements', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 2, maxLength: 5 }),
        (labelNames) => {
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length < 2) return true

          const builder = new FlowGraphBuilder()

          // Create labels where each calls the next
          const labels = uniqueNames.map((name, i) => {
            const nextLabel = uniqueNames[(i + 1) % uniqueNames.length]
            return createLabel(name, [
              createDialogue(`d-${name}`, null, `In ${name}`),
              createCall(`c-${name}`, nextLabel),
            ])
          })

          const ast = createScript(labels)
          const graph = builder.buildGraph(ast)

          // Count call statements in AST
          const astCalls = extractCalls(ast)

          // Count call edges in graph
          const callEdges = graph.edges.filter(e => e.type === 'call')

          // Each call statement should have a corresponding edge
          expect(callEdges.length).toBeGreaterThanOrEqual(astCalls.length)

          // Each call node in the graph should have the correct target
          const callNodes = graph.nodes.filter(n => n.type === 'call')
          for (const callNode of callNodes) {
            const target = callNode.data.target
            expect(target).toBeDefined()
            // The target should be one of our labels
            expect(uniqueNames).toContain(target)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should mark edges as invalid when target label does not exist', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        (sourceName, targetName) => {
          // Ensure source and target are different
          if (sourceName === targetName) return true

          const builder = new FlowGraphBuilder()

          // Create a label that jumps to a non-existent target
          const label = createLabel(sourceName, [
            createDialogue(`d-${sourceName}`, null, `In ${sourceName}`),
            createJump(`j-${sourceName}`, targetName),
          ])

          const ast = createScript([label])
          const graph = builder.buildGraph(ast)

          // Find the jump edge
          const jumpEdges = graph.edges.filter(e => e.type === 'jump')
          expect(jumpEdges.length).toBe(1)

          // The edge should be marked as invalid since target doesn't exist
          expect(jumpEdges[0].valid).toBe(false)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should mark edges as valid when target label exists', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        (sourceName, targetName) => {
          // Ensure source and target are different
          if (sourceName === targetName) return true

          const builder = new FlowGraphBuilder()

          // Create source label that jumps to target
          const sourceLabel = createLabel(sourceName, [
            createDialogue(`d-${sourceName}`, null, `In ${sourceName}`),
            createJump(`j-${sourceName}`, targetName),
          ])

          // Create target label
          const targetLabel = createLabel(targetName, [
            createDialogue(`d-${targetName}`, null, `In ${targetName}`),
          ])

          const ast = createScript([sourceLabel, targetLabel])
          const graph = builder.buildGraph(ast)

          // Find the jump edge
          const jumpEdges = graph.edges.filter(e => e.type === 'jump')
          expect(jumpEdges.length).toBe(1)

          // The edge should be marked as valid since target exists
          expect(jumpEdges[0].valid).toBe(true)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve edge-jump correspondence after sync', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 2, maxLength: 4 }),
        (labelNames) => {
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length < 2) return true

          const builder = new FlowGraphBuilder()
          const synchronizer = new ASTSynchronizer()

          // Create labels with jumps
          const labels = uniqueNames.map((name, i) => {
            const nextLabel = uniqueNames[(i + 1) % uniqueNames.length]
            return createLabel(name, [
              createDialogue(`d-${name}`, null, `In ${name}`),
              createJump(`j-${name}`, nextLabel),
            ])
          })

          const originalAst = createScript(labels)
          const graph = builder.buildGraph(originalAst)

          // Sync the graph back to AST
          const syncResult = synchronizer.syncToAst(graph, originalAst)

          // Extract jumps from both ASTs
          const originalJumps = extractJumps(originalAst)
          const syncedJumps = extractJumps(syncResult.ast)

          // Jump count should be preserved
          expect(syncedJumps.length).toBe(originalJumps.length)

          // Jump targets should be preserved
          const originalTargets = originalJumps.map(j => j.target).sort()
          const syncedTargets = syncedJumps.map(j => j.target).sort()
          expect(syncedTargets).toEqual(originalTargets)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle menu choices with jump targets', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryText, { minLength: 1, maxLength: 3 }),
        fc.array(arbitraryLabelName, { minLength: 2, maxLength: 4 }),
        (choiceTexts, labelNames) => {
          const uniqueLabels = [...new Set(labelNames)]
          if (uniqueLabels.length < 2 || choiceTexts.length === 0) return true

          const builder = new FlowGraphBuilder()

          // Create menu choices that jump to different labels
          const choices: MenuChoice[] = choiceTexts.map((text, i) => ({
            text,
            body: [createJump(`j-choice-${i}`, uniqueLabels[(i + 1) % uniqueLabels.length])],
          }))

          const menu = createMenu('menu-1', choices)
          const startLabel = createLabel(uniqueLabels[0], [menu])

          // Create target labels
          const targetLabels = uniqueLabels.slice(1).map(name =>
            createLabel(name, [createDialogue(`d-${name}`, null, `In ${name}`)])
          )

          const ast = createScript([startLabel, ...targetLabels])
          const graph = builder.buildGraph(ast)

          // Find menu node
          const menuNodes = graph.nodes.filter(n => n.type === 'menu')
          expect(menuNodes.length).toBe(1)

          // Each choice should have a target label extracted
          const menuNode = menuNodes[0]
          for (let i = 0; i < choiceTexts.length; i++) {
            const choice = menuNode.data.choices?.[i]
            expect(choice).toBeDefined()
            // Target label should be extracted from the jump in the choice body
            expect(choice?.targetLabel).toBe(uniqueLabels[(i + 1) % uniqueLabels.length])
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


describe('Property 7: Node Deletion Consistency', () => {
  /**
   * Property 7: Node Deletion Consistency
   * For any node deletion operation, the resulting AST should not contain
   * the deleted statements, and all edges connected to the deleted node
   * should be removed.
   * 
   * Feature: node-editor-redesign, Property 7: Node Deletion Consistency
   * Validates: Requirements 6.4, 8.5
   */

  // Arbitrary for valid label names
  const arbitraryLabelName = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'),
    { minLength: 1, maxLength: 15 }
  ).filter(s => /^[a-z_][a-z0-9_]*$/.test(s))

  // Arbitrary for dialogue text
  const arbitraryText = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '),
    { minLength: 1, maxLength: 30 }
  )

  it('should remove deleted node statements from AST', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 2, maxLength: 5 }),
        (labelNames) => {
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length < 2) return true

          const builder = new FlowGraphBuilder()
          const synchronizer = new ASTSynchronizer()

          // Create labels with dialogues
          const labels = uniqueNames.map(name =>
            createLabel(name, [
              createDialogue(`d-${name}`, null, `Content of ${name}`),
            ])
          )

          const ast = createScript(labels)
          const graph = builder.buildGraph(ast)

          // Pick a random label to delete
          const labelToDelete = uniqueNames[0]
          const nodeToDelete = graph.nodes.find(
            n => n.type === 'scene' && n.data.label === labelToDelete
          )

          if (!nodeToDelete) return true

          // Delete the node
          const result = synchronizer.deleteNode(nodeToDelete.id, graph, ast)

          // The deleted label should not be in the resulting AST
          const remainingLabels = result.ast.statements
            .filter(s => s.type === 'label')
            .map(s => (s as LabelNode).name)

          expect(remainingLabels).not.toContain(labelToDelete)

          // Other labels should still be present
          for (const name of uniqueNames.slice(1)) {
            expect(remainingLabels).toContain(name)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should remove edges connected to deleted node', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 2, maxLength: 4 }),
        (labelNames) => {
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length < 2) return true

          const builder = new FlowGraphBuilder()
          const synchronizer = new ASTSynchronizer()

          // Create labels where each jumps to the next
          const labels = uniqueNames.map((name, i) => {
            const nextLabel = uniqueNames[(i + 1) % uniqueNames.length]
            return createLabel(name, [
              createDialogue(`d-${name}`, null, `In ${name}`),
              createJump(`j-${name}`, nextLabel),
            ])
          })

          const ast = createScript(labels)
          const graph = builder.buildGraph(ast)

          // Pick a label to delete
          const labelToDelete = uniqueNames[0]
          const nodeToDelete = graph.nodes.find(
            n => n.type === 'scene' && n.data.label === labelToDelete
          )

          if (!nodeToDelete) return true

          // Count edges connected to this node before deletion
          const connectedEdgesBefore = graph.edges.filter(
            e => e.source === nodeToDelete.id || e.target === nodeToDelete.id
          )

          // Delete the node
          const result = synchronizer.deleteNode(nodeToDelete.id, graph, ast)

          // All connected edges should be in the removed list
          expect(result.removedEdgeIds.length).toBeGreaterThanOrEqual(connectedEdgesBefore.length)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should remove jump statements targeting deleted label', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 2, maxLength: 4 }),
        (labelNames) => {
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length < 2) return true

          const builder = new FlowGraphBuilder()
          const synchronizer = new ASTSynchronizer()

          // Create labels where each jumps to the next
          const labels = uniqueNames.map((name, i) => {
            const nextLabel = uniqueNames[(i + 1) % uniqueNames.length]
            return createLabel(name, [
              createDialogue(`d-${name}`, null, `In ${name}`),
              createJump(`j-${name}`, nextLabel),
            ])
          })

          const ast = createScript(labels)
          const graph = builder.buildGraph(ast)

          // Pick a label to delete (not the first one, so there's a jump to it)
          const labelToDelete = uniqueNames[uniqueNames.length - 1]
          const nodeToDelete = graph.nodes.find(
            n => n.type === 'scene' && n.data.label === labelToDelete
          )

          if (!nodeToDelete) return true

          // Delete the node
          const result = synchronizer.deleteNode(nodeToDelete.id, graph, ast)

          // Check that no jump statements target the deleted label
          function findJumpsToLabel(body: ASTNode[], targetLabel: string): JumpNode[] {
            const jumps: JumpNode[] = []
            for (const node of body) {
              if (node.type === 'jump' && (node as JumpNode).target === targetLabel) {
                jumps.push(node as JumpNode)
              } else if (node.type === 'label') {
                jumps.push(...findJumpsToLabel((node as LabelNode).body, targetLabel))
              }
            }
            return jumps
          }

          const jumpsToDeleted = findJumpsToLabel(result.ast.statements, labelToDelete)
          expect(jumpsToDeleted.length).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve unrelated nodes when deleting', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 3, maxLength: 5 }),
        fc.array(arbitraryText, { minLength: 1, maxLength: 3 }),
        (labelNames, dialogueTexts) => {
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length < 3) return true

          const builder = new FlowGraphBuilder()
          const synchronizer = new ASTSynchronizer()

          // Create labels with dialogues
          const labels = uniqueNames.map((name, i) =>
            createLabel(name, [
              createDialogue(`d-${name}`, null, dialogueTexts[i % dialogueTexts.length]),
            ])
          )

          const ast = createScript(labels)
          const graph = builder.buildGraph(ast)

          // Delete the first label
          const labelToDelete = uniqueNames[0]
          const nodeToDelete = graph.nodes.find(
            n => n.type === 'scene' && n.data.label === labelToDelete
          )

          if (!nodeToDelete) return true

          // Delete the node
          const result = synchronizer.deleteNode(nodeToDelete.id, graph, ast)

          // All other labels should be preserved with their content
          for (let i = 1; i < uniqueNames.length; i++) {
            const labelName = uniqueNames[i]
            const label = result.ast.statements.find(
              s => s.type === 'label' && (s as LabelNode).name === labelName
            ) as LabelNode | undefined

            expect(label).toBeDefined()
            expect(label?.body.length).toBeGreaterThan(0)

            // Check dialogue content is preserved
            const dialogue = label?.body.find(n => n.type === 'dialogue') as DialogueNode | undefined
            expect(dialogue).toBeDefined()
            expect(dialogue?.text).toBe(dialogueTexts[i % dialogueTexts.length])
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle deletion of nodes with no external edges', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryText,
        (labelName, dialogueText) => {
          const builder = new FlowGraphBuilder()
          const synchronizer = new ASTSynchronizer()

          // Create a single label with no jumps
          const label = createLabel(labelName, [
            createDialogue(`d-${labelName}`, null, dialogueText),
          ])

          const ast = createScript([label])
          const graph = builder.buildGraph(ast)

          // Find the scene node
          const nodeToDelete = graph.nodes.find(
            n => n.type === 'scene' && n.data.label === labelName
          )

          if (!nodeToDelete) return true

          // Count edges connected to this node before deletion
          const connectedEdges = graph.edges.filter(
            e => e.source === nodeToDelete.id || e.target === nodeToDelete.id
          )

          // Delete the node
          const result = synchronizer.deleteNode(nodeToDelete.id, graph, ast)

          // The AST should have no labels
          const remainingLabels = result.ast.statements.filter(s => s.type === 'label')
          expect(remainingLabels.length).toBe(0)

          // All connected edges should be in the removed list
          expect(result.removedEdgeIds.length).toBe(connectedEdges.length)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return removed statement IDs', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        fc.array(arbitraryText, { minLength: 1, maxLength: 3 }),
        (labelName, dialogueTexts) => {
          const builder = new FlowGraphBuilder()
          const synchronizer = new ASTSynchronizer()

          // Create a label with multiple dialogues
          const dialogues = dialogueTexts.map((text, i) =>
            createDialogue(`d-${labelName}-${i}`, null, text)
          )
          const label = createLabel(labelName, dialogues)

          const ast = createScript([label])
          const graph = builder.buildGraph(ast)

          // Find the scene node
          const nodeToDelete = graph.nodes.find(
            n => n.type === 'scene' && n.data.label === labelName
          )

          if (!nodeToDelete) return true

          // Delete the node
          const result = synchronizer.deleteNode(nodeToDelete.id, graph, ast)

          // Should have removed statement IDs
          expect(result.removedStatementIds.length).toBeGreaterThan(0)

          // The removed IDs should not be in the resulting AST
          function collectAllIds(nodes: ASTNode[]): string[] {
            const ids: string[] = []
            for (const node of nodes) {
              ids.push(node.id)
              if (node.type === 'label') {
                ids.push(...collectAllIds((node as LabelNode).body))
              }
            }
            return ids
          }

          const remainingIds = collectAllIds(result.ast.statements)
          for (const removedId of result.removedStatementIds) {
            expect(remainingIds).not.toContain(removedId)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


describe('Property 1: Node Insertion Position Correctness', () => {
  /**
   * Property 1: 节点插入位置正确性
   * 
   * For any newly created node and valid connection relationship, when the node
   * is connected to the flow, its position in the AST should correctly reflect
   * its position in the flow graph:
   * - Nodes connected to Scene output should be at the beginning of label body
   * - Nodes connected to other node outputs should be after the source node
   * - Nodes inserted between two nodes should be between them in the AST
   * 
   * Feature: node-creation-persistence, Property 1: Node Insertion Position Correctness
   * Validates: Requirements 1.2, 5.1, 5.2, 7.1, 7.2, 7.3
   */

  // Arbitrary for valid label names
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

  it('should insert dialogue at the beginning when afterNodeId is null', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitrarySpeaker,
        arbitraryText,
        fc.array(arbitraryText, { minLength: 1, maxLength: 3 }),
        (labelName, speaker, newText, existingTexts) => {
          const synchronizer = new ASTSynchronizer()

          // Create existing dialogues
          const existingDialogues = existingTexts.map((text, i) =>
            createDialogue(`d-existing-${i}`, null, text)
          )
          const label = createLabel(labelName, existingDialogues)
          const ast = createScript([label])

          // Insert new dialogue at the beginning (afterNodeId = undefined)
          const newDialogueId = synchronizer.insertDialogue(
            labelName,
            { speaker, text: newText },
            ast,
            undefined // Insert at beginning
          )

          expect(newDialogueId).not.toBeNull()

          // Verify the new dialogue is at the beginning
          const updatedLabel = ast.statements.find(
            s => s.type === 'label' && (s as LabelNode).name === labelName
          ) as LabelNode

          expect(updatedLabel.body.length).toBe(existingTexts.length + 1)
          
          const firstNode = updatedLabel.body[0] as DialogueNode
          expect(firstNode.id).toBe(newDialogueId)
          expect(firstNode.text).toBe(newText)
          expect(firstNode.speaker).toBe(speaker)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should insert dialogue after specified node', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitrarySpeaker,
        arbitraryText,
        fc.array(arbitraryText, { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 0, max: 4 }),
        (labelName, speaker, newText, existingTexts, insertAfterIndex) => {
          // Ensure insertAfterIndex is valid
          const validIndex = Math.min(insertAfterIndex, existingTexts.length - 1)
          
          const synchronizer = new ASTSynchronizer()

          // Create existing dialogues
          const existingDialogues = existingTexts.map((text, i) =>
            createDialogue(`d-existing-${i}`, null, text)
          )
          const label = createLabel(labelName, existingDialogues)
          const ast = createScript([label])

          // Get the ID of the node to insert after
          const afterNodeId = existingDialogues[validIndex].id

          // Insert new dialogue after the specified node
          const newDialogueId = synchronizer.insertDialogue(
            labelName,
            { speaker, text: newText },
            ast,
            afterNodeId
          )

          expect(newDialogueId).not.toBeNull()

          // Verify the new dialogue is at the correct position
          const updatedLabel = ast.statements.find(
            s => s.type === 'label' && (s as LabelNode).name === labelName
          ) as LabelNode

          expect(updatedLabel.body.length).toBe(existingTexts.length + 1)
          
          // The new node should be at position validIndex + 1
          const insertedNode = updatedLabel.body[validIndex + 1] as DialogueNode
          expect(insertedNode.id).toBe(newDialogueId)
          expect(insertedNode.text).toBe(newText)

          // The node before should be the one we specified
          const nodeBefore = updatedLabel.body[validIndex] as DialogueNode
          expect(nodeBefore.id).toBe(afterNodeId)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return null when inserting into non-existent label', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        arbitrarySpeaker,
        arbitraryText,
        (existingLabelName, nonExistentLabelName, speaker, text) => {
          // Ensure the labels are different
          if (existingLabelName === nonExistentLabelName) return true

          const synchronizer = new ASTSynchronizer()

          // Create a label
          const label = createLabel(existingLabelName, [
            createDialogue('d-1', null, 'existing dialogue')
          ])
          const ast = createScript([label])

          // Try to insert into non-existent label
          const result = synchronizer.insertDialogue(
            nonExistentLabelName,
            { speaker, text },
            ast
          )

          expect(result).toBeNull()

          // Original AST should be unchanged
          expect(ast.statements.length).toBe(1)
          const originalLabel = ast.statements[0] as LabelNode
          expect(originalLabel.body.length).toBe(1)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should insert menu at the beginning when afterNodeId is null', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        fc.array(arbitraryText, { minLength: 1, maxLength: 3 }),
        fc.array(arbitraryText, { minLength: 1, maxLength: 3 }),
        (labelName, choiceTexts, existingTexts) => {
          const synchronizer = new ASTSynchronizer()

          // Create existing dialogues
          const existingDialogues = existingTexts.map((text, i) =>
            createDialogue(`d-existing-${i}`, null, text)
          )
          const label = createLabel(labelName, existingDialogues)
          const ast = createScript([label])

          // Create menu data
          const menuData = {
            prompt: 'Choose an option',
            choices: choiceTexts.map(text => ({
              text,
              body: [] as ASTNode[],
            })),
          }

          // Insert menu at the beginning
          const newMenuId = synchronizer.insertMenu(
            labelName,
            menuData,
            ast,
            undefined
          )

          expect(newMenuId).not.toBeNull()

          // Verify the menu is at the beginning
          const updatedLabel = ast.statements.find(
            s => s.type === 'label' && (s as LabelNode).name === labelName
          ) as LabelNode

          expect(updatedLabel.body.length).toBe(existingTexts.length + 1)
          
          const firstNode = updatedLabel.body[0] as MenuNode
          expect(firstNode.id).toBe(newMenuId)
          expect(firstNode.type).toBe('menu')
          expect(firstNode.choices.length).toBe(choiceTexts.length)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should insert menu after specified node', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        fc.array(arbitraryText, { minLength: 1, maxLength: 3 }),
        fc.array(arbitraryText, { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 0, max: 3 }),
        (labelName, choiceTexts, existingTexts, insertAfterIndex) => {
          const validIndex = Math.min(insertAfterIndex, existingTexts.length - 1)
          
          const synchronizer = new ASTSynchronizer()

          // Create existing dialogues
          const existingDialogues = existingTexts.map((text, i) =>
            createDialogue(`d-existing-${i}`, null, text)
          )
          const label = createLabel(labelName, existingDialogues)
          const ast = createScript([label])

          const afterNodeId = existingDialogues[validIndex].id

          // Create menu data
          const menuData = {
            choices: choiceTexts.map(text => ({
              text,
              body: [] as ASTNode[],
            })),
          }

          // Insert menu after specified node
          const newMenuId = synchronizer.insertMenu(
            labelName,
            menuData,
            ast,
            afterNodeId
          )

          expect(newMenuId).not.toBeNull()

          // Verify the menu is at the correct position
          const updatedLabel = ast.statements.find(
            s => s.type === 'label' && (s as LabelNode).name === labelName
          ) as LabelNode

          expect(updatedLabel.body.length).toBe(existingTexts.length + 1)
          
          const insertedNode = updatedLabel.body[validIndex + 1] as MenuNode
          expect(insertedNode.id).toBe(newMenuId)
          expect(insertedNode.type).toBe('menu')

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should insert jump into menu choice body', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        fc.array(arbitraryText, { minLength: 1, maxLength: 4 }),
        fc.integer({ min: 0, max: 3 }),
        (labelName, targetLabel, choiceTexts, choiceIndex) => {
          const validChoiceIndex = Math.min(choiceIndex, choiceTexts.length - 1)
          
          const synchronizer = new ASTSynchronizer()

          // Create menu with choices
          const choices: MenuChoice[] = choiceTexts.map(text => ({
            text,
            body: [],
          }))
          const menu = createMenu('menu-1', choices)
          const label = createLabel(labelName, [menu])
          const ast = createScript([label])

          // Insert jump into the specified choice
          const result = synchronizer.insertJumpIntoChoice(
            'menu-1',
            validChoiceIndex,
            targetLabel,
            ast
          )

          expect(result).toBe(true)

          // Verify the jump was inserted
          const updatedLabel = ast.statements.find(
            s => s.type === 'label' && (s as LabelNode).name === labelName
          ) as LabelNode

          const updatedMenu = updatedLabel.body[0] as MenuNode
          const updatedChoice = updatedMenu.choices[validChoiceIndex]
          
          expect(updatedChoice.body.length).toBe(1)
          expect(updatedChoice.body[0].type).toBe('jump')
          expect((updatedChoice.body[0] as JumpNode).target).toBe(targetLabel)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should replace existing jump in menu choice', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        arbitraryLabelName,
        fc.array(arbitraryText, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 2 }),
        (labelName, oldTarget, newTarget, choiceTexts, choiceIndex) => {
          if (oldTarget === newTarget) return true
          
          const validChoiceIndex = Math.min(choiceIndex, choiceTexts.length - 1)
          
          const synchronizer = new ASTSynchronizer()

          // Create menu with choices that already have jumps
          const choices: MenuChoice[] = choiceTexts.map((text, i) => ({
            text,
            body: i === validChoiceIndex ? [createJump(`j-${i}`, oldTarget)] : [],
          }))
          const menu = createMenu('menu-1', choices)
          const label = createLabel(labelName, [menu])
          const ast = createScript([label])

          // Insert new jump (should replace existing)
          const result = synchronizer.insertJumpIntoChoice(
            'menu-1',
            validChoiceIndex,
            newTarget,
            ast
          )

          expect(result).toBe(true)

          // Verify the jump was replaced
          const updatedLabel = ast.statements.find(
            s => s.type === 'label' && (s as LabelNode).name === labelName
          ) as LabelNode

          const updatedMenu = updatedLabel.body[0] as MenuNode
          const updatedChoice = updatedMenu.choices[validChoiceIndex]
          
          // Should still have only one jump
          expect(updatedChoice.body.length).toBe(1)
          expect(updatedChoice.body[0].type).toBe('jump')
          expect((updatedChoice.body[0] as JumpNode).target).toBe(newTarget)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false when inserting jump into invalid choice index', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        fc.array(arbitraryText, { minLength: 1, maxLength: 3 }),
        (labelName, targetLabel, choiceTexts) => {
          const synchronizer = new ASTSynchronizer()

          // Create menu with choices
          const choices: MenuChoice[] = choiceTexts.map(text => ({
            text,
            body: [],
          }))
          const menu = createMenu('menu-1', choices)
          const label = createLabel(labelName, [menu])
          const ast = createScript([label])

          // Try to insert into invalid choice index
          const result = synchronizer.insertJumpIntoChoice(
            'menu-1',
            choiceTexts.length + 10, // Invalid index
            targetLabel,
            ast
          )

          expect(result).toBe(false)

          // Verify no changes were made
          const updatedLabel = ast.statements.find(
            s => s.type === 'label' && (s as LabelNode).name === labelName
          ) as LabelNode

          const updatedMenu = updatedLabel.body[0] as MenuNode
          for (const choice of updatedMenu.choices) {
            expect(choice.body.length).toBe(0)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve existing content when inserting new nodes', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitrarySpeaker,
        arbitraryText,
        fc.array(fc.tuple(arbitrarySpeaker, arbitraryText), { minLength: 2, maxLength: 5 }),
        (labelName, newSpeaker, newText, existingDialogues) => {
          const synchronizer = new ASTSynchronizer()

          // Create existing dialogues
          const dialogues = existingDialogues.map(([speaker, text], i) =>
            createDialogue(`d-existing-${i}`, speaker, text)
          )
          const label = createLabel(labelName, dialogues)
          const ast = createScript([label])

          // Insert new dialogue at the beginning
          synchronizer.insertDialogue(
            labelName,
            { speaker: newSpeaker, text: newText },
            ast,
            undefined
          )

          // Verify all existing dialogues are preserved
          const updatedLabel = ast.statements.find(
            s => s.type === 'label' && (s as LabelNode).name === labelName
          ) as LabelNode

          expect(updatedLabel.body.length).toBe(existingDialogues.length + 1)

          // Check that existing dialogues are still there (shifted by 1)
          for (let i = 0; i < existingDialogues.length; i++) {
            const dialogue = updatedLabel.body[i + 1] as DialogueNode
            expect(dialogue.speaker).toBe(existingDialogues[i][0])
            expect(dialogue.text).toBe(existingDialogues[i][1])
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Property 6: Label 唯一性约束
 * 
 * Feature: node-creation-persistence
 * 
 * For any attempt to create a Scene node with a label name that already exists
 * in the AST, the operation should be rejected and return an error.
 * 
 * Validates: Requirements 2.4
 */
describe('Property 6: Label 唯一性约束', () => {
  // Arbitrary for valid label names
  const arbitraryLabelName = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'),
    { minLength: 1, maxLength: 15 }
  ).filter(s => /^[a-z_][a-z0-9_]*$/.test(s))

  // Arbitrary for dialogue text
  const arbitraryText = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '),
    { minLength: 1, maxLength: 50 }
  )

  /**
   * Property 6.1: Duplicate label names should be rejected
   * 
   * For any valid label name that already exists in the AST,
   * attempting to add another label with the same name should fail
   * and return a duplicate_label error.
   * 
   * Feature: node-creation-persistence, Property 6: Label 唯一性约束
   * Validates: Requirements 2.4
   */
  it('should reject duplicate label names with detailed error', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryText,
        (labelName, dialogueText) => {
          const synchronizer = new ASTSynchronizer()

          // Create an AST with an existing label
          const existingLabel = createLabel(labelName, [
            createDialogue(`d-${labelName}`, null, dialogueText)
          ])
          const ast = createScript([existingLabel])

          // Attempt to add a label with the same name
          const result = synchronizer.addLabel(labelName, ast)

          // Should fail with duplicate_label error
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
          expect(result.error?.type).toBe('duplicate_label')
          expect(result.error?.message).toContain(labelName)
          expect(result.error?.existingLabelId).toBe(existingLabel.id)

          // AST should not be modified
          expect(ast.statements.length).toBe(1)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.2: Unique label names should be accepted
   * 
   * For any valid label name that does not exist in the AST,
   * adding a new label should succeed and return the new label ID.
   * 
   * Feature: node-creation-persistence, Property 6: Label 唯一性约束
   * Validates: Requirements 2.1, 2.4
   */
  it('should accept unique label names and return label ID', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        arbitraryLabelName,
        (existingLabelName, newLabelName) => {
          // Skip if names are the same
          if (existingLabelName === newLabelName) return true

          const synchronizer = new ASTSynchronizer()

          // Create an AST with an existing label
          const existingLabel = createLabel(existingLabelName, [])
          const ast = createScript([existingLabel])

          // Add a new label with a different name
          const result = synchronizer.addLabel(newLabelName, ast)

          // Should succeed
          expect(result.success).toBe(true)
          expect(result.labelId).toBeDefined()
          expect(result.error).toBeUndefined()

          // AST should have two labels now
          expect(ast.statements.length).toBe(2)

          // Verify the new label exists
          const newLabel = ast.statements.find(
            s => s.type === 'label' && (s as LabelNode).name === newLabelName
          ) as LabelNode
          expect(newLabel).toBeDefined()
          expect(newLabel.id).toBe(result.labelId)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.3: Multiple unique labels can be added sequentially
   * 
   * For any array of unique label names, all labels should be
   * successfully added to the AST.
   * 
   * Feature: node-creation-persistence, Property 6: Label 唯一性约束
   * Validates: Requirements 2.1, 2.4
   */
  it('should allow adding multiple unique labels sequentially', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryLabelName, { minLength: 2, maxLength: 5 }),
        (labelNames) => {
          // Ensure all names are unique
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length < 2) return true

          const synchronizer = new ASTSynchronizer()
          const ast = createScript([])

          // Add all labels
          const results = uniqueNames.map(name => ({
            name,
            result: synchronizer.addLabel(name, ast)
          }))

          // All should succeed
          for (const { name, result } of results) {
            expect(result.success).toBe(true)
            expect(result.labelId).toBeDefined()
            expect(result.error).toBeUndefined()
          }

          // AST should have all labels
          expect(ast.statements.length).toBe(uniqueNames.length)

          // All labels should be present
          for (const name of uniqueNames) {
            const label = ast.statements.find(
              s => s.type === 'label' && (s as LabelNode).name === name
            )
            expect(label).toBeDefined()
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.4: Invalid label names should be rejected
   * 
   * For any invalid label name (empty, starts with number, contains special chars),
   * the operation should fail with an invalid_name error.
   * 
   * Feature: node-creation-persistence, Property 6: Label 唯一性约束
   * Validates: Requirements 2.4
   */
  it('should reject invalid label names with detailed error', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.stringOf(fc.constantFrom(...'0123456789'), { minLength: 1, maxLength: 5 })
            .map(s => s + 'label'), // Starts with number
          fc.stringOf(fc.constantFrom(...'!@#$%^&*()'), { minLength: 1, maxLength: 5 }) // Special chars
        ),
        (invalidName) => {
          const synchronizer = new ASTSynchronizer()
          const ast = createScript([])

          // Attempt to add a label with invalid name
          const result = synchronizer.addLabel(invalidName, ast)

          // Should fail with invalid_name error
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
          expect(result.error?.type).toBe('invalid_name')

          // AST should not be modified
          expect(ast.statements.length).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.5: Adding duplicate after successful add should fail
   * 
   * For any label name, after successfully adding it once,
   * attempting to add it again should fail with duplicate_label error.
   * 
   * Feature: node-creation-persistence, Property 6: Label 唯一性约束
   * Validates: Requirements 2.4
   */
  it('should reject second add of same label name', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        (labelName) => {
          const synchronizer = new ASTSynchronizer()
          const ast = createScript([])

          // First add should succeed
          const firstResult = synchronizer.addLabel(labelName, ast)
          expect(firstResult.success).toBe(true)
          expect(firstResult.labelId).toBeDefined()

          // Second add should fail
          const secondResult = synchronizer.addLabel(labelName, ast)
          expect(secondResult.success).toBe(false)
          expect(secondResult.error?.type).toBe('duplicate_label')
          expect(secondResult.error?.existingLabelId).toBe(firstResult.labelId)

          // AST should still have only one label
          expect(ast.statements.length).toBe(1)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
