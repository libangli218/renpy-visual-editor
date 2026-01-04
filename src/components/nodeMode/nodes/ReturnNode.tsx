import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { ReturnNode as ReturnNodeType } from '../../../types/ast'

/**
 * ReturnNode - Return from call
 * Represents: return or return value
 */
export const ReturnNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as ReturnNodeType

  return (
    <BaseNode {...props} showSourceHandle={false}>
      {data.value ? (
        <div className="node-field">
          <div className="node-field-label">Value</div>
          <div className="node-field-value monospace">{data.value}</div>
        </div>
      ) : (
        <div className="node-field">
          <div className="node-field-value">Return to caller</div>
        </div>
      )}
    </BaseNode>
  )
})

ReturnNode.displayName = 'ReturnNode'
