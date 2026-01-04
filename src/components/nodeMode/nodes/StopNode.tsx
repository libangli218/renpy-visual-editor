import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { StopNode as StopNodeType } from '../../../types/ast'

/**
 * StopNode - Stop audio
 * Represents: stop music/sound/voice
 * Implements Requirements 10.4: Stop audio with fade out option
 */
export const StopNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as StopNodeType

  // Get channel display name
  const channelDisplay = data.channel.charAt(0).toUpperCase() + data.channel.slice(1)

  return (
    <BaseNode {...props}>
      <div className="audio-info">
        <div className="audio-channel">Stop {channelDisplay}</div>
        {data.fadeOut !== undefined && data.fadeOut !== null && (
          <div className="audio-options">fadeout {data.fadeOut}s</div>
        )}
      </div>
    </BaseNode>
  )
})

StopNode.displayName = 'StopNode'
