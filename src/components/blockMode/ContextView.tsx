/**
 * ContextView Component
 * 上下文对话视图组件
 * 
 * Displays adjacent dialogues when editing a dialogue block,
 * providing context for maintaining dialogue continuity.
 * 
 * Features:
 * - Shows previous and next dialogues around the current one
 * - Fades non-current dialogues for visual distinction
 * - Uses different colors to distinguish speakers
 * - Allows quick navigation to adjacent dialogues
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import React, { useMemo, useCallback } from 'react'
import { Block } from './types'
import './ContextView.css'

/**
 * Dialogue context item representing a dialogue in the context view
 */
export interface DialogueContextItem {
  /** Block ID */
  blockId: string
  /** Speaker name (undefined for narrator) */
  speaker?: string
  /** Dialogue text */
  text: string
  /** Whether this is the currently edited dialogue */
  isCurrent: boolean
  /** Position relative to current: -n for before, 0 for current, +n for after */
  position: number
}

/**
 * Props for ContextView component
 */
export interface ContextViewProps {
  /** The block tree to search for dialogues */
  blockTree: Block | null
  /** Currently selected/edited block ID */
  currentBlockId: string | null
  /** Number of dialogues to show before current */
  contextBefore?: number
  /** Number of dialogues to show after current */
  contextAfter?: number
  /** Callback when a dialogue is clicked for navigation */
  onDialogueClick?: (blockId: string) => void
  /** Custom class name */
  className?: string
  /** Whether the view is visible */
  visible?: boolean
}

/**
 * Get a color for a speaker based on their name
 * Uses a simple hash to generate consistent colors
 */
