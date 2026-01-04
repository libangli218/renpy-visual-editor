import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { DefaultNode as DefaultNodeType } from '../../../types/ast'

/**
 * DefaultNode - Default variable
 * Represents: default name = value
 */
export const DefaultNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as DefaultNodeType

  return (
    <BaseNode {...props} showTargetHandle={false} showSourceHandle={false}>
      <div className="node-field">
        <div className="node-field-label">Name</div>
        <div className="variable-name">{data.name}</div>
      </div>
      <div className="node-field">
        <div className="node-field-label">Default Value</div>
        <div className="variable-value">{data.value}</div>
      </div>
    </BaseNode>
  )
})

DefaultNode.displayName = 'DefaultNode'
