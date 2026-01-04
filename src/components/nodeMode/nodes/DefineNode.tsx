import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { DefineNode as DefineNodeType } from '../../../types/ast'

/**
 * DefineNode - Define constant
 * Represents: define name = value
 */
export const DefineNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as DefineNodeType

  return (
    <BaseNode {...props} showTargetHandle={false} showSourceHandle={false}>
      <div className="node-field">
        <div className="node-field-label">Name</div>
        <div className="variable-name">
          {data.store ? `${data.store}.${data.name}` : data.name}
        </div>
      </div>
      <div className="node-field">
        <div className="node-field-label">Value</div>
        <div className="variable-value">{data.value}</div>
      </div>
    </BaseNode>
  )
})

DefineNode.displayName = 'DefineNode'
