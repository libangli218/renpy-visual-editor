import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { HideNode as HideNodeType } from '../../../types/ast'

/**
 * HideNode - Hide character/image
 * Represents: hide image_name
 */
export const HideNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as HideNodeType

  return (
    <BaseNode {...props}>
      <div className="node-field">
        <div className="node-field-label">Image</div>
        <div className="image-name">{data.image}</div>
      </div>
    </BaseNode>
  )
})

HideNode.displayName = 'HideNode'
