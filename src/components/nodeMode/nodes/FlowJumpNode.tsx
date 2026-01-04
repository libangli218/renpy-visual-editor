import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { FlowNodeData } from '../FlowGraphBuilder'
import './FlowNodes.css'

/**
 * FlowJumpNode - Jump node for the flow graph
 * 
 * Displays jump target label with pink color scheme.
 * Jump nodes transfer control to another label without returning.
 * 
 * Implements Requirements:
 * - 5.1: Draw Flow_Edge from jump statements to their target Scene_Node
 * - 9.1: Use pink color scheme for Jump nodes
 * - 9.4: Highlight selected node with glow effect
 */
export const FlowJumpNode: React.FC<NodeProps> = memo((props) => {
  const { selected } = props
  const data = props.data as unknown as FlowNodeData
  
  // Get className from props (includes 'disconnected' if applicable)
  const nodeClassName = (props as unknown as { className?: string }).className || ''

  const target = data.target || 'unknown'

  return (
    <div className={`flow-node flow-jump-node ${selected ? 'selected' : ''} ${nodeClassName}`}>
      {/* Input port */}
      <Handle
        type="target"
        position={Position.Top}
        className="flow-handle flow-handle-target"
      />

      {/* Node header */}
      <div className="flow-node-header flow-jump-header">
        <span className="flow-node-icon">➡️</span>
        <span className="flow-node-label">Jump</span>
      </div>

      {/* Content */}
      <div className="flow-node-content">
        <div className="flow-jump-target">
          <span className="flow-target-arrow">→</span>
          <span className="flow-target-label">{target}</span>
        </div>
      </div>

      {/* Output port - connects to target label */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="flow-handle flow-handle-source"
      />
    </div>
  )
})

FlowJumpNode.displayName = 'FlowJumpNode'
