/**
 * NodeOperationHandler - 节点操作处理器
 * 
 * 处理用户的节点操作，协调 AST 同步和 UI 更新。
 * 负责创建、连接、删除节点，以及管理孤立节点。
 * 
 * Implements Requirements:
 * - 1.1: 对话节点创建与持久化
 * - 1.2: 将对话节点添加到对应 label 的 body 中
 * - 5.2: 连接建立后将节点 AST 表示插入到正确的 label body 中
 * - 6.1: 孤立节点处理
 * - 6.3: 保存时忽略孤立节点
 */

import { FlowNodeType, FlowNodeData, FlowNode, FlowGraph } from './FlowGraphBuilder'
import {
  PendingNodePool,
  PendingNode,
  PendingNodeStatus,
  XYPosition,
  createPendingNode,
} from './PendingNodePool'
import { NodeConnectionResolver, InsertPosition } from './NodeConnectionResolver'
import { ASTSynchronizer, DialogueData, MenuData } from './ASTSynchronizer'
import { RenpyScript, ASTNode } from '../../types/ast'

/**
 * Result of a node operation
 */
export interface NodeOperationResult {
  success: boolean
  nodeId?: string
  error?: string
}

/**
 * Result of a connect operation
 */
export interface ConnectResult {
  success: boolean
  astNodeId?: string
  error?: string
}

/**
 * Result of committing pending nodes
 */
export interface CommitResult {
  success: boolean
  syncedNodeIds: string[]
  orphanNodeIds: string[]
  errors: string[]
}

/**
 * Generate a unique ID for new nodes
 */
function generateNodeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * NodeOperationHandler class
 * 
 * Coordinates node operations between the UI, PendingNodePool, and ASTSynchronizer.
 */
export class NodeOperationHandler {
  private pendingNodePool: PendingNodePool
  private connectionResolver: NodeConnectionResolver
  private astSynchronizer: ASTSynchronizer

  constructor(
    pendingNodePool?: PendingNodePool,
    connectionResolver?: NodeConnectionResolver,
    astSynchronizer?: ASTSynchronizer
  ) {
    this.pendingNodePool = pendingNodePool || new PendingNodePool()
    this.connectionResolver = connectionResolver || new NodeConnectionResolver()
    this.astSynchronizer = astSynchronizer || new ASTSynchronizer()
  }

  /**
   * Create a new node and add it to the PendingNodePool
   * 
   * Implements Requirement 1.1: 创建新的对话节点并显示在画布上
   * 
   * @param type - The type of node to create
   * @param position - The position on the canvas
   * @param data - Initial node data
   * @returns The ID of the created node
   */
  createNode(
    type: FlowNodeType,
    position: XYPosition,
    data: Partial<FlowNodeData> = {}
  ): string {
    const nodeId = generateNodeId(type)
    
    // Create default data based on node type
    const defaultData = this.getDefaultDataForType(type)
    const nodeData: FlowNodeData = { ...defaultData, ...data }

    // Create the pending node
    const pendingNode = createPendingNode(nodeId, type, position, nodeData)
    
    // Add to the pending node pool
    this.pendingNodePool.add(pendingNode)

    return nodeId
  }

  /**
   * Get default data for a node type
   */
  private getDefaultDataForType(type: FlowNodeType): FlowNodeData {
    switch (type) {
      case 'dialogue-block':
        return {
          dialogues: [{
            speaker: null,
            text: 'New dialogue',
            id: generateNodeId('dialogue'),
          }],
          visualCommands: [],
          expanded: true,
        }
      case 'menu':
        return {
          prompt: undefined,
          choices: [
            {
              text: 'Choice 1',
              portId: 'choice-0',
              body: [],
            },
            {
              text: 'Choice 2',
              portId: 'choice-1',
              body: [],
            },
          ],
        }
      case 'scene':
        return {
          label: 'new_label',
          preview: '',
          exitType: 'fall-through',
        }
      case 'jump':
        return {
          target: '',
          isCall: false,
        }
      case 'call':
        return {
          target: '',
          isCall: true,
        }
      case 'return':
        return {}
      case 'condition':
        return {
          condition: 'True',
          branches: [
            { condition: 'True', portId: 'branch-0', body: [] },
            { condition: null, portId: 'branch-1', body: [] },
          ],
        }
      default:
        return {}
    }
  }

