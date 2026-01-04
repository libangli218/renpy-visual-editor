import React, { memo } from 'react'
import { NodeProps, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { IfNode as IfNodeType } from '../../../types/ast'

/**
 * IfNode - Conditional branching
 * Represents: if/elif/else blocks
 */
export const IfNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as IfNodeType

  // Create source handles for each branch
  const sourceHandles = data.branches.map((branch, index) => ({
    id: `branch-${index}`,
    position: Position.Bottom,
    label: branch.condition || 'else',
  }))

  return (
    <BaseNode 
      {...props} 
      sourceHandles={sourceHandles.length > 0 ? sourceHandles : undefined}
    >
      <div className="node-field">
        <div className="node-field-label">Branches ({data.branches.length})</div>
        <ul className="branch-list">
          {data.branches.map((branch, index) => (
            <li key={index} className="branch-item">
              {branch.condition ? (
                <span className="branch-condition">
                  {index === 0 ? 'if' : 'elif'} {branch.condition}
                </span>
              ) : (
                <span className="branch-else">else</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </BaseNode>
  )
})

IfNode.displayName = 'IfNode'
