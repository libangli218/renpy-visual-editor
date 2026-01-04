import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { JumpNode as JumpNodeType } from '../../../types/ast'

/**
 * JumpNode - Jump to another label
 * Represents: jump label_name or jump expression
 */
export const JumpNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as JumpNodeType

  return (
    <BaseNode {...props} showSourceHandle={false}>
      <div className="node-field">
        <div className="node-field-label">Target</div>
        <div className="target-label">{data.target}</div>
      </div>
      {data.expression && (
        <div className="node-field">
          <div className="node-field-label">Type</div>
          <div className="node-field-value">Expression</div>
        </div>
      )}
    </BaseNode>
  )
})

JumpNode.displayName = 'JumpNode'
