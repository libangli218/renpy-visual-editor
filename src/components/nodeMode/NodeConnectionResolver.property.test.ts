/**
 * Property-Based Tests for NodeConnectionResolver
 * 
 * Tests the correctness of orphan node detection using property-based testing.
 * 
 * **Feature: node-creation-persistence, Property 4: 孤立节点检测正确性**
 * **Validates: Requirements 1.5, 6.1, 6.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { NodeConnectionResolver } from './NodeConnectionResolver'
import { FlowNode, FlowEdge, FlowNodeType } from './FlowGraphBuilder'

// Helper to generate unique IDs
let idCounter = 0
const generateId = (prefix: string) => `${prefix}-${idCounter++}`

// Reset counter before each test
const resetIdCounter = () => { idCounter = 0 }

/**
 * Arbitrary for generating flow node types (excluding scene for non-scene nodes)
 */
const nonSceneNodeTypeArb: fc.Arbitrary<FlowNodeType> = fc.constantFrom(
  'dialogue-block',
  'menu',
  'condition',
  'jump',
  'call',
  'return'
)

/**
 * Arbitrary for generating a scene node
 */
const sceneNodeArb = (id: string, labelName: string): fc.Arbitrary<FlowNode> =>
  fc.constant({
    id,
    type: 'scene' as FlowNodeType,
    position: { x: 0, y: 0 },
    data: { label: labelName },
  })

/**
 * Arbitrary for generating a non-scene node
 */
const nonSceneNodeArb = (id: string): fc.Arbitrary<FlowNode> =>
  nonSceneNodeTypeArb.map(type => ({
    id,
    type,
    position: { x: 0, y: 0 },
    data: {},
  }))

/**
 * Generate a simple connected graph with one scene and some connected nodes
 */
const connectedGraphArb: fc.Arbitrary<{ nodes: FlowNode[]; edges: FlowEdge[] }> =
  fc.integer({ min: 1, max: 5 }).chain(nodeCount => {
    resetIdCounter()
    const sceneId = generateId('scene')
    const labelName = 'test_label'
    
    // Generate node IDs
    const nodeIds = Array.from({ length: nodeCount }, () => generateId('node'))
    
    return fc.tuple(
      sceneNodeArb(sceneId, labelName),
      fc.tuple(...nodeIds.map(id => nonSceneNodeArb(id)))
    ).map(([sceneNode, otherNodes]) => {
      const nodes: FlowNode[] = [sceneNode, ...otherNodes]
      const edges: FlowEdge[] = []
      
      // Connect nodes in a chain: scene -> node0 -> node1 -> ...
      let prevId = sceneId
      for (const node of otherNodes) {
        edges.push({
          id: `e-${prevId}-${node.id}`,
          source: prevId,
          target: node.id,
          type: 'normal',
        })
        prevId = node.id
      }
      
      return { nodes, edges }
    })
  })

/**
 * Generate a graph with some orphan nodes (not connected to scene)
 */
const graphWithOrphansArb: fc.Arbitrary<{
  nodes: FlowNode[]
  edges: FlowEdge[]
  expectedOrphanIds: Set<string>
}> = fc.tuple(
  fc.integer({ min: 1, max: 3 }), // connected node count
  fc.integer({ min: 1, max: 3 })  // orphan node count
).chain(([connectedCount, orphanCount]) => {
  resetIdCounter()
  const sceneId = generateId('scene')
  const labelName = 'test_label'
  
  // Generate connected node IDs
  const connectedIds = Array.from({ length: connectedCount }, () => generateId('connected'))
  // Generate orphan node IDs
  const orphanIds = Array.from({ length: orphanCount }, () => generateId('orphan'))
  
  return fc.tuple(
    sceneNodeArb(sceneId, labelName),
    fc.tuple(...connectedIds.map(id => nonSceneNodeArb(id))),
    fc.tuple(...orphanIds.map(id => nonSceneNodeArb(id)))
  ).map(([sceneNode, connectedNodes, orphanNodes]) => {
    const nodes: FlowNode[] = [sceneNode, ...connectedNodes, ...orphanNodes]
    const edges: FlowEdge[] = []
    
    // Connect nodes in a chain: scene -> connected0 -> connected1 -> ...
    let prevId = sceneId
    for (const node of connectedNodes) {
      edges.push({
        id: `e-${prevId}-${node.id}`,
        source: prevId,
        target: node.id,
        type: 'normal',
      })
      prevId = node.id
    }
    
    // Orphan nodes have no edges connecting them to the scene
    // They might have edges between themselves, but not to the main flow
    
    const expectedOrphanIds = new Set(orphanNodes.map(n => n.id))
    
    return { nodes, edges, expectedOrphanIds }
  })
})

