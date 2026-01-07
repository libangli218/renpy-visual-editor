/**
 * SceneBlock Component
 * 场景积木组件
 * 
 * Provides scene setup blocks: Scene (background), Show (character),
 * Hide (character), and With (transition).
 * 
 * Requirements: 4.1-4.6
 */

import React, { useCallback, useMemo } from 'react'
import { Block, SlotOption } from '../types'
import { TRANSITION_OPTIONS, POSITION_OPTIONS } from '../constants'
import { BaseBlock, BaseBlockProps } from './BaseBlock'
import { ImageTag } from '../../../resource/ResourceManager'
import './Block.css'

/**
 * Props for SceneBlock component
 */
export interface SceneBlockProps extends Omit<BaseBlockProps, 'children'> {
  /** Available background images */
  availableImages?: SlotOption[]
  /** Available characters (image tags for Show/Hide) */
  availableCharacters?: SlotOption[]
  /** Image tags with attributes (for Show block expression selection) */
  imageTags?: ImageTag[]
  /** Available expressions for characters */
  availableExpressions?: Record<string, SlotOption[]>
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
 * SceneBlock - Scene setup block component
 * 
 * Implements Requirements:
 * - 4.1: Scene block contains background image selection
 * - 4.2: Scene block contains optional transition effect
 * - 4.3: Show block contains character image and position
 * - 4.4: Show block contains optional expression selection
 * - 4.5: Display resource preview thumbnail
 * - 4.6: Hide block contains character selection
 */
export const SceneBlock: React.FC<SceneBlockProps> = ({
  block,
  availableImages = [],
  availableCharacters = [],
  imageTags = [],
  availableExpressions = {},
  onSlotChange,
  slotErrors = {},
  ...baseProps
}) => {
  /**
   * Handle slot value change
   */
  const handleSlotChange = useCallback((slotName: string, value: unknown) => {
    onSlotChange?.(block.id, slotName, value)
  }, [block.id, onSlotChange])
  
  /**
   * Handle character change - also clear expression since new character may have different options
   */
  const handleCharacterChange = useCallback((newCharacter: string) => {
    onSlotChange?.(block.id, 'character', newCharacter)
    // Clear expression when character changes
    onSlotChange?.(block.id, 'expression', null)
  }, [block.id, onSlotChange])
  
  // Check for errors
  const hasSlotErrors = Object.keys(slotErrors).length > 0
  const hasError = baseProps.hasError || hasSlotErrors
  
  // Get character slot value for dependency tracking
  const characterValue = getSlotValue(block, 'character') as string | undefined
  
  // Build expression options based on selected character (image tag)
  const expressionOptions = useMemo(() => {
    if (!characterValue) return []
    
    // Find the image tag for this character
    const tag = imageTags.find(t => t.tag === characterValue)
    if (!tag) return []
    
    // Convert attributes to options
    const options = tag.attributes.map(attrs => ({
      value: attrs.join(' '),
      label: attrs.join(' '),
    }))
    return options
  }, [characterValue, imageTags])
  
  // Render different content based on block type
  const renderContent = () => {
    switch (block.type) {
      case 'scene':
        return renderSceneContent()
      case 'show':
        return renderShowContent()
      case 'hide':
        return renderHideContent()
      case 'with':
        return renderWithContent()
      default:
        return null
    }
  }
  
  /**
   * Render Scene block content (background image + transition)
   */
  const renderSceneContent = () => {
    const image = getSlotValue(block, 'image') as string
    const transition = getSlotValue(block, 'transition') as string | null
    
    return (
      <div className="block-slots">
        {/* Image Preview */}
        {image ? (
          <img 
            src={image} 
            alt="背景预览" 
            className="scene-image-preview"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="scene-image-placeholder">
            🖼️ 选择背景图片
          </div>
        )}
        
        <div className="scene-row">
          {/* Background Image Selection */}
          <div className="block-slot">
            <label className={`block-slot-label ${isSlotRequired(block, 'image') ? 'required' : ''}`}>
              背景图片
            </label>
            <select
              className={`block-slot-input block-slot-select ${slotErrors['image'] ? 'has-error' : ''}`}
              value={image || ''}
              onChange={(e) => handleSlotChange('image', e.target.value)}
              title={slotErrors['image']}
            >
              <option value="">选择背景图片...</option>
              {availableImages.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Transition Effect Selection */}
          <div className="block-slot">
            <label className="block-slot-label">
              过渡效果
            </label>
            <select
              className={`block-slot-input block-slot-select ${slotErrors['transition'] ? 'has-error' : ''}`}
              value={transition || ''}
              onChange={(e) => handleSlotChange('transition', e.target.value || null)}
              title={slotErrors['transition']}
            >
              <option value="">无过渡</option>
              {TRANSITION_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    )
  }
  
  /**
   * Render Show block content (character + position + expression)
   */
  const renderShowContent = () => {
    const character = getSlotValue(block, 'character') as string
    const position = getSlotValue(block, 'position') as string
    const expression = getSlotValue(block, 'expression') as string | null
    
    return (
      <div className="block-slots">
        <div className="scene-row">
          {/* Character (Image Tag) Selection */}
          <div className="block-slot">
            <label className={`block-slot-label ${isSlotRequired(block, 'character') ? 'required' : ''}`}>
              角色
            </label>
            <select
              className={`block-slot-input block-slot-select ${slotErrors['character'] ? 'has-error' : ''}`}
              value={character || ''}
              onChange={(e) => handleCharacterChange(e.target.value)}
              title={slotErrors['character']}
            >
              <option value="">选择角色...</option>
              {availableCharacters.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon ? `${option.icon} ${option.label}` : option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Position Selection */}
          <div className="block-slot">
            <label className="block-slot-label">
              位置
            </label>
            <select
              className={`block-slot-input block-slot-select ${slotErrors['position'] ? 'has-error' : ''}`}
              value={position || 'center'}
              onChange={(e) => handleSlotChange('position', e.target.value)}
              title={slotErrors['position']}
            >
              {POSITION_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Expression/Attribute Selection (from image tag attributes) */}
        {expressionOptions.length > 0 && (
          <div className="block-slot">
            <label className="block-slot-label">
              表情/服装
            </label>
            <select
              className={`block-slot-input block-slot-select ${slotErrors['expression'] ? 'has-error' : ''}`}
              value={expression || ''}
              onChange={(e) => handleSlotChange('expression', e.target.value || null)}
              title={slotErrors['expression']}
            >
              <option value="">选择表情...</option>
              {expressionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Position Visual Indicator */}
        <div className="character-position-indicator">
          {POSITION_OPTIONS.slice(0, 3).map(pos => (
            <div
              key={pos.value}
              className={`position-marker ${position === pos.value ? 'active' : ''}`}
              onClick={() => handleSlotChange('position', pos.value)}
              title={pos.label}
            />
          ))}
        </div>
      </div>
    )
  }
  
  /**
   * Render Hide block content (character selection)
   */
  const renderHideContent = () => {
    const character = getSlotValue(block, 'character') as string
    
    return (
      <div className="block-slots">
        <div className="block-slot">
          <label className={`block-slot-label ${isSlotRequired(block, 'character') ? 'required' : ''}`}>
            要隐藏的角色
          </label>
          <select
            className={`block-slot-input block-slot-select ${slotErrors['character'] ? 'has-error' : ''}`}
            value={character || ''}
            onChange={(e) => handleSlotChange('character', e.target.value)}
            title={slotErrors['character']}
          >
            <option value="">选择角色...</option>
            {availableCharacters.map(option => (
              <option key={option.value} value={option.value}>
                {option.icon ? `${option.icon} ${option.label}` : option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }
  
  /**
   * Render With block content (transition effect)
   */
  const renderWithContent = () => {
    const transition = getSlotValue(block, 'transition') as string
    
    return (
      <div className="block-slots">
        <div className="block-slot">
          <label className={`block-slot-label ${isSlotRequired(block, 'transition') ? 'required' : ''}`}>
            过渡效果
          </label>
          <select
            className={`block-slot-input block-slot-select ${slotErrors['transition'] ? 'has-error' : ''}`}
            value={transition || 'dissolve'}
            onChange={(e) => handleSlotChange('transition', e.target.value)}
            title={slotErrors['transition']}
          >
            {TRANSITION_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }
  
  return (
    <BaseBlock
      {...baseProps}
      block={block}
      hasError={hasError}
      className={`scene-block scene-block-${block.type} ${baseProps.className || ''}`}
    >
      {renderContent()}
    </BaseBlock>
  )
}

export default SceneBlock