  /**
   * Connect two nodes and trigger AST synchronization
   * 
   * Implements Requirements:
   * - 1.2: 将对话节点添加到对应 label 的 body 中
   * - 5.2: 连接建立后将节点 AST 表示插入到正确的 label body 中
   * 
   * @param sourceId - The source node ID
   * @param targetId - The target node ID
   * @param sourceHandle - Optional source handle (for menu choices, condition branches)
   * @param graph - The current flow graph state
   * @param ast - The current AST
   * @returns Result of the connect operation
   */
  connectNodes(
    sourceId: string,
    targetId: string,
    sourceHandle: string | undefined,
    graph: FlowGraph,
    ast: RenpyScript
  ): ConnectResult {
    // Check if target is a pending node
    const pendingNode = this.pendingNodePool.get(targetId)
    
    if (!pendingNode) {
      // Target is not a pending node, this is a connection between existing nodes
      // Handle jump/call creation for menu choices or condition branches
      return this.handleExistingNodeConnection(sourceId, targetId, sourceHandle, graph, ast)
    }

    // Target is a pending node - need to sync it to AST
    return this.syncPendingNodeToAst(pendingNode, sourceId, sourceHandle, graph, ast)
  }

  /**
   * Handle connection between existing nodes (e.g., menu choice to scene)
   */
  private handleExistingNodeConnection(
    sourceId: string,
    targetId: string,
    sourceHandle: string | undefined,
    graph: FlowGraph,
    ast: RenpyScript
  ): ConnectResult {
    const sourceNode = graph.nodes.find(n => n.id === sourceId)
    const targetNode = graph.nodes.find(n => n.id === targetId)

    if (!sourceNode || !targetNode) {
      return { success: false, error: 'Source or target node not found' }
    }

    // If connecting from a menu choice to a scene, insert jump into choice body
    if (sourceNode.type === 'menu' && targetNode.type === 'scene' && sourceHandle) {
      const choiceIndex = this.parseChoiceIndex(sourceHandle)
      if (choiceIndex !== null && targetNode.data.label) {
        // Find the menu's AST node ID
        const menuAstNode = sourceNode.data.astNodes?.find(n => n.type === 'menu')
        if (menuAstNode) {
          const success = this.astSynchronizer.insertJumpIntoChoice(
            menuAstNode.id,
            choiceIndex,
            targetNode.data.label,
            ast
          )
          if (success) {
            return { success: true }
          }
        }
      }
    }

    // If connecting from a condition branch to a scene, similar logic would apply
    // For now, return success for other connection types
    return { success: true }
  }

  /**
   * Parse choice index from source handle (e.g., "choice-0" -> 0)
   */
  private parseChoiceIndex(sourceHandle: string): number | null {
    const match = sourceHandle.match(/^choice-(\d+)$/)
    if (match) {
      return parseInt(match[1], 10)
    }
    return null
  }

  /**
   * Sync a pending node to the AST
   */
  private syncPendingNodeToAst(
    pendingNode: PendingNode,
    sourceId: string,
    sourceHandle: string | undefined,
    graph: FlowGraph,
    ast: RenpyScript
  ): ConnectResult {
    // Update the pending node's connection info
    this.pendingNodePool.updateConnection(pendingNode.id, {
      sourceNodeId: sourceId,
      sourceHandle,
    })

    // Determine the insert position
    const insertPosition = this.connectionResolver.determineInsertPosition(
      sourceId,
      pendingNode.id,
      graph.edges,
      graph.nodes
    )

    if (!insertPosition) {
      return { success: false, error: 'Could not determine insert position' }
    }

    // Sync based on node type
    let astNodeId: string | null = null

    switch (pendingNode.type) {
      case 'dialogue-block':
        astNodeId = this.syncDialogueBlock(pendingNode, insertPosition, ast)
        break
      case 'menu':
        astNodeId = this.syncMenu(pendingNode, insertPosition, ast)
        break
      case 'scene':
        astNodeId = this.syncScene(pendingNode, ast)
        break
      case 'jump':
        astNodeId = this.syncJump(pendingNode, insertPosition, ast)
        break
      case 'call':
        astNodeId = this.syncCall(pendingNode, insertPosition, ast)
        break
      default:
        return { success: false, error: `Unsupported node type: ${pendingNode.type}` }
    }

    if (!astNodeId) {
      return { success: false, error: 'Failed to sync node to AST' }
    }

    // Mark the pending node as synced
    this.pendingNodePool.markSynced(pendingNode.id, astNodeId, insertPosition.labelName)

    return { success: true, astNodeId }
  }

