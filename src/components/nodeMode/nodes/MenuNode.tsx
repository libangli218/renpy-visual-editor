import React, { memo } from 'react'
import { NodeProps, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { MenuNode as MenuNodeType } from '../../../types/ast'

/**
 * MenuNode - Choice menu with multiple options
 * Represents: menu: with choices
 */
export const MenuNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as MenuNodeType

  // Create source handles for each choice
  const sourceHandles = data.choices.map((choice, index) => ({
    id: `choice-${index}`,
    position: Position.Bottom,
    label: choice.text,
  }))

  return (
    <BaseNode 
      {...props} 
      sourceHandles={sourceHandles.length > 0 ? sourceHandles : undefined}
    >
      {data.prompt && (
        <div className="node-field">
          <div className="node-field-label">Prompt</div>
          <div className="dialogue-text">"{data.prompt}"</div>
        </div>
      )}
      <div className="node-field">
        <div className="node-field-label">Choices ({data.choices.length})</div>
        <ul className="menu-choices">
          {data.choices.map((choice, index) => (
            <li key={index} className="menu-choice">
              <div className="menu-choice-text">"{choice.text}"</div>
              {choice.condition && (
                <div className="menu-choice-condition">if {choice.condition}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </BaseNode>
  )
})

MenuNode.displayName = 'MenuNode'
