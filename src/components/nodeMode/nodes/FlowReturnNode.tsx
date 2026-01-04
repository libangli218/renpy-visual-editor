import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import './FlowNodes.css'

/**
 * FlowReturnNode - Return node for the flow graph
 * 
 * Represents a return statement that ends the current label execution.
 * Uses orange color scheme as per design requirements.
 * 
 * Implements Requirements:
 * - 9.1: Use orange color scheme for Return nodes
 * - 9.4: Highlight selected node with glow effect
 */
export const FlowReturnNode: React.FC<NodeProps> = memo((props) => {
  const { selected } = props
  
  // Get className from props (includes 'disconnected' if applicable)
  const nodeClassName = (props as unknown as { className?: string }).className || ''

  return (
    <div className={`flow-node flow-return-node ${selected ? 'selected' : ''} ${nodeClassName}`}>
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
