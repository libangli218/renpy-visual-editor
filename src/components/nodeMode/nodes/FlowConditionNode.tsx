import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { FlowNodeData, ConditionBranch } from '../FlowGraphBuilder'
import './FlowNodes.css'

/**
 * FlowConditionNode - Conditional branching node for the flow graph
 * 
 * Displays if/elif/else branches with individual output ports for each branch.
 * Uses yellow color scheme as per design requirements.
 * 
 * Implements Requirements:
 * - 4.4: Create Branch_Node for each if statement with multiple branches
 * - 4.5: Have output Port for each condition (if, elif, else)
 * - 9.1: Use yellow color scheme
 * - 9.4: Highlight selected node with glow effect
 */
export const FlowConditionNode: React.FC<NodeProps> = memo((props) => {
  const { selected } = props
  const data = props.data as unknown as FlowNodeData
  
  // Get className from props (includes 'disconnected' if applicable)
  const nodeClassName = (props as unknown as { className?: string }).className || ''

  const branches = data.branches || []

  return (
    <div className={`flow-node flow-condition-node ${selected ? 'selected' : ''} ${nodeClassName}`}>
      {/* Input port */}
      <Handle
        type="target"
        position={Position.Top}
        className="flow-handle flow-handle-target"
      />

      {/* Node header */}
      <div className="flow-node-header flow-condition-header">
        <span className="flow-node-icon">❓</span>
        <span className="flow-node-label">Condition</span>
      </div>

      {/* Content */}
      <div className="flow-node-content">
        <div className="flow-branches-list">
          {branches.map((branch, index) => (
            <BranchItem 
              key={index} 
              branch={branch} 
              index={index}
              isFirst={index === 0}
              isLast={index === branches.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Default output port (if no branches) */}
      {branches.length === 0 && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="flow-handle flow-handle-source"
        />
      )}
    </div>
  )
})

FlowConditionNode.displayName = 'FlowConditionNode'

/**
 * Branch item with its own output handle
 */
interface BranchItemProps {
  branch: ConditionBranch
  index: number
  isFirst: boolean
  isLast: boolean
}

const BranchItem: React.FC<BranchItemProps> = memo(({ branch, index, isFirst }) => {
  // Determine branch type
  const branchType = getBranchType(branch.condition, isFirst)
  
  return (
    <div className="flow-branch-item">
      <span className="flow-branch-marker">{index + 1}</span>
      <div className="flow-branch-content">
        <span className={`flow-branch-keyword ${branchType}`}>
          {branchType}
        </span>
        {branch.condition ? (
          <div className="flow-branch-condition">
            {branch.condition}
          </div>
        ) : (
          <div className="flow-branch-else">
            (default branch)
          </div>
        )}
      </div>
      {/* Output handle for this branch */}
      <Handle
        type="source"
        position={Position.Right}
        id={branch.portId}
        className="flow-handle flow-handle-source flow-branch-handle"
      />
    </div>
  )
})

BranchItem.displayName = 'BranchItem'

/**
 * Get branch type label
 */
function getBranchType(condition: string | null, isFirst: boolean): 'if' | 'elif' | 'else' {
  if (condition === null) {
    return 'else'
  }
  return isFirst ? 'if' : 'elif'
}
