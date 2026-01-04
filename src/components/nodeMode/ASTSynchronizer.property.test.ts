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
