/**
 * DialogueBlock Component
 * 对话积木组件
 * 
 * Provides dialogue editing with character selection and multiline text input.
 * Supports narrator mode (no character selected).
 * 
 * Requirements: 3.1-3.5, 11.1 (Advanced Properties)
 */

import React, { useCallback, useMemo } from 'react'
import { Block, BlockSlot, SlotOption } from '../types'
import { BaseBlock, BaseBlockProps } from './BaseBlock'
import { AdvancedPanel } from './AdvancedPanel'
import './Block.css'

/**
 * Props for DialogueBlock component
 */
export interface DialogueBlockProps extends Omit<BaseBlockProps, 'children'> {
  /** Available characters for selection */
  availableCharacters?: SlotOption[]
  /** Callback when a slot value changes */
  onSlotChange?: (blockId: string, slotName: string, value: unknown) => void
  /** Validation errors for slots */
  slotErrors?: Record<string, string>
}

/**
 * Get slot value from block
 */
function getSlotValue(block: Block, slotName: string): unknown {
  const slot = block.slots.find(s => s.name === slotName)
  return slot?.value
}

/**
 * Check if slot is required
 */
function isSlotRequired(block: Block, slotName: string): boolean {
  const slot = block.slots.find(s => s.name === slotName)
  return slot?.required ?? false
}

/**
 * DialogueBlock - Dialogue editing block component
 * 
 * Implements Requirements:
 * - 3.1: Dialogue block contains character selection and text input slots
 * - 3.2: Show dropdown list of defined characters
 * - 3.3: Support narrator mode (empty character)
 * - 3.4: Support multiline text input
 * - 3.5: Real-time AST update on text input
 * - 11.1: Dialogue block advanced properties (withTransition, attributes)
 */
export const DialogueBlock: React.FC<DialogueBlockProps> = ({
  block,
  availableCharacters = [],
  onSlotChange,
  slotErrors = {},
  ...baseProps
}) => {
  // Get current slot values
  const speaker = getSlotValue(block, 'speaker') as string | null
  const text = getSlotValue(block, 'text') as string
  
  // Check if narrator mode (no speaker)
  const isNarrator = !speaker || speaker === ''
  
  // Build character options with narrator option
  const characterOptions = useMemo(() => {
    const options: SlotOption[] = [
      { value: '', label: '旁白 (无角色)' },
      ...availableCharacters,
    ]
    return options
  }, [availableCharacters])
  
  /**
   * Get advanced slots for the dialogue block
   */
  const advancedSlots = useMemo((): BlockSlot[] => {
    return block.slots.filter(slot => slot.advanced === true)
  }, [block.slots])
  
  /**
   * Handle slot value change
   */
  const handleSlotChange = useCallback((slotName: string, value: unknown) => {
    onSlotChange?.(block.id, slotName, value)
  }, [block.id, onSlotChange])
  
  /**
   * Handle speaker change
   */
  const handleSpeakerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null
    onSlotChange?.(block.id, 'speaker', value)
  }, [block.id, onSlotChange])
  
  /**
   * Handle text change
   */
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onSlotChange?.(block.id, 'text', e.target.value)
  }, [block.id, onSlotChange])
  
  // Check for errors
  const speakerError = slotErrors['speaker']
  const textError = slotErrors['text']
  const hasError = baseProps.hasError || !!speakerError || !!textError
  
  return (
    <BaseBlock
      {...baseProps}
      block={block}
      hasError={hasError}
      className={`dialogue-block ${baseProps.className || ''}`}
    >
      <div className="block-slots">
        {/* Speaker Selection Row */}
        <div className="dialogue-speaker-row">
          <div className="block-slot">
            <label className="block-slot-label">
              角色
            </label>
            <select
              className={`block-slot-input block-slot-select dialogue-speaker-select ${speakerError ? 'has-error' : ''}`}
              value={speaker || ''}
              onChange={handleSpeakerChange}
              title={speakerError}
            >
              {characterOptions.map(option => (
                <option 
                  key={option.value} 
                  value={option.value}
                  title={option.tooltip}
                >
                  {option.icon ? `${option.icon} ${option.label}` : option.label}
                  {option.tooltip ? ` (${option.tooltip.replace('来自: ', '')})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          {isNarrator && (
            <span className="dialogue-narrator-badge">
              旁白模式
            </span>
          )}
        </div>
        
        {/* Dialogue Text Area */}
        <div className="block-slot">
          <label className={`block-slot-label ${isSlotRequired(block, 'text') ? 'required' : ''}`}>
            对话内容
          </label>
          <textarea
            className={`dialogue-text-area ${textError ? 'has-error' : ''}`}
            value={text || ''}
            onChange={handleTextChange}
            placeholder="输入对话内容..."
            rows={3}
            title={textError}
          />
          {textError && (
            <span className="slot-error-message">{textError}</span>
          )}
        </div>
        
        {/* Advanced Panel for Dialogue block */}
        {advancedSlots.length > 0 && (
          <AdvancedPanel
            slots={advancedSlots}
            onSlotChange={handleSlotChange}
            slotErrors={slotErrors}
            panelId={`dialogue-${block.id}`}
          />
        )}
      </div>
    </BaseBlock>
  )
}

export default DialogueBlock
