import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { FlowNodeData } from '../FlowGraphBuilder'
import './FlowNodes.css'

/**
 * FlowSceneNode - Scene entry point node for the flow graph
 * 
 * Represents a label and its content preview in the story flow.
 * Uses indigo color scheme as per design requirements.
 * 
 * Implements Requirements:
 * - 2.2: Display label name prominently at the top
 * - 2.3: Show preview of content (first few lines of dialogue)
 * - 2.4: Have one input Port for incoming flow
 * - 2.5: Have output Port based on exit points
 * - 9.1: Use indigo color scheme
 * - 9.4: Highlight selected node with glow effect
 */
export const FlowSceneNode: React.FC<NodeProps> = memo((props) => {
  const { selected } = props
  const data = props.data as unknown as FlowNodeData
  
  // Get className from props (includes 'disconnected' if applicable)
  const nodeClassName = (props as unknown as { className?: string }).className || ''

  // Parse preview lines
  const previewLines = data.preview?.split('\n') || []

  return (
    <div className={`flow-node flow-scene-node ${selected ? 'selected' : ''} ${nodeClassName}`}>
      {/* Input port */}
      {data.hasIncoming !== false && (
        <Handle
          type="target"
          position={Position.Top}
          className="flow-handle flow-handle-target"
        />
      )}

      {/* Node header with label name */}
      <div className="flow-node-header flow-scene-header">
        <span className="flow-node-icon">🏷️</span>
        <span className="flow-node-label">{data.label || 'Unknown'}</span>
      </div>

      {/* Content preview */}
      <div className="flow-node-content">
        {previewLines.length > 0 ? (
          <div className="flow-scene-preview">
            {previewLines.map((line, index) => (
              <div key={index} className="flow-preview-line">
                {line}
              </div>
            ))}
          </div>
        ) : (
          <div className="flow-empty-content">No content</div>
        )}
      </div>

      {/* Exit type indicator */}
      {data.exitType && (
        <div className="flow-node-footer">
          <span className={`flow-exit-badge flow-exit-${data.exitType}`}>
            {getExitTypeLabel(data.exitType)}
          </span>
        </div>
      )}

      {/* Output port */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="flow-handle flow-handle-source"
      />
    </div>
  )
})

FlowSceneNode.displayName = 'FlowSceneNode'

/**
 * Get human-readable label for exit type
 */
function getExitTypeLabel(exitType: string): string {
  switch (exitType) {
    case 'return':
      return '↩ Return'
    case 'jump':
      return '→ Jump'
    case 'menu':
      return '⋮ Menu'
    case 'fall-through':
      return '↓ Continue'
    default:
      return exitType
  }
}
