import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { ShowNode as ShowNodeType } from '../../../types/ast'

/**
 * ShowNode - Show character/image
 * Represents: show image_name [attributes] [at position]
 */
export const ShowNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as ShowNodeType

  return (
    <BaseNode {...props}>
      <div className="node-field">
        <div className="node-field-label">Image</div>
        <div className="image-name">{data.image}</div>
      </div>
      {data.attributes && data.attributes.length > 0 && (
        <div className="node-field">
          <div className="node-field-label">Attributes</div>
          <div className="image-attributes">{data.attributes.join(' ')}</div>
        </div>
      )}
      {data.atPosition && (
        <div className="node-field">
          <div className="node-field-label">Position</div>
          <div className="node-field-value">{data.atPosition}</div>
        </div>
      )}
    </BaseNode>
  )
})

ShowNode.displayName = 'ShowNode'
