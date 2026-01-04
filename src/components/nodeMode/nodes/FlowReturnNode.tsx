import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import './FlowNodes.css'

/**
 * FlowReturnNode - Return node for the flow graph
 * 
 * Represents a return statement that ends the current label execution.
 * Uses orange color scheme as per design requirements.
 */
export const FlowReturnNode: React.FC<NodeProps> = memo((props) => {
  const { selected } = props

  return (
    <div className={`flow-node flow-return-node ${selected ? 'selected' : ''}`}>
      {/* Input port */}
      <Handle
        type="target"
        position={Position.Top}
        className="flow-handle flow-handle-target"
      />

      {/* Node header */}
      <div className="flow-node-header flow-return-header">
        <span className="flow-node-icon">↩️</span>
        <span className="flow-node-label">Return</span>
      </div>

      {/* Content */}
      <div className="flow-node-content">
        <div className="flow-return-content">
          <span className="flow-return-icon">⏹</span>
          <span className="flow-return-text">End of flow</span>
        </div>
      </div>

      {/* No output port - return ends the flow */}
    </div>
  )
})

FlowReturnNode.displayName = 'FlowReturnNode'
