/**
 * MenuBlock Component
 * 菜单积木组件
 * 
 * Provides menu container with choice blocks.
 * Menu can contain multiple Choice blocks, each with text and optional condition.
 * 
 * Requirements: 5.1-5.4, 7.1 (Advanced Properties)
 */

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { Block, BlockSlot } from '../types'
import { BaseBlock, BaseBlockProps } from './BaseBlock'
import { AdvancedPanel } from './AdvancedPanel'
import './Block.css'

/**
 * Props for MenuBlock component
 */
export interface MenuBlockProps extends Omit<BaseBlockProps, 'children'> {
  /** Callback when a slot value changes */
  onSlotChange?: (blockId: string, slotName: string, value: unknown) => void
  /** Callback to add a new choice */
  onAddChoice?: (menuBlockId: string) => void
  /** Callback to delete a choice */
  onDeleteChoice?: (choiceBlockId: string) => void
  /** Callback when a block is dropped into a choice */
  onBlockDropIntoChoice?: (blockType: string, choiceBlockId: string, index: number) => void
  /** Callback when an existing block is moved into a choice */
  onBlockMoveIntoChoice?: (blockId: string, choiceBlockId: string, index: number) => void
  /** Callback when a block is dropped into the menu (for choice blocks) */
  onBlockDrop?: (blockType: string, menuBlockId: string, index: number) => void
  /** Callback when an existing block is moved into the menu */
  onBlockMove?: (blockId: string, menuBlockId: string, index: number) => void
  /** Validation errors for slots */
  slotErrors?: Record<string, string>
  /** Render function for child blocks */
  renderChildBlock?: (block: Block, depth: number) => React.ReactNode
  /** Current depth level */
  depth?: number
  /** Canvas scale factor for correct drop indicator positioning */
  canvasScale?: number
}

/**
 * Props for ChoiceBlock component
 */
export interface ChoiceBlockProps extends Omit<BaseBlockProps, 'children'> {
  /** Callback when a slot value changes */
  onSlotChange?: (blockId: string, slotName: string, value: unknown) => void
  /** Callback to delete this choice */
  onDelete?: (choiceBlockId: string) => void
  /** Callback when a block is dropped into this choice */
  onBlockDrop?: (blockType: string, choiceBlockId: string, index: number) => void
  /** Callback when an existing block is moved into this choice */
  onBlockMove?: (blockId: string, choiceBlockId: string, index: number) => void
  /** Validation errors for slots */
  slotErrors?: Record<string, string>
  /** Render function for child blocks */
  renderChildBlock?: (block: Block, depth: number) => React.ReactNode
  /** Current depth level */
  depth?: number
}

/**
 * Get slot value from block
 */
function getSlotValue(block: Block, slotName: string): unknown {
  const slot = block.slots.find(s => s.name === slotName)
  return slot?.value
}

/**
 * MenuBlock - Menu container block component
 * 
 * Implements Requirements:
 * - 5.1: Menu block as container for multiple choice blocks
 * - 5.2: Support adding and deleting choices
 * - 7.1: Menu block advanced properties (setVar, screen)
 */
