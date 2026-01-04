import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { LabelNode as LabelNodeType } from '../../../types/ast'

/**
 * LabelNode - Entry point node for a scene/label
 * Represents: label label_name:
 */
export const LabelNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as LabelNodeType

  return (
    <BaseNode {...props} showTargetHandle={false}>
      <div className="node-field">
        <div className="node-field-label">Name</div>
        <div className="target-label">{data.name}</div>
      </div>
      {data.parameters && data.parameters.length > 0 && (
        <div className="node-field">
          <div className="node-field-label">Parameters</div>
          <div className="node-field-value monospace">
            ({data.parameters.join(', ')})
          </div>
        </div>
      )}
    </BaseNode>
  )
})

LabelNode.displayName = 'LabelNode'
