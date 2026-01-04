import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { SceneNode as SceneNodeType } from '../../../types/ast'

/**
 * SceneNode - Background scene change
 * Represents: scene image_name
 */
export const SceneNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as SceneNodeType

  return (
    <BaseNode {...props}>
      <div className="node-field">
        <div className="node-field-label">Image</div>
        <div className="image-name">{data.image}</div>
      </div>
      {data.layer && (
        <div className="node-field">
          <div className="node-field-label">Layer</div>
          <div className="node-field-value">{data.layer}</div>
        </div>
      )}
    </BaseNode>
  )
})

SceneNode.displayName = 'SceneNode'
