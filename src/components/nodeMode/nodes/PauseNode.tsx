import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { PauseNode as PauseNodeType } from '../../../types/ast'

/**
 * PauseNode - Pause execution
 * Represents: pause or pause duration
 */
export const PauseNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as PauseNodeType

  return (
    <BaseNode {...props}>
      <div className="node-field">
        <div className="node-field-label">Duration</div>
        <div className="node-field-value">
          {data.duration !== undefined 
            ? `${data.duration} seconds` 
            : 'Wait for click'}
        </div>
      </div>
    </BaseNode>
  )
})

PauseNode.displayName = 'PauseNode'
