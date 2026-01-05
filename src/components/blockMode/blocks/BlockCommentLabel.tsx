/**
 * BlockCommentLabel Component
 * 积木注释标签组件
 * 
 * Allows adding comment labels to any block for organization and documentation.
 * Comments are displayed as small badges on blocks.
 * 
 * Requirements: 15.3
 */

import React, { useCallback, useState, useRef, useEffect } from 'react'
import './BlockCommentLabel.css'

/**
 * Props for BlockCommentLabel component
 */
export interface BlockCommentLabelProps {
  /** The block ID */
  blockId: string
  /** Current comment text */
  comment?: string
  /** Callback when comment changes */
  onCommentChange?: (blockId: string, comment: string | undefined) => void
  /** Whether the block is read-only */
  readOnly?: boolean
  /** Position of the label */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** Maximum length for the displayed comment */
  maxDisplayLength?: number
}

/**
 * BlockCommentLabel - Component for adding comment labels to blocks
 * 
 * Implements Requirements:
 * - 15.3: Support adding comment labels to blocks
 */
export const BlockCommentLabel: React.FC<BlockCommentLabelProps> = ({
  blockId,
  comment,
  onCommentChange,
  readOnly = false,
  position = 'top-right',
  maxDisplayLength = 20,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [localComment, setLocalComment] = useState(comment ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Sync local comment with prop
  useEffect(() => {
    setLocalComment(comment ?? '')
  }, [comment])
  
  // Auto-focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])
  
  /**
   * Handle click to start editing
   */
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!readOnly) {
      setIsEditing(true)
    }
  }, [readOnly])
  
  /**
   * Handle input change
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalComment(e.target.value)
  }, [])
  
  /**
   * Handle blur - save changes
   */
  const handleBlur = useCallback(() => {
    setIsEditing(false)
    const trimmedComment = localComment.trim()
    const newComment = trimmedComment || undefined
    if (newComment !== comment) {
      onCommentChange?.(blockId, newComment)
    }
  }, [blockId, comment, localComment, onCommentChange])
  
  /**
   * Handle key down - save on Enter, cancel on Escape
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setLocalComment(comment ?? '')
      setIsEditing(false)
    }
  }, [comment, handleBlur])
  
  /**
   * Handle delete comment
   */
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onCommentChange?.(blockId, undefined)
  }, [blockId, onCommentChange])
  
  /**
   * Truncate comment for display
   */
  const displayComment = comment && comment.length > maxDisplayLength
    ? `${comment.substring(0, maxDisplayLength)}...`
    : comment
  
  const hasComment = !!comment?.trim()
  
  return (
    <div 
      className={`block-comment-label ${position} ${hasComment ? 'has-comment' : 'no-comment'}`}
      onClick={handleClick}
      title={hasComment ? comment : '点击添加注释标签'}
    >
      {isEditing ? (
        <div className="comment-label-editor" onClick={e => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            className="comment-label-input"
            value={localComment}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="输入注释..."
            maxLength={100}
          />
        </div>
      ) : hasComment ? (
        <div className="comment-label-display">
          <span className="comment-label-icon">💬</span>
          <span className="comment-label-text">{displayComment}</span>
          {!readOnly && (
            <button
              className="comment-label-delete"
              onClick={handleDelete}
              title="删除注释"
              aria-label="删除注释"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <div className="comment-label-add">
          <span className="comment-label-add-icon">+</span>
          <span className="comment-label-add-text">注释</span>
        </div>
      )}
    </div>
  )
}

/**
 * Hook for managing block comments
 */
export function useBlockComments(
  initialComments: Record<string, string> = {}
): {
  comments: Record<string, string>
  setComment: (blockId: string, comment: string | undefined) => void
  getComment: (blockId: string) => string | undefined
  clearComments: () => void
} {
  const [comments, setComments] = useState<Record<string, string>>(initialComments)
  
  const setComment = useCallback((blockId: string, comment: string | undefined) => {
    setComments(prev => {
      const next = { ...prev }
      if (comment) {
        next[blockId] = comment
      } else {
        delete next[blockId]
      }
      return next
    })
  }, [])
  
  const getComment = useCallback((blockId: string) => {
    return comments[blockId]
  }, [comments])
  
  const clearComments = useCallback(() => {
    setComments({})
  }, [])
  
  return { comments, setComment, getComment, clearComments }
}

export default BlockCommentLabel
