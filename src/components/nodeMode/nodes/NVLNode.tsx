import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { NVLNode as NVLNodeType } from '../../../types/ast'

/**
 * NVLNode - NVL mode control
 * Represents: nvl show, nvl hide, nvl clear
 */
export const NVLNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as NVLNodeType

  const actionLabels: Record<string, string> = {
    show: 'Show NVL Mode',
    hide: 'Hide NVL Mode',
    clear: 'Clear NVL Text',
  }

  return (
    <BaseNode {...props}>
      <div className="node-field">
        <div className="node-field-label">Action</div>
        <div className="node-field-value">{actionLabels[data.action]}</div>
      </div>
    </BaseNode>
  )
})

NVLNode.displayName = 'NVLNode'
