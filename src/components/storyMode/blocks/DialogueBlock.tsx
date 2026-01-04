import React, { useState, useRef, useEffect, useCallback } from 'react'
import { DialogueBlock as DialogueBlockType, NarrationBlock as NarrationBlockType } from '../types'
import { BlockIcon } from './BlockIcon'

interface DialogueBlockProps {
  block: DialogueBlockType
  selected: boolean
  onClick: () => void
  onTextChange?: (text: string) => void
  onEnterPress?: () => void
  onDelete?: () => void
}

export const DialogueBlockComponent: React.FC<DialogueBlockProps> = ({
  block,
  selected,
  onClick,
  onTextChange,
  onEnterPress,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(block.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Update local state when block changes
  useEffect(() => {
    setEditText(block.text)
  }, [block.text])

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(editText.length, editText.length)
    }
  }, [isEditing, editText.length])

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    if (onTextChange && editText !== block.text) {
      onTextChange(editText)
    }
  }, [editText, block.text, onTextChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleBlur()
        if (onEnterPress) {
          onEnterPress()
        }
      } else if (e.key === 'Escape') {
        setEditText(block.text)
        setIsEditing(false)
      } else if (e.key === 'Delete' && e.ctrlKey && onDelete) {
        e.preventDefault()
        onDelete()
      }
    },
    [handleBlur, onEnterPress, onDelete, block.text]
  )

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value)
  }, [])

  return (
    <div
      className={`story-block ${selected ? 'selected' : ''} ${block.extend ? 'extend-block' : ''}`}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      data-testid={`block-${block.id}`}
      role="button"
      tabIndex={0}
      aria-selected={selected}
    >
      <BlockIcon type="dialogue" />
      <div className="block-content">
        <div className="block-header">
          {block.extend && <span className="extend-indicator">↳</span>}
          <span className="block-speaker">{block.speaker}</span>
          {block.attributes && block.attributes.length > 0 && (
            <span className="block-meta">({block.attributes.join(', ')})</span>
          )}
        </div>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="block-text-input"
            value={editText}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            aria-label="Edit dialogue text"
          />
        ) : (
          <div className="block-text">"{block.text || '(empty)'}"</div>
        )}
      </div>
      {selected && onDelete && (
        <div className="block-actions">
          <button
            className="block-action-btn delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            aria-label="Delete block"
            title="Delete (Ctrl+Delete)"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  )
}

interface NarrationBlockProps {
  block: NarrationBlockType
  selected: boolean
  onClick: () => void
  onTextChange?: (text: string) => void
  onEnterPress?: () => void
  onDelete?: () => void
}

export const NarrationBlockComponent: React.FC<NarrationBlockProps> = ({
  block,
  selected,
  onClick,
  onTextChange,
  onEnterPress,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(block.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Update local state when block changes
  useEffect(() => {
    setEditText(block.text)
  }, [block.text])

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(editText.length, editText.length)
    }
  }, [isEditing, editText.length])

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    if (onTextChange && editText !== block.text) {
      onTextChange(editText)
    }
  }, [editText, block.text, onTextChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleBlur()
        if (onEnterPress) {
          onEnterPress()
        }
      } else if (e.key === 'Escape') {
        setEditText(block.text)
        setIsEditing(false)
      } else if (e.key === 'Delete' && e.ctrlKey && onDelete) {
        e.preventDefault()
        onDelete()
      }
    },
    [handleBlur, onEnterPress, onDelete, block.text]
  )

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value)
  }, [])

  return (
    <div
      className={`story-block ${selected ? 'selected' : ''} ${block.extend ? 'extend-block' : ''}`}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      data-testid={`block-${block.id}`}
      role="button"
      tabIndex={0}
      aria-selected={selected}
    >
      <BlockIcon type="narration" />
      <div className="block-content">
        <div className="block-header">
          {block.extend && <span className="extend-indicator">↳</span>}
          <span className="block-type-label">Narration</span>
        </div>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="block-text-input"
            value={editText}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            aria-label="Edit narration text"
          />
        ) : (
          <div className="block-text">"{block.text || '(empty)'}"</div>
        )}
      </div>
      {selected && onDelete && (
        <div className="block-actions">
          <button
            className="block-action-btn delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            aria-label="Delete block"
            title="Delete (Ctrl+Delete)"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  )
}
