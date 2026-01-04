import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { PythonNode as PythonNodeType } from '../../../types/ast'

/**
 * PythonNode - Python code block
 * Represents: python: block or $ single line
 * Implements Requirements 13.1, 13.3: Python code block with syntax highlighting
 */
export const PythonNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as PythonNodeType

  // Truncate code for display
  const displayCode = data.code.length > 200 
    ? data.code.substring(0, 200) + '...' 
    : data.code

  // Determine the code type for display
  const getCodeType = () => {
    if (data.early) return 'init python early'
    if (data.hide) return 'python hide'
    if (data.code.includes('\n')) return 'python:'
    return '$ (single line)'
  }

  return (
    <BaseNode {...props}>
      <div className="node-field">
        <div className="node-field-label">Type</div>
        <div className="node-field-value python-type-badge">
          {getCodeType()}
        </div>
      </div>
      <div className="node-field">
        <div className="node-field-label">Code</div>
        <pre className="code-block python-code-preview">{displayCode}</pre>
      </div>
      {data.code.split('\n').length > 1 && (
        <div className="node-field">
          <div className="node-field-value python-line-count">
            {data.code.split('\n').length} lines
          </div>
        </div>
      )}
    </BaseNode>
  )
})

PythonNode.displayName = 'PythonNode'
