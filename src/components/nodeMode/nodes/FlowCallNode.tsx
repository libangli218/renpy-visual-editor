import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { FlowNodeData } from '../FlowGraphBuilder'
import './FlowNodes.css'

/**
 * FlowCallNode - Call node for the flow graph
 * 
 * Displays call target label with teal color scheme.
 * Call nodes transfer control to another label and return when done.
 * 
 * Implements Requirements:
 * - 5.2: Draw Flow_Edge from call statements to their target Scene_Node with dashed line
 * - 9.1: Use teal color scheme for Call nodes
 */
export const FlowCallNode: React.FC<NodeProps> = memo((props) => {
  const { selected } = props
  const data = props.data as unknown as FlowNodeData

  const target = data.target || 'unknown'

  return (
    <div className={`flow-node flow-call-node ${selected ? 'selected' : ''}`}>
      {/* Input port */}
      <Handle
        type="target"
        position={Position.Top}
        className="flow-handle flow-handle-target"
      />

      {/* Node header */}
      <div className="flow-node-header flow-call-header">
        <span className="flow-node-icon">📞</span>
        <span className="flow-node-label">Call</span>
      </div>

      {/* Content */}
      <div className="flow-node-content">
        <div className="flow-call-target">
          <span className="flow-call-icon">↪</span>
          <span className="flow-call-label">{target}</span>
        </div>
      </div>

      {/* Output port - continues after call returns */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="flow-handle flow-handle-source"
      />
    </div>
  )
})

FlowCallNode.displayName = 'FlowCallNode'
