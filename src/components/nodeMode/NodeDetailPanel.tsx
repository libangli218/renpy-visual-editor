import React, { useState, useCallback } from 'react'
import { Node } from '@xyflow/react'
import { FlowNodeData } from './FlowGraphBuilder'
import { useEditorStore } from '../../store/editorStore'
import { ASTSynchronizer } from './ASTSynchronizer'
import './NodeDetailPanel.css'

/**
 * NodeDetailPanel - Shows detailed content of selected node
 * 
 * Implements Requirement 2.6: Show full content in detail panel when node is selected
 * 
 * Features:
 * - Display full node content
 * - Support editing dialogue text
 * - Show all dialogues in dialogue blocks
 * - Show all choices in menu nodes
 * - Show all branches in condition nodes
 */

interface NodeDetailPanelProps {
  node: Node
  onClose: () => void
  onNodeDataChange?: (nodeId: string, newData: FlowNodeData) => void
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onClose, onNodeDataChange }) => {
  const data = node.data as unknown as FlowNodeData
  const { ast, setAst } = useEditorStore()
  
  /**
   * Handle dialogue text change
   */
  const handleDialogueChange = useCallback((index: number, newText: string) => {
    if (!data.dialogues) return
    
    // Update the dialogue in the node data
    const newDialogues = [...data.dialogues]
    newDialogues[index] = { ...newDialogues[index], text: newText }
    
    const newData: FlowNodeData = {
      ...data,
      dialogues: newDialogues,
    }
    
    // Notify parent of data change
    if (onNodeDataChange) {
      onNodeDataChange(node.id, newData)
    }
    
    // Sync to AST
    if (ast && data.dialogues[index].id) {
      const synchronizer = new ASTSynchronizer()
      const updated = synchronizer.updateDialogueText(data.dialogues[index].id, newText, ast)
      if (updated) {
        // Trigger AST update to mark as modified
        setAst({ ...ast })
      }
    } else if (ast) {
      // Even if we can't find the specific dialogue, mark as modified
      setAst({ ...ast })
    }
  }, [data, node.id, onNodeDataChange, ast, setAst])
  
  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <h3 className="detail-panel-title">
          {getNodeTypeIcon(node.type || '')} {getNodeTypeLabel(node.type || '')}
        </h3>
        <button className="detail-panel-close" onClick={onClose}>
          ✕
        </button>
      </div>
      
      <div className="detail-panel-content">
        {renderNodeContent(node.type || '', data, handleDialogueChange)}
      </div>
    </div>
  )
}

/**
 * Get icon for node type
 */
function getNodeTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'scene': '🏷️',
    'dialogue-block': '💬',
    'menu': '🔀',
    'condition': '❓',
    'jump': '➡️',
    'call': '📞',
    'return': '↩️',
  }
  return icons[type] || '📄'
}

/**
 * Get label for node type
 */
function getNodeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'scene': 'Scene',
    'dialogue-block': 'Dialogue Block',
    'menu': 'Menu',
    'condition': 'Condition',
    'jump': 'Jump',
    'call': 'Call',
    'return': 'Return',
  }
  return labels[type] || type
}

/**
 * Render content based on node type
 */
function renderNodeContent(
  type: string, 
  data: FlowNodeData, 
  onDialogueChange?: (index: number, newText: string) => void
): React.ReactNode {
  switch (type) {
    case 'scene':
      return <SceneContent data={data} />
    case 'dialogue-block':
      return <DialogueBlockContent data={data} onDialogueChange={onDialogueChange} />
    case 'menu':
      return <MenuContent data={data} />
    case 'condition':
      return <ConditionContent data={data} />
    case 'jump':
      return <JumpContent data={data} />
    case 'call':
      return <CallContent data={data} />
    case 'return':
      return <ReturnContent />
    default:
      return <div className="detail-empty">No details available</div>
  }
}

/**
 * Scene node content
 */
