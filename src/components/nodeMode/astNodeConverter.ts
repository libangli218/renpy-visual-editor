import { Node, Edge } from '@xyflow/react'
import { RenpyScript, ASTNode, LabelNode } from '../../types/ast'

/**
 * Convert AST to React Flow nodes and edges
 * This handles the transformation from Ren'Py AST structure to visual flow graph
 */
export function astToNodes(ast: RenpyScript): { initialNodes: Node[]; initialEdges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  
  let yOffset = 0
  const nodeSpacing = 120
  const labelSpacing = 200

  // Process each top-level statement
  ast.statements.forEach((statement, index) => {
    if (statement.type === 'label') {
      // Label nodes are entry points
      const labelNode = statement as LabelNode
      const labelFlowNode = createFlowNode(labelNode, 0, yOffset)
      nodes.push(labelFlowNode)
      
      // Process label body
      let bodyYOffset = yOffset + nodeSpacing
      let prevNodeId = labelNode.id
      
      labelNode.body.forEach((bodyStatement) => {
        const bodyNode = createFlowNode(bodyStatement, 200, bodyYOffset)
        nodes.push(bodyNode)
        
        // Create edge from previous node
        edges.push({
          id: `e-${prevNodeId}-${bodyStatement.id}`,
          source: prevNodeId,
          target: bodyStatement.id,
          type: 'smoothstep',
        })
        
        prevNodeId = bodyStatement.id
        bodyYOffset += nodeSpacing
      })
      
      yOffset = bodyYOffset + labelSpacing
    } else {
      // Top-level statements (define, default, etc.)
      const flowNode = createFlowNode(statement, 0, yOffset)
      nodes.push(flowNode)
      
      // Connect to previous node if exists
      if (index > 0) {
        const prevStatement = ast.statements[index - 1]
        edges.push({
          id: `e-${prevStatement.id}-${statement.id}`,
          source: prevStatement.id,
          target: statement.id,
          type: 'smoothstep',
        })
      }
      
      yOffset += nodeSpacing
    }
  })

  return { initialNodes: nodes, initialEdges: edges }
}

/**
 * Create a React Flow node from an AST node
 */
function createFlowNode(astNode: ASTNode, x: number, y: number): Node {
  return {
    id: astNode.id,
    type: astNode.type,
    position: { x, y },
    data: { ...astNode },
  }
}

/**
 * Convert React Flow nodes and edges back to AST
 * This preserves the original AST structure while updating positions
 */
export function nodesToAst(
  _nodes: Node[],
  _edges: Edge[],
  originalAst: RenpyScript
): RenpyScript {
  // For now, we preserve the original AST structure
  // Position changes don't affect the AST semantics
  // Future: Handle node reordering and connection changes
  return originalAst
}

/**
 * Get the display label for a node type
 */
export function getNodeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    label: 'Label',
    dialogue: 'Dialogue',
    menu: 'Menu',
    scene: 'Scene',
    show: 'Show',
    hide: 'Hide',
    with: 'Transition',
    jump: 'Jump',
    call: 'Call',
    return: 'Return',
    if: 'Condition',
    set: 'Set Variable',
    python: 'Python',
    define: 'Define',
    default: 'Default',
    play: 'Play Audio',
    stop: 'Stop Audio',
    pause: 'Pause',
    nvl: 'NVL',
    raw: 'Raw Code',
  }
  return labels[type] || type
}

/**
 * Get the color for a node type
 */
export function getNodeTypeColor(type: string): string {
  const colors: Record<string, string> = {
    label: '#6366f1',      // Indigo
    dialogue: '#22c55e',   // Green
    menu: '#f59e0b',       // Amber
    scene: '#3b82f6',      // Blue
    show: '#8b5cf6',       // Violet
    hide: '#ef4444',       // Red
    with: '#06b6d4',       // Cyan
    jump: '#ec4899',       // Pink
    call: '#14b8a6',       // Teal
    return: '#f97316',     // Orange
    if: '#eab308',         // Yellow
    set: '#84cc16',        // Lime
    python: '#64748b',     // Slate
    define: '#a855f7',     // Purple
    default: '#0ea5e9',    // Sky
    play: '#10b981',       // Emerald
    stop: '#dc2626',       // Red
    pause: '#78716c',      // Stone
    nvl: '#f472b6',        // Pink
    raw: '#94a3b8',        // Gray
  }
  return colors[type] || '#94a3b8'
}