  /**
   * Sync a dialogue block to the AST
   */
  private syncDialogueBlock(
    pendingNode: PendingNode,
    insertPosition: InsertPosition,
    ast: RenpyScript
  ): string | null {
    const dialogues = pendingNode.data.dialogues
    if (!dialogues || dialogues.length === 0) {
      return null
    }

    // Insert the first dialogue (for now, we handle single dialogue)
    const firstDialogue = dialogues[0]
    const dialogueData: DialogueData = {
      speaker: firstDialogue.speaker,
      text: firstDialogue.text,
      attributes: firstDialogue.attributes,
    }

    return this.astSynchronizer.insertDialogue(
      insertPosition.labelName,
      dialogueData,
      ast,
      insertPosition.afterNodeId || undefined
    )
  }

  /**
   * Sync a menu to the AST
   */
  private syncMenu(
    pendingNode: PendingNode,
    insertPosition: InsertPosition,
    ast: RenpyScript
  ): string | null {
    const choices = pendingNode.data.choices
    if (!choices || choices.length === 0) {
      return null
    }

    const menuData: MenuData = {
      prompt: pendingNode.data.prompt,
      choices: choices.map(choice => ({
        text: choice.text,
        condition: choice.condition,
        body: choice.body || [],
      })),
    }

    return this.astSynchronizer.insertMenu(
      insertPosition.labelName,
      menuData,
      ast,
      insertPosition.afterNodeId || undefined
    )
  }

  /**
   * Sync a scene (label) to the AST
   */
  private syncScene(
    pendingNode: PendingNode,
    ast: RenpyScript
  ): string | null {
    const labelName = pendingNode.data.label
    if (!labelName) {
      return null
    }

    const result = this.astSynchronizer.addLabel(labelName, ast)
    if (!result.success) {
      // Log error for debugging
      if (result.error) {
        console.warn(`Failed to add label "${labelName}": ${result.error.message}`)
      }
      return null
    }

    // Return the label ID from the result
    return result.labelId || null
  }

  /**
   * Sync a jump node to the AST
   */
  private syncJump(
    pendingNode: PendingNode,
    insertPosition: InsertPosition,
    ast: RenpyScript
  ): string | null {
    const target = pendingNode.data.target
    if (!target) {
      return null
    }

    const success = this.astSynchronizer.insertJumpIntoLabel(
      insertPosition.labelName,
      target,
      ast,
      insertPosition.afterNodeId ? 'end' : 0
    )

    if (!success) {
      return null
    }

    // Find the inserted jump node
    const labelNode = ast.statements.find(
      s => s.type === 'label' && (s as any).name === insertPosition.labelName
    ) as any
    
    if (labelNode?.body) {
      const jumpNode = labelNode.body.find(
        (n: ASTNode) => n.type === 'jump' && (n as any).target === target
      )
      return jumpNode?.id || null
    }

    return null
  }

  /**
   * Sync a call node to the AST
   */
  private syncCall(
    pendingNode: PendingNode,
    insertPosition: InsertPosition,
    ast: RenpyScript
  ): string | null {
    const target = pendingNode.data.target
    if (!target) {
      return null
    }

    const success = this.astSynchronizer.insertCallIntoLabel(
      insertPosition.labelName,
      target,
      ast,
      insertPosition.afterNodeId ? 'end' : 0
    )

    if (!success) {
      return null
    }

    // Find the inserted call node
    const labelNode = ast.statements.find(
      s => s.type === 'label' && (s as any).name === insertPosition.labelName
    ) as any
    
    if (labelNode?.body) {
      const callNode = labelNode.body.find(
        (n: ASTNode) => n.type === 'call' && (n as any).target === target
      )
      return callNode?.id || null
    }

    return null
  }

  /**
   * Delete a node
   * 
   * @param nodeId - The node ID to delete
   * @param graph - The current flow graph
   * @param ast - The current AST
   * @returns Result of the delete operation
   */
  deleteNode(
    nodeId: string,
    graph: FlowGraph,
    ast: RenpyScript
  ): { ast: RenpyScript; removedEdgeIds: string[] } {
    // Check if it's a pending node
    if (this.pendingNodePool.isPending(nodeId)) {
      this.pendingNodePool.remove(nodeId)
      return { ast, removedEdgeIds: [] }
    }

    // Delete from AST using the synchronizer
    return this.astSynchronizer.deleteNode(nodeId, graph, ast)
  }

