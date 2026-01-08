/**
 * FlowBlock Component
 * 流程积木组件
 * 
 * Provides flow control blocks: Jump, Call, Return, and If/Elif/Else.
 * 
 * Requirements: 5.5-5.8, 9.1, 10.1 (Advanced Properties)
 */

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { Block, BlockSlot, SlotOption } from '../types'
import { BaseBlock, BaseBlockProps } from './BaseBlock'
import { AdvancedPanel } from './AdvancedPanel'
import './Block.css'

/**
 * Props for FlowBlock component
 */
export interface FlowBlockProps extends Omit<BaseBlockProps, 'children'> {
  /** Available labels for jump/call targets */
  availableLabels?: SlotOption[]
  /** Callback when a slot value changes */
  onSlotChange?: (blockId: string, slotName: string, value: unknown) => void
  /** Validation errors for slots */
  slotErrors?: Record<string, string>
  /** Render function for child blocks */
  renderChildBlock?: (block: Block, depth: number) => React.ReactNode
  /** Current depth level */
  depth?: number
  /** Callback when a block is dropped into this container */
  onBlockDrop?: (blockType: string, containerId: string, index: number) => void
  /** Callback when an existing block is moved into this container */
  onBlockMove?: (blockId: string, containerId: string, index: number) => void
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
 * Count total blocks in a tree (including nested children)
 */
function countTotalBlocks(blocks: Block[]): number {
  let count = 0
  for (const block of blocks) {
    count += 1
    if (block.children && block.children.length > 0) {
      count += countTotalBlocks(block.children)
    }
  }
  return count
}

/**
 * Get collapsed summary for If block
 */
function getIfCollapsedSummary(block: Block): string {
  const children = block.children || []
  
  // Separate children into true branch and else/elif branches
  const trueBranchChildren: Block[] = []
  const elseBranches: Block[] = []
  
  for (const child of children) {
    if (child.type === 'elif' || child.type === 'else') {
      elseBranches.push(child)
    } else {
      trueBranchChildren.push(child)
    }
  }
  
  // Count branches: 1 (true branch) + number of elif/else branches
  const branchCount = 1 + elseBranches.length
  
  // Count total blocks in all branches
  let totalBlocks = trueBranchChildren.length
  for (const branch of elseBranches) {
    totalBlocks += 1 // Count the elif/else block itself
    if (branch.children) {
      totalBlocks += branch.children.length
    }
  }
  
  return `${branchCount}个分支，${totalBlocks}个积木`
}

/**
 * FlowBlock - Flow control block component
 * 
 * Implements Requirements:
 * - 5.5: Jump block contains target label selection
 * - 5.6: Call block contains target label selection
 * - 5.7: Return block represents flow end, no child blocks
 * - 5.8: If block as container with condition and true/false branches
 * - 9.1: Call block advanced properties (arguments, fromLabel)
 * - 10.1: Jump block advanced properties (expression)
 */
export const FlowBlock: React.FC<FlowBlockProps> = ({
  block,
  availableLabels = [],
  onSlotChange,
  slotErrors = {},
  renderChildBlock,
  depth = 0,
  onBlockDrop,
  onBlockMove,
  ...baseProps
}) => {
  // Drag-drop state for If block
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
   * Handle slot value change
   */
  const handleSlotChange = useCallback((slotName: string, value: unknown) => {
    onSlotChange?.(block.id, slotName, value)
  }, [block.id, onSlotChange])
  
  /**
   * Get advanced slots for the current block type
   */
  const advancedSlots = useMemo((): BlockSlot[] => {
    return block.slots.filter(slot => slot.advanced === true)
  }, [block.slots])
  
  /**
   * Calculate drop index based on mouse Y position
   */
  const calculateDropIndex = useCallback((clientY: number): number => {
    const children = block.children || []
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
  }, [block.children])
  
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
  
  // Check for errors
  const hasSlotErrors = Object.keys(slotErrors).length > 0
  const hasError = baseProps.hasError || hasSlotErrors
  
  // Render different content based on block type
  const renderContent = () => {
    switch (block.type) {
      case 'jump':
        return renderJumpContent()
      case 'call':
        return renderCallContent()
      case 'return':
        return renderReturnContent()
      case 'if':
        return renderIfContent()
      case 'elif':
        return renderElifContent()
      case 'else':
        return renderElseContent()
      default:
        return null
    }
  }
  
  /**
   * Render Jump block content (target label selection)
   */
  const renderJumpContent = () => {
    const target = getSlotValue(block, 'target') as string
    const isExpression = getSlotValue(block, 'expression') === true || getSlotValue(block, 'expression') === 'true'
    
    return (
      <div className="block-slots">
        {/* Expression mode checkbox row */}
        <div className="expression-mode-row">
          <label className="expression-checkbox-label">
            <input
              type="checkbox"
              checked={isExpression}
              onChange={(e) => handleSlotChange('expression', e.target.checked ? 'true' : 'false')}
              className="expression-checkbox"
            />
            <span>表达式模式</span>
          </label>
        </div>
        
        <div className="flow-target-row">
          <span className="flow-target-label">跳转到:</span>
          {isExpression ? (
            <input
              type="text"
              className={`block-slot-input flow-target-input ${slotErrors['target'] ? 'has-error' : ''}`}
              value={target || ''}
              onChange={(e) => handleSlotChange('target', e.target.value)}
              placeholder="输入表达式，如: next_chapter"
              title={slotErrors['target']}
            />
          ) : (
            <select
              className={`block-slot-input block-slot-select flow-target-select ${slotErrors['target'] ? 'has-error' : ''}`}
              value={target || ''}
              onChange={(e) => handleSlotChange('target', e.target.value)}
              title={slotErrors['target']}
            >
              <option value="">选择目标 Label...</option>
              {availableLabels.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon ? `${option.icon} ${option.label}` : option.label}
                </option>
              ))}
            </select>
          )}
        </div>
        {slotErrors['target'] && (
          <span className="slot-error-message">{slotErrors['target']}</span>
        )}
      </div>
    )
  }
  
  /**
   * Render Call block content (target label selection)
   */
  const renderCallContent = () => {
    const target = getSlotValue(block, 'target') as string
    const isExpression = getSlotValue(block, 'expression') === true || getSlotValue(block, 'expression') === 'true'
    
    return (
      <div className="block-slots">
        {/* Expression mode checkbox row */}
        <div className="expression-mode-row">
          <label className="expression-checkbox-label">
            <input
              type="checkbox"
              checked={isExpression}
              onChange={(e) => handleSlotChange('expression', e.target.checked ? 'true' : 'false')}
              className="expression-checkbox"
            />
            <span>表达式模式</span>
          </label>
        </div>
        
        <div className="flow-target-row">
          <span className="flow-target-label">调用:</span>
          {isExpression ? (
            <input
              type="text"
              className={`block-slot-input flow-target-input ${slotErrors['target'] ? 'has-error' : ''}`}
              value={target || ''}
              onChange={(e) => handleSlotChange('target', e.target.value)}
              placeholder="输入表达式，如: target_label"
              title={slotErrors['target']}
            />
          ) : (
            <select
              className={`block-slot-input block-slot-select flow-target-select ${slotErrors['target'] ? 'has-error' : ''}`}
              value={target || ''}
              onChange={(e) => handleSlotChange('target', e.target.value)}
              title={slotErrors['target']}
            >
              <option value="">选择目标 Label...</option>
              {availableLabels.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon ? `${option.icon} ${option.label}` : option.label}
                </option>
              ))}
            </select>
          )}
        </div>
        {slotErrors['target'] && (
          <span className="slot-error-message">{slotErrors['target']}</span>
        )}
        
        {/* Advanced Panel for Call block - excluding expression since it's now a checkbox */}
        {advancedSlots.filter(s => s.name !== 'expression').length > 0 && (
          <AdvancedPanel
            slots={advancedSlots.filter(s => s.name !== 'expression')}
            onSlotChange={handleSlotChange}
            slotErrors={slotErrors}
            panelId={`call-${block.id}`}
          />
        )}
      </div>
    )
  }
  
  /**
   * Render Return block content (no properties)
   */
  const renderReturnContent = () => {
    // Return block has no content
    return null
  }
  
  /**
   * Render If block content (condition + branches)
   */
  const renderIfContent = () => {
    const condition = getSlotValue(block, 'condition') as string
    const children = block.children || []
    
    // Separate children into true branch (regular children) and else/elif blocks
    const trueBranchChildren: Block[] = []
    const elseBranches: Block[] = []
    
    for (const child of children) {
      if (child.type === 'elif' || child.type === 'else') {
        elseBranches.push(child)
      } else {
        trueBranchChildren.push(child)
      }
    }
    
    return (
      <div className="block-slots">
        {/* Condition Input */}
        <div className="block-slot">
          <label className={`block-slot-label ${isSlotRequired(block, 'condition') ? 'required' : ''}`}>
            条件表达式
          </label>
          <input
            type="text"
            className={`block-slot-input ${slotErrors['condition'] ? 'has-error' : ''}`}
            value={condition || ''}
            onChange={(e) => handleSlotChange('condition', e.target.value)}
            placeholder="例如: points >= 10"
            title={slotErrors['condition']}
          />
        </div>
        
        {/* Branches Container with drag-drop support for elif/else */}
        <div 
          ref={childrenContainerRef}
          className={`if-branches-container ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* True Branch */}
          <div className="if-branch true-branch">
            <div className="if-branch-header">
              <span>✅ 条件为真时执行:</span>
            </div>
            <div 
              className={`if-branch-children ${trueBranchChildren.length === 0 ? 'empty' : ''}`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {trueBranchChildren.length === 0 ? (
                <div className="block-children-container empty">
                  <span className="block-children-placeholder">
                    拖拽积木到这里
                  </span>
                </div>
              ) : (
                <div className="block-children-container">
                  {trueBranchChildren.map(child => 
                    renderChildBlock ? renderChildBlock(child, depth + 1) : null
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Elif/Else Branches */}
          {elseBranches.map(branch => (
            renderChildBlock ? renderChildBlock(branch, depth) : null
          ))}
          
          {/* Drop indicator for elif/else */}
          {isDragOver && (
            <div 
              className="if-drop-indicator"
            />
          )}
        </div>
      </div>
    )
  }
  
  /**
   * Render Elif block content (condition + children)
   */
  const renderElifContent = () => {
    const condition = getSlotValue(block, 'condition') as string
    const children = block.children || []
    
    return (
      <div className="block-slots">
        {/* Condition Input */}
        <div className="block-slot">
          <label className={`block-slot-label ${isSlotRequired(block, 'condition') ? 'required' : ''}`}>
            否则如果条件
          </label>
          <input
            type="text"
            className={`block-slot-input ${slotErrors['condition'] ? 'has-error' : ''}`}
            value={condition || ''}
            onChange={(e) => handleSlotChange('condition', e.target.value)}
            placeholder="例如: points >= 5"
            title={slotErrors['condition']}
          />
        </div>
        
        {/* Children Container with drag-drop support */}
        <div 
          ref={childrenContainerRef}
          className={`block-children-container ${children.length === 0 ? 'empty' : ''} ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {children.length === 0 ? (
            <span className="block-children-placeholder">
              拖拽积木到这里
            </span>
          ) : (
            children.map(child => 
              renderChildBlock ? renderChildBlock(child, depth + 1) : null
            )
          )}
          
          {/* Drop indicator */}
          {isDragOver && (
            <div className="elif-drop-indicator" />
          )}
        </div>
      </div>
    )
  }
  
  /**
   * Render Else block content (children only)
   */
  const renderElseContent = () => {
    const children = block.children || []
    
    return (
      <div className="block-slots">
        <div className="if-branch false-branch">
          <div className="if-branch-header">
            <span>❌ 否则执行:</span>
          </div>
          <div 
            ref={childrenContainerRef}
            className={`if-branch-children ${children.length === 0 ? 'empty' : ''} ${isDragOver ? 'drag-over' : ''}`}
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
            
            {/* Drop indicator */}
            {isDragOver && (
              <div className="else-drop-indicator" />
            )}
          </div>
        </div>
      </div>
    )
  }
  
  // Determine if this is a container type
  const isContainer = ['if', 'elif', 'else'].includes(block.type)
  const children = block.children || []
  
  // For If blocks, always show collapse button since they have branches
  // For elif/else, show collapse button if they have children
  const shouldShowCollapseButton = block.type === 'if' || (isContainer && children.length > 0)
  
  // Get custom collapsed summary for If blocks
  const collapsedSummary = block.type === 'if' ? getIfCollapsedSummary(block) : undefined
  
  return (
    <BaseBlock
      {...baseProps}
      block={block}
      hasError={hasError}
      className={`flow-block flow-block-${block.type} ${block.type === 'return' ? 'return-block' : ''} ${baseProps.className || ''}`}
      showCollapseButton={shouldShowCollapseButton}
      collapsedSummary={collapsedSummary}
      depth={depth}
    >
      {renderContent()}
    </BaseBlock>
  )
}

export default FlowBlock