const SceneContent: React.FC<{ data: FlowNodeData }> = ({ data }) => {
  return (
    <div className="detail-scene">
      <div className="detail-field">
        <label>Label Name</label>
        <div className="detail-value detail-label-name">{data.label || 'Unknown'}</div>
      </div>
      
      {data.preview && (
        <div className="detail-field">
          <label>Preview</label>
          <div className="detail-preview">
            {data.preview.split('\n').map((line, i) => (
              <div key={i} className="detail-preview-line">{line}</div>
            ))}
          </div>
        </div>
      )}
      
      {data.exitType && (
        <div className="detail-field">
          <label>Exit Type</label>
          <div className={`detail-exit-badge detail-exit-${data.exitType}`}>
            {data.exitType}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Dialogue block content with editing support
 */
const DialogueBlockContent: React.FC<{ 
  data: FlowNodeData
  onDialogueChange?: (index: number, newText: string) => void 
}> = ({ data, onDialogueChange }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  
  const handleStartEdit = useCallback((index: number, text: string) => {
    setEditingIndex(index)
    setEditText(text)
  }, [])
  
  const handleSaveEdit = useCallback(() => {
    if (editingIndex !== null && onDialogueChange) {
      onDialogueChange(editingIndex, editText)
    }
    setEditingIndex(null)
    setEditText('')
  }, [editingIndex, editText, onDialogueChange])
  
  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null)
    setEditText('')
  }, [])
  
  return (
    <div className="detail-dialogue-block">
      {/* Visual commands */}
      {data.visualCommands && data.visualCommands.length > 0 && (
        <div className="detail-field">
          <label>Visual Commands</label>
          <div className="detail-visual-commands">
            {data.visualCommands.map((cmd, i) => (
              <div key={i} className="detail-visual-command">
                <span className="detail-visual-icon">{getVisualIcon(cmd.type)}</span>
                <span className="detail-visual-type">{cmd.type}</span>
                <span className="detail-visual-target">{cmd.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Dialogues */}
      {data.dialogues && data.dialogues.length > 0 && (
        <div className="detail-field">
          <label>Dialogues ({data.dialogues.length})</label>
          <div className="detail-dialogues">
            {data.dialogues.map((dialogue, i) => (
              <div key={i} className="detail-dialogue-item">
                <div className="detail-dialogue-header">
                  <span className="detail-speaker">
                    {dialogue.speaker || '(Narrator)'}
                  </span>
                  <button 
                    className="detail-edit-btn"
                    onClick={() => handleStartEdit(i, dialogue.text)}
                  >
                    ✏️
                  </button>
                </div>
                {editingIndex === i ? (
                  <div className="detail-dialogue-edit">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="detail-dialogue-textarea"
                      rows={3}
                    />
                    <div className="detail-edit-actions">
                      <button onClick={handleSaveEdit} className="detail-save-btn">Save</button>
                      <button onClick={handleCancelEdit} className="detail-cancel-btn">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="detail-dialogue-text">"{dialogue.text}"</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get icon for visual command type
 */
function getVisualIcon(type: string): string {
  const icons: Record<string, string> = {
    'scene': '📷',
    'show': '👤',
    'hide': '👻',
    'with': '✨',
  }
  return icons[type] || '🎬'
}

/**
 * Menu node content
 */
const MenuContent: React.FC<{ data: FlowNodeData }> = ({ data }) => {
  return (
    <div className="detail-menu">
      {data.prompt && (
        <div className="detail-field">
          <label>Prompt</label>
          <div className="detail-prompt">"{data.prompt}"</div>
        </div>
      )}
      
      {data.choices && data.choices.length > 0 && (
        <div className="detail-field">
          <label>Choices ({data.choices.length})</label>
          <div className="detail-choices">
            {data.choices.map((choice, i) => (
              <div key={i} className="detail-choice-item">
                <div className="detail-choice-number">{i + 1}</div>
                <div className="detail-choice-content">
                  <div className="detail-choice-text">"{choice.text}"</div>
                  {choice.condition && (
                    <div className="detail-choice-condition">
                      <span className="detail-condition-keyword">if</span>
                      <span className="detail-condition-expr">{choice.condition}</span>
                    </div>
                  )}
                  {choice.targetLabel && (
                    <div className="detail-choice-target">
                      → {choice.targetLabel}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Condition node content
 */
const ConditionContent: React.FC<{ data: FlowNodeData }> = ({ data }) => {
  return (
    <div className="detail-condition">
      {data.branches && data.branches.length > 0 && (
        <div className="detail-field">
          <label>Branches ({data.branches.length})</label>
          <div className="detail-branches">
            {data.branches.map((branch, i) => (
              <div key={i} className="detail-branch-item">
                <div className="detail-branch-header">
                  <span className={`detail-branch-keyword ${getBranchKeyword(i, data.branches!.length)}`}>
                    {getBranchKeyword(i, data.branches!.length)}
                  </span>
                </div>
                {branch.condition ? (
                  <div className="detail-branch-condition">{branch.condition}</div>
                ) : (
                  <div className="detail-branch-else">(default)</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get branch keyword based on index
 */
function getBranchKeyword(index: number, total: number): string {
  if (index === 0) return 'if'
  if (index === total - 1 && total > 1) return 'else'
  return 'elif'
}

/**
 * Jump node content
 */
const JumpContent: React.FC<{ data: FlowNodeData }> = ({ data }) => {
  return (
    <div className="detail-jump">
      <div className="detail-field">
        <label>Target Label</label>
        <div className="detail-target">
          <span className="detail-target-arrow">→</span>
          <span className="detail-target-label">{data.target || 'Unknown'}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Call node content
 */
const CallContent: React.FC<{ data: FlowNodeData }> = ({ data }) => {
  return (
    <div className="detail-call">
      <div className="detail-field">
        <label>Target Label</label>
        <div className="detail-target">
          <span className="detail-target-icon">📞</span>
          <span className="detail-target-label">{data.target || 'Unknown'}</span>
        </div>
      </div>
      <div className="detail-note">
        Returns to this point after the called label completes.
      </div>
    </div>
  )
}

/**
 * Return node content
 */
const ReturnContent: React.FC = () => {
  return (
    <div className="detail-return">
      <div className="detail-note">
        Returns to the calling label or ends the game if at the top level.
      </div>
    </div>
  )
}