  /**
   * Get all orphan nodes (nodes not connected to any Scene)
   * 
   * Implements Requirement 6.1: 以视觉方式标记该节点为孤立状态
   * 
   * @param graph - The current flow graph
   * @returns Array of orphan nodes
   */
  getOrphanNodes(graph: FlowGraph): FlowNode[] {
    // Get orphan nodes from the connection resolver
    const orphanFlowNodes = this.connectionResolver.getOrphanNodes(graph.nodes, graph.edges)

    // Also check pending nodes that are not connected
    const pendingOrphans = this.pendingNodePool.getAll().filter(pendingNode => {
      // A pending node is orphan if it's in CREATED or ORPHAN status
      return pendingNode.status === PendingNodeStatus.CREATED ||
             pendingNode.status === PendingNodeStatus.ORPHAN
    })

    // Mark pending orphans
    for (const pendingNode of pendingOrphans) {
      this.pendingNodePool.updateStatus(pendingNode.id, PendingNodeStatus.ORPHAN)
    }

    // Convert pending orphans to FlowNode format
    const pendingOrphanFlowNodes: FlowNode[] = pendingOrphans.map(pn => ({
      id: pn.id,
      type: pn.type,
      position: pn.position,
      data: pn.data,
    }))

    return [...orphanFlowNodes, ...pendingOrphanFlowNodes]
  }

  /**
   * Commit all pending nodes to the AST
   * 
   * Implements Requirement 6.3: 忽略孤立节点不生成对应代码
   * 
   * @param graph - The current flow graph
   * @param ast - The current AST
   * @param includeOrphans - Whether to include orphan nodes (default: false)
   * @returns Result of the commit operation
   */
  commitPendingNodes(
    graph: FlowGraph,
    ast: RenpyScript,
    includeOrphans: boolean = false
  ): CommitResult {
    const syncedNodeIds: string[] = []
    const orphanNodeIds: string[] = []
    const errors: string[] = []

    // Get all pending nodes
    const pendingNodes = this.pendingNodePool.getAll()

    for (const pendingNode of pendingNodes) {
      // Check if node is connected
      const isConnected = pendingNode.status === PendingNodeStatus.CONNECTED ||
                          pendingNode.status === PendingNodeStatus.SYNCED

      if (!isConnected) {
        // Node is orphan
        orphanNodeIds.push(pendingNode.id)
        
        if (!includeOrphans) {
          // Skip orphan nodes
          continue
        }
      }

      // If already synced, skip
      if (pendingNode.status === PendingNodeStatus.SYNCED) {
        syncedNodeIds.push(pendingNode.id)
        continue
      }

      // Try to sync the node
      if (pendingNode.connectedTo) {
        const result = this.syncPendingNodeToAst(
          pendingNode,
          pendingNode.connectedTo.sourceNodeId,
          pendingNode.connectedTo.sourceHandle,
          graph,
          ast
        )

        if (result.success) {
          syncedNodeIds.push(pendingNode.id)
        } else {
          errors.push(`Failed to sync node ${pendingNode.id}: ${result.error}`)
        }
      }
    }

    // Clear synced nodes from the pool
    for (const nodeId of syncedNodeIds) {
      const node = this.pendingNodePool.get(nodeId)
      if (node?.status === PendingNodeStatus.SYNCED) {
        this.pendingNodePool.remove(nodeId)
      }
    }

    return {
      success: errors.length === 0,
      syncedNodeIds,
      orphanNodeIds,
      errors,
    }
  }

  /**
   * Check if a node is pending (not yet synced to AST)
   */
  isPendingNode(nodeId: string): boolean {
    return this.pendingNodePool.isPending(nodeId)
  }

  /**
   * Get a pending node by ID
   */
  getPendingNode(nodeId: string): PendingNode | undefined {
    return this.pendingNodePool.get(nodeId)
  }

  /**
   * Get all pending nodes
   */
  getAllPendingNodes(): PendingNode[] {
    return this.pendingNodePool.getAll()
  }

  /**
   * Clear all pending nodes
   */
  clearPendingNodes(): void {
    this.pendingNodePool.clear()
  }

