/**
 * Unit Tests for NodeConnectionResolver
 * 
 * Tests for the node connection resolver that determines node label ownership
 * and insertion positions.
 * 
 * Validates: Requirements 5.1, 7.1, 7.2, 7.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { NodeConnectionResolver } from './NodeConnectionResolver'
import { FlowNode, FlowEdge } from './FlowGraphBuilder'

describe('NodeConnectionResolver', () => {
  let resolver: NodeConnectionResolver

  beforeEach(() => {
    resolver = new NodeConnectionResolver()
  })

  // Helper to create a scene node
  const createSceneNode = (id: string, label: string): FlowNode => ({
    id,
    type: 'scene',
    position: { x: 0, y: 0 },
    data: { label },
  })

  // Helper to create a dialogue block node
  const createDialogueNode = (id: string): FlowNode => ({
    id,
    type: 'dialogue-block',
    position: { x: 0, y: 0 },
    data: { dialogues: [] },
  })

  // Helper to create an edge
  const createEdge = (
    source: string,
    target: string,
    sourceHandle?: string
  ): FlowEdge => ({
    id: `e-${source}-${target}`,
    source,
    target,
    sourceHandle,
    type: 'normal',
  })

  describe('resolveNodeLabel', () => {
    it('should return label for scene node itself', () => {
      const nodes: FlowNode[] = [createSceneNode('scene-1', 'start')]
      const edges: FlowEdge[] = []

      const label = resolver.resolveNodeLabel('scene-1', edges, nodes)
      expect(label).toBe('start')
    })

    it('should resolve label for node directly connected to scene', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('dialogue-1'),
      ]
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      const label = resolver.resolveNodeLabel('dialogue-1', edges, nodes)
      expect(label).toBe('start')
    })

    it('should resolve label for node in a chain', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('dialogue-1'),
        createDialogueNode('dialogue-2'),
        createDialogueNode('dialogue-3'),
      ]
      const edges: FlowEdge[] = [
        createEdge('scene-1', 'dialogue-1'),
        createEdge('dialogue-1', 'dialogue-2'),
        createEdge('dialogue-2', 'dialogue-3'),
      ]

      const label = resolver.resolveNodeLabel('dialogue-3', edges, nodes)
      expect(label).toBe('start')
    })

    it('should return null for disconnected node', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('dialogue-1'),
        createDialogueNode('orphan'),
      ]
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      const label = resolver.resolveNodeLabel('orphan', edges, nodes)
      expect(label).toBeNull()
    })

    it('should handle multiple scenes and resolve correct label', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createSceneNode('scene-2', 'chapter1'),
        createDialogueNode('dialogue-1'),
        createDialogueNode('dialogue-2'),
      ]
      const edges: FlowEdge[] = [
        createEdge('scene-1', 'dialogue-1'),
        createEdge('scene-2', 'dialogue-2'),
      ]

      expect(resolver.resolveNodeLabel('dialogue-1', edges, nodes)).toBe('start')
      expect(resolver.resolveNodeLabel('dialogue-2', edges, nodes)).toBe('chapter1')
    })
  })

  describe('getPredecessor', () => {
    it('should return predecessor node id', () => {
      const edges: FlowEdge[] = [
        createEdge('scene-1', 'dialogue-1'),
        createEdge('dialogue-1', 'dialogue-2'),
      ]

      expect(resolver.getPredecessor('dialogue-1', edges)).toBe('scene-1')
      expect(resolver.getPredecessor('dialogue-2', edges)).toBe('dialogue-1')
    })

    it('should return null for node with no predecessor', () => {
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      expect(resolver.getPredecessor('scene-1', edges)).toBeNull()
    })
  })

  describe('getSuccessor', () => {
    it('should return first successor node id', () => {
      const edges: FlowEdge[] = [
        createEdge('scene-1', 'dialogue-1'),
        createEdge('dialogue-1', 'dialogue-2'),
      ]

      expect(resolver.getSuccessor('scene-1', edges)).toBe('dialogue-1')
      expect(resolver.getSuccessor('dialogue-1', edges)).toBe('dialogue-2')
    })

    it('should return null for node with no successor', () => {
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      expect(resolver.getSuccessor('dialogue-1', edges)).toBeNull()
    })
  })

  describe('getAllSuccessors', () => {
    it('should return all successors for branching node', () => {
      const edges: FlowEdge[] = [
        createEdge('menu-1', 'dialogue-1', 'choice-0'),
        createEdge('menu-1', 'dialogue-2', 'choice-1'),
        createEdge('menu-1', 'dialogue-3', 'choice-2'),
      ]

      const successors = resolver.getAllSuccessors('menu-1', edges)
      expect(successors).toHaveLength(3)
      expect(successors).toContain('dialogue-1')
      expect(successors).toContain('dialogue-2')
      expect(successors).toContain('dialogue-3')
    })

    it('should return empty array for node with no successors', () => {
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      expect(resolver.getAllSuccessors('dialogue-1', edges)).toEqual([])
    })
  })

  describe('isConnected', () => {
    it('should return true for node with incoming edge', () => {
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      expect(resolver.isConnected('dialogue-1', edges)).toBe(true)
    })

    it('should return true for node with outgoing edge', () => {
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      expect(resolver.isConnected('scene-1', edges)).toBe(true)
    })

    it('should return false for isolated node', () => {
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      expect(resolver.isConnected('orphan', edges)).toBe(false)
    })
  })

  describe('isConnectedToScene', () => {
    it('should return true for node connected to scene', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('dialogue-1'),
      ]
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      expect(resolver.isConnectedToScene('dialogue-1', edges, nodes)).toBe(true)
    })

    it('should return false for orphan node', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('dialogue-1'),
        createDialogueNode('orphan'),
      ]
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      expect(resolver.isConnectedToScene('orphan', edges, nodes)).toBe(false)
    })

    it('should return true for scene node itself', () => {
      const nodes: FlowNode[] = [createSceneNode('scene-1', 'start')]
      const edges: FlowEdge[] = []

      expect(resolver.isConnectedToScene('scene-1', edges, nodes)).toBe(true)
    })
  })

  describe('getPathFromScene', () => {
    it('should return path from scene to target node', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('dialogue-1'),
        createDialogueNode('dialogue-2'),
      ]
      const edges: FlowEdge[] = [
        createEdge('scene-1', 'dialogue-1'),
        createEdge('dialogue-1', 'dialogue-2'),
      ]

      const path = resolver.getPathFromScene('dialogue-2', edges, nodes)
      expect(path).toEqual(['scene-1', 'dialogue-1', 'dialogue-2'])
    })

    it('should return single element for scene node', () => {
      const nodes: FlowNode[] = [createSceneNode('scene-1', 'start')]
      const edges: FlowEdge[] = []

      const path = resolver.getPathFromScene('scene-1', edges, nodes)
      expect(path).toEqual(['scene-1'])
    })

    it('should return empty array for orphan node', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('orphan'),
      ]
      const edges: FlowEdge[] = []

      const path = resolver.getPathFromScene('orphan', edges, nodes)
      expect(path).toEqual([])
    })
  })

  describe('getOrphanNodes', () => {
    it('should return empty array when all nodes connected', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('dialogue-1'),
        createDialogueNode('dialogue-2'),
      ]
      const edges: FlowEdge[] = [
        createEdge('scene-1', 'dialogue-1'),
        createEdge('dialogue-1', 'dialogue-2'),
      ]

      const orphans = resolver.getOrphanNodes(nodes, edges)
      expect(orphans).toEqual([])
    })

    it('should return orphan nodes', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('dialogue-1'),
        createDialogueNode('orphan-1'),
        createDialogueNode('orphan-2'),
      ]
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      const orphans = resolver.getOrphanNodes(nodes, edges)
      expect(orphans).toHaveLength(2)
      expect(orphans.map(n => n.id)).toContain('orphan-1')
      expect(orphans.map(n => n.id)).toContain('orphan-2')
    })

    it('should not include scene nodes as orphans', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createSceneNode('scene-2', 'chapter1'),
      ]
      const edges: FlowEdge[] = []

      const orphans = resolver.getOrphanNodes(nodes, edges)
      expect(orphans).toEqual([])
    })
  })

  describe('determineInsertPosition', () => {
    it('should return position after scene node (at label body start)', () => {
      const nodes: FlowNode[] = [createSceneNode('scene-1', 'start')]
      const edges: FlowEdge[] = []

      const position = resolver.determineInsertPosition(
        'scene-1',
        'new-node',
        edges,
        nodes
      )

      expect(position).toEqual({
        labelName: 'start',
        afterNodeId: null,
        beforeNodeId: null,
      })
    })

    it('should return position after source node', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('dialogue-1'),
      ]
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      const position = resolver.determineInsertPosition(
        'dialogue-1',
        'new-node',
        edges,
        nodes
      )

      expect(position).toEqual({
        labelName: 'start',
        afterNodeId: 'dialogue-1',
        beforeNodeId: null,
      })
    })

    it('should include existing successor as beforeNodeId', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('dialogue-1'),
        createDialogueNode('dialogue-2'),
      ]
      const edges: FlowEdge[] = [
        createEdge('scene-1', 'dialogue-1'),
        createEdge('dialogue-1', 'dialogue-2'),
      ]

      const position = resolver.determineInsertPosition(
        'dialogue-1',
        'new-node',
        edges,
        nodes
      )

      expect(position).toEqual({
        labelName: 'start',
        afterNodeId: 'dialogue-1',
        beforeNodeId: 'dialogue-2',
      })
    })

    it('should return null for non-existent source node', () => {
      const nodes: FlowNode[] = [createSceneNode('scene-1', 'start')]
      const edges: FlowEdge[] = []

      const position = resolver.determineInsertPosition(
        'non-existent',
        'new-node',
        edges,
        nodes
      )

      expect(position).toBeNull()
    })

    it('should return null for orphan source node', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('orphan'),
      ]
      const edges: FlowEdge[] = []

      const position = resolver.determineInsertPosition(
        'orphan',
        'new-node',
        edges,
        nodes
      )

      expect(position).toBeNull()
    })
  })

  describe('hasPath', () => {
    it('should return true when path exists', () => {
      const edges: FlowEdge[] = [
        createEdge('scene-1', 'dialogue-1'),
        createEdge('dialogue-1', 'dialogue-2'),
      ]

      expect(resolver.hasPath('scene-1', 'dialogue-2', edges)).toBe(true)
    })

    it('should return true for same source and target', () => {
      const edges: FlowEdge[] = []

      expect(resolver.hasPath('node-1', 'node-1', edges)).toBe(true)
    })

    it('should return false when no path exists', () => {
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      expect(resolver.hasPath('scene-1', 'orphan', edges)).toBe(false)
    })

    it('should handle branching paths', () => {
      const edges: FlowEdge[] = [
        createEdge('scene-1', 'menu-1'),
        createEdge('menu-1', 'dialogue-1', 'choice-0'),
        createEdge('menu-1', 'dialogue-2', 'choice-1'),
      ]

      expect(resolver.hasPath('scene-1', 'dialogue-1', edges)).toBe(true)
      expect(resolver.hasPath('scene-1', 'dialogue-2', edges)).toBe(true)
    })
  })

  describe('getSceneNode', () => {
    it('should return scene node for connected node', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('dialogue-1'),
      ]
      const edges: FlowEdge[] = [createEdge('scene-1', 'dialogue-1')]

      const sceneNode = resolver.getSceneNode('dialogue-1', edges, nodes)
      expect(sceneNode?.id).toBe('scene-1')
      expect(sceneNode?.data.label).toBe('start')
    })

    it('should return scene node itself when queried', () => {
      const nodes: FlowNode[] = [createSceneNode('scene-1', 'start')]
      const edges: FlowEdge[] = []

      const sceneNode = resolver.getSceneNode('scene-1', edges, nodes)
      expect(sceneNode?.id).toBe('scene-1')
    })

    it('should return null for orphan node', () => {
      const nodes: FlowNode[] = [
        createSceneNode('scene-1', 'start'),
        createDialogueNode('orphan'),
      ]
      const edges: FlowEdge[] = []

      const sceneNode = resolver.getSceneNode('orphan', edges, nodes)
      expect(sceneNode).toBeNull()
    })
  })
})
