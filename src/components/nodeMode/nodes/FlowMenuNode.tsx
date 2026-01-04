import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { FlowNodeData, MenuChoice } from '../FlowGraphBuilder'
import './FlowNodes.css'

/**
 * FlowMenuNode - Menu choice node for the flow graph
 * 
 * Displays menu prompt and choices with individual output ports for each choice.
 * Uses amber color scheme as per design requirements.
 * 
 * Implements Requirements:
 * - 4.2: Display each menu choice as a separate output Port
 * - 4.3: Label each output Port with the choice text
 * - 9.1: Use amber color scheme
 */
export const FlowMenuNode: React.FC<NodeProps> = memo((props) => {
  const { selected } = props
  const data = props.data as unknown as FlowNodeData

  const choices = data.choices || []
  const prompt = data.prompt

  return (
    <div className={`flow-node flow-menu-node ${selected ? 'selected' : ''}`}>
      {/* Input port */}
      <Handle
        type="target"
        position={Position.Top}
        className="flow-handle flow-handle-target"
      />

      {/* Node header */}
      <div className="flow-node-header flow-menu-header">
        <span className="flow-node-icon">🔀</span>
        <span className="flow-node-label">Menu</span>
      </div>

      {/* Content */}
      <div className="flow-node-content">
        {/* Menu prompt */}
        {prompt && (
          <div className="flow-menu-prompt">
            "{prompt}"
          </div>
        )}

        {/* Menu choices */}
        <div className="flow-menu-choices">
          {choices.map((choice, index) => (
            <MenuChoiceItem 
              key={index} 
              choice={choice} 
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Default output port (for fall-through) */}
      {choices.length === 0 && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="flow-handle flow-handle-source"
        />
      )}
    </div>
  )
})

FlowMenuNode.displayName = 'FlowMenuNode'

/**
 * Menu choice item with its own output handle
 */
const MenuChoiceItem: React.FC<{ choice: MenuChoice; index: number }> = memo(({ choice, index }) => {
  return (
    <div className="flow-menu-choice">
      <span className="flow-choice-marker">{index + 1}</span>
      <div className="flow-choice-content">
        <div className="flow-choice-text">"{choice.text}"</div>
        {choice.condition && (
          <div className="flow-choice-condition">
            <span className="flow-condition-keyword">if</span>
            <span className="flow-condition-expr">{choice.condition}</span>
          </div>
        )}
      </div>
      {/* Output handle for this choice */}
      <Handle
        type="source"
        position={Position.Right}
        id={choice.portId}
        className="flow-handle flow-handle-source flow-choice-handle"
      />
    </div>
  )
})

MenuChoiceItem.displayName = 'MenuChoiceItem'
