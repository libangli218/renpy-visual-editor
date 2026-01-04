import React, { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { PythonNode as PythonNodeType } from '../../../types/ast'

/**
 * PythonNode - Python code block
 * Represents: python: block or $ single line
 */
export const PythonNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as PythonNodeType

  // Truncate code for display
  const displayCode = data.code.length > 200 
    ? data.code.substring(0, 200) + '...' 
    : data.code

  return (
    <BaseNode {...props}>
      {(data.early || data.hide) && (
        <div className="node-field">
          <div className="node-field-label">Modifiers</div>
          <div className="node-field-value">
            {data.early && 'early '}
            {data.hide && 'hide'}
          </div>
        </div>
      )}
      <div className="node-field">
        <div className="node-field-label">Code</div>
        <pre className="code-block">{displayCode}</pre>
      </div>
    </BaseNode>
  )
})

PythonNode.displayName = 'PythonNode'