  /**
   * Update pending node data
   */
  updatePendingNodeData(nodeId: string, data: Partial<FlowNodeData>): boolean {
    return this.pendingNodePool.updateData(nodeId, data)
  }

  /**
   * Update pending node position
   */
  updatePendingNodePosition(nodeId: string, position: XYPosition): boolean {
    return this.pendingNodePool.updatePosition(nodeId, position)
  }

  /**
   * Remove a connection between two nodes and sync to AST
   * 
   * Implements Requirement 5.3: 删除连接时移除对应的 jump/call 语句
   * 
   * When a connection is removed:
   * - If the connection represents a jump/call statement, remove it from the AST
   * - If the connection is from a menu choice to a scene, remove the jump from the choice body
   * - If the connection is from a condition branch to a scene, remove the jump from the branch body
   * 
   * @param sourceId - The source node ID
   * @param targetId - The target node ID
   * @param sourceHandle - Optional source handle (for menu choices, condition branches)
   * @param graph - The current flow graph state
   * @param ast - The current AST
   * @returns Result of the remove connection operation
   */
  removeConnection(
    sourceId: string,
    targetId: string,
    sourceHandle: string | undefined,
    graph: FlowGraph,
    ast: RenpyScript
  ): RemoveConnectionResult {
    const sourceNode = graph.nodes.find(n => n.id === sourceId)
    const targetNode = graph.nodes.find(n => n.id === targetId)

    if (!sourceNode) {
      return { success: false, error: 'Source node not found' }
    }

    // Case 1: Connection from menu choice to scene - remove jump from choice body
    if (sourceNode.type === 'menu' && targetNode?.type === 'scene' && sourceHandle) {
      return this.removeJumpFromMenuChoice(sourceNode, targetNode, sourceHandle, ast)
    }

    // Case 2: Connection from condition branch to scene - remove jump from branch body
    if (sourceNode.type === 'condition' && targetNode?.type === 'scene' && sourceHandle) {
      return this.removeJumpFromConditionBranch(sourceNode, targetNode, sourceHandle, ast)
    }

    // Case 3: Connection from jump node to scene - remove the jump statement
    if (sourceNode.type === 'jump' && targetNode?.type === 'scene') {
      return this.removeJumpStatement(sourceNode, targetNode, graph, ast)
    }

    // Case 4: Connection from call node to scene - remove the call statement
    if (sourceNode.type === 'call' && targetNode?.type === 'scene') {
      return this.removeCallStatement(sourceNode, targetNode, graph, ast)
    }

    // Case 5: Connection from dialogue-block or other node to scene
    // This might represent an implicit flow, check if there's a jump at the end
    if (targetNode?.type === 'scene') {
      return this.removeImplicitJumpToScene(sourceNode, targetNode, graph, ast)
    }

    // For other connection types, just return success (no AST changes needed)
    return { success: true }
  }

  /**
   * Remove a jump statement from a menu choice body
   */
  private removeJumpFromMenuChoice(
    menuNode: FlowNode,
    targetSceneNode: FlowNode,
    sourceHandle: string,
    ast: RenpyScript
  ): RemoveConnectionResult {
    const choiceIndex = this.parseChoiceIndex(sourceHandle)
    if (choiceIndex === null) {
      return { success: false, error: 'Invalid choice handle' }
    }

    const targetLabel = targetSceneNode.data.label
    if (!targetLabel) {
      return { success: false, error: 'Target scene has no label' }
    }

    // Find the menu's AST node
    const menuAstNode = menuNode.data.astNodes?.find(n => n.type === 'menu')
    if (!menuAstNode) {
      return { success: false, error: 'Menu AST node not found' }
    }

    // Remove the jump from the choice body
    const success = this.astSynchronizer.removeJumpFromChoice(
      menuAstNode.id,
      choiceIndex,
      targetLabel,
      ast
    )

    if (success) {
      return { success: true, removedStatementId: undefined }
    }

    return { success: false, error: 'Failed to remove jump from menu choice' }
  }

