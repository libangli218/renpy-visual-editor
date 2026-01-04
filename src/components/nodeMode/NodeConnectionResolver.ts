/**
 * NodeConnectionResolver - 节点连接解析器
 * 
 * 解析节点连接关系，确定节点在 AST 中的归属和位置。
 * 用于确定新创建的节点应该属于哪个 label，以及在 AST 中的插入位置。
 * 
 * Implements Requirements:
 * - 5.1: 节点连接时的 AST 同步
 * - 7.1, 7.2, 7.3: 节点位置确定
 */

import { FlowNode, FlowEdge } from './FlowGraphBuilder'

/**
 * 插入位置信息
 */
export interface InsertPosition {
  /** 目标 label 名称 */
  labelName: string
  /** 插入到此节点之后（null 表示插入到开头） */
  afterNodeId: string | null
  /** 插入到此节点之前（null 表示插入到末尾） */
  beforeNodeId: string | null
}

/**
 * NodeConnectionResolver 类
 * 
 * 解析节点连接关系，确定节点在 AST 中的归属和位置
 */
export class NodeConnectionResolver {
  /**
   * 根据连接关系确定节点属于哪个 label
   * 
   * 通过向上遍历连接关系，找到最近的 scene 节点，
   * 该 scene 节点的 label 就是目标节点所属的 label。
   * 
   * @param nodeId 节点 ID
   * @param edges 所有边
   * @param nodes 所有节点
   * @returns label 名称，如果无法确定则返回 null
   */
  resolveNodeLabel(
    nodeId: string,
    edges: FlowEdge[],
    nodes: FlowNode[]
  ): string | null {
    // 创建节点 ID 到节点的映射
    const nodeMap = new Map<string, FlowNode>()
    for (const node of nodes) {
      nodeMap.set(node.id, node)
    }

    // 检查当前节点是否是 scene 节点
    const currentNode = nodeMap.get(nodeId)
    if (currentNode?.type === 'scene') {
      return currentNode.data.label || null
    }

    // 向上遍历找到 scene 节点
    const visited = new Set<string>()
    const queue: string[] = [nodeId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      
      if (visited.has(currentId)) {
        continue
      }
      visited.add(currentId)

      // 找到所有指向当前节点的边（即当前节点是 target 的边）
      const incomingEdges = edges.filter(edge => edge.target === currentId)

      for (const edge of incomingEdges) {
        const sourceNode = nodeMap.get(edge.source)
        
        if (!sourceNode) {
          continue
        }

        // 如果源节点是 scene 节点，返回其 label
        if (sourceNode.type === 'scene') {
          return sourceNode.data.label || null
        }

        // 否则继续向上遍历
        if (!visited.has(edge.source)) {
          queue.push(edge.source)
        }
      }
    }

    // 无法确定 label
    return null
  }

  /**
   * 获取节点的前驱节点（流程中的上一个节点）
   * 
   * @param nodeId 节点 ID
   * @param edges 所有边
   * @returns 前驱节点 ID，如果没有则返回 null
   */
  getPredecessor(nodeId: string, edges: FlowEdge[]): string | null {
    // 找到指向当前节点的边
    const incomingEdge = edges.find(edge => edge.target === nodeId)
    return incomingEdge?.source || null
  }

  /**
   * 获取节点的后继节点（流程中的下一个节点）
   * 
   * 注意：一个节点可能有多个后继（如 menu 或 condition 节点），
   * 此方法只返回第一个后继。
   * 
   * @param nodeId 节点 ID
   * @param edges 所有边
   * @returns 后继节点 ID，如果没有则返回 null
   */
  getSuccessor(nodeId: string, edges: FlowEdge[]): string | null {
    // 找到从当前节点出发的边
    const outgoingEdge = edges.find(edge => edge.source === nodeId)
    return outgoingEdge?.target || null
  }

  /**
   * 获取节点的所有后继节点
   * 
   * @param nodeId 节点 ID
   * @param edges 所有边
   * @returns 所有后继节点 ID 数组
   */
  getAllSuccessors(nodeId: string, edges: FlowEdge[]): string[] {
    return edges
      .filter(edge => edge.source === nodeId)
      .map(edge => edge.target)
  }