function getSpeakerColor(speaker: string | undefined): string {
  if (!speaker) {
    return '#9e9e9e' // Gray for narrator
  }
  
  // Simple hash function for consistent colors
  let hash = 0
  for (let i = 0; i < speaker.length; i++) {
    hash = speaker.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Predefined color palette for speakers
  const colors = [
    '#4fc3f7', // Light blue
    '#81c784', // Light green
    '#ffb74d', // Orange
    '#f06292', // Pink
    '#ba68c8', // Purple
    '#4dd0e1', // Cyan
    '#aed581', // Lime
    '#ff8a65', // Deep orange
    '#9575cd', // Deep purple
    '#64b5f6', // Blue
  ]
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Flatten blocks and extract all dialogue blocks in order
 */
function extractDialogueBlocks(block: Block | null): Block[] {
  if (!block) return []
  
  const dialogues: Block[] = []
  
  function traverse(b: Block): void {
    if (b.type === 'dialogue') {
      dialogues.push(b)
    }
    
    if (b.children) {
      for (const child of b.children) {
        traverse(child)
      }
    }
  }
  
  traverse(block)
  return dialogues
}

/**
 * Get slot value from a block
 */
function getSlotValue(block: Block, slotName: string): unknown {
  const slot = block.slots.find(s => s.name === slotName)
  return slot?.value
}

/**
 * Build context items around the current dialogue
 */
export function buildDialogueContext(
  blockTree: Block | null,
  currentBlockId: string | null,
  contextBefore: number = 3,
  contextAfter: number = 2
): DialogueContextItem[] {
  if (!blockTree || !currentBlockId) return []
  
  const dialogueBlocks = extractDialogueBlocks(blockTree)
  
  // Find current dialogue index
  const currentIndex = dialogueBlocks.findIndex(b => b.id === currentBlockId)
  
  // If current block is not a dialogue, return empty
  if (currentIndex === -1) return []
  
  const items: DialogueContextItem[] = []
  
  // Calculate range
  const startIndex = Math.max(0, currentIndex - contextBefore)
  const endIndex = Math.min(dialogueBlocks.length - 1, currentIndex + contextAfter)
  
  // Build context items
  for (let i = startIndex; i <= endIndex; i++) {
    const block = dialogueBlocks[i]
    const speaker = getSlotValue(block, 'speaker') as string | undefined
    const text = getSlotValue(block, 'text') as string || ''
    
    items.push({
      blockId: block.id,
      speaker: speaker || undefined,
      text,
      isCurrent: i === currentIndex,
      position: i - currentIndex,
    })
  }
  
  return items
}

/**
 * Get adjacent dialogue blocks (for property testing)
 */
export function getAdjacentDialogues(
  blockTree: Block | null,
  currentBlockId: string | null,
  count: number = 3
): { before: Block[], after: Block[] } {
  if (!blockTree || !currentBlockId) {
    return { before: [], after: [] }
  }
  
  const dialogueBlocks = extractDialogueBlocks(blockTree)
  const currentIndex = dialogueBlocks.findIndex(b => b.id === currentBlockId)
  
  if (currentIndex === -1) {
    return { before: [], after: [] }
  }
  
  const before = dialogueBlocks.slice(Math.max(0, currentIndex - count), currentIndex)
  const after = dialogueBlocks.slice(currentIndex + 1, currentIndex + 1 + count)
  
  return { before, after }
}

/**
 * ContextView - Context dialogue view component
 * 
 * Implements Requirements:
 * - 13.1: Display adjacent dialogues when editing a dialogue block
 * - 13.2: Fade non-current dialogues for visual distinction
 * - 13.3: Allow quick navigation to adjacent dialogues
 * - 13.4: Use different colors to distinguish speakers
 */
export const ContextView: React.FC<ContextViewProps> = ({
  blockTree,
  currentBlockId,
  contextBefore = 3,
  contextAfter = 2,
  onDialogueClick,
  className = '',
  visible = true,
}) => {
  // Build dialogue context
  const contextItems = useMemo(() => {
    return buildDialogueContext(blockTree, currentBlockId, contextBefore, contextAfter)
  }, [blockTree, currentBlockId, contextBefore, contextAfter])
  
  // Handle dialogue click for navigation (Requirement 13.3)
  const handleDialogueClick = useCallback((blockId: string, isCurrent: boolean) => {
    if (!isCurrent && onDialogueClick) {
      onDialogueClick(blockId)
    }
  }, [onDialogueClick])
  
  // Don't render if not visible or no context
  if (!visible || contextItems.length === 0) {
    return null
  }
  
  return (
    <div className={`context-view ${className}`}>
      <div className="context-view-header">
        <span className="context-view-icon">💬</span>
        <span className="context-view-title">对话上下文</span>
      </div>
      
      <div className="context-view-content">
        {contextItems.map((item) => {
          const speakerColor = getSpeakerColor(item.speaker)
          const isClickable = !item.isCurrent && !!onDialogueClick
          
          return (
            <div
              key={item.blockId}
              className={`context-dialogue-item ${item.isCurrent ? 'current' : 'faded'} ${isClickable ? 'clickable' : ''}`}
              onClick={() => handleDialogueClick(item.blockId, item.isCurrent)}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  handleDialogueClick(item.blockId, item.isCurrent)
                }
              }}
            >
              {/* Position indicator */}
              <div className="dialogue-position-indicator">
                {item.position < 0 && <span className="position-arrow">↑</span>}
                {item.position > 0 && <span className="position-arrow">↓</span>}
                {item.position === 0 && <span className="position-current">●</span>}
              </div>
              
              {/* Speaker name with color (Requirement 13.4) */}
              <div className="dialogue-speaker-section">
                <span 
                  className="dialogue-speaker-name"
                  style={{ color: speakerColor }}
                >
                  {item.speaker || '旁白'}
                </span>
                <span 
                  className="dialogue-speaker-indicator"
                  style={{ backgroundColor: speakerColor }}
                />
              </div>
              
              {/* Dialogue text */}
              <div className="dialogue-text-section">
                <span className="dialogue-text-content">
                  {item.text || '(空)'}
                </span>
              </div>
              
              {/* Current indicator */}
              {item.isCurrent && (
                <div className="dialogue-current-badge">
                  当前编辑
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Navigation hint */}
      {onDialogueClick && contextItems.some(item => !item.isCurrent) && (
        <div className="context-view-hint">
          点击其他对话可快速跳转编辑
        </div>
      )}
    </div>
  )
}

export default ContextView