  /**
   * Remove a jump statement from a condition branch body
   */
  private removeJumpFromConditionBranch(
    conditionNode: FlowNode,
    targetSceneNode: FlowNode,
    sourceHandle: string,
    ast: RenpyScript
  ): RemoveConnectionResult {
    const branchIndex = this.parseBranchIndex(sourceHandle)
    if (branchIndex === null) {
      return { success: false, error: 'Invalid branch handle' }
    }

    const targetLabel = targetSceneNode.data.label
    if (!targetLabel) {
      return { success: false, error: 'Target scene has no label' }
    }

    // Find the condition's AST node (if node)
    const ifAstNode = conditionNode.data.astNodes?.find(n => n.type === 'if')
    if (!ifAstNode) {
      return { success: false, error: 'Condition AST node not found' }
    }

    // Remove the jump from the branch body
    const success = this.astSynchronizer.removeJumpFromConditionBranch(
      ifAstNode.id,
      branchIndex,
      targetLabel,
      ast
    )

    if (success) {
      return { success: true, removedStatementId: undefined }
    }

    return { success: false, error: 'Failed to remove jump from condition branch' }
  }

  /**
   * Remove a jump statement node from the AST
   */
  private removeJumpStatement(
    jumpNode: FlowNode,
    targetSceneNode: FlowNode,
    graph: FlowGraph,
    ast: RenpyScript
  ): RemoveConnectionResult {
    const targetLabel = targetSceneNode.data.label
    if (!targetLabel) {
      return { success: false, error: 'Target scene has no label' }
    }

    // Find the label that contains this jump node
    const labelName = this.connectionResolver.resolveNodeLabel(
      jumpNode.id,
      graph.edges,
      graph.nodes
    )

    if (!labelName) {
      return { success: false, error: 'Could not determine label for jump node' }
    }

    // Remove the jump statement from the label
    const success = this.astSynchronizer.removeFlowStatement(
      labelName,
      targetLabel,
      ast,
      'jump'
    )

    if (success) {
      return { success: true, removedStatementId: jumpNode.id }
    }

    return { success: false, error: 'Failed to remove jump statement' }
  }

  /**
   * Remove a call statement node from the AST
   */
  private removeCallStatement(
    callNode: FlowNode,
    targetSceneNode: FlowNode,
    graph: FlowGraph,
    ast: RenpyScript
  ): RemoveConnectionResult {
    const targetLabel = targetSceneNode.data.label
    if (!targetLabel) {
      return { success: false, error: 'Target scene has no label' }
    }

    // Find the label that contains this call node
    const labelName = this.connectionResolver.resolveNodeLabel(
      callNode.id,
      graph.edges,
      graph.nodes
    )

    if (!labelName) {
      return { success: false, error: 'Could not determine label for call node' }
    }

    // Remove the call statement from the label
    const success = this.astSynchronizer.removeFlowStatement(
      labelName,
      targetLabel,
      ast,
      'call'
    )

    if (success) {
      return { success: true, removedStatementId: callNode.id }
    }

    return { success: false, error: 'Failed to remove call statement' }
  }

  /**
   * Remove an implicit jump to a scene (e.g., from dialogue block end)
   */
  private removeImplicitJumpToScene(
    sourceNode: FlowNode,
    targetSceneNode: FlowNode,
    graph: FlowGraph,
    ast: RenpyScript
  ): RemoveConnectionResult {
    const targetLabel = targetSceneNode.data.label
    if (!targetLabel) {
      return { success: false, error: 'Target scene has no label' }
    }

    // Find the label that contains the source node
    const labelName = this.connectionResolver.resolveNodeLabel(
      sourceNode.id,
      graph.edges,
      graph.nodes
    )

    if (!labelName) {
      // Source node might not be connected to any label yet
      return { success: true }
    }

    // Try to remove a jump statement targeting the scene
    // This handles cases where a jump was implicitly created
    const success = this.astSynchronizer.removeFlowStatement(
      labelName,
      targetLabel,
      ast,
      'jump'
    )

    // Even if no jump was found, consider it a success
    // (the connection might not have had an AST representation)
    return { success: true, removedStatementId: success ? undefined : undefined }
  }

  /**
   * Parse branch index from source handle (e.g., "branch-0" -> 0)
   */
  private parseBranchIndex(sourceHandle: string): number | null {
    const match = sourceHandle.match(/^branch-(\d+)$/)
    if (match) {
      return parseInt(match[1], 10)
    }
    return null
  }
}

/**
 * Result of a remove connection operation
 */
export interface RemoveConnectionResult {
  success: boolean
  removedStatementId?: string
  error?: string
}

// Export singleton instance
export const nodeOperationHandler = new NodeOperationHandler()
