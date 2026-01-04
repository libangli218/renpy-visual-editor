import React, { memo, useState, useCallback } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { FlowNodeData, DialogueItem, VisualCommand } from '../FlowGraphBuilder'
import './FlowNodes.css'

/**
 * FlowDialogueBlockNode - Merged dialogue block node for the flow graph
 * 
 * Displays multiple consecutive dialogues as a single node with speaker summary.
 * Supports expand/collapse to show all dialogues.
 * Uses green color scheme as per design requirements.
 * 
 * Implements Requirements:
 * - 3.2: Display speaker names and preview of dialogue text
 * - 3.3: Show count of merged dialogues
 * - 3.6: Support expand to show all dialogues (double-click)
 * - 9.2: Display icons for visual commands
 */
export const FlowDialogueBlockNode: React.FC<NodeProps> = memo((props) => {
  const { selected } = props
  const data = props.data as unknown as FlowNodeData
  const [expanded, setExpanded] = useState(data.expanded || false)

  const dialogues = data.dialogues || []
  const visualCommands = data.visualCommands || []

  // Group dialogues by speaker
  const speakerCounts = getSpeakerCounts(dialogues)

  // Toggle expanded state
  const handleToggleExpand = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  return (
    <div className={`flow-node flow-dialogue-block-node ${selected ? 'selected' : ''}`}>
      {/* Input port */}
      <Handle
        type="target"
        position={Position.Top}
        className="flow-handle flow-handle-target"
      />

      {/* Node header */}
      <div className="flow-node-header flow-dialogue-header">
        <span className="flow-node-icon">💬</span>
        <span className="flow-node-label">Dialogue Block</span>
      </div>

      {/* Content */}
      <div className="flow-node-content">
        {/* Visual commands */}
        {visualCommands.length > 0 && (
          <div className="flow-visual-commands">
            {visualCommands.map((cmd, index) => (
              <VisualCommandItem key={index} command={cmd} />
            ))}
          </div>
        )}

        {/* Speakers summary or expanded dialogues */}
        {expanded ? (
          <div className="flow-dialogues-expanded">
            {dialogues.map((dialogue, index) => (
              <div key={index} className="flow-dialogue-item">
                <div className="flow-dialogue-speaker">
                  {dialogue.speaker || '旁白'}
                </div>
                <div className="flow-dialogue-text">
                  "{dialogue.text}"
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flow-speakers-list">
            {speakerCounts.map(({ speaker, count }, index) => (
              <div key={index} className="flow-speaker-item">
                <span className="flow-speaker-icon">👤</span>
                <span className="flow-speaker-name">{speaker}</span>
                <span className="flow-speaker-count">
                  {count} line{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Dialogue count and expand toggle */}
        {dialogues.length > 0 && (
          <>
            <div className="flow-dialogue-count">
              {dialogues.length} dialogue{dialogues.length !== 1 ? 's' : ''} total
            </div>
            <div 
              className="flow-expand-toggle"
              onClick={handleToggleExpand}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {expanded ? '▲ Collapse' : '▼ Expand'}
            </div>
          </>
        )}
      </div>

      {/* Output port */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="flow-handle flow-handle-source"
      />
    </div>
  )
})

FlowDialogueBlockNode.displayName = 'FlowDialogueBlockNode'

/**
 * Visual command item component
 */
const VisualCommandItem: React.FC<{ command: VisualCommand }> = memo(({ command }) => {
  const icon = getVisualCommandIcon(command.type)
  
  return (
    <div className="flow-visual-command">
      <span className="flow-visual-icon">{icon}</span>
      <span className="flow-visual-type">{command.type}</span>
      <span className="flow-visual-target">{command.target}</span>
    </div>
  )
})

VisualCommandItem.displayName = 'VisualCommandItem'

/**
 * Get icon for visual command type
 */
function getVisualCommandIcon(type: string): string {
  switch (type) {
    case 'scene':
      return '📷'
    case 'show':
      return '👤'
    case 'hide':
      return '👻'
    case 'with':
      return '✨'
    default:
      return '📌'
  }
}

/**
 * Group dialogues by speaker and count
 */
function getSpeakerCounts(dialogues: DialogueItem[]): { speaker: string; count: number }[] {
  const counts = new Map<string, number>()
  
  for (const dialogue of dialogues) {
    const speaker = dialogue.speaker || '旁白'
    counts.set(speaker, (counts.get(speaker) || 0) + 1)
  }
  
  return Array.from(counts.entries()).map(([speaker, count]) => ({
    speaker,
    count,
  }))
}
