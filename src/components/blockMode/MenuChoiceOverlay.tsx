/**
 * MenuChoiceOverlay Component
 * 菜单选择覆盖层组件
 * 
 * Displays an overlay when playback encounters a menu block,
 * allowing the user to select which branch to follow.
 * 
 * Requirements: 12.5 - Pause on menu blocks and wait for user selection
 */

import React, { useCallback } from 'react'
import { Block } from './types'
import './MenuChoiceOverlay.css'

/**
 * Props for MenuChoiceOverlay component
 */
export interface MenuChoiceOverlayProps {
  /** The menu block being displayed */
  menuBlock: Block
  /** Whether the overlay is visible */
  visible: boolean
  /** Callback when a choice is selected */
  onSelectChoice: (choiceIndex: number) => void
  /** Callback when overlay is dismissed (skip menu) */
  onDismiss?: () => void
  /** Custom class name */
  className?: string
}

/**
 * MenuChoiceOverlay - Overlay for selecting menu choices during playback
 * 
 * Implements Requirements:
 * - 12.5: Pause on menu blocks and wait for user selection
 */
export const MenuChoiceOverlay: React.FC<MenuChoiceOverlayProps> = ({
  menuBlock,
  visible,
  onSelectChoice,
  onDismiss,
  className = '',
}) => {
  // Get choice blocks from menu
  const choices = menuBlock.children?.filter(c => c.type === 'choice') ?? []

  // Handle choice click
  const handleChoiceClick = useCallback((index: number) => {
    onSelectChoice(index)
  }, [onSelectChoice])

  // Handle backdrop click (dismiss)
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onDismiss) {
      onDismiss()
    }
  }, [onDismiss])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onDismiss) {
      onDismiss()
    } else if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key, 10) - 1
      if (index < choices.length) {
        onSelectChoice(index)
      }
    }
  }, [choices.length, onDismiss, onSelectChoice])

  if (!visible || choices.length === 0) {
    return null
  }

  return (
    <div 
      className={`menu-choice-overlay ${className}`}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="选择菜单选项"
      tabIndex={-1}
    >
      <div className="menu-choice-dialog">
        {/* Header */}
        <div className="menu-choice-header">
          <span className="menu-choice-icon">🔀</span>
          <span className="menu-choice-title">请选择一个选项</span>
        </div>

        {/* Choices */}
        <div className="menu-choice-list">
          {choices.map((choice, index) => {
            // Get choice text from slot
            const textSlot = choice.slots.find(s => s.name === 'text')
            const choiceText = textSlot?.value ? String(textSlot.value) : `选项 ${index + 1}`
            
            // Get condition if any
            const conditionSlot = choice.slots.find(s => s.name === 'condition')
            const hasCondition = Boolean(conditionSlot?.value)

            return (
              <button
                key={choice.id}
                className="menu-choice-button"
                onClick={() => handleChoiceClick(index)}
                aria-label={`选择: ${choiceText}`}
              >
                <span className="choice-number">{index + 1}</span>
                <span className="choice-text">{choiceText}</span>
                {hasCondition && (
                  <span className="choice-condition" title={`条件: ${String(conditionSlot?.value)}`}>
                    ❓
                  </span>
                )}
                <span className="choice-arrow">→</span>
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="menu-choice-footer">
          <span className="hint-text">按数字键 1-{Math.min(choices.length, 9)} 快速选择</span>
          {onDismiss && (
            <button 
              className="skip-button"
              onClick={onDismiss}
              title="跳过菜单"
            >
              跳过
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuChoiceOverlay
