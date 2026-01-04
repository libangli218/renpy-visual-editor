import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { WithNode as WithNodeType } from '../../../types/ast'

/**
 * WithNode - Transition effect
 * Represents: with transition_name
 */
export const WithNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as WithNodeType

  return (
    <BaseNode {...props}>
      <div className="node-field">
        <div className="node-field-label">Transition</div>
        <div className="transition-name">{data.transition}</div>
      </div>
    </BaseNode>
  )
})

WithNode.displayName = 'WithNode'
