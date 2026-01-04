import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { PlayNode as PlayNodeType } from '../../../types/ast'

/**
 * PlayNode - Play audio
 * Represents: play music/sound/voice "file"
 * Implements Requirements 10.1, 10.3, 10.4: Audio channels, fade in, loop options
 */
export const PlayNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as PlayNodeType

  const options: string[] = []
  if (data.fadeIn !== undefined && data.fadeIn !== null) {
    options.push(`fadein ${data.fadeIn}s`)
  }
  if (data.loop === true) {
    options.push('loop')
  } else if (data.loop === false) {
    options.push('noloop')
  }
  if (data.volume !== undefined && data.volume !== null) {
    options.push(`vol ${data.volume}`)
  }
  if (data.queue) {
    options.push('queued')
  }

  // Get channel display name
  const channelDisplay = data.channel === 'voice' 
    ? 'Voice' 
    : data.queue && data.channel === 'music' 
      ? 'Queue Music' 
      : data.channel.charAt(0).toUpperCase() + data.channel.slice(1)

  return (
    <BaseNode {...props}>
      <div className="audio-info">
        <div className="audio-channel">{channelDisplay}</div>
        <div className="audio-file">{data.file}</div>
        {options.length > 0 && (
          <div className="audio-options">{options.join(' • ')}</div>
        )}
      </div>
    </BaseNode>
  )
})

PlayNode.displayName = 'PlayNode'
