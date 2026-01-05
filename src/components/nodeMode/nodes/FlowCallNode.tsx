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
 * - 9.4: Highlight selected node with glow effect
 * - 4.3: Show invalid target warning when target label doesn't exist
 */
export const FlowCallNode: React.FC<NodeProps> = memo((props) => {
  const { selected } = props
  const data = props.data as unknown as FlowNodeData
  
  // Get className from props (includes 'disconnected', 'invalid-target' if applicable)
  const nodeClassName = (props as unknown as { className?: string }).className || ''
  
  // Check if this node has an invalid target
  const hasInvalidTarget = nodeClassName.includes('invalid-target')

  const target = data.target || 'unknown'

  return (
    <div className={`flow-node flow-call-node ${selected ? 'selected' : ''} ${nodeClassName}`}>
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
        {hasInvalidTarget && (
          <span className="flow-invalid-target-badge" title="Target label does not exist">
            ⚠️
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flow-node-content">
        <div className={`flow-call-target ${hasInvalidTarget ? 'invalid' : ''}`}>
          <span className="flow-call-icon">↪</span>
          <span className="flow-call-label">{target}</span>
        </div>
        {hasInvalidTarget && (
          <div className="flow-invalid-target-message">
            Target label "{target}" not found
          </div>
        )}
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