  /**
   * 获取节点的所有前驱节点
   * 
   * @param nodeId 节点 ID
   * @param edges 所有边
   * @returns 所有前驱节点 ID 数组
   */
  getAllPredecessors(nodeId: string, edges: FlowEdge[]): string[] {
    return edges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source)
  }

  /**
   * 检查节点是否已连接到流程
   * 
   * 一个节点被认为是"已连接"的，如果它有任何入边或出边。
   * 
   * @param nodeId 节点 ID
   * @param edges 所有边
   * @returns 是否已连接
   */
  isConnected(nodeId: string, edges: FlowEdge[]): boolean {
    return edges.some(edge => edge.source === nodeId || edge.target === nodeId)
  }

  /**
   * 检查节点是否连接到任何 Scene 节点
   * 
   * 通过向上遍历连接关系，检查是否能到达任何 scene 节点。
   * 
   * @param nodeId 节点 ID
   * @param edges 所有边
   * @param nodes 所有节点
   * @returns 是否连接到 Scene
   */
  isConnectedToScene(
    nodeId: string,
    edges: FlowEdge[],
    nodes: FlowNode[]
  ): boolean {
    return this.resolveNodeLabel(nodeId, edges, nodes) !== null
  }

  /**
   * 获取从 Scene 节点到目标节点的路径
   * 
   * @param nodeId 目标节点 ID
   * @param edges 所有边
   * @param nodes 所有节点
   * @returns 从 Scene 到目标节点的路径（节点 ID 数组），如果无法到达则返回空数组
   */
  getPathFromScene(
    nodeId: string,
    edges: FlowEdge[],
    nodes: FlowNode[]
  ): string[] {
    // 创建节点 ID 到节点的映射
    const nodeMap = new Map<string, FlowNode>()
    for (const node of nodes) {
      nodeMap.set(node.id, node)
    }

    // 使用 BFS 向上遍历，记录路径
    const visited = new Set<string>()
    const parentMap = new Map<string, string>() // 记录每个节点的父节点
    const queue: string[] = [nodeId]
    let sceneNodeId: string | null = null

    while (queue.length > 0) {
      const currentId = queue.shift()!
      
      if (visited.has(currentId)) {
        continue
      }
      visited.add(currentId)

      const currentNode = nodeMap.get(currentId)
      
      // 如果找到 scene 节点，停止搜索
      if (currentNode?.type === 'scene') {
        sceneNodeId = currentId
        break
      }

      // 找到所有指向当前节点的边
      const incomingEdges = edges.filter(edge => edge.target === currentId)

      for (const edge of incomingEdges) {
        if (!visited.has(edge.source)) {
          parentMap.set(edge.source, currentId)
          queue.push(edge.source)
        }
      }
    }

    // 如果没有找到 scene 节点，返回空数组
    if (!sceneNodeId) {
      return []
    }

    // 重新构建从 scene 到 nodeId 的正向路径
    // 使用 DFS 从 scene 开始向下搜索
    return this.findPathDFS(sceneNodeId, nodeId, edges, new Set())
  }

  /**
   * 使用 DFS 查找从源节点到目标节点的路径
   * 
   * @param sourceId 源节点 ID
   * @param targetId 目标节点 ID
   * @param edges 所有边
   * @param visited 已访问节点集合
   * @returns 路径数组，如果无法到达则返回空数组
   */
  private findPathDFS(
    sourceId: string,
    targetId: string,
    edges: FlowEdge[],
    visited: Set<string>
  ): string[] {
    if (sourceId === targetId) {
      return [sourceId]
    }

    if (visited.has(sourceId)) {
      return []
    }
    visited.add(sourceId)

    // 获取所有从当前节点出发的边
    const outgoingEdges = edges.filter(edge => edge.source === sourceId)

    for (const edge of outgoingEdges) {
      const path = this.findPathDFS(edge.target, targetId, edges, visited)
      if (path.length > 0) {
        return [sourceId, ...path]
      }
    }

    return []
  }

  /**
   * 获取所有孤立节点
   * 
   * 孤立节点是指未通过任何路径连接到 Scene 节点的节点。
   * Scene 节点本身不被视为孤立节点。
   * 
   * @param nodes 所有节点
   * @param edges 所有边
   * @returns 孤立节点数组
   */
  getOrphanNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
    const orphans: FlowNode[] = []

    for (const node of nodes) {
      // Scene 节点不被视为孤立节点
      if (node.type === 'scene') {
        continue
      }

      // 检查节点是否连接到任何 Scene
      if (!this.isConnectedToScene(node.id, edges, nodes)) {
        orphans.push(node)
      }
    }

    return orphans
  }

  /**
   * 确定新节点应该插入的位置
   * 
   * 根据源节点（连接的起点）确定新节点在 AST 中的插入位置。
   * 
   * @param sourceNodeId 源节点 ID（连接的起点）
   * @param _targetNodeId 目标节点 ID（新节点或连接的终点，用于未来扩展）
   * @param edges 所有边
   * @param nodes 所有节点
   * @returns 插入位置信息，如果无法确定则返回 null
   */
  determineInsertPosition(
    sourceNodeId: string,
    _targetNodeId: string,
    edges: FlowEdge[],
    nodes: FlowNode[]
  ): InsertPosition | null {
    // 创建节点 ID 到节点的映射
    const nodeMap = new Map<string, FlowNode>()
    for (const node of nodes) {
      nodeMap.set(node.id, node)
    }

    const sourceNode = nodeMap.get(sourceNodeId)
    if (!sourceNode) {
      return null
    }

    // 确定 label
    let labelName: string | null = null

    if (sourceNode.type === 'scene') {
      // 如果源节点是 scene，使用其 label
      labelName = sourceNode.data.label || null
    } else {
      // 否则向上查找 label
      labelName = this.resolveNodeLabel(sourceNodeId, edges, nodes)
    }

    if (!labelName) {
      return null
    }

    // 确定插入位置
    if (sourceNode.type === 'scene') {
      // 连接到 Scene 输出：插入到 label body 开头
      // 检查是否已有后继节点
      const existingSuccessor = this.getSuccessor(sourceNodeId, edges)
      return {
        labelName,
        afterNodeId: null, // 插入到开头
        beforeNodeId: existingSuccessor,
      }
    } else {
      // 连接到其他节点输出：插入到源节点之后
      const existingSuccessor = this.getSuccessor(sourceNodeId, edges)
      return {
        labelName,
        afterNodeId: sourceNodeId,
        beforeNodeId: existingSuccessor,
      }
    }
  }

  /**
   * 检查是否存在从源节点到目标节点的路径
   * 
   * @param sourceId 源节点 ID
   * @param targetId 目标节点 ID
   * @param edges 所有边
   * @returns 是否存在路径
   */
  hasPath(sourceId: string, targetId: string, edges: FlowEdge[]): boolean {
    if (sourceId === targetId) {
      return true
    }

    const visited = new Set<string>()
    const queue: string[] = [sourceId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      
      if (visited.has(currentId)) {
        continue
      }
      visited.add(currentId)

      const outgoingEdges = edges.filter(edge => edge.source === currentId)

      for (const edge of outgoingEdges) {
        if (edge.target === targetId) {
          return true
        }
        if (!visited.has(edge.target)) {
          queue.push(edge.target)
        }
      }
    }

    return false
  }

  /**
   * 获取节点所在的 Scene 节点
   * 
   * @param nodeId 节点 ID
   * @param edges 所有边
   * @param nodes 所有节点
   * @returns Scene 节点，如果无法找到则返回 null
   */
  getSceneNode(
    nodeId: string,
    edges: FlowEdge[],
    nodes: FlowNode[]
  ): FlowNode | null {
    const nodeMap = new Map<string, FlowNode>()
    for (const node of nodes) {
      nodeMap.set(node.id, node)
    }

    const currentNode = nodeMap.get(nodeId)
    if (currentNode?.type === 'scene') {
      return currentNode
    }

    const labelName = this.resolveNodeLabel(nodeId, edges, nodes)
    if (!labelName) {
      return null
    }

    // 找到对应的 scene 节点
    for (const node of nodes) {
      if (node.type === 'scene' && node.data.label === labelName) {
        return node
      }
    }

    return null
  }
}

// Export singleton instance
export const nodeConnectionResolver = new NodeConnectionResolver()
