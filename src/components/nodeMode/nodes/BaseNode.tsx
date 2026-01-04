import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { getNodeTypeLabel, getNodeTypeColor } from '../astNodeConverter'
import './BaseNode.css'

export interface BaseNodeData {
  id: string
  type: string
  [key: string]: unknown
}

interface BaseNodeProps extends Omit<NodeProps, 'data'> {
  data: Record<string, unknown>
  children?: React.ReactNode
  showSourceHandle?: boolean
  showTargetHandle?: boolean
  sourceHandles?: { id: string; position: Position; label?: string }[]
  targetHandles?: { id: string; position: Position; label?: string }[]
}

/**
 * BaseNode component - Base wrapper for all custom node types
 * Provides consistent styling and handle configuration
 */
export const BaseNode: React.FC<BaseNodeProps> = memo(({
  data,
  children,
  selected,
  showSourceHandle = true,
  showTargetHandle = true,
  sourceHandles,
  targetHandles,
}) => {
  const nodeType = data.type as string
  const color = getNodeTypeColor(nodeType)
  const label = getNodeTypeLabel(nodeType)

  return (
    <div
      className={`base-node ${selected ? 'selected' : ''}`}
      style={{ '--node-color': color } as React.CSSProperties}
    >
      {/* Default target handle */}
      {showTargetHandle && !targetHandles && (
        <Handle
          type="target"
          position={Position.Top}
          className="node-handle target-handle"
        />
      )}
      
      {/* Custom target handles */}
      {targetHandles?.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="target"
          position={handle.position}
          className="node-handle target-handle"
          title={handle.label}
        />
      ))}

      {/* Node header */}
      <div className="node-header" style={{ backgroundColor: color }}>
        <span className="node-type-label">{label}</span>
      </div>

      {/* Node content */}
      <div className="node-content">
        {children}
      </div>

      {/* Default source handle */}
      {showSourceHandle && !sourceHandles && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="node-handle source-handle"
        />
      )}
      
      {/* Custom source handles */}
      {sourceHandles?.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={handle.position}
          className="node-handle source-handle"
          title={handle.label}
        />
      ))}
    </div>
  )
})

BaseNode.displayName = 'BaseNode'
