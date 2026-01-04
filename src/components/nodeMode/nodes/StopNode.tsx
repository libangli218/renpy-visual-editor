import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { StopNode as StopNodeType } from '../../../types/ast'

/**
 * StopNode - Stop audio
 * Represents: stop music/sound/voice
 */
export const StopNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as StopNodeType

  return (
    <BaseNode {...props}>
      <div className="audio-info">
        <div className="audio-channel">{data.channel}</div>
        {data.fadeOut && (
          <div className="audio-options">fadeout {data.fadeOut}</div>
        )}
      </div>
    </BaseNode>
  )
})

StopNode.displayName = 'StopNode'
