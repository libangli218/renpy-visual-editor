/**
 * FlowGraphBuilder - 流程图构建器
 * 
 * 将 Ren'Py AST 转换为流程图结构，用于节点编辑器显示。
 * 
 * Implements Requirements:
 * - 2.1: 为每个 label 创建一个 Scene_Node
 * - 3.1, 3.4, 3.5: 对话块合并逻辑
 * - 4.1-4.6: 分支节点设计
 * - 5.1, 5.2: 流程连线
 * - 5.6: 自动布局
 */

import dagre from 'dagre'
import { 
  RenpyScript, 
  ASTNode, 
  LabelNode, 
  DialogueNode as ASTDialogueNode,
  MenuNode as ASTMenuNode,
  IfNode as ASTIfNode,
  JumpNode as ASTJumpNode,
  CallNode as ASTCallNode,
  ReturnNode as ASTReturnNode,
  SceneNode as ASTSceneNode,
  ShowNode as ASTShowNode,
  HideNode as ASTHideNode,
  WithNode as ASTWithNode,
} from '../../types/ast'

/**
 * Flow node types for the visual editor
 */
export type FlowNodeType = 
  | 'scene' 
  | 'dialogue-block' 
  | 'menu' 
  | 'condition' 
  | 'jump' 
  | 'call' 
  | 'return'

/**
 * Visual command types (scene, show, hide, with)
 */
export interface VisualCommand {
  type: 'scene' | 'show' | 'hide' | 'with'
  target: string
  attributes?: string[]
  id: string
}

/**
 * Dialogue item within a dialogue block
 */
export interface DialogueItem {
  speaker: string | null
  text: string
  attributes?: string[]
  id: string
}

/**
 * Menu choice with port information
 */
export interface MenuChoice {
  text: string
  condition?: string
  targetLabel?: string
  portId: string
  body: ASTNode[]
}

/**
 * Condition branch for if statements
 */
export interface ConditionBranch {
  condition: string | null
  portId: string
  body: ASTNode[]
}

/**
 * Flow node data - varies by node type
 */
export interface FlowNodeData {
  /** Label name (for scene nodes) */
  label?: string
  /** Preview text */
  preview?: string
  /** Dialogues in a dialogue block */
  dialogues?: DialogueItem[]
  /** Visual commands in a dialogue block */
  visualCommands?: VisualCommand[]
  /** Menu choices */
  choices?: MenuChoice[]
  /** Menu prompt text */
  prompt?: string
  /** Condition expression (for condition nodes) */
  condition?: string
  /** Condition branches (for if nodes) */
  branches?: ConditionBranch[]
  /** Jump/call target label */
  target?: string
  /** Whether this is a call (vs jump) */
  isCall?: boolean
  /** Exit type for scene nodes */
  exitType?: 'return' | 'jump' | 'menu' | 'fall-through'
  /** Whether the node has incoming edges */
  hasIncoming?: boolean
  /** Original AST nodes for reference */
  astNodes?: ASTNode[]
  /** Whether dialogue block is expanded */
  expanded?: boolean
}

/**
 * Flow node structure
 */
export interface FlowNode {
  id: string
  type: FlowNodeType
  position: { x: number; y: number }
  data: FlowNodeData
}

/**
 * Edge types for flow connections
 */
export type FlowEdgeType = 'normal' | 'jump' | 'call' | 'return'

/**
 * Flow edge structure
 */
export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type: FlowEdgeType
  animated?: boolean
  /** Whether the target label exists */
  valid?: boolean
}

/**
 * Complete flow graph
 */
export interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

/**
 * Internal context for building the graph
 */
interface BuildContext {
  /** All label names in the script */
  labelNames: Set<string>
  /** Map of label name to node ID */
  labelNodeIds: Map<string, string>
  /** Counter for generating unique IDs */
  idCounter: number
  /** Collected edges */
  edges: FlowEdge[]
}

