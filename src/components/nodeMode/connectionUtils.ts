import { Connection, Edge, Node } from '@xyflow/react'

/**
 * Connection utilities for node mode editor
 * Implements Requirements 5.3, 5.8: Node connections and edge management
 */

/**
 * Node port definitions
 * Defines which node types have which ports
 */
export interface PortDefinition {
  id: string
  type: 'source' | 'target'
  label?: string
  maxConnections?: number
}

/**
 * Get port definitions for a node type
 */
export function getNodePorts(nodeType: string, data?: Record<string, unknown>): {
  sourcePorts: PortDefinition[]
  targetPorts: PortDefinition[]
} {
  const defaultSourcePort: PortDefinition = { id: 'default', type: 'source' }
  const defaultTargetPort: PortDefinition = { id: 'default', type: 'target' }

  switch (nodeType) {
    case 'label':
      // Labels are entry points - no target port, one source port
      return {
        sourcePorts: [defaultSourcePort],
        targetPorts: [],
      }

    case 'jump':
    case 'return':
      // Jump and return are exit points - target port, no source port
      return {
        sourcePorts: [],
        targetPorts: [defaultTargetPort],
      }

    case 'menu': {
      // Menu has multiple source ports (one per choice)
      const choices = (data?.choices as Array<{ text: string }>) || []
      return {
        sourcePorts: choices.map((choice, index) => ({
          id: `choice-${index}`,
          type: 'source' as const,
          label: choice.text,
        })),
        targetPorts: [defaultTargetPort],
      }
    }

    case 'if': {
      // If has multiple source ports (one per branch)
      const branches = (data?.branches as Array<{ condition: string | null }>) || []
      return {
        sourcePorts: branches.map((branch, index) => ({
          id: `branch-${index}`,
          type: 'source' as const,
          label: branch.condition || 'else',
        })),
        targetPorts: [defaultTargetPort],
      }
    }

    case 'define':
    case 'default':
      // Variable definitions are standalone - no connections
      return {
        sourcePorts: [],
        targetPorts: [],
      }

    default:
      // Most nodes have one source and one target port
      return {
        sourcePorts: [defaultSourcePort],
        targetPorts: [defaultTargetPort],
      }
  }
}

/**
 * Validate if a connection is allowed
 */
export function isValidConnection(
  connection: Connection,
  nodes: Node[],
  edges: Edge[]
): boolean {
  const { source, target, sourceHandle, targetHandle } = connection

  // Can't connect to self
  if (source === target) {
    return false
  }

  // Find source and target nodes
  const sourceNode = nodes.find((n) => n.id === source)
  const targetNode = nodes.find((n) => n.id === target)

  if (!sourceNode || !targetNode) {
    return false
  }

  // Check if source node type allows outgoing connections
  const sourcePorts = getNodePorts(sourceNode.type || '', sourceNode.data as Record<string, unknown>)
  if (sourcePorts.sourcePorts.length === 0) {
    return false
  }

  // Check if target node type allows incoming connections
  const targetPorts = getNodePorts(targetNode.type || '', targetNode.data as Record<string, unknown>)
  if (targetPorts.targetPorts.length === 0) {
    return false
  }

  // Check if the specific handle exists
  if (sourceHandle) {
    const hasSourceHandle = sourcePorts.sourcePorts.some((p) => p.id === sourceHandle)
    if (!hasSourceHandle) {
      return false
    }
  }

  if (targetHandle) {
    const hasTargetHandle = targetPorts.targetPorts.some((p) => p.id === targetHandle)
    if (!hasTargetHandle) {
      return false
    }
  }

  // Check for duplicate connections
  const existingEdge = edges.find(
    (e) =>
      e.source === source &&
      e.target === target &&
      e.sourceHandle === sourceHandle &&
      e.targetHandle === targetHandle
  )
  if (existingEdge) {
    return false
  }

  return true
}

/**
 * Create an edge ID from connection parameters
 */
export function createEdgeId(connection: Connection): string {
  const { source, target, sourceHandle, targetHandle } = connection
  const parts = ['e', source, target]
  if (sourceHandle) parts.push(sourceHandle)
  if (targetHandle) parts.push(targetHandle)
  return parts.join('-')
}

/**
 * Get edges connected to a node
 */
export function getConnectedEdges(nodeId: string, edges: Edge[]): {
  incoming: Edge[]
  outgoing: Edge[]
} {
  return {
    incoming: edges.filter((e) => e.target === nodeId),
    outgoing: edges.filter((e) => e.source === nodeId),
  }
}

