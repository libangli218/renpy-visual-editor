/**
 * FlowBlock Component
 * 流程积木组件
 * 
 * Provides flow control blocks: Jump, Call, Return, and If/Elif/Else.
 * 
 * Requirements: 5.5-5.8
 */

import React, { useCallback } from 'react'
import { Block, SlotOption } from '../types'
import { BaseBlock, BaseBlockProps } from './BaseBlock'
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
 * FlowBlock - Flow control block component
 * 
 * Implements Requirements:
 * - 5.5: Jump block contains target label selection
 * - 5.6: Call block contains target label selection
 * - 5.7: Return block represents flow end, no child blocks
 * - 5.8: If block as container with condition and true/false branches
 */
export const FlowBlock: React.FC<FlowBlockProps> = ({
  block,
  availableLabels = [],
  onSlotChange,
  slotErrors = {},
  renderChildBlock,
  depth = 0,
  ...baseProps
}) => {
  /**
   * Handle slot value change
   */
  const handleSlotChange = useCallback((slotName: string, value: unknown) => {
    onSlotChange?.(block.id, slotName, value)
  }, [block.id, onSlotChange])
  
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
    
    return (
      <div className="block-slots">
        <div className="flow-target-row">
          <span className="flow-target-label">跳转到:</span>
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
    
    return (
      <div className="block-slots">
        <div className="flow-target-row">
          <span className="flow-target-label">调用:</span>
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
        </div>
        {slotErrors['target'] && (
          <span className="slot-error-message">{slotErrors['target']}</span>
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
        
        {/* Branches Container */}
        <div className="if-branches-container">
          {/* True Branch */}
          <div className="if-branch true-branch">
            <div className="if-branch-header">
              <span>✅ 条件为真时执行:</span>
            </div>
            <div className={`if-branch-children ${trueBranchChildren.length === 0 ? 'empty' : ''}`}>
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
        
        {/* Children Container */}
        <div className={`block-children-container ${children.length === 0 ? 'empty' : ''}`}>
          {children.length === 0 ? (
            <span className="block-children-placeholder">
              拖拽积木到这里
            </span>
          ) : (
            children.map(child => 
              renderChildBlock ? renderChildBlock(child, depth + 1) : null
            )
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
          <div className={`if-branch-children ${children.length === 0 ? 'empty' : ''}`}>
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
          </div>
        </div>
      </div>
    )
  }
  
  // Determine if this is a container type
  const isContainer = ['if', 'elif', 'else'].includes(block.type)
  const children = block.children || []
  
  return (
    <BaseBlock
      {...baseProps}
      block={block}
      hasError={hasError}
      className={`flow-block flow-block-${block.type} ${block.type === 'return' ? 'return-block' : ''} ${baseProps.className || ''}`}
      showCollapseButton={isContainer && children.length > 0}
      depth={depth}
    >
      {renderContent()}
    </BaseBlock>
  )
}

export default FlowBlock
