import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { DialogueNode as DialogueNodeType } from '../../../types/ast'

/**
 * DialogueNode - Character dialogue or narration
 * Represents: character "text" or "narration text"
 */
export const DialogueNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as DialogueNodeType
  const isNarration = !data.speaker

  return (
    <BaseNode {...props}>
      {!isNarration && (
        <div className="node-field">
          <div className="node-field-label">Speaker</div>
          <div className="speaker-name">{data.speaker}</div>
        </div>
      )}
      <div className="node-field">
        <div className="node-field-label">{isNarration ? 'Narration' : 'Text'}</div>
        <div className="dialogue-text">"{data.text}"</div>
      </div>
      {data.attributes && data.attributes.length > 0 && (
        <div className="node-field">
          <div className="node-field-label">Attributes</div>
          <div className="image-attributes">{data.attributes.join(' ')}</div>
        </div>
      )}
    </BaseNode>
  )
})

DialogueNode.displayName = 'DialogueNode'
