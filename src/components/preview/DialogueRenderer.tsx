/**
 * DialogueRenderer - Renders dialogue in ADV and NVL modes
 * Implements Requirements 4.3: ADV mode dialogue box and NVL mode full-screen text
 */

import React from 'react'
import { PreviewDialogue, NVLHistoryEntry } from '../../preview/types'
import './PreviewComponents.css'

interface DialogueRendererProps {
  dialogue: PreviewDialogue | null
  nvlMode: boolean
  nvlHistory: NVLHistoryEntry[]
}

/**
 * DialogueRenderer component - Displays dialogue based on mode
 */
export const DialogueRenderer: React.FC<DialogueRendererProps> = ({
  dialogue,
  nvlMode,
  nvlHistory,
}) => {
  if (nvlMode) {
    return (
      <NVLDialogue 
        history={nvlHistory} 
        currentDialogue={dialogue} 
      />
    )
  }
  
  return <ADVDialogue dialogue={dialogue} />
}

interface ADVDialogueProps {
  dialogue: PreviewDialogue | null
}

/**
 * ADVDialogue - Traditional visual novel dialogue box at bottom
 */
const ADVDialogue: React.FC<ADVDialogueProps> = ({ dialogue }) => {
  if (!dialogue) {
    return (
      <div className="dialogue-renderer">
        <div className="dialogue-box-adv dialogue-empty">
          Select a dialogue node to preview
        </div>
      </div>
    )
  }
  
  const { speaker, speakerColor, text } = dialogue
  
  return (
    <div className="dialogue-renderer">
      <div className="dialogue-box-adv">
        <div className="dialogue-speaker">
          {speaker ? (
            <span 
              className="speaker-name"
              style={speakerColor ? { color: speakerColor } : undefined}
            >
              {speaker}
            </span>
          ) : (
            <span className="speaker-name narration">Narration</span>
          )}
        </div>
        <div className="dialogue-text">
          {formatDialogueText(text)}
        </div>
      </div>
    </div>
  )
}

interface NVLDialogueProps {
  history: NVLHistoryEntry[]
  currentDialogue: PreviewDialogue | null
}

/**
 * NVLDialogue - Full-screen text mode
 */
const NVLDialogue: React.FC<NVLDialogueProps> = ({ history, currentDialogue }) => {
  // Combine history with current dialogue
  const allEntries = [...history]
  
  // If current dialogue is not in history, add it
  if (currentDialogue && !history.some(h => 
    h.speaker === currentDialogue.speaker && h.text === currentDialogue.text
  )) {
    allEntries.push({
      speaker: currentDialogue.speaker,
      speakerColor: currentDialogue.speakerColor,
      text: currentDialogue.text,
    })
  }
  
  if (allEntries.length === 0) {
    return (
      <div className="dialogue-renderer">
        <div className="dialogue-box-nvl dialogue-empty">
          NVL Mode - No dialogue yet
        </div>
      </div>
    )
  }
  
  return (
    <div className="dialogue-renderer">
      <div className="dialogue-box-nvl">
        {allEntries.map((entry, index) => {
          const isLast = index === allEntries.length - 1
          return (
            <div 
              key={index} 
              className={`nvl-entry ${isLast ? 'nvl-current' : ''}`}
            >
              {entry.speaker ? (
                <span 
                  className="nvl-speaker"
                  style={entry.speakerColor ? { color: entry.speakerColor } : undefined}
                >
                  {entry.speaker}
                </span>
              ) : (
                <span className="nvl-speaker narration">*</span>
              )}
              <div className="nvl-text">
                {formatDialogueText(entry.text)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Format dialogue text - handle Ren'Py text tags
 */
function formatDialogueText(text: string): React.ReactNode {
  // Simple text tag handling for preview
  // In a full implementation, this would parse Ren'Py text tags
  
  // Remove common Ren'Py tags for preview display
  let formatted = text
    .replace(/\{[^}]+\}/g, '') // Remove {tags}
    .replace(/\[\[/g, '[')     // Escape brackets
    .replace(/\]\]/g, ']')
  
  // Handle newlines
  const lines = formatted.split('\\n')
  
  if (lines.length === 1) {
    return formatted
  }
  
  return lines.map((line, index) => (
    <React.Fragment key={index}>
      {line}
      {index < lines.length - 1 && <br />}
    </React.Fragment>
  ))
}

export default DialogueRenderer