/**
 * FlowGraphBuilder class
 * 
 * Converts Ren'Py AST to a flow graph for visual editing.
 */
export class FlowGraphBuilder {
  /**
   * Build a flow graph from a Ren'Py script AST
   * 
   * @param ast - The parsed Ren'Py script
   * @returns Flow graph with nodes and edges
   */
  buildGraph(ast: RenpyScript): FlowGraph {
    const context: BuildContext = {
      labelNames: new Set(),
      labelNodeIds: new Map(),
      idCounter: 0,
      edges: [],
    }

    // First pass: collect all label names
    this.collectLabelNames(ast.statements, context)

    // Second pass: build nodes
    const nodes: FlowNode[] = []
    
    for (const statement of ast.statements) {
      if (statement.type === 'label') {
        const labelNode = statement as LabelNode
        const sceneNode = this.buildSceneNode(labelNode, context)
        nodes.push(sceneNode)
        
        // Build child nodes from label body
        const childNodes = this.buildLabelBodyNodes(labelNode, sceneNode.id, context)
        nodes.push(...childNodes)
      }
    }

    return {
      nodes,
      edges: context.edges,
    }
  }

  /**
   * Collect all label names from the AST
   */
  private collectLabelNames(statements: ASTNode[], context: BuildContext): void {
    for (const statement of statements) {
      if (statement.type === 'label') {
        const labelNode = statement as LabelNode
        context.labelNames.add(labelNode.name)
      }
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(prefix: string, context: BuildContext): string {
    return `${prefix}-${context.idCounter++}`
  }

  /**
   * Build a scene node from a label
   */
  private buildSceneNode(label: LabelNode, context: BuildContext): FlowNode {
    const nodeId = this.generateId('scene', context)
    context.labelNodeIds.set(label.name, nodeId)

    // Generate preview from first few dialogues
    const preview = this.generatePreview(label.body)
    
    // Determine exit type
    const exitType = this.determineExitType(label.body)

    return {
      id: nodeId,
      type: 'scene',
      position: { x: 0, y: 0 }, // Will be set by auto-layout
      data: {
        label: label.name,
        preview,
        exitType,
        hasIncoming: false, // Will be updated after all edges are created
        astNodes: [label],
      },
    }
  }

  /**
   * Generate a preview string from statements
   */
  private generatePreview(statements: ASTNode[]): string {
    const lines: string[] = []
    let count = 0
    const maxLines = 3

    for (const statement of statements) {
      if (count >= maxLines) break

      if (statement.type === 'dialogue') {
        const dialogue = statement as ASTDialogueNode
        const speaker = dialogue.speaker || '旁白'
        lines.push(`${speaker}: "${dialogue.text.substring(0, 30)}${dialogue.text.length > 30 ? '...' : ''}"`)
        count++
      } else if (statement.type === 'scene') {
        const scene = statement as ASTSceneNode
        lines.push(`📷 scene ${scene.image}`)
        count++
      } else if (statement.type === 'show') {
        const show = statement as ASTShowNode
        lines.push(`👤 show ${show.image}`)
        count++
      }
    }

    return lines.join('\n')
  }

  /**
   * Determine the exit type of a label
   */
  private determineExitType(statements: ASTNode[]): 'return' | 'jump' | 'menu' | 'fall-through' {
    if (statements.length === 0) return 'fall-through'

    // Check the last statement
    const lastStatement = statements[statements.length - 1]
    
    switch (lastStatement.type) {
      case 'return':
        return 'return'
      case 'jump':
        return 'jump'
      case 'menu':
        return 'menu'
      default:
        // Check if there's a menu or jump anywhere in the body
        for (const statement of statements) {
          if (statement.type === 'menu') return 'menu'
          if (statement.type === 'jump') return 'jump'
        }
        return 'fall-through'
    }
  }

  /**
   * Build nodes from a label's body statements
   */
  private buildLabelBodyNodes(
    label: LabelNode, 
    sceneNodeId: string, 
    context: BuildContext
  ): FlowNode[] {
    const nodes: FlowNode[] = []
    let prevNodeId = sceneNodeId
    let prevHandle: string | undefined

    // Merge dialogues into blocks
    const mergedStatements = this.mergeDialogueBlocks(label.body)

    for (const item of mergedStatements) {
      if (item.type === 'dialogue-block') {
        // Create dialogue block node
        const blockNode = this.createDialogueBlockNode(item.dialogues, item.visualCommands, context)
        nodes.push(blockNode)

        // Connect from previous node
        this.addEdge(prevNodeId, blockNode.id, 'normal', context, prevHandle)
        prevNodeId = blockNode.id
        prevHandle = undefined
      } else if (item.type === 'menu') {
        // Create menu node
        const menuNode = this.createMenuNode(item.node as ASTMenuNode, context)
        nodes.push(menuNode)

        // Connect from previous node
        this.addEdge(prevNodeId, menuNode.id, 'normal', context, prevHandle)

        // Process menu choices and create edges
        this.processMenuChoices(menuNode, item.node as ASTMenuNode, context, nodes)
        
        // Menu doesn't have a single next node
        prevNodeId = menuNode.id
        prevHandle = undefined
      } else if (item.type === 'if') {
        // Create condition node
        const conditionNode = this.createConditionNode(item.node as ASTIfNode, context)
        nodes.push(conditionNode)

        // Connect from previous node
        this.addEdge(prevNodeId, conditionNode.id, 'normal', context, prevHandle)

        // Process branches
        this.processConditionBranches(conditionNode, item.node as ASTIfNode, context, nodes)
        
        prevNodeId = conditionNode.id
        prevHandle = undefined
      } else if (item.type === 'jump') {
        // Create jump node
        const jumpNode = this.createJumpNode(item.node as ASTJumpNode, context)
        nodes.push(jumpNode)

        // Connect from previous node
        this.addEdge(prevNodeId, jumpNode.id, 'normal', context, prevHandle)

        // Create edge to target label
        const targetLabel = (item.node as ASTJumpNode).target
        this.addJumpEdge(jumpNode.id, targetLabel, 'jump', context)
        
        prevNodeId = jumpNode.id
        prevHandle = undefined
      } else if (item.type === 'call') {
        // Create call node
        const callNode = this.createCallNode(item.node as ASTCallNode, context)
        nodes.push(callNode)

        // Connect from previous node
        this.addEdge(prevNodeId, callNode.id, 'normal', context, prevHandle)

        // Create edge to target label
        const targetLabel = (item.node as ASTCallNode).target
        this.addJumpEdge(callNode.id, targetLabel, 'call', context)
        
        prevNodeId = callNode.id
        prevHandle = undefined
      } else if (item.type === 'return') {
        // Create return node
        const returnNode = this.createReturnNode(item.node as ASTReturnNode, context)
        nodes.push(returnNode)

        // Connect from previous node
        this.addEdge(prevNodeId, returnNode.id, 'normal', context, prevHandle)
        
        prevNodeId = returnNode.id
        prevHandle = undefined
      }
    }

    return nodes
  }

  /**
   * Merged statement types
   */
  private mergeDialogueBlocks(statements: ASTNode[]): MergedStatement[] {
    const result: MergedStatement[] = []
    let currentDialogues: DialogueItem[] = []
    let currentVisualCommands: VisualCommand[] = []

    const flushDialogueBlock = () => {
      if (currentDialogues.length > 0 || currentVisualCommands.length > 0) {
        result.push({
          type: 'dialogue-block',
          dialogues: [...currentDialogues],
          visualCommands: [...currentVisualCommands],
        })
        currentDialogues = []
        currentVisualCommands = []
      }
    }

    for (const statement of statements) {
      switch (statement.type) {
        case 'dialogue': {
          const dialogue = statement as ASTDialogueNode
          currentDialogues.push({
            speaker: dialogue.speaker,
            text: dialogue.text,
            attributes: dialogue.attributes,
            id: dialogue.id,
          })
          break
        }

        case 'scene': {
          // Scene starts a new block
          flushDialogueBlock()
          const scene = statement as ASTSceneNode
          currentVisualCommands.push({
            type: 'scene',
            target: scene.image,
            id: scene.id,
          })
          break
        }

        case 'show': {
          const show = statement as ASTShowNode
          currentVisualCommands.push({
            type: 'show',
            target: show.image,
            attributes: show.attributes,
            id: show.id,
          })
          break
        }

        case 'hide': {
          const hide = statement as ASTHideNode
          currentVisualCommands.push({
            type: 'hide',
            target: hide.image,
            id: hide.id,
          })
          break
        }

        case 'with': {
          const withNode = statement as ASTWithNode
          currentVisualCommands.push({
            type: 'with',
            target: withNode.transition,
            id: withNode.id,
          })
          break
        }

        case 'menu':
        case 'jump':
        case 'call':
        case 'if':
        case 'return':
          // These end the current dialogue block
          flushDialogueBlock()
          result.push({
            type: statement.type as 'menu' | 'jump' | 'call' | 'if' | 'return',
            node: statement,
          })
          break

        default:
          // Other statements are ignored for now
          break
      }
    }

    // Flush any remaining dialogue block
    flushDialogueBlock()

    return result
  }

  /**
   * Create a dialogue block node
   */
  private createDialogueBlockNode(
    dialogues: DialogueItem[],
    visualCommands: VisualCommand[],
    context: BuildContext
  ): FlowNode {
    return {
      id: this.generateId('dialogue-block', context),
      type: 'dialogue-block',
      position: { x: 0, y: 0 },
      data: {
        dialogues,
        visualCommands,
        expanded: false,
      },
    }
  }

  /**
   * Create a menu node
   */
  private createMenuNode(menu: ASTMenuNode, context: BuildContext): FlowNode {
    const choices: MenuChoice[] = menu.choices.map((choice, index) => ({
      text: choice.text,
      condition: choice.condition,
      portId: `choice-${index}`,
      body: choice.body,
      targetLabel: this.findJumpTarget(choice.body),
    }))

    return {
      id: this.generateId('menu', context),
      type: 'menu',
      position: { x: 0, y: 0 },
      data: {
        prompt: menu.prompt,
        choices,
      },
    }
  }

  /**
   * Find jump target in a list of statements
   */
  private findJumpTarget(statements: ASTNode[]): string | undefined {
    for (const statement of statements) {
      if (statement.type === 'jump') {
        return (statement as ASTJumpNode).target
      }
    }
    return undefined
  }

  /**
   * Process menu choices and create edges
   */
  private processMenuChoices(
    menuNode: FlowNode,
    menu: ASTMenuNode,
    context: BuildContext,
    nodes: FlowNode[]
  ): void {
    for (let i = 0; i < menu.choices.length; i++) {
      const choice = menu.choices[i]
      const portId = `choice-${i}`
      
      // Find jump target in choice body
      const jumpTarget = this.findJumpTarget(choice.body)
      
      if (jumpTarget) {
        // Create edge to target label
        this.addJumpEdge(menuNode.id, jumpTarget, 'jump', context, portId)
      } else if (choice.body.length > 0) {
        // Process choice body as nested content
        // For now, we'll just look for the first significant statement
        const childNodes = this.processNestedStatements(choice.body, menuNode.id, portId, context)
        nodes.push(...childNodes)
      }
    }
  }

  /**
   * Create a condition node
   */
  private createConditionNode(ifNode: ASTIfNode, context: BuildContext): FlowNode {
    const branches: ConditionBranch[] = ifNode.branches.map((branch, index) => ({
      condition: branch.condition,
      portId: `branch-${index}`,
      body: branch.body,
    }))

    return {
      id: this.generateId('condition', context),
      type: 'condition',
      position: { x: 0, y: 0 },
      data: {
        condition: ifNode.branches[0]?.condition || '',
        branches,
      },
    }
  }

  /**
   * Process condition branches and create edges
   */
  private processConditionBranches(
    conditionNode: FlowNode,
    ifNode: ASTIfNode,
    context: BuildContext,
    nodes: FlowNode[]
  ): void {
    for (let i = 0; i < ifNode.branches.length; i++) {
      const branch = ifNode.branches[i]
      const portId = `branch-${i}`
      
      // Find jump target in branch body
      const jumpTarget = this.findJumpTarget(branch.body)
      
      if (jumpTarget) {
        // Create edge to target label
        this.addJumpEdge(conditionNode.id, jumpTarget, 'jump', context, portId)
      } else if (branch.body.length > 0) {
        // Process branch body as nested content
        const childNodes = this.processNestedStatements(branch.body, conditionNode.id, portId, context)
        nodes.push(...childNodes)
      }
    }
  }

  /**
   * Process nested statements (from menu choices or if branches)
   */
  private processNestedStatements(
    statements: ASTNode[],
    parentId: string,
    parentHandle: string,
    context: BuildContext
  ): FlowNode[] {
    const nodes: FlowNode[] = []
    const merged = this.mergeDialogueBlocks(statements)
    
    let prevNodeId = parentId
    let prevHandle: string | undefined = parentHandle

    for (const item of merged) {
      if (item.type === 'dialogue-block') {
        const blockNode = this.createDialogueBlockNode(item.dialogues, item.visualCommands, context)
        nodes.push(blockNode)
        this.addEdge(prevNodeId, blockNode.id, 'normal', context, prevHandle)
        prevNodeId = blockNode.id
        prevHandle = undefined
      } else if (item.type === 'jump') {
        const jumpNode = this.createJumpNode(item.node as ASTJumpNode, context)
        nodes.push(jumpNode)
        this.addEdge(prevNodeId, jumpNode.id, 'normal', context, prevHandle)
        const targetLabel = (item.node as ASTJumpNode).target
        this.addJumpEdge(jumpNode.id, targetLabel, 'jump', context)
        prevNodeId = jumpNode.id
        prevHandle = undefined
      } else if (item.type === 'call') {
        const callNode = this.createCallNode(item.node as ASTCallNode, context)
        nodes.push(callNode)
        this.addEdge(prevNodeId, callNode.id, 'normal', context, prevHandle)
        const targetLabel = (item.node as ASTCallNode).target
        this.addJumpEdge(callNode.id, targetLabel, 'call', context)
        prevNodeId = callNode.id
        prevHandle = undefined
      } else if (item.type === 'return') {
        const returnNode = this.createReturnNode(item.node as ASTReturnNode, context)
        nodes.push(returnNode)
        this.addEdge(prevNodeId, returnNode.id, 'normal', context, prevHandle)
        prevNodeId = returnNode.id
        prevHandle = undefined
      }
    }

    return nodes
  }

  /**
   * Create a jump node
   */
  private createJumpNode(jump: ASTJumpNode, context: BuildContext): FlowNode {
    return {
      id: this.generateId('jump', context),
      type: 'jump',
      position: { x: 0, y: 0 },
      data: {
        target: jump.target,
        isCall: false,
        astNodes: [jump],
      },
    }
  }

  /**
   * Create a call node
   */
  private createCallNode(call: ASTCallNode, context: BuildContext): FlowNode {
    return {
      id: this.generateId('call', context),
      type: 'call',
      position: { x: 0, y: 0 },
      data: {
        target: call.target,
        isCall: true,
        astNodes: [call],
      },
    }
  }

  /**
   * Create a return node
   */
  private createReturnNode(returnNode: ASTReturnNode, context: BuildContext): FlowNode {
    return {
      id: this.generateId('return', context),
      type: 'return',
      position: { x: 0, y: 0 },
      data: {
        astNodes: [returnNode],
      },
    }
  }

  /**
   * Add an edge to the graph
   */
  private addEdge(
    source: string,
    target: string,
    type: FlowEdgeType,
    context: BuildContext,
    sourceHandle?: string,
    targetHandle?: string
  ): void {
    const edgeId = `e-${source}-${target}${sourceHandle ? `-${sourceHandle}` : ''}`
    context.edges.push({
      id: edgeId,
      source,
      target,
      sourceHandle,
      targetHandle,
      type,
      valid: true,
    })
  }

  /**
   * Add a jump/call edge to a target label
   */
  private addJumpEdge(
    source: string,
    targetLabel: string,
    type: 'jump' | 'call',
    context: BuildContext,
    sourceHandle?: string
  ): void {
    const targetNodeId = context.labelNodeIds.get(targetLabel)
    const valid = context.labelNames.has(targetLabel)
    
    const edgeId = `e-${source}-${targetLabel}${sourceHandle ? `-${sourceHandle}` : ''}`
    context.edges.push({
      id: edgeId,
      source,
      target: targetNodeId || `missing-${targetLabel}`,
      sourceHandle,
      type,
      animated: type === 'call',
      valid,
    })
  }

  /**
   * Auto-layout the graph using dagre for hierarchical layout
   * Implements Requirement 5.6: Support automatic layout to minimize edge crossings
   */
  autoLayout(graph: FlowGraph): FlowGraph {
    const nodeWidth = 280
    const nodeHeight = 150

    // Create a new dagre graph
    const g = new dagre.graphlib.Graph()
    
    // Set graph options for top-to-bottom layout
    g.setGraph({
      rankdir: 'TB',      // Top to bottom
      nodesep: 50,        // Horizontal spacing between nodes
      ranksep: 100,       // Vertical spacing between ranks
      marginx: 20,
      marginy: 20,
    })
    
    // Default edge label (required by dagre)
    g.setDefaultEdgeLabel(() => ({}))

    // Add nodes to the graph
    for (const node of graph.nodes) {
      // Adjust height based on node type
      let height = nodeHeight
      if (node.type === 'dialogue-block') {
        const dialogueCount = node.data.dialogues?.length || 0
        height = Math.max(nodeHeight, 80 + dialogueCount * 20)
      } else if (node.type === 'menu') {
        const choiceCount = node.data.choices?.length || 0
        height = Math.max(nodeHeight, 80 + choiceCount * 30)
      } else if (node.type === 'condition') {
        const branchCount = node.data.branches?.length || 0
        height = Math.max(nodeHeight, 80 + branchCount * 30)
      }
      
      g.setNode(node.id, { width: nodeWidth, height })
    }

    // Add edges to the graph
    for (const edge of graph.edges) {
      // Only add edges to existing nodes
      if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
        g.setEdge(edge.source, edge.target)
      }
    }

    // Run the dagre layout algorithm
    dagre.layout(g)

    // Apply the calculated positions to nodes
    const positionedNodes = graph.nodes.map(node => {
      const nodeWithPosition = g.node(node.id)
      if (nodeWithPosition) {
        return {
          ...node,
          position: {
            // dagre returns center position, convert to top-left
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - (nodeWithPosition.height || nodeHeight) / 2,
          },
        }
      }
      // Fallback for nodes not in the graph
      return node
    })

    return {
      nodes: positionedNodes,
      edges: graph.edges,
    }
  }
}

/**
 * Merged statement type for internal processing
 */
type MergedStatement = 
  | { type: 'dialogue-block'; dialogues: DialogueItem[]; visualCommands: VisualCommand[] }
  | { type: 'menu' | 'jump' | 'call' | 'if' | 'return'; node: ASTNode }

// Export singleton instance
export const flowGraphBuilder = new FlowGraphBuilder()