/**
 * Generate a graph with branching (menu or condition nodes)
 */
const branchingGraphArb: fc.Arbitrary<{ nodes: FlowNode[]; edges: FlowEdge[] }> =
  fc.integer({ min: 2, max: 4 }).chain(branchCount => {
    resetIdCounter()
    const sceneId = generateId('scene')
    const menuId = generateId('menu')
    const labelName = 'test_label'
    
    // Generate branch target IDs
    const branchIds = Array.from({ length: branchCount }, () => generateId('branch'))
    
    return fc.tuple(
      sceneNodeArb(sceneId, labelName),
      fc.constant<FlowNode>({
        id: menuId,
        type: 'menu',
        position: { x: 0, y: 0 },
        data: { choices: branchIds.map((_, i) => ({ text: `Choice ${i}`, portId: `choice-${i}`, body: [] })) },
      }),
      fc.tuple(...branchIds.map(id => nonSceneNodeArb(id)))
    ).map(([sceneNode, menuNode, branchNodes]) => {
      const nodes: FlowNode[] = [sceneNode, menuNode, ...branchNodes]
      const edges: FlowEdge[] = [
        // scene -> menu
        {
          id: `e-${sceneId}-${menuId}`,
          source: sceneId,
          target: menuId,
          type: 'normal',
        },
      ]
      
      // menu -> each branch
      branchNodes.forEach((node, i) => {
        edges.push({
          id: `e-${menuId}-${node.id}`,
          source: menuId,
          target: node.id,
          sourceHandle: `choice-${i}`,
          type: 'normal',
        })
      })
      
      return { nodes, edges }
    })
  })

