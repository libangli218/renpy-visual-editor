import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { RawNode as RawNodeType } from '../../../types/ast'

/**
 * RawNode - Unsupported/raw code
 * Represents: any unsupported Ren'Py syntax preserved as-is
 */
export const RawNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as RawNodeType

  // Truncate content for display
  const displayContent = data.content.length > 200 
    ? data.content.substring(0, 200) + '...' 
    : data.content

  return (
    <BaseNode {...props}>
      <div className="node-field">
        <div className="node-field-label">Raw Code</div>
        <pre className="code-block">{displayContent}</pre>
      </div>
    </BaseNode>
  )
})

RawNode.displayName = 'RawNode'
