/**
 * ASTSynchronizer - AST 同步器
 * 
 * 将流程图变更同步到 AST，实现节点编辑器与代码的双向同步。
 * 
 * Implements Requirements:
 * - 8.1: 节点修改时更新对应 AST
 * - 8.3: 保留代码注释和格式
 * - 8.4: 创建新边时插入 jump/call 语句
 * - 8.5: 删除边时移除对应流程控制语句
 */

import {
  RenpyScript,
  ASTNode,
  LabelNode,
  JumpNode as ASTJumpNode,
  CallNode as ASTCallNode,
  DialogueNode as ASTDialogueNode,
  MenuNode as ASTMenuNode,
  ReturnNode as ASTReturnNode,
  IfNode as ASTIfNode,
  MenuChoice,
} from '../../types/ast'

import {
  FlowGraph,
  FlowNode,
  FlowEdge,
} from './FlowGraphBuilder'

/**
 * Synchronization result
 */
export interface SyncResult {
  /** Updated AST */
  ast: RenpyScript
  /** Whether changes were made */
  modified: boolean
  /** Any errors encountered */
  errors: SyncError[]
}

/**
 * Synchronization error
 */
export interface SyncError {
  type: 'invalid_target' | 'missing_label' | 'duplicate_label' | 'sync_failed'
  message: string
  nodeId?: string
}

/**
 * Options for creating new statements
 */
export interface CreateStatementOptions {
  /** Line number hint for insertion */
  line?: number
  /** Whether this is an expression jump/call */
  expression?: boolean
  /** Arguments for call statements */
  arguments?: string[]
}

/**
 * Generate a unique ID for AST nodes
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * ASTSynchronizer class
 * 
 * Synchronizes flow graph changes to the AST while preserving
 * code structure, comments, and formatting.
 */
export class ASTSynchronizer {
  /**
   * Synchronize flow graph changes to the AST
   * 
   * @param graph - The current flow graph state
   * @param originalAst - The original AST to update
   * @returns Updated AST with sync result
   */
  syncToAst(graph: FlowGraph, originalAst: RenpyScript): SyncResult {
    const errors: SyncError[] = []
    let modified = false

    // Deep clone the AST to avoid mutating the original
    const ast = this.cloneAst(originalAst)

    // Build a map of label names to their AST nodes
    const labelMap = this.buildLabelMap(ast)

    // Build a map of flow node IDs to their corresponding AST nodes
    const nodeAstMap = this.buildNodeAstMap(graph, ast)

    // Process each flow node and sync changes
    for (const flowNode of graph.nodes) {
      try {
        const nodeModified = this.syncFlowNode(flowNode, graph, ast, labelMap, nodeAstMap)
        if (nodeModified) {
          modified = true
        }
      } catch (error) {
        errors.push({
          type: 'sync_failed',
          message: `Failed to sync node ${flowNode.id}: ${error}`,
          nodeId: flowNode.id,
        })
      }
    }

    // Sync edges (jump/call statements)
    const edgeSyncResult = this.syncEdges(graph, ast, labelMap)
    if (edgeSyncResult.modified) {
      modified = true
    }
    errors.push(...edgeSyncResult.errors)

    return {
      ast,
      modified,
      errors,
    }
  }

  /**
   * Create a new jump statement AST node
   * 
   * @param targetLabel - The target label name
   * @param options - Optional creation options
   * @returns New JumpNode
   */
  createJumpStatement(targetLabel: string, options: CreateStatementOptions = {}): ASTJumpNode {
    return {
      id: generateId('jump'),
      type: 'jump',
      target: targetLabel,
      expression: options.expression,
      line: options.line,
    }
  }

  /**
   * Create a new call statement AST node
   * 
   * @param targetLabel - The target label name
   * @param options - Optional creation options
   * @returns New CallNode
   */
  createCallStatement(targetLabel: string, options: CreateStatementOptions = {}): ASTCallNode {
    return {
      id: generateId('call'),
      type: 'call',
      target: targetLabel,
      expression: options.expression,
      arguments: options.arguments,
      line: options.line,
    }
  }