describe('NodeConnectionResolver Property Tests', () => {
  const resolver = new NodeConnectionResolver()

  describe('Property 4: 孤立节点检测正确性', () => {
    /**
     * Property: For any flow graph state, getOrphanNodes() returns the set of nodes
     * that are NOT connected to any Scene node through any path.
     * 
     * **Feature: node-creation-persistence, Property 4: 孤立节点检测正确性**
     * **Validates: Requirements 1.5, 6.1, 6.2**
     */
    it('should correctly identify orphan nodes - nodes not connected to scene are orphans', () => {
      fc.assert(
        fc.property(graphWithOrphansArb, ({ nodes, edges, expectedOrphanIds }) => {
          const orphans = resolver.getOrphanNodes(nodes, edges)
          const orphanIds = new Set(orphans.map(n => n.id))
          
          // All expected orphans should be in the result
          for (const expectedId of expectedOrphanIds) {
            expect(orphanIds.has(expectedId)).toBe(true)
          }
          
          // All returned orphans should be in the expected set
          for (const orphan of orphans) {
            expect(expectedOrphanIds.has(orphan.id)).toBe(true)
          }
          
          // The sets should be equal
          expect(orphanIds.size).toBe(expectedOrphanIds.size)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property: In a fully connected graph (all nodes reachable from scene),
     * there should be no orphan nodes.
     */
    it('should return empty array when all nodes are connected to scene', () => {
      fc.assert(
        fc.property(connectedGraphArb, ({ nodes, edges }) => {
          const orphans = resolver.getOrphanNodes(nodes, edges)
          
          // No orphans in a fully connected graph
          expect(orphans.length).toBe(0)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Scene nodes are never considered orphans.
     */
    it('should never include scene nodes in orphan list', () => {
      fc.assert(
        fc.property(graphWithOrphansArb, ({ nodes, edges }) => {
          const orphans = resolver.getOrphanNodes(nodes, edges)
          
          // No scene nodes in orphans
          for (const orphan of orphans) {
            expect(orphan.type).not.toBe('scene')
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property: In a branching graph (menu/condition), all branches connected
     * to the scene should not be orphans.
     */
    it('should not mark branching nodes as orphans when connected to scene', () => {
      fc.assert(
        fc.property(branchingGraphArb, ({ nodes, edges }) => {
          const orphans = resolver.getOrphanNodes(nodes, edges)
          
          // All nodes in a branching graph connected to scene should not be orphans
          expect(orphans.length).toBe(0)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property: A node is an orphan if and only if resolveNodeLabel returns null.
     */
    it('should be consistent with resolveNodeLabel - orphan iff label is null', () => {
      fc.assert(
        fc.property(graphWithOrphansArb, ({ nodes, edges }) => {
          for (const node of nodes) {
            if (node.type === 'scene') continue
            
            const label = resolver.resolveNodeLabel(node.id, edges, nodes)
            const orphans = resolver.getOrphanNodes(nodes, edges)
            const isOrphan = orphans.some(o => o.id === node.id)
            
            // Node is orphan iff it has no label
            if (label === null) {
              expect(isOrphan).toBe(true)
            } else {
              expect(isOrphan).toBe(false)
            }
          }
        }),
        { numRuns: 100 }
      )
    })
  })
})


describe('Property 9: 无效目标检测正确性', () => {
  const resolver = new NodeConnectionResolver()

  /**
   * Arbitrary for generating valid label names
   */
  const labelNameArb = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'),
    { minLength: 1, maxLength: 15 }
  ).filter(s => /^[a-z_][a-z0-9_]*$/.test(s))

  /**
   * Generate a graph with jump/call nodes that have valid targets
   */
  const graphWithValidTargetsArb: fc.Arbitrary<{
    nodes: FlowNode[]
    edges: FlowEdge[]
  }> = fc.tuple(
    fc.array(labelNameArb, { minLength: 2, maxLength: 5 })
  ).chain(([labelNames]) => {
    const uniqueLabels = [...new Set(labelNames)]
    if (uniqueLabels.length < 2) {
      // Need at least 2 labels for valid jump/call
      return fc.constant({ nodes: [], edges: [] })
    }

    resetIdCounter()
    
    // Create scene nodes for each label
    const sceneNodes: FlowNode[] = uniqueLabels.map(label => ({
      id: generateId('scene'),
      type: 'scene' as FlowNodeType,
      position: { x: 0, y: 0 },
      data: { label },
    }))

    // Create jump nodes targeting valid labels
    const jumpNodes: FlowNode[] = uniqueLabels.slice(0, -1).map((_, i) => ({
      id: generateId('jump'),
      type: 'jump' as FlowNodeType,
      position: { x: 0, y: 0 },
      data: { target: uniqueLabels[i + 1] }, // Target the next label
    }))

    // Create call nodes targeting valid labels
    const callNodes: FlowNode[] = uniqueLabels.slice(0, -1).map((_, i) => ({
      id: generateId('call'),
      type: 'call' as FlowNodeType,
      position: { x: 0, y: 0 },
      data: { target: uniqueLabels[i + 1] }, // Target the next label
    }))

    const nodes = [...sceneNodes, ...jumpNodes, ...callNodes]
    const edges: FlowEdge[] = []

    // Connect jump nodes to their source scenes
    jumpNodes.forEach((jumpNode, i) => {
      edges.push({
        id: `e-${sceneNodes[i].id}-${jumpNode.id}`,
        source: sceneNodes[i].id,
        target: jumpNode.id,
        type: 'normal',
      })
    })

    return fc.constant({ nodes, edges })
  })

  /**
   * Generate a graph with jump/call nodes that have invalid targets
   */
  const graphWithInvalidTargetsArb: fc.Arbitrary<{
    nodes: FlowNode[]
    edges: FlowEdge[]
    expectedInvalidIds: Set<string>
  }> = fc.tuple(
    fc.array(labelNameArb, { minLength: 1, maxLength: 3 }),
    fc.array(labelNameArb, { minLength: 1, maxLength: 3 })
  ).chain(([existingLabels, nonExistingLabels]) => {
    const uniqueExisting = [...new Set(existingLabels)]
    const uniqueNonExisting = [...new Set(nonExistingLabels)].filter(
      l => !uniqueExisting.includes(l)
    )

    if (uniqueExisting.length === 0 || uniqueNonExisting.length === 0) {
      return fc.constant({ nodes: [], edges: [], expectedInvalidIds: new Set<string>() })
    }

    resetIdCounter()

    // Create scene nodes for existing labels
    const sceneNodes: FlowNode[] = uniqueExisting.map(label => ({
      id: generateId('scene'),
      type: 'scene' as FlowNodeType,
      position: { x: 0, y: 0 },
      data: { label },
    }))

    // Create jump nodes with invalid targets (non-existing labels)
    const invalidJumpNodes: FlowNode[] = uniqueNonExisting.map(target => ({
      id: generateId('invalid-jump'),
      type: 'jump' as FlowNodeType,
      position: { x: 0, y: 0 },
      data: { target },
    }))

    // Create call nodes with invalid targets
    const invalidCallNodes: FlowNode[] = uniqueNonExisting.map(target => ({
      id: generateId('invalid-call'),
      type: 'call' as FlowNodeType,
      position: { x: 0, y: 0 },
      data: { target },
    }))

    const nodes = [...sceneNodes, ...invalidJumpNodes, ...invalidCallNodes]
    const edges: FlowEdge[] = []

    const expectedInvalidIds = new Set([
      ...invalidJumpNodes.map(n => n.id),
      ...invalidCallNodes.map(n => n.id),
    ])

    return fc.constant({ nodes, edges, expectedInvalidIds })
  })

  /**
   * Generate a graph with mixed valid and invalid targets
   */
  const mixedTargetsGraphArb: fc.Arbitrary<{
    nodes: FlowNode[]
    edges: FlowEdge[]
    expectedInvalidIds: Set<string>
    expectedValidIds: Set<string>
  }> = fc.tuple(
    fc.array(labelNameArb, { minLength: 2, maxLength: 4 }),
    fc.array(labelNameArb, { minLength: 1, maxLength: 2 })
  ).chain(([existingLabels, nonExistingLabels]) => {
    const uniqueExisting = [...new Set(existingLabels)]
    const uniqueNonExisting = [...new Set(nonExistingLabels)].filter(
      l => !uniqueExisting.includes(l)
    )

    if (uniqueExisting.length < 2 || uniqueNonExisting.length === 0) {
      return fc.constant({
        nodes: [],
        edges: [],
        expectedInvalidIds: new Set<string>(),
        expectedValidIds: new Set<string>(),
      })
    }

    resetIdCounter()

    // Create scene nodes
    const sceneNodes: FlowNode[] = uniqueExisting.map(label => ({
      id: generateId('scene'),
      type: 'scene' as FlowNodeType,
      position: { x: 0, y: 0 },
      data: { label },
    }))

    // Create valid jump nodes (targeting existing labels)
    const validJumpNodes: FlowNode[] = uniqueExisting.slice(0, -1).map((_, i) => ({
      id: generateId('valid-jump'),
      type: 'jump' as FlowNodeType,
      position: { x: 0, y: 0 },
      data: { target: uniqueExisting[i + 1] },
    }))

    // Create invalid jump nodes (targeting non-existing labels)
    const invalidJumpNodes: FlowNode[] = uniqueNonExisting.map(target => ({
      id: generateId('invalid-jump'),
      type: 'jump' as FlowNodeType,
      position: { x: 0, y: 0 },
      data: { target },
    }))

    const nodes = [...sceneNodes, ...validJumpNodes, ...invalidJumpNodes]
    const edges: FlowEdge[] = []

    const expectedInvalidIds = new Set(invalidJumpNodes.map(n => n.id))
    const expectedValidIds = new Set(validJumpNodes.map(n => n.id))

    return fc.constant({ nodes, edges, expectedInvalidIds, expectedValidIds })
  })

  /**
   * Property 9: Invalid Target Detection Correctness
   * 
   * For any Jump or Call node, if its target label does not exist in the AST,
   * the node should be marked as having an invalid target.
   * 
   * **Feature: node-creation-persistence, Property 9: 无效目标检测正确性**
   * **Validates: Requirements 4.3**
   */
  it('should return empty array when all jump/call nodes have valid targets', () => {
    fc.assert(
      fc.property(graphWithValidTargetsArb, ({ nodes, edges }) => {
        if (nodes.length === 0) return true // Skip empty graphs

        const invalidNodes = resolver.getNodesWithInvalidTargets(nodes)
        
        // All targets are valid, so no invalid nodes
        expect(invalidNodes.length).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Jump/call nodes targeting non-existing labels should be detected as invalid
   */
  it('should detect all jump/call nodes with non-existing target labels', () => {
    fc.assert(
      fc.property(graphWithInvalidTargetsArb, ({ nodes, edges, expectedInvalidIds }) => {
        if (nodes.length === 0) return true // Skip empty graphs

        const invalidNodes = resolver.getNodesWithInvalidTargets(nodes)
        const invalidIds = new Set(invalidNodes.map(n => n.id))

        // All expected invalid nodes should be detected
        for (const expectedId of expectedInvalidIds) {
          expect(invalidIds.has(expectedId)).toBe(true)
        }

        // All detected invalid nodes should be in expected set
        for (const invalidNode of invalidNodes) {
          expect(expectedInvalidIds.has(invalidNode.id)).toBe(true)
        }

        // Sets should be equal
        expect(invalidIds.size).toBe(expectedInvalidIds.size)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: In a mixed graph, only nodes with invalid targets should be detected
   */
  it('should correctly distinguish valid and invalid targets in mixed graphs', () => {
    fc.assert(
      fc.property(mixedTargetsGraphArb, ({ nodes, expectedInvalidIds, expectedValidIds }) => {
        if (nodes.length === 0) return true // Skip empty graphs

        const invalidNodes = resolver.getNodesWithInvalidTargets(nodes)
        const invalidIds = new Set(invalidNodes.map(n => n.id))

        // All expected invalid nodes should be detected
        for (const expectedId of expectedInvalidIds) {
          expect(invalidIds.has(expectedId)).toBe(true)
        }

        // Valid nodes should NOT be in the invalid list
        for (const validId of expectedValidIds) {
          expect(invalidIds.has(validId)).toBe(false)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property: isValidTarget should return true for existing labels and false for non-existing
   */
  it('should correctly validate target labels with isValidTarget', () => {
    fc.assert(
      fc.property(
        fc.array(labelNameArb, { minLength: 1, maxLength: 5 }),
        labelNameArb,
        (existingLabels, testLabel) => {
          const uniqueLabels = [...new Set(existingLabels)]
          
          // Create scene nodes for existing labels
          const nodes: FlowNode[] = uniqueLabels.map(label => ({
            id: `scene-${label}`,
            type: 'scene' as FlowNodeType,
            position: { x: 0, y: 0 },
            data: { label },
          }))

          const isValid = resolver.isValidTarget(testLabel, nodes)
          const shouldBeValid = uniqueLabels.includes(testLabel)

          expect(isValid).toBe(shouldBeValid)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Empty or whitespace-only targets should be invalid
   */
  it('should treat empty or whitespace targets as invalid', () => {
    fc.assert(
      fc.property(
        fc.array(labelNameArb, { minLength: 1, maxLength: 3 }),
        fc.constantFrom('', ' ', '  ', '\t', '\n'),
        (existingLabels, emptyTarget) => {
          const uniqueLabels = [...new Set(existingLabels)]
          
          const nodes: FlowNode[] = uniqueLabels.map(label => ({
            id: `scene-${label}`,
            type: 'scene' as FlowNodeType,
            position: { x: 0, y: 0 },
            data: { label },
          }))

          // Empty targets should always be invalid
          expect(resolver.isValidTarget(emptyTarget, nodes)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: validateNodeTarget should return correct validation result
   */
  it('should return correct validation result for jump/call nodes', () => {
    fc.assert(
      fc.property(
        fc.array(labelNameArb, { minLength: 1, maxLength: 3 }),
        labelNameArb,
        fc.constantFrom('jump', 'call'),
        (existingLabels, targetLabel, nodeType) => {
          const uniqueLabels = [...new Set(existingLabels)]
          
          // Create scene nodes
          const sceneNodes: FlowNode[] = uniqueLabels.map(label => ({
            id: `scene-${label}`,
            type: 'scene' as FlowNodeType,
            position: { x: 0, y: 0 },
            data: { label },
          }))

          // Create the node to validate
          const testNode: FlowNode = {
            id: 'test-node',
            type: nodeType as FlowNodeType,
            position: { x: 0, y: 0 },
            data: { target: targetLabel },
          }

          const nodes = [...sceneNodes, testNode]
          const result = resolver.validateNodeTarget(testNode, nodes)

          const shouldBeValid = uniqueLabels.includes(targetLabel)
          expect(result.isValid).toBe(shouldBeValid)

          if (!shouldBeValid) {
            expect(result.error).toBeDefined()
            expect(result.error).toContain(targetLabel)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Non-jump/call nodes should always be valid
   */
  it('should always return valid for non-jump/call nodes', () => {
    fc.assert(
      fc.property(
        fc.array(labelNameArb, { minLength: 1, maxLength: 3 }),
        fc.constantFrom('scene', 'dialogue-block', 'menu', 'condition', 'return'),
        (existingLabels, nodeType) => {
          const uniqueLabels = [...new Set(existingLabels)]
          
          const sceneNodes: FlowNode[] = uniqueLabels.map(label => ({
            id: `scene-${label}`,
            type: 'scene' as FlowNodeType,
            position: { x: 0, y: 0 },
            data: { label },
          }))

          // Create a non-jump/call node
          const testNode: FlowNode = {
            id: 'test-node',
            type: nodeType as FlowNodeType,
            position: { x: 0, y: 0 },
            data: {},
          }

          const nodes = [...sceneNodes, testNode]
          const result = resolver.validateNodeTarget(testNode, nodes)

          // Non-jump/call nodes should always be valid
          expect(result.isValid).toBe(true)
          expect(result.error).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })
})
