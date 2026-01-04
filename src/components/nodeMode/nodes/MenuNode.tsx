import React, { memo } from 'react'
import { NodeProps, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { MenuNode as MenuNodeType } from '../../../types/ast'

/**
 * MenuNode - Choice menu with multiple options and conditional visibility
 * Represents: menu: with choices
 * 
 * Implements Requirements 12.3: Support conditions on menu choices (if clause)
 * Each choice can have an optional condition that determines when it's shown
 */
export const MenuNode: React.FC<NodeProps> = memo((props) => {
  const data = props.data as unknown as MenuNodeType

  // Create source handles for each choice - positioned horizontally across the bottom
  const sourceHandles = data.choices.map((choice, index) => {
    const totalChoices = data.choices.length
    const handleSpacing = 100 / (totalChoices + 1)
    const leftOffset = handleSpacing * (index + 1)
    
    return {
      id: `choice-${index}`,
      position: Position.Bottom,
      label: choice.text,
      style: { left: `${leftOffset}%` },
    }
  })

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
        <ul className="menu-choices menu-choices-enhanced">
          {data.choices.map((choice, index) => (
            <li key={index} className="menu-choice menu-choice-enhanced">
              <span className="menu-choice-number">{index + 1}</span>
              <div className="menu-choice-content">
                <div className="menu-choice-text">"{choice.text}"</div>
                {choice.condition && (
                  <div className="menu-choice-condition-badge">
                    <span className="condition-keyword">if</span>
                    <span className="condition-expr">{choice.condition}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </BaseNode>
  )
})

MenuNode.displayName = 'MenuNode'
