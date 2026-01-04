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