export const MenuBlock: React.FC<MenuBlockProps> = ({
  block,
  onSlotChange,
  onAddChoice,
  onDeleteChoice,
  onBlockDropIntoChoice,
  onBlockMoveIntoChoice,
  onBlockDrop,
  onBlockMove,
  slotErrors = {},
  renderChildBlock,
  depth = 0,
  canvasScale = 1,
  ...baseProps
}) => {
  const choices = block.children || []
  
  // Drag-drop state
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropPosition, setDropPosition] = useState<{ index: number; y: number } | null>(null)
  const choicesContainerRef = useRef<HTMLDivElement>(null)
  
  // Reset drag state when drag ends globally (handles cases where drop happens outside)
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setIsDragOver(false)
      setDropPosition(null)
    }
    
    document.addEventListener('dragend', handleGlobalDragEnd)
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd)
    }
  }, [])
  
  /**
   * Handle slot value change
   */
  const handleSlotChange = useCallback((slotName: string, value: unknown) => {
    onSlotChange?.(block.id, slotName, value)
  }, [block.id, onSlotChange])
  
  /**
   * Get advanced slots for the menu block
   */
  const advancedSlots = useMemo((): BlockSlot[] => {
    return block.slots.filter(slot => slot.advanced === true)
  }, [block.slots])
  
  /**
   * Handle add choice button click
   */
  const handleAddChoice = useCallback(() => {
    onAddChoice?.(block.id)
  }, [block.id, onAddChoice])
  
  /**
   * Calculate drop index based on mouse Y position
   */
  const calculateDropIndex = useCallback((clientY: number): number => {
    if (!choicesContainerRef.current || choices.length === 0) {
      return 0
    }

    const blockElements = choicesContainerRef.current.querySelectorAll(':scope > [data-block-id]')
    const containerRect = choicesContainerRef.current.getBoundingClientRect()
    
    if (clientY < containerRect.top) {
      return 0
    }

    for (let i = 0; i < blockElements.length; i++) {
      const blockRect = blockElements[i].getBoundingClientRect()
      const blockMiddle = blockRect.top + blockRect.height / 2

      if (clientY < blockMiddle) {
        return i
      }
    }

    return choices.length
  }, [choices.length])
  
  /**
   * Get Y position for drop indicator based on index
   * 
   * IMPORTANT: When the canvas is scaled, getBoundingClientRect() returns
   * screen coordinates (already transformed), but CSS top/left values are
   * applied BEFORE the transform. So we need to divide by scale to compensate.
   */
  const getDropIndicatorY = useCallback((index: number): number => {
    if (!choicesContainerRef.current) {
      return 0
    }

    const blockElements = choicesContainerRef.current.querySelectorAll(':scope > [data-block-id]')
    const containerRect = choicesContainerRef.current.getBoundingClientRect()
    
    if (blockElements.length === 0) {
      return 20 // Center position when empty
    }

    if (index === 0) {
      const firstBlock = blockElements[0]
      const firstRect = firstBlock.getBoundingClientRect()
      // Divide by scale to convert from screen coordinates to CSS coordinates
      return (firstRect.top - containerRect.top) / canvasScale - 4
    }

    if (index >= blockElements.length) {
      const lastBlock = blockElements[blockElements.length - 1]
      const lastRect = lastBlock.getBoundingClientRect()
      // Divide by scale to convert from screen coordinates to CSS coordinates
      return (lastRect.bottom - containerRect.top) / canvasScale + 4
    }

    // Position between two blocks
    const prevBlock = blockElements[index - 1]
    const nextBlock = blockElements[index]
    const prevRect = prevBlock.getBoundingClientRect()
    const nextRect = nextBlock.getBoundingClientRect()
    
    // Calculate the midpoint between the bottom of prev block and top of next block
    // Divide by scale to convert from screen coordinates to CSS coordinates
    const prevBottom = (prevRect.bottom - containerRect.top) / canvasScale
    const nextTop = (nextRect.top - containerRect.top) / canvasScale
    return (prevBottom + nextTop) / 2
  }, [canvasScale])
  
  /**
   * Handle drag over the choices container
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const hasBlockType = e.dataTransfer.types.includes('application/x-block-type')
    const hasBlockId = e.dataTransfer.types.includes('application/x-block-id')
    
    if (hasBlockType || hasBlockId) {
      e.dataTransfer.dropEffect = hasBlockType ? 'copy' : 'move'
      const index = calculateDropIndex(e.clientY)
      const y = getDropIndicatorY(index)
      setIsDragOver(true)
      setDropPosition({ index, y })
    }
  }, [calculateDropIndex, getDropIndicatorY])
  
  /**
   * Handle drag enter
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])
  
  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only clear if leaving the container entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null
    const currentTarget = e.currentTarget as HTMLElement
    
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setIsDragOver(false)
      setDropPosition(null)
    }
  }, [])
  
  /**
   * Handle drop
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const index = calculateDropIndex(e.clientY)

    // Reset drag state first
    setIsDragOver(false)
    setDropPosition(null)

    // Check if dropping a block from palette (new block)
    const blockType = e.dataTransfer.getData('application/x-block-type')
    if (blockType) {
      onBlockDrop?.(blockType, block.id, index)
      return
    }

    // Check if dropping an existing block (move)
    const blockId = e.dataTransfer.getData('application/x-block-id')
    if (blockId) {
      // Don't allow dropping a block into itself
      if (blockId === block.id) {
        return
      }
      onBlockMove?.(blockId, block.id, index)
    }
  }, [calculateDropIndex, block.id, onBlockDrop, onBlockMove])
  
  return (
    <BaseBlock
      {...baseProps}
      block={block}
      className={`menu-block ${baseProps.className || ''}`}
      showCollapseButton={choices.length > 0}
      depth={depth}
    >
      {/* Advanced Panel for Menu block */}
      {advancedSlots.length > 0 && (
        <AdvancedPanel
          slots={advancedSlots}
          onSlotChange={handleSlotChange}
          slotErrors={slotErrors}
          panelId={`menu-${block.id}`}
        />
      )}
      
      <div 
        ref={choicesContainerRef}
        className={`menu-choices-container ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {choices.length === 0 ? (
          <div className="block-children-container empty">
            <span className="block-children-placeholder">
              拖拽选项积木到这里，或点击下方按钮添加
            </span>
          </div>
        ) : (
          choices.map((choice) => (
            <ChoiceBlock
              key={choice.id}
              block={choice}
              onSlotChange={onSlotChange}
              onDelete={onDeleteChoice}
              onBlockDrop={onBlockDropIntoChoice}
              onBlockMove={onBlockMoveIntoChoice}
              slotErrors={slotErrors}
              renderChildBlock={renderChildBlock}
              depth={depth + 1}
              onClick={baseProps.onClick}
              onDoubleClick={baseProps.onDoubleClick}
              onDragStart={baseProps.onDragStart}
              onDragEnd={baseProps.onDragEnd}
              onToggleCollapse={baseProps.onToggleCollapse}
              selected={choice.selected}
              hasError={choice.hasError}
              collapsed={choice.collapsed}
            />
          ))
        )}
        
        {/* Drop indicator */}
        {isDragOver && dropPosition && (
          <div 
            className="menu-drop-indicator" 
            style={{ 
              top: `${dropPosition.y}px`,
              transform: 'translateY(-50%)'
            }}
          />
        )}
        
        {/* Add Choice Button */}
        <button
          className="menu-add-choice-btn"
          onClick={handleAddChoice}
          type="button"
        >
          <span>➕</span>
          <span>添加选项</span>
        </button>
      </div>
    </BaseBlock>
  )
}

/**
 * ChoiceBlock - Choice block component within a menu
 * 
 * Implements Requirements:
 * - 5.3: Choice block contains text slot and optional condition
 * - 5.4: Choice block as container for triggered blocks
 */
export const ChoiceBlock: React.FC<ChoiceBlockProps> = ({
  block,
  onSlotChange,
  onDelete,
  onBlockDrop,
  onBlockMove,
  slotErrors = {},
  renderChildBlock,
  depth = 0,
  ...baseProps
}) => {
  const text = getSlotValue(block, 'text') as string
  const condition = getSlotValue(block, 'condition') as string | null
  const children = block.children || []
  
  // Drag-drop state
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const childrenContainerRef = useRef<HTMLDivElement>(null)
  
  // Reset drag state when drag ends globally (handles cases where drop happens outside)
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setIsDragOver(false)
      setDropIndex(null)
    }
    
    document.addEventListener('dragend', handleGlobalDragEnd)
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd)
    }
  }, [])
  
  /**
   * Handle text change
   */
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSlotChange?.(block.id, 'text', e.target.value)
  }, [block.id, onSlotChange])
  
  /**
   * Handle condition change
   */
  const handleConditionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSlotChange?.(block.id, 'condition', e.target.value || null)
  }, [block.id, onSlotChange])
  
  /**
   * Handle delete button click
   */
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(block.id)
  }, [block.id, onDelete])
  
  /**
   * Calculate drop index based on mouse Y position
   */
  const calculateDropIndex = useCallback((clientY: number): number => {
    if (!childrenContainerRef.current || children.length === 0) {
      return 0
    }

    const blockElements = childrenContainerRef.current.querySelectorAll('[data-block-id]')
    const containerRect = childrenContainerRef.current.getBoundingClientRect()
    
    if (clientY < containerRect.top) {
      return 0
    }

    for (let i = 0; i < blockElements.length; i++) {
      const blockRect = blockElements[i].getBoundingClientRect()
      const blockMiddle = blockRect.top + blockRect.height / 2

      if (clientY < blockMiddle) {
        return i
      }
    }

    return children.length
  }, [children.length])
  
  /**
   * Handle drag over the children container
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const hasBlockType = e.dataTransfer.types.includes('application/x-block-type')
    const hasBlockId = e.dataTransfer.types.includes('application/x-block-id')
    
    if (hasBlockType || hasBlockId) {
      e.dataTransfer.dropEffect = hasBlockType ? 'copy' : 'move'
      setIsDragOver(true)
      setDropIndex(calculateDropIndex(e.clientY))
    }
  }, [calculateDropIndex])
  
  /**
   * Handle drag enter
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])
  
  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only clear if leaving the container entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null
    const currentTarget = e.currentTarget as HTMLElement
    
    // Check if we're leaving to an element outside the container
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setIsDragOver(false)
      setDropIndex(null)
    }
  }, [])
  
  /**
   * Handle drop
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const index = calculateDropIndex(e.clientY)

    // Reset drag state first
    setIsDragOver(false)
    setDropIndex(null)

    // Check if dropping a block from palette (new block)
    const blockType = e.dataTransfer.getData('application/x-block-type')
    if (blockType) {
      onBlockDrop?.(blockType, block.id, index)
      return
    }

    // Check if dropping an existing block (move)
    const blockId = e.dataTransfer.getData('application/x-block-id')
    if (blockId) {
      // Don't allow dropping a block into itself
      if (blockId === block.id) {
        return
      }
      onBlockMove?.(blockId, block.id, index)
    }
  }, [calculateDropIndex, block.id, onBlockDrop, onBlockMove])
  
  // Custom header content with inline text input
  // Don Norman: Visibility principle - delete button must always be visible and accessible
  // Using a flex container with proper constraints to prevent text from pushing button out
  const headerContent = (
    <div className="choice-header-content">
      <input
        type="text"
        className={`choice-text-input ${slotErrors['text'] ? 'has-error' : ''}`}
        value={text || ''}
        onChange={handleTextChange}
        placeholder="输入选项文本..."
        onClick={(e) => e.stopPropagation()}
        title={slotErrors['text']}
      />
      <button
        className="choice-delete-btn"
        onClick={handleDelete}
        type="button"
        title="删除选项"
      >
        🗑️
      </button>
    </div>
  )
  
  return (
    <BaseBlock
      {...baseProps}
      block={block}
      className={`choice-block ${baseProps.className || ''}`}
      headerContent={headerContent}
      showCollapseButton={children.length > 0}
      depth={depth}
    >
      <div className="block-slots">
        {/* Condition Input (optional) */}
        <div className="block-slot">
          <label className="block-slot-label">
            显示条件 (可选)
          </label>
          <input
            type="text"
            className={`block-slot-input ${slotErrors['condition'] ? 'has-error' : ''}`}
            value={condition || ''}
            onChange={handleConditionChange}
            placeholder="例如: points >= 10"
            title={slotErrors['condition']}
          />
        </div>
        
        {/* Children Container with drag-drop support */}
        <div 
          ref={childrenContainerRef}
          className={`choice-children-container ${children.length === 0 ? 'empty' : ''} ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {children.length === 0 ? (
            <div className="block-children-container empty">
              <span className="block-children-placeholder">
                拖拽积木到这里
              </span>
            </div>
          ) : (
            <div className="block-children-container">
              {children.map(child => 
                renderChildBlock ? renderChildBlock(child, depth + 1) : null
              )}
            </div>
          )}
          
          {/* Drop indicator - only show when actively dragging over */}
          {isDragOver && dropIndex !== null && (
            <div 
              className="choice-drop-indicator"
              style={{ 
                top: children.length === 0 ? '50%' : `${dropIndex * 40}px` 
              }}
            />
          )}
        </div>
      </div>
    </BaseBlock>
  )
}

export default MenuBlock