/**
 * Remove edges connected to a node
 */
export function removeNodeEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
}

/**
 * Update edges when a node is deleted
 */
export function handleNodeDeletion(
  deletedNodeIds: string[],
  edges: Edge[]
): Edge[] {
  return edges.filter(
    (e) => !deletedNodeIds.includes(e.source) && !deletedNodeIds.includes(e.target)
  )
}

/**
 * Get the flow order of nodes based on edges
 * Returns nodes in execution order starting from labels
 */
export function getFlowOrder(nodes: Node[], edges: Edge[]): Node[] {
  const result: Node[] = []
  const visited = new Set<string>()

  // Find all label nodes (entry points)
  const labelNodes = nodes.filter((n) => n.type === 'label')

  // DFS from each label
  function visit(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = nodes.find((n) => n.id === nodeId)
    if (node) {
      result.push(node)

      // Find outgoing edges and visit targets
      const outgoing = edges.filter((e) => e.source === nodeId)
      outgoing.forEach((e) => visit(e.target))
    }
  }

  labelNodes.forEach((label) => visit(label.id))

  // Add any unvisited nodes (disconnected)
  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      result.push(n)
    }
  })

  return result
}

/**
 * Convert edges to AST flow structure
 * Maps edge connections to AST node relationships
 */
export function edgesToAstFlow(
  edges: Edge[],
  _nodes: Node[]
): Map<string, string[]> {
  const flowMap = new Map<string, string[]>()

  edges.forEach((edge) => {
    const targets = flowMap.get(edge.source) || []
    targets.push(edge.target)
    flowMap.set(edge.source, targets)
  })

  return flowMap
}

/**
 * Detect cycles in the flow graph
 */
export function detectCycles(nodes: Node[], edges: Edge[]): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []

  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)
    path.push(nodeId)

    const outgoing = edges.filter((e) => e.source === nodeId)
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        if (dfs(edge.target)) {
          return true
        }
      } else if (recursionStack.has(edge.target)) {
        // Found a cycle
        const cycleStart = path.indexOf(edge.target)
        cycles.push([...path.slice(cycleStart), edge.target])
      }
    }

    path.pop()
    recursionStack.delete(nodeId)
    return false
  }

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      dfs(node.id)
    }
  })

  return cycles
}

/**
 * Find disconnected nodes - nodes not reachable from any scene (label) node
 * Implements Requirement 9.5: Dim nodes that are not connected to the main flow
 * 
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @returns Set of node IDs that are disconnected from the main flow
 */
export function findDisconnectedNodes(nodes: Node[], edges: Edge[]): Set<string> {
  const connectedNodes = new Set<string>()
  
  // Find all scene (label) nodes - these are entry points
  const sceneNodes = nodes.filter((n) => n.type === 'scene')
  
  // If no scene nodes, all nodes are considered disconnected
  if (sceneNodes.length === 0) {
    return new Set(nodes.map(n => n.id))
  }
  
  // Build adjacency list for bidirectional traversal
  const adjacencyList = new Map<string, Set<string>>()
  
  // Initialize adjacency list
  nodes.forEach(node => {
    adjacencyList.set(node.id, new Set())
  })
  
  // Add edges (both directions for reachability)
  edges.forEach(edge => {
    // Forward direction (source -> target)
    adjacencyList.get(edge.source)?.add(edge.target)
    // Backward direction (target -> source) - for nodes that flow INTO scene nodes
    adjacencyList.get(edge.target)?.add(edge.source)
  })
  
  // BFS from all scene nodes
  const queue: string[] = sceneNodes.map(n => n.id)
  
  while (queue.length > 0) {
    const currentId = queue.shift()!
    
    if (connectedNodes.has(currentId)) {
      continue
    }
    
    connectedNodes.add(currentId)
    
    // Visit all connected nodes
    const neighbors = adjacencyList.get(currentId)
    if (neighbors) {
      neighbors.forEach(neighborId => {
        if (!connectedNodes.has(neighborId)) {
          queue.push(neighborId)
        }
      })
    }
  }
  
  // Return nodes that are NOT connected
  const disconnectedNodes = new Set<string>()
  nodes.forEach(node => {
    if (!connectedNodes.has(node.id)) {
      disconnectedNodes.add(node.id)
    }
  })
  
  return disconnectedNodes
}
