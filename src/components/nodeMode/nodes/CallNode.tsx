import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { CallNode as CallNodeType } from '../../../types/ast'

/**
 * CallNode - Call another label (with return)
 * Represents: call label_name or call expression
 */
export const CallNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as CallNodeType

  return (
    <BaseNode {...props}>
      <div className="node-field">
        <div className="node-field-label">Target</div>
        <div className="target-label">{data.target}</div>
      </div>
      {data.arguments && data.arguments.length > 0 && (
        <div className="node-field">
          <div className="node-field-label">Arguments</div>
          <div className="node-field-value monospace">
            ({data.arguments.join(', ')})
          </div>
        </div>
      )}
      {data.expression && (
        <div className="node-field">
          <div className="node-field-label">Type</div>
          <div className="node-field-value">Expression</div>
        </div>
      )}
    </BaseNode>
  )
})

CallNode.displayName = 'CallNode'
