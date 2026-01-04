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
  
  // Check if there's an explicit else branch (not auto-generated fallthrough)
  const hasExplicitElseBranch = branches.some(b => b.condition === null && b.portId !== 'branch-fallthrough')
  
  // Check if there's a fallthrough branch (auto-generated)
  const hasFallthroughBranch = branches.some(b => b.portId === 'branch-fallthrough')

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
        <span className="flow-node-icon">🔀</span>
        <span className="flow-node-label">条件分支</span>
        <span className="flow-branch-count">{branches.length} 分支</span>
      </div>

      {/* Content */}
      <div className="flow-node-content flow-condition-content">
        <div className="flow-branches-list">
          {branches.map((branch, index) => (
            <BranchItem 
              key={index} 
              branch={branch} 
              isFirst={index === 0}
            />
          ))}
        </div>
        
        {/* Warning if no else branch and no fallthrough */}
        {!hasExplicitElseBranch && !hasFallthroughBranch && branches.length > 0 && (
          <div className="flow-condition-warning">
            ⚠️ 无 else 分支
          </div>
        )}
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
  isFirst: boolean
}

const BranchItem: React.FC<BranchItemProps> = memo(({ branch, isFirst }) => {
  // Determine branch type
  const branchType = getBranchType(branch.condition, isFirst, branch.portId)
  
  // Get icon for branch type
  const branchIcon = getBranchIcon(branchType)
  
  // Get color class for branch type
  const colorClass = `flow-branch-${branchType === 'fallthrough' ? 'else' : branchType}`
  
  return (
    <div className={`flow-branch-item ${colorClass}`}>
      {/* Branch type indicator */}
      <div className={`flow-branch-type-badge ${branchType === 'fallthrough' ? 'else' : branchType}`}>
        <span className="flow-branch-icon">{branchIcon}</span>
        <span className="flow-branch-keyword">
          {branchType === 'fallthrough' ? '否则' : branchType.toUpperCase()}
        </span>
      </div>
      
      {/* Branch content */}
      <div className="flow-branch-content">
        {branch.condition ? (
          <code className="flow-branch-condition">
            {branch.condition}
          </code>
        ) : (
          <span className="flow-branch-else-text">
            {branchType === 'fallthrough' ? '继续执行' : '其他情况'}
          </span>
        )}
      </div>
      
      {/* Output handle for this branch */}
      <Handle
        type="source"
        position={Position.Right}
        id={branch.portId}
        className={`flow-handle flow-handle-source flow-branch-handle ${colorClass}-handle`}
      />
    </div>
  )
})

BranchItem.displayName = 'BranchItem'

/**
 * Get branch type label
 */
function getBranchType(condition: string | null, isFirst: boolean, portId?: string): 'if' | 'elif' | 'else' | 'fallthrough' {
  // Check if this is an auto-generated fall-through branch
  if (portId === 'branch-fallthrough') {
    return 'fallthrough'
  }
  if (condition === null) {
    return 'else'
  }
  return isFirst ? 'if' : 'elif'
}

/**
 * Get icon for branch type
 */
function getBranchIcon(branchType: 'if' | 'elif' | 'else' | 'fallthrough'): string {
  switch (branchType) {
    case 'if':
      return '✓'
    case 'elif':
      return '◇'
    case 'else':
      return '○'
    case 'fallthrough':
      return '↓'
  }
}