  /**
   * Create a new label AST node
   * 
   * @param name - The label name
   * @param body - Optional body statements
   * @returns New LabelNode
   */
  createLabel(name: string, body: ASTNode[] = []): LabelNode {
    // If body is empty, add a pass-equivalent (empty dialogue or return)
    const labelBody = body.length > 0 ? body : []
    
    return {
      id: generateId('label'),
      type: 'label',
      name,
      body: labelBody,
    }
  }

  /**
   * Create a new dialogue AST node
   * 
   * @param text - The dialogue text
   * @param speaker - Optional speaker name
   * @returns New DialogueNode
   */
  createDialogue(text: string, speaker: string | null = null): ASTDialogueNode {
    return {
      id: generateId('dialogue'),
      type: 'dialogue',
      speaker,
      text,
    }
  }

  /**
   * Create a new menu AST node
   * 
   * @param choices - Menu choices
   * @param prompt - Optional menu prompt
   * @returns New MenuNode
   */
  createMenu(choices: MenuChoice[], prompt?: string): ASTMenuNode {
    return {
      id: generateId('menu'),
      type: 'menu',
      prompt,
      choices,
    }
  }

  /**
   * Create a new return AST node
   * 
   * @param value - Optional return value
   * @returns New ReturnNode
   */
  createReturn(value?: string): ASTReturnNode {
    return {
      id: generateId('return'),
      type: 'return',
      value,
    }
  }

  /**
   * Delete a node from the AST
   * 
   * @param nodeId - The flow node ID to delete
   * @param graph - The current flow graph
   * @param ast - The AST to modify
   * @returns Updated AST and list of removed edge IDs
   */
  deleteNode(
    nodeId: string,
    graph: FlowGraph,
    ast: RenpyScript
  ): { ast: RenpyScript; removedEdgeIds: string[]; removedStatementIds: string[] } {
    const clonedAst = this.cloneAst(ast)
    const removedEdgeIds: string[] = []
    const removedStatementIds: string[] = []

    // Find the flow node
    const flowNode = graph.nodes.find(n => n.id === nodeId)
    if (!flowNode) {
      return { ast: clonedAst, removedEdgeIds, removedStatementIds }
    }

    // Find edges connected to this node
    const connectedEdges = graph.edges.filter(
      e => e.source === nodeId || e.target === nodeId
    )
    removedEdgeIds.push(...connectedEdges.map(e => e.id))

    // If this is a scene node (label), also remove jump/call statements targeting it
    if (flowNode.type === 'scene' && flowNode.data.label) {
      const labelName = flowNode.data.label
      const removedIds = this.removeJumpCallsToLabel(labelName, clonedAst)
      removedStatementIds.push(...removedIds)
    }

    // Remove the corresponding AST statements
    const nodeStatementIds = this.removeAstStatements(flowNode, clonedAst)
    removedStatementIds.push(...nodeStatementIds)

    return { ast: clonedAst, removedEdgeIds, removedStatementIds }
  }

  /**
   * Remove all jump/call statements that target a specific label
   * 
   * @param labelName - The target label name
   * @param ast - The AST to modify
   * @returns List of removed statement IDs
   */
  private removeJumpCallsToLabel(labelName: string, ast: RenpyScript): string[] {
    const removedIds: string[] = []

    // Process all labels in the AST
    for (const statement of ast.statements) {
      if (statement.type === 'label') {
        const label = statement as LabelNode
        const ids = this.removeJumpCallsFromBody(labelName, label.body)
        removedIds.push(...ids)
      }
    }

    return removedIds
  }

