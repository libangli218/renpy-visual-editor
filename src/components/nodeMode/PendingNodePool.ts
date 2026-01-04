/**
 * PendingNodePool - 临时节点池
 * 
 * 管理未连接到 AST 的临时节点。当用户在流程图中创建新节点时，
 * 节点首先存储在此池中，直到用户建立连接后才同步到 AST。
 * 
 * Implements Requirements:
 * - 1.1: 对话节点创建与持久化
 * - 6.1: 孤立节点处理
 */

import { FlowNodeType, FlowNodeData } from './FlowGraphBuilder'

/**
 * 待处理节点状态枚举
 */
export enum PendingNodeStatus {
  /** 刚创建，未连接 */
  CREATED = 'created',
  /** 已连接，待同步 */
  CONNECTED = 'connected',
  /** 已同步到 AST */
  SYNCED = 'synced',
  /** 孤立状态 */
  ORPHAN = 'orphan',
}

/**
 * 节点位置接口
 */
export interface XYPosition {
  x: number
  y: number
}

/**
 * 待处理节点接口
 */
export interface PendingNode {
  /** 节点唯一标识 */
  id: string
  /** 节点类型 */
  type: FlowNodeType
  /** 节点位置 */
  position: XYPosition
  /** 节点数据 */
  data: FlowNodeData
  /** 节点状态 */
  status: PendingNodeStatus
  /** 创建时间戳 */
  createdAt: number
  /** 更新时间戳 */
  updatedAt: number
  /** 连接信息（当节点已连接时） */
  connectedTo?: {
    sourceNodeId: string
    sourceHandle?: string
  }
  /** AST 节点 ID（当节点已同步时） */
  astNodeId?: string
  /** 所属 label 名称（当节点已同步时） */
  labelName?: string
}

/**
 * PendingNodePool 类
 * 
 * 管理未连接到 AST 的临时节点池
 */
export class PendingNodePool {
  /** 内部节点存储 */
  private nodes: Map<string, PendingNode> = new Map()

  /**
   * 添加待处理节点
   * @param node 待处理节点
   */
  add(node: PendingNode): void {
    this.nodes.set(node.id, {
      ...node,
      updatedAt: Date.now(),
    })
  }

  /**
   * 移除待处理节点（已同步到 AST 或被删除）
   * @param nodeId 节点 ID
   * @returns 是否成功移除
   */
  remove(nodeId: string): boolean {
    return this.nodes.delete(nodeId)
  }

  /**
   * 获取待处理节点
   * @param nodeId 节点 ID
   * @returns 待处理节点，如果不存在则返回 undefined
   */
  get(nodeId: string): PendingNode | undefined {
    return this.nodes.get(nodeId)
  }

  /**
   * 获取所有待处理节点
   * @returns 所有待处理节点数组
   */
  getAll(): PendingNode[] {
    return Array.from(this.nodes.values())
  }

  /**
   * 检查节点是否为待处理状态
   * @param nodeId 节点 ID
   * @returns 是否为待处理状态
   */
  isPending(nodeId: string): boolean {
    return this.nodes.has(nodeId)
  }

  /**
   * 清空所有待处理节点
   */
  clear(): void {
    this.nodes.clear()
  }

  /**
   * 获取待处理节点数量
   * @returns 节点数量
   */
  size(): number {
    return this.nodes.size
  }

  /**
   * 更新节点状态
   * @param nodeId 节点 ID
   * @param status 新状态
   * @returns 是否成功更新
   */
  updateStatus(nodeId: string, status: PendingNodeStatus): boolean {
    const node = this.nodes.get(nodeId)
    if (!node) {
      return false
    }
    node.status = status
    node.updatedAt = Date.now()
    return true
  }

  /**
   * 更新节点连接信息
   * @param nodeId 节点 ID
   * @param connectedTo 连接信息
   * @returns 是否成功更新
   */
  updateConnection(
    nodeId: string,
    connectedTo: { sourceNodeId: string; sourceHandle?: string }
  ): boolean {
    const node = this.nodes.get(nodeId)
    if (!node) {
      return false
    }
    node.connectedTo = connectedTo
    node.status = PendingNodeStatus.CONNECTED
    node.updatedAt = Date.now()
    return true
  }

  /**
   * 标记节点为已同步
   * @param nodeId 节点 ID
   * @param astNodeId AST 节点 ID
   * @param labelName 所属 label 名称
   * @returns 是否成功更新
   */
  markSynced(nodeId: string, astNodeId: string, labelName: string): boolean {
    const node = this.nodes.get(nodeId)
    if (!node) {
      return false
    }
    node.status = PendingNodeStatus.SYNCED
    node.astNodeId = astNodeId
    node.labelName = labelName
    node.updatedAt = Date.now()
    return true
  }

  /**
   * 获取指定状态的所有节点
   * @param status 节点状态
   * @returns 符合状态的节点数组
   */
  getByStatus(status: PendingNodeStatus): PendingNode[] {
    return this.getAll().filter(node => node.status === status)
  }

  /**
   * 获取所有孤立节点
   * @returns 孤立节点数组
   */
  getOrphanNodes(): PendingNode[] {
    return this.getByStatus(PendingNodeStatus.ORPHAN)
  }

  /**
   * 获取所有已连接但未同步的节点
   * @returns 已连接节点数组
   */
  getConnectedNodes(): PendingNode[] {
    return this.getByStatus(PendingNodeStatus.CONNECTED)
  }

  /**
   * 更新节点数据
   * @param nodeId 节点 ID
   * @param data 新的节点数据（部分更新）
   * @returns 是否成功更新
   */
  updateData(nodeId: string, data: Partial<FlowNodeData>): boolean {
    const node = this.nodes.get(nodeId)
    if (!node) {
      return false
    }
    node.data = { ...node.data, ...data }
    node.updatedAt = Date.now()
    return true
  }

  /**
   * 更新节点位置
   * @param nodeId 节点 ID
   * @param position 新位置
   * @returns 是否成功更新
   */
  updatePosition(nodeId: string, position: XYPosition): boolean {
    const node = this.nodes.get(nodeId)
    if (!node) {
      return false
    }
    node.position = position
    node.updatedAt = Date.now()
    return true
  }
}

/**
 * 创建新的待处理节点
 * @param id 节点 ID
 * @param type 节点类型
 * @param position 节点位置
 * @param data 节点数据
 * @returns 新的待处理节点
 */
export function createPendingNode(
  id: string,
  type: FlowNodeType,
  position: XYPosition,
  data: FlowNodeData
): PendingNode {
  const now = Date.now()
  return {
    id,
    type,
    position,
    data,
    status: PendingNodeStatus.CREATED,
    createdAt: now,
    updatedAt: now,
  }
}

// Export singleton instance for convenience
export const pendingNodePool = new PendingNodePool()
