import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { SetNode as SetNodeType } from '../../../types/ast'

/**
 * SetNode - Variable assignment
 * Represents: $ variable = value
 */
export const SetNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as SetNodeType

  return (
    <BaseNode {...props}>
      <div className="node-field">
        <div className="node-field-label">Variable</div>
        <div className="variable-name">{data.variable}</div>
      </div>
      <div className="node-field">
        <div className="node-field-label">Operation</div>
        <div className="node-field-value monospace">
          {data.variable} {data.operator} {data.value}
        </div>
      </div>
    </BaseNode>
  )
})

SetNode.displayName = 'SetNode'