  /**
   * Remove jump/call statements from a body array that target a specific label
   */
  private removeJumpCallsFromBody(labelName: string, body: ASTNode[]): string[] {
    const removedIds: string[] = []
    const indicesToRemove: number[] = []

    for (let i = 0; i < body.length; i++) {
      const node = body[i]

      if (node.type === 'jump') {
        const jump = node as ASTJumpNode
        if (jump.target === labelName) {
          indicesToRemove.push(i)
          removedIds.push(node.id)
        }
      } else if (node.type === 'call') {
        const call = node as ASTCallNode
        if (call.target === labelName) {
          indicesToRemove.push(i)
          removedIds.push(node.id)
        }
      } else if (node.type === 'menu') {
        const menu = node as ASTMenuNode
        for (const choice of menu.choices) {
          const ids = this.removeJumpCallsFromBody(labelName, choice.body)
          removedIds.push(...ids)
        }
      } else if (node.type === 'if') {
        const ifNode = node as ASTIfNode
        for (const branch of ifNode.branches) {
          const ids = this.removeJumpCallsFromBody(labelName, branch.body)
          removedIds.push(...ids)
        }
      }
    }

    // Remove in reverse order to maintain indices
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      body.splice(indicesToRemove[i], 1)
    }

    return removedIds
  }

  /**
   * Deep clone an AST
   */
  private cloneAst(ast: RenpyScript): RenpyScript {
    return JSON.parse(JSON.stringify(ast))
  }

  /**
   * Build a map of label names to their AST nodes
   */
  private buildLabelMap(ast: RenpyScript): Map<string, LabelNode> {
    const map = new Map<string, LabelNode>()
    
    for (const statement of ast.statements) {
      if (statement.type === 'label') {
        const label = statement as LabelNode
        map.set(label.name, label)
      }
    }
    
    return map
  }

  /**
   * Build a map of flow node IDs to their corresponding AST nodes
   */
  private buildNodeAstMap(
    graph: FlowGraph,
    _ast: RenpyScript
  ): Map<string, ASTNode[]> {
    const map = new Map<string, ASTNode[]>()
    
    for (const flowNode of graph.nodes) {
      if (flowNode.data.astNodes) {
        map.set(flowNode.id, flowNode.data.astNodes)
      }
    }
    
    return map
  }

  /**
   * Sync a single flow node to the AST
   */
  private syncFlowNode(
    flowNode: FlowNode,
    _graph: FlowGraph,
    ast: RenpyScript,
    labelMap: Map<string, LabelNode>,
    _nodeAstMap: Map<string, ASTNode[]>
  ): boolean {
    let modified = false

    switch (flowNode.type) {
      case 'scene':
        modified = this.syncSceneNode(flowNode, ast, labelMap)
        break
      case 'dialogue-block':
        modified = this.syncDialogueBlock(flowNode, ast, labelMap)
        break
      case 'jump':
        modified = this.syncJumpNode(flowNode, ast, labelMap)
        break
      case 'call':
        modified = this.syncCallNode(flowNode, ast, labelMap)
        break
      case 'menu':
        modified = this.syncMenuNode(flowNode, ast, labelMap)
        break
      case 'condition':
        modified = this.syncConditionNode(flowNode, ast, labelMap)
        break
      case 'return':
        // Return nodes don't need special sync
        break
    }

    return modified
  }

  /**
   * Sync a scene node (label) to the AST
   */
  private syncSceneNode(
    flowNode: FlowNode,
    _ast: RenpyScript,
    labelMap: Map<string, LabelNode>
  ): boolean {
    const labelName = flowNode.data.label
    if (!labelName) return false

    const labelNode = labelMap.get(labelName)
    if (!labelNode) return false

    // For now, scene nodes are read-only from the flow graph
    // Future: support renaming labels
    return false
  }

  /**
   * Sync a dialogue block to the AST
   */
  private syncDialogueBlock(
    _flowNode: FlowNode,
    _ast: RenpyScript,
    _labelMap: Map<string, LabelNode>
  ): boolean {
    // Dialogue blocks are currently read-only from the flow graph
    // Future: support editing dialogue text
    return false
  }

  /**
   * Sync a jump node to the AST
   */
  private syncJumpNode(
    flowNode: FlowNode,
    _ast: RenpyScript,
    _labelMap: Map<string, LabelNode>
  ): boolean {
    const target = flowNode.data.target
    if (!target) return false

    // Find the corresponding AST jump node
    const astNodes = flowNode.data.astNodes
    if (!astNodes || astNodes.length === 0) return false

    const jumpNode = astNodes.find(n => n.type === 'jump') as ASTJumpNode | undefined
    if (!jumpNode) return false

    // Check if target changed
    if (jumpNode.target !== target) {
      jumpNode.target = target
      return true
    }

    return false
  }

  /**
   * Sync a call node to the AST
   */
  private syncCallNode(
    flowNode: FlowNode,
    _ast: RenpyScript,
    _labelMap: Map<string, LabelNode>
  ): boolean {
    const target = flowNode.data.target
    if (!target) return false

    // Find the corresponding AST call node
    const astNodes = flowNode.data.astNodes
    if (!astNodes || astNodes.length === 0) return false

    const callNode = astNodes.find(n => n.type === 'call') as ASTCallNode | undefined
    if (!callNode) return false

    // Check if target changed
    if (callNode.target !== target) {
      callNode.target = target
      return true
    }

    return false
  }

  /**
   * Sync a menu node to the AST
   */
  private syncMenuNode(
    _flowNode: FlowNode,
    _ast: RenpyScript,
    _labelMap: Map<string, LabelNode>
  ): boolean {
    // Menu nodes are currently read-only from the flow graph
    // Future: support editing menu choices
    return false
  }

  /**
   * Sync a condition node to the AST
   */
  private syncConditionNode(
    _flowNode: FlowNode,
    _ast: RenpyScript,
    _labelMap: Map<string, LabelNode>
  ): boolean {
    // Condition nodes are currently read-only from the flow graph
    // Future: support editing conditions
    return false
  }

  /**
   * Sync edges (jump/call statements) to the AST
   */
  private syncEdges(
    graph: FlowGraph,
    _ast: RenpyScript,
    labelMap: Map<string, LabelNode>
  ): { modified: boolean; errors: SyncError[] } {
    const errors: SyncError[] = []
    let modified = false

    // Validate all jump/call edges have valid targets
    for (const edge of graph.edges) {
      if (edge.type === 'jump' || edge.type === 'call') {
        // Find the source node
        const sourceNode = graph.nodes.find(n => n.id === edge.source)
        if (!sourceNode) continue

        // Get the target label from the edge
        const targetLabel = this.getEdgeTargetLabel(edge, graph)
        if (!targetLabel) continue

        // Check if target label exists
        if (!labelMap.has(targetLabel)) {
          errors.push({
            type: 'invalid_target',
            message: `Jump/call target "${targetLabel}" does not exist`,
            nodeId: edge.source,
          })
        }
      }
    }

    return { modified, errors }
  }

  /**
   * Get the target label name from an edge
   */
  private getEdgeTargetLabel(edge: FlowEdge, graph: FlowGraph): string | undefined {
    // Find the target node
    const targetNode = graph.nodes.find(n => n.id === edge.target)
    if (!targetNode) {
      // Target might be a label name directly (for missing labels)
      if (edge.target.startsWith('missing-')) {
        return edge.target.replace('missing-', '')
      }
      return undefined
    }

    // If target is a scene node, return its label name
    if (targetNode.type === 'scene' && targetNode.data.label) {
      return targetNode.data.label
    }

    return undefined
  }

  /**
   * Remove AST statements corresponding to a flow node
   * @returns List of removed statement IDs
   */
  private removeAstStatements(flowNode: FlowNode, ast: RenpyScript): string[] {
    const astNodes = flowNode.data.astNodes
    if (!astNodes || astNodes.length === 0) return []

    const idsToRemove = new Set(astNodes.map(n => n.id))
    const removedIds: string[] = [...idsToRemove]

    // Remove from top-level statements
    ast.statements = ast.statements.filter(s => !idsToRemove.has(s.id))

    // Remove from label bodies
    for (const statement of ast.statements) {
      if (statement.type === 'label') {
        const label = statement as LabelNode
        this.removeFromBody(label.body, idsToRemove)
      }
    }

    return removedIds
  }

  /**
   * Remove statements from a body array recursively
   */
  private removeFromBody(body: ASTNode[], idsToRemove: Set<string>): void {
    // Filter out statements to remove
    const indicesToRemove: number[] = []
    
    for (let i = 0; i < body.length; i++) {
      const node = body[i]
      
      if (idsToRemove.has(node.id)) {
        indicesToRemove.push(i)
        continue
      }

      // Recursively check nested bodies
      if (node.type === 'menu') {
        const menu = node as ASTMenuNode
        for (const choice of menu.choices) {
          this.removeFromBody(choice.body, idsToRemove)
        }
      } else if (node.type === 'if') {
        const ifNode = node as ASTIfNode
        for (const branch of ifNode.branches) {
          this.removeFromBody(branch.body, idsToRemove)
        }
      } else if (node.type === 'label') {
        const label = node as LabelNode
        this.removeFromBody(label.body, idsToRemove)
      }
    }

    // Remove in reverse order to maintain indices
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      body.splice(indicesToRemove[i], 1)
    }
  }

  /**
   * Insert a jump statement into a label body
   * 
   * @param labelName - The label to insert into
   * @param targetLabel - The jump target
   * @param ast - The AST to modify
   * @param position - Position to insert ('end' or index)
   * @returns Whether insertion was successful
   */
  insertJumpIntoLabel(
    labelName: string,
    targetLabel: string,
    ast: RenpyScript,
    position: 'end' | number = 'end'
  ): boolean {
    const labelMap = this.buildLabelMap(ast)
    const label = labelMap.get(labelName)
    
    if (!label) return false

    const jumpNode = this.createJumpStatement(targetLabel)
    
    if (position === 'end') {
      label.body.push(jumpNode)
    } else {
      label.body.splice(position, 0, jumpNode)
    }

    return true
  }

  /**
   * Insert a call statement into a label body
   * 
   * @param labelName - The label to insert into
   * @param targetLabel - The call target
   * @param ast - The AST to modify
   * @param position - Position to insert ('end' or index)
   * @returns Whether insertion was successful
   */
  insertCallIntoLabel(
    labelName: string,
    targetLabel: string,
    ast: RenpyScript,
    position: 'end' | number = 'end'
  ): boolean {
    const labelMap = this.buildLabelMap(ast)
    const label = labelMap.get(labelName)
    
    if (!label) return false

    const callNode = this.createCallStatement(targetLabel)
    
    if (position === 'end') {
      label.body.push(callNode)
    } else {
      label.body.splice(position, 0, callNode)
    }

    return true
  }

  /**
   * Remove a jump/call statement from a label body
   * 
   * @param labelName - The label to remove from
   * @param targetLabel - The target to match
   * @param ast - The AST to modify
   * @param type - 'jump' or 'call'
   * @returns Whether removal was successful
   */
  removeFlowStatement(
    labelName: string,
    targetLabel: string,
    ast: RenpyScript,
    type: 'jump' | 'call'
  ): boolean {
    const labelMap = this.buildLabelMap(ast)
    const label = labelMap.get(labelName)
    
    if (!label) return false

    const index = label.body.findIndex(node => {
      if (node.type !== type) return false
      const flowNode = node as ASTJumpNode | ASTCallNode
      return flowNode.target === targetLabel
    })

    if (index === -1) return false

    label.body.splice(index, 1)
    return true
  }

  /**
   * Add a new label to the AST
   * 
   * @param name - The label name
   * @param ast - The AST to modify
   * @param body - Optional body statements
   * @returns Whether addition was successful
   */
  addLabel(name: string, ast: RenpyScript, body: ASTNode[] = []): boolean {
    // Check if label already exists
    const labelMap = this.buildLabelMap(ast)
    if (labelMap.has(name)) return false

    const label = this.createLabel(name, body)
    ast.statements.push(label)
    return true
  }

  /**
   * Remove a label from the AST
   * 
   * @param name - The label name to remove
   * @param ast - The AST to modify
   * @returns Whether removal was successful
   */
  removeLabel(name: string, ast: RenpyScript): boolean {
    const index = ast.statements.findIndex(
      s => s.type === 'label' && (s as LabelNode).name === name
    )

    if (index === -1) return false

    ast.statements.splice(index, 1)
    return true
  }

  /**
   * Update a dialogue's text in the AST
   * 
   * @param dialogueId - The dialogue node ID
   * @param newText - The new text
   * @param ast - The AST to modify
   * @returns Whether update was successful
   */
  updateDialogueText(dialogueId: string, newText: string, ast: RenpyScript): boolean {
    const dialogue = this.findNodeById(ast, dialogueId) as ASTDialogueNode | null
    if (!dialogue || dialogue.type !== 'dialogue') return false

    dialogue.text = newText
    return true
  }

  /**
   * Update a dialogue's speaker in the AST
   * 
   * @param dialogueId - The dialogue node ID
   * @param newSpeaker - The new speaker (null for narration)
   * @param ast - The AST to modify
   * @returns Whether update was successful
   */
  updateDialogueSpeaker(
    dialogueId: string,
    newSpeaker: string | null,
    ast: RenpyScript
  ): boolean {
    const dialogue = this.findNodeById(ast, dialogueId) as ASTDialogueNode | null
    if (!dialogue || dialogue.type !== 'dialogue') return false

    dialogue.speaker = newSpeaker
    return true
  }

  /**
   * Find an AST node by ID
   */
  private findNodeById(ast: RenpyScript, id: string): ASTNode | null {
    for (const statement of ast.statements) {
      const found = this.findNodeInTree(statement, id)
      if (found) return found
    }
    return null
  }

  /**
   * Recursively find a node in an AST subtree
   */
  private findNodeInTree(node: ASTNode, id: string): ASTNode | null {
    if (node.id === id) return node

    // Check nested structures
    if (node.type === 'label') {
      const label = node as LabelNode
      for (const child of label.body) {
        const found = this.findNodeInTree(child, id)
        if (found) return found
      }
    } else if (node.type === 'menu') {
      const menu = node as ASTMenuNode
      for (const choice of menu.choices) {
        for (const child of choice.body) {
          const found = this.findNodeInTree(child, id)
          if (found) return found
        }
      }
    } else if (node.type === 'if') {
      const ifNode = node as ASTIfNode
      for (const branch of ifNode.branches) {
        for (const child of branch.body) {
          const found = this.findNodeInTree(child, id)
          if (found) return found
        }
      }
    }

    return null
  }

  /**
   * Preserve raw content from original AST nodes
   * 
   * This method ensures that when we modify the AST, we preserve
   * the original raw content (including comments and formatting)
   * for nodes that haven't been modified.
   * 
   * @param originalAst - The original AST with raw content
   * @param modifiedAst - The modified AST
   * @returns AST with preserved raw content
   */
  preserveRawContent(originalAst: RenpyScript, modifiedAst: RenpyScript): RenpyScript {
    const result = this.cloneAst(modifiedAst)
    
    // Build a map of original nodes by ID
    const originalNodeMap = new Map<string, ASTNode>()
    this.collectNodesById(originalAst.statements, originalNodeMap)
    
    // Restore raw content for unmodified nodes
    this.restoreRawContent(result.statements, originalNodeMap)
    
    return result
  }

  /**
   * Collect all nodes by ID into a map
   */
  private collectNodesById(nodes: ASTNode[], map: Map<string, ASTNode>): void {
    for (const node of nodes) {
      map.set(node.id, node)
      
      // Recurse into nested structures
      if (node.type === 'label') {
        const label = node as LabelNode
        this.collectNodesById(label.body, map)
      } else if (node.type === 'menu') {
        const menu = node as ASTMenuNode
        for (const choice of menu.choices) {
          this.collectNodesById(choice.body, map)
        }
      } else if (node.type === 'if') {
        const ifNode = node as ASTIfNode
        for (const branch of ifNode.branches) {
          this.collectNodesById(branch.body, map)
        }
      }
    }
  }

  /**
   * Restore raw content from original nodes
   */
  private restoreRawContent(nodes: ASTNode[], originalMap: Map<string, ASTNode>): void {
    for (const node of nodes) {
      const original = originalMap.get(node.id)
      
      // If we have the original node and it has raw content, preserve it
      if (original && original.raw && !node.raw) {
        node.raw = original.raw
      }
      
      // Preserve line numbers if available
      if (original && original.line && !node.line) {
        node.line = original.line
      }
      
      // Recurse into nested structures
      if (node.type === 'label') {
        const label = node as LabelNode
        this.restoreRawContent(label.body, originalMap)
      } else if (node.type === 'menu') {
        const menu = node as ASTMenuNode
        for (const choice of menu.choices) {
          this.restoreRawContent(choice.body, originalMap)
        }
      } else if (node.type === 'if') {
        const ifNode = node as ASTIfNode
        for (const branch of ifNode.branches) {
          this.restoreRawContent(branch.body, originalMap)
        }
      }
    }
  }

  /**
   * Check if a node has been modified compared to its original
   * 
   * @param nodeId - The node ID to check
   * @param originalAst - The original AST
   * @param modifiedAst - The modified AST
   * @returns Whether the node has been modified
   */
  isNodeModified(nodeId: string, originalAst: RenpyScript, modifiedAst: RenpyScript): boolean {
    const original = this.findNodeById(originalAst, nodeId)
    const modified = this.findNodeById(modifiedAst, nodeId)
    
    if (!original || !modified) {
      // Node was added or removed
      return true
    }
    
    // Compare JSON representations (simple but effective)
    return JSON.stringify(original) !== JSON.stringify(modified)
  }

  /**
   * Get a list of modified node IDs between two ASTs
   * 
   * @param originalAst - The original AST
   * @param modifiedAst - The modified AST
   * @returns List of modified node IDs
   */
  getModifiedNodeIds(originalAst: RenpyScript, modifiedAst: RenpyScript): string[] {
    const modifiedIds: string[] = []
    
    // Collect all node IDs from both ASTs
    const originalIds = new Set<string>()
    const modifiedIds2 = new Set<string>()
    
    this.collectNodeIds(originalAst.statements, originalIds)
    this.collectNodeIds(modifiedAst.statements, modifiedIds2)
    
    // Find added nodes (in modified but not in original)
    for (const id of modifiedIds2) {
      if (!originalIds.has(id)) {
        modifiedIds.push(id)
      }
    }
    
    // Find removed nodes (in original but not in modified)
    for (const id of originalIds) {
      if (!modifiedIds2.has(id)) {
        modifiedIds.push(id)
      }
    }
    
    // Find changed nodes (in both but different)
    for (const id of originalIds) {
      if (modifiedIds2.has(id) && this.isNodeModified(id, originalAst, modifiedAst)) {
        modifiedIds.push(id)
      }
    }
    
    return modifiedIds
  }

  /**
   * Collect all node IDs from an AST
   */
  private collectNodeIds(nodes: ASTNode[], ids: Set<string>): void {
    for (const node of nodes) {
      ids.add(node.id)
      
      // Recurse into nested structures
      if (node.type === 'label') {
        const label = node as LabelNode
        this.collectNodeIds(label.body, ids)
      } else if (node.type === 'menu') {
        const menu = node as ASTMenuNode
        for (const choice of menu.choices) {
          this.collectNodeIds(choice.body, ids)
        }
      } else if (node.type === 'if') {
        const ifNode = node as ASTIfNode
        for (const branch of ifNode.branches) {
          this.collectNodeIds(branch.body, ids)
        }
      }
    }
  }

  /**
   * Merge changes from modified AST into original AST
   * 
   * This method performs a minimal merge, only updating nodes that
   * have actually changed while preserving the structure and raw
   * content of unchanged nodes.
   * 
   * @param originalAst - The original AST
   * @param modifiedAst - The modified AST
   * @returns Merged AST with minimal changes
   */
  mergeAstChanges(originalAst: RenpyScript, modifiedAst: RenpyScript): RenpyScript {
    const result = this.cloneAst(originalAst)
    const modifiedNodeIds = this.getModifiedNodeIds(originalAst, modifiedAst)
    
    // For each modified node, update it in the result
    for (const nodeId of modifiedNodeIds) {
      const modifiedNode = this.findNodeById(modifiedAst, nodeId)
      
      if (modifiedNode) {
        // Node was added or changed - update it
        this.updateNodeInAst(result, nodeId, modifiedNode)
      } else {
        // Node was removed - remove it from result
        this.removeNodeFromAst(result, nodeId)
      }
    }
    
    return result
  }

  /**
   * Update a specific node in the AST
   */
  private updateNodeInAst(ast: RenpyScript, nodeId: string, newNode: ASTNode): void {
    // Try to find and update in top-level statements
    for (let i = 0; i < ast.statements.length; i++) {
      if (ast.statements[i].id === nodeId) {
        ast.statements[i] = newNode
        return
      }
      
      // Recurse into nested structures
      if (this.updateNodeInBody(ast.statements[i], nodeId, newNode)) {
        return
      }
    }
    
    // If not found, it's a new node - add it to the end
    ast.statements.push(newNode)
  }

  /**
   * Update a node within a nested body
   */
  private updateNodeInBody(parent: ASTNode, nodeId: string, newNode: ASTNode): boolean {
    if (parent.type === 'label') {
      const label = parent as LabelNode
      for (let i = 0; i < label.body.length; i++) {
        if (label.body[i].id === nodeId) {
          label.body[i] = newNode
          return true
        }
        if (this.updateNodeInBody(label.body[i], nodeId, newNode)) {
          return true
        }
      }
    } else if (parent.type === 'menu') {
      const menu = parent as ASTMenuNode
      for (const choice of menu.choices) {
        for (let i = 0; i < choice.body.length; i++) {
          if (choice.body[i].id === nodeId) {
            choice.body[i] = newNode
            return true
          }
          if (this.updateNodeInBody(choice.body[i], nodeId, newNode)) {
            return true
          }
        }
      }
    } else if (parent.type === 'if') {
      const ifNode = parent as ASTIfNode
      for (const branch of ifNode.branches) {
        for (let i = 0; i < branch.body.length; i++) {
          if (branch.body[i].id === nodeId) {
            branch.body[i] = newNode
            return true
          }
          if (this.updateNodeInBody(branch.body[i], nodeId, newNode)) {
            return true
          }
        }
      }
    }
    
    return false
  }

  /**
   * Remove a node from the AST by ID
   */
  private removeNodeFromAst(ast: RenpyScript, nodeId: string): void {
    // Try to remove from top-level statements
    const topIndex = ast.statements.findIndex(s => s.id === nodeId)
    if (topIndex !== -1) {
      ast.statements.splice(topIndex, 1)
      return
    }
    
    // Recurse into nested structures
    for (const statement of ast.statements) {
      if (this.removeNodeFromBody(statement, nodeId)) {
        return
      }
    }
  }

  /**
   * Remove a node from a nested body
   */
  private removeNodeFromBody(parent: ASTNode, nodeId: string): boolean {
    if (parent.type === 'label') {
      const label = parent as LabelNode
      const index = label.body.findIndex(n => n.id === nodeId)
      if (index !== -1) {
        label.body.splice(index, 1)
        return true
      }
      for (const child of label.body) {
        if (this.removeNodeFromBody(child, nodeId)) {
          return true
        }
      }
    } else if (parent.type === 'menu') {
      const menu = parent as ASTMenuNode
      for (const choice of menu.choices) {
        const index = choice.body.findIndex(n => n.id === nodeId)
        if (index !== -1) {
          choice.body.splice(index, 1)
          return true
        }
        for (const child of choice.body) {
          if (this.removeNodeFromBody(child, nodeId)) {
            return true
          }
        }
      }
    } else if (parent.type === 'if') {
      const ifNode = parent as ASTIfNode
      for (const branch of ifNode.branches) {
        const index = branch.body.findIndex(n => n.id === nodeId)
        if (index !== -1) {
          branch.body.splice(index, 1)
          return true
        }
        for (const child of branch.body) {
          if (this.removeNodeFromBody(child, nodeId)) {
            return true
          }
        }
      }
    }
    
    return false
  }
}

// Export singleton instance
export const astSynchronizer = new ASTSynchronizer()
