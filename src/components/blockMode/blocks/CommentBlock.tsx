/**
 * CommentBlock Component
 * 注释积木组件
 * 
 * Allows users to add explanatory text that does not generate code.
 * Comments are purely for documentation and organization purposes.
 * 
 * Requirements: 15.4
 */

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { Block } from '../types'
import { BaseBlock } from './BaseBlock'
import './CommentBlock.css'

/**
 * Props for CommentBlock component
 */
export interface CommentBlockProps {
  /** The block data */
  block: Block
  /** Whether the block is selected */
  selected?: boolean
  /** Callback when block is clicked */
  onClick?: (blockId: string) => void
  /** Callback when comment text changes */
  onTextChange?: (blockId: string, text: string) => void
  /** Callback when drag starts */
  onDragStart?: (blockId: string, event: React.DragEvent) => void
  /** Callback when drag ends */
  onDragEnd?: (event: React.DragEvent) => void
  /** Whether the block is read-only */
  readOnly?: boolean
  /** Depth level for nested blocks */
  depth?: number
}

/**
 * Get the comment text from block slots
 */
function getCommentText(block: Block): string {
  const textSlot = block.slots.find(s => s.name === 'text')
  return (textSlot?.value as string) ?? ''
}

/**
 * CommentBlock - Block for adding non-code comments
 * 
 * Implements Requirements:
 * - 15.4: Allow users to add explanatory text that does not generate code
 */
export const CommentBlock: React.FC<CommentBlockProps> = ({
  block,
  selected = false,
  onClick,
  onTextChange,
  onDragStart,
  onDragEnd,
  readOnly = false,
  depth = 0,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [localText, setLocalText] = useState(getCommentText(block))
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Sync local text with block data
  useEffect(() => {
    setLocalText(getCommentText(block))
  }, [block])
  
  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])
  
  /**
   * Handle double-click to start editing
   */
  const handleDoubleClick = useCallback(() => {
    if (!readOnly) {
      setIsEditing(true)
    }
  }, [readOnly])
  
  /**
   * Handle text change
   */
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalText(e.target.value)
  }, [])
  
  /**
   * Handle blur - save changes
   */
  const handleBlur = useCallback(() => {
    setIsEditing(false)
    if (localText !== getCommentText(block)) {
      onTextChange?.(block.id, localText)
    }
  }, [block, localText, onTextChange])
  
  /**
   * Handle key down - save on Enter (with Ctrl/Cmd), cancel on Escape
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setLocalText(getCommentText(block))
      setIsEditing(false)
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleBlur()
    }
  }, [block, handleBlur])
  
  const commentText = getCommentText(block)
  const isEmpty = !commentText.trim()
  
  return (
    <BaseBlock
      block={block}
      selected={selected}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      depth={depth}
      className="comment-block"
      headerContent={
        <span className="comment-no-code-badge" title="此积木不生成代码">
          不生成代码
        </span>
      }
    >
      <div className="comment-content">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="comment-textarea"
            value={localText}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="输入注释内容..."
            rows={3}
          />
        ) : (
          <div 
            className={`comment-display ${isEmpty ? 'empty' : ''}`}
            onDoubleClick={handleDoubleClick}
          >
            {isEmpty ? (
              <span className="comment-placeholder">
                双击添加注释...
              </span>
            ) : (
              <pre className="comment-text">{commentText}</pre>
            )}
          </div>
        )}
        
        {/* Visual indicator that this is a comment */}
        <div className="comment-indicator">
          <span className="comment-icon">📝</span>
          <span className="comment-label">注释</span>
        </div>
      </div>
    </BaseBlock>
  )
}

/**
 * Check if a block is a comment block
 */
export function isCommentBlock(block: Block): boolean {
  return block.type === 'comment'
}

/**
 * Check if a block should generate code
 * Comment blocks do not generate code
 */
export function shouldGenerateCode(block: Block): boolean {
  return block.type !== 'comment'
}

/**
 * Filter out comment blocks from a block array
 * Used when generating code from blocks
 */
export function filterOutComments(blocks: Block[]): Block[] {
  return blocks.filter(block => block.type !== 'comment')
}

/**
 * Recursively filter out comment blocks from a block tree
 */
export function filterOutCommentsRecursive(block: Block): Block | null {
  if (block.type === 'comment') {
    return null
  }
  
  const filteredBlock: Block = { ...block }
  
  if (block.children) {
    filteredBlock.children = block.children
      .map(child => filterOutCommentsRecursive(child))
      .filter((child): child is Block => child !== null)
  }
  
  return filteredBlock
}

export default CommentBlock
