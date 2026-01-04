import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { PlayNode as PlayNodeType } from '../../../types/ast'

/**
 * PlayNode - Play audio
 * Represents: play music/sound/voice "file"
 */
export const PlayNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as PlayNodeType

  const options: string[] = []
  if (data.fadeIn) options.push(`fadein ${data.fadeIn}`)
  if (data.loop) options.push('loop')
  if (data.volume !== undefined) options.push(`volume ${data.volume}`)
  if (data.queue) options.push('queue')

  return (
    <BaseNode {...props}>
      <div className="audio-info">
        <div className="audio-channel">{data.channel}</div>
        <div className="audio-file">{data.file}</div>
        {options.length > 0 && (
          <div className="audio-options">{options.join(' • ')}</div>
        )}
      </div>
    </BaseNode>
  )
})

PlayNode.displayName = 'PlayNode'
