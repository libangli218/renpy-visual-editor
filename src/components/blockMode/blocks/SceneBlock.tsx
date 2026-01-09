/**
 * SceneBlock Component
 * 场景积木组件
 * 
 * Provides scene setup blocks: Scene (background), Show (character),
 * Hide (character), and With (transition).
 * 
 * Requirements: 4.1-4.6, 1.1, 1.4, 2.1, 3.1 (Advanced Properties)
 * Requirements: 4.4, 4.6, 4.7 (Resource drag-drop for Scene block)
 */

import React, { useCallback, useMemo } from 'react'
import { Block, BlockSlot, SlotOption } from '../types'
import { TRANSITION_OPTIONS, POSITION_OPTIONS } from '../constants'
import { BaseBlock, BaseBlockProps } from './BaseBlock'
import { AdvancedPanel } from './AdvancedPanel'
import { ImageTag } from '../../../resource/ResourceManager'
import { useResourceDrop } from '../../../hooks/useResourceDrop'
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
 * - 1.1: Show block advanced properties (as, behind, onlayer, zorder, with)
 * - 1.4: Show block basic properties visible without expanding advanced panel
 * - 2.1: Scene block advanced properties (onlayer, with)
 * - 3.1: Hide block advanced properties (onlayer, with)
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
  
  /**
   * Handle background image drop from resource panel
   * Implements Requirements 4.4, 4.6
   */
  const handleBackgroundDrop = useCallback((imageTag: string) => {
    onSlotChange?.(block.id, 'image', imageTag)
  }, [block.id, onSlotChange])
  
  /**
   * Handle sprite image drop from resource panel
   * Implements Requirements 4.5, 4.6
   */
  const handleSpriteDrop = useCallback((imageTag: string) => {
    // For show block, we need to parse the image tag
    // Format: "character expression" e.g., "eileen happy"
    const parts = imageTag.split(' ')
    if (parts.length >= 1) {
      const character = parts[0]
      const expression = parts.length > 1 ? parts.slice(1).join(' ') : null
      
      onSlotChange?.(block.id, 'character', character)
      if (expression) {
        onSlotChange?.(block.id, 'expression', expression)
      }
    }
  }, [block.id, onSlotChange])
  
  // Use resource drop hook for scene block (background images)
  const {
    isOver: isBackgroundOver,
    canDrop: canDropBackground,
    dropHandlers: backgroundDropHandlers,
  } = useResourceDrop({
    acceptType: 'background',
    onDrop: handleBackgroundDrop,
    enabled: block.type === 'scene',
  })
  
  // Use resource drop hook for show block (sprite images)
  const {
    isOver: isSpriteOver,
    canDrop: canDropSprite,
    dropHandlers: spriteDropHandlers,
  } = useResourceDrop({
    acceptType: 'sprite',
    onDrop: handleSpriteDrop,
    enabled: block.type === 'show',
  })
  
  // Determine which drop handlers to use based on block type
  const activeDropHandlers = block.type === 'scene' 
    ? backgroundDropHandlers 
    : block.type === 'show' 
      ? spriteDropHandlers 
      : undefined
  
  const isDropTarget = (block.type === 'scene' && isBackgroundOver && canDropBackground) ||
                       (block.type === 'show' && isSpriteOver && canDropSprite)
  
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
  
  /**
   * Get advanced slots for the current block type
   */
  const advancedSlots = useMemo((): BlockSlot[] => {
    return block.slots.filter(slot => slot.advanced === true)
  }, [block.slots])
  
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
        
        {/* Advanced Panel for Scene block */}
        {advancedSlots.length > 0 && (
          <AdvancedPanel
            slots={advancedSlots}
            onSlotChange={handleSlotChange}
            slotErrors={slotErrors}
            panelId={`scene-${block.id}`}
          />
        )}
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
        
        {/* Advanced Panel for Show block */}
        {advancedSlots.length > 0 && (
          <AdvancedPanel
            slots={advancedSlots}
            onSlotChange={handleSlotChange}
            slotErrors={slotErrors}
            panelId={`show-${block.id}`}
          />
        )}
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
        
        {/* Advanced Panel for Hide block */}
        {advancedSlots.length > 0 && (
          <AdvancedPanel
            slots={advancedSlots}
            onSlotChange={handleSlotChange}
            slotErrors={slotErrors}
            panelId={`hide-${block.id}`}
          />
        )}
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
      className={`scene-block scene-block-${block.type} ${isDropTarget ? 'resource-drop-target' : ''} ${baseProps.className || ''}`}
    >
      <div 
        className={`scene-block-content ${isDropTarget ? 'drop-active' : ''}`}
        {...activeDropHandlers}
      >
        {renderContent()}
        {/* Drop indicator overlay */}
        {isDropTarget && (
          <div className="resource-drop-indicator">
            <span className="drop-indicator-icon">
              {block.type === 'scene' ? '🖼️' : '👤'}
            </span>
            <span className="drop-indicator-text">
              {block.type === 'scene' ? '放置背景图片' : '放置立绘'}
            </span>
          </div>
        )}
      </div>
    </BaseBlock>
  )
}

export default SceneBlock
