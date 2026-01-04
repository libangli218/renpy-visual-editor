import React, { memo } from 'react'
import { NodeProps, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { IfNode as IfNodeType } from '../../../types/ast'

/**
 * IfNode - Conditional branching with multiple output ports
 * Represents: if/elif/else blocks
 * 
 * Implements Requirements 12.1: Support If/Elif/Else conditional nodes with multiple branches
 * Each branch has its own output port for connecting to different flow paths
 */
export const IfNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as IfNodeType

  // Create source handles for each branch - positioned horizontally across the bottom
  // Each branch gets its own output port for connecting to different flow paths
  const sourceHandles = data.branches.map((branch, index) => {
    // Calculate horizontal position for each handle
    // Distribute handles evenly across the bottom of the node
    const totalBranches = data.branches.length
    const handleSpacing = 100 / (totalBranches + 1)
    const leftOffset = handleSpacing * (index + 1)
    
    return {
      id: `branch-${index}`,
      position: Position.Bottom,
      label: branch.condition 
        ? (index === 0 ? `if: ${branch.condition}` : `elif: ${branch.condition}`)
        : 'else',
      style: { left: `${leftOffset}%` },
    }
  })

  // Get branch type label
  const getBranchLabel = (index: number, condition: string | null): string => {
    if (index === 0) return 'if'
    if (condition === null) return 'else'
    return 'elif'
  }

  return (
    <BaseNode 
      {...props} 
      sourceHandles={sourceHandles.length > 0 ? sourceHandles : undefined}
    >
      <div className="node-field">
        <div className="node-field-label">
          Conditional Branches ({data.branches.length})
        </div>
        <ul className="branch-list if-branch-list">
          {data.branches.map((branch, index) => (
            <li key={index} className="branch-item if-branch-item">
              <span className="branch-index">{index + 1}</span>
              <div className="branch-content">
                <span className={`branch-keyword ${getBranchLabel(index, branch.condition)}`}>
                  {getBranchLabel(index, branch.condition)}
                </span>
                {branch.condition ? (
                  <span className="branch-condition-text">
                    {branch.condition}
                  </span>
                ) : (
                  <span className="branch-else-text">(default)</span>
                )}
              </div>
              <span className="branch-body-count">
                {branch.body.length} stmt{branch.body.length !== 1 ? 's' : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </BaseNode>
  )
})

IfNode.displayName = 'IfNode'
