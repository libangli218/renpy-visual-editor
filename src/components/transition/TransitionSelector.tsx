/**
 * Transition Selector Component
 * 
 * Dialog for selecting and configuring transition effects.
 * Implements Requirements 11.2, 11.3, 11.5
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useTransitionStore } from './transitionStore'
import {
  TransitionSelection,
  TransitionDefinition,
  TransitionCategory,
  BUILT_IN_TRANSITIONS,
  CATEGORY_INFO,
  getTransitionsByCategory,
  generateTransitionCode,
  parseTransitionCode,
  isValidTransitionCode,
} from './types'
import './TransitionSelector.css'

interface TransitionSelectorProps {
  isOpen: boolean
  initialTransition?: string
  onClose: () => void
  onSelect: (transitionCode: string) => void
}

/**
 * Get icon for transition category
 */
function getCategoryIcon(category: TransitionCategory): string {
  switch (category) {
    case 'basic':
      return '◐'
    case 'wipe':
      return '▶'
    case 'slide':
      return '↔'
    case 'push':
      return '⇄'
    case 'iris':
      return '◉'
    case 'special':
      return '✦'
    default:
      return '•'
  }
}

/**
 * Get icon for specific transition
 */
function getTransitionIcon(name: string): string {
  switch (name) {
    case 'dissolve':
      return '◐'
    case 'fade':
      return '◑'
    case 'pixellate':
      return '▦'
    case 'None':
      return '⊘'
    case 'wipeleft':
    case 'slideawayleft':
    case 'pushleft':
      return '◀'
    case 'wiperight':
    case 'slideright':
    case 'pushright':
      return '▶'
    case 'wipeup':
    case 'slideup':
    case 'pushup':
      return '▲'
    case 'wipedown':
    case 'slidedown':
    case 'pushdown':
      return '▼'
    case 'slideleft':
    case 'slideawayright':
      return '←'
    case 'slideawayup':
      return '↑'
    case 'slideawaydown':
      return '↓'
    case 'irisin':
      return '◎'
    case 'irisout':
      return '○'
    case 'move':
    case 'ease':
      return '↝'
    case 'squares':
      return '▢'
    case 'blinds':
      return '▤'
    case 'vpunch':
      return '↕'
    case 'hpunch':
      return '↔'
    case 'flash':
      return '☀'
    default:
      return '•'
  }
}

export const TransitionSelector: React.FC<TransitionSelectorProps> = ({
  isOpen,
  initialTransition,
  onClose,
  onSelect,
}) => {
  const { recentTransitions, addToRecent } = useTransitionStore()
  
  const [selectedCategory, setSelectedCategory] = useState<TransitionCategory>('basic')
  const [selectedTransition, setSelectedTransition] = useState<TransitionDefinition | null>(null)
  const [duration, setDuration] = useState<number | undefined>(undefined)
  const [customParams, setCustomParams] = useState<string>('')
  const [useCustomParams, setUseCustomParams] = useState(false)
  const [customTransition, setCustomTransition] = useState<string>('')

  // Get transitions for current category
  const categoryTransitions = useMemo(() => {
    return getTransitionsByCategory(selectedCategory)
  }, [selectedCategory])

  // Initialize from initial transition
  useEffect(() => {
    if (isOpen && initialTransition) {
      const parsed = parseTransitionCode(initialTransition)
      
      if (parsed.type === 'builtin') {
        const definition = BUILT_IN_TRANSITIONS.find(
          (t) => t.name === parsed.transition
        )
        if (definition) {
          setSelectedCategory(definition.category)
          setSelectedTransition(definition)
          setDuration(parsed.duration)
          if (parsed.customParams) {
            setCustomParams(parsed.customParams)
            setUseCustomParams(true)
          }
        }
      } else {
        setCustomTransition(parsed.transition)
      }
    } else if (isOpen) {
      // Reset to defaults
      setSelectedCategory('basic')
      setSelectedTransition(null)
      setDuration(undefined)
      setCustomParams('')
      setUseCustomParams(false)
      setCustomTransition('')
    }
  }, [isOpen, initialTransition])

  // Handle transition selection
  const handleTransitionSelect = (transition: TransitionDefinition) => {
    setSelectedTransition(transition)
    setDuration(transition.defaultDuration)
    setCustomParams('')
    setUseCustomParams(false)
    setCustomTransition('')
  }

  // Handle recent transition click
  const handleRecentClick = (code: string) => {
    const parsed = parseTransitionCode(code)
    
    if (parsed.type === 'builtin') {
      const definition = BUILT_IN_TRANSITIONS.find(
        (t) => t.name === parsed.transition
      )
      if (definition) {
        setSelectedCategory(definition.category)
        setSelectedTransition(definition)
        setDuration(parsed.duration)
        if (parsed.customParams) {
          setCustomParams(parsed.customParams)
          setUseCustomParams(true)
        }
      }
    } else {
      setCustomTransition(parsed.transition)
      setSelectedTransition(null)
    }
  }

  // Generate current code
  const currentCode = useMemo(() => {
    if (customTransition) {
      return customTransition
    }
    
    if (!selectedTransition) {
      return ''
    }

    if (useCustomParams && customParams) {
      return customParams
    }

    const selection: TransitionSelection = {
      type: 'builtin',
      transition: selectedTransition.name,
      duration: selectedTransition.supportsDuration ? duration : undefined,
    }

    return generateTransitionCode(selection)
  }, [selectedTransition, duration, customParams, useCustomParams, customTransition])

  // Handle apply
  const handleApply = () => {
    if (currentCode) {
      addToRecent(currentCode)
      onSelect(currentCode)
      onClose()
    }
  }

  // Check if can apply
  const canApply = customTransition 
    ? isValidTransitionCode(customTransition)
    : selectedTransition !== null

  if (!isOpen) {
    return null
  }

  return (
    <div className="transition-dialog-overlay" onClick={onClose}>
      <div className="transition-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="transition-dialog-header">
          <h2>Select Transition</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Recent transitions */}
        {recentTransitions.length > 0 && (
          <div className="recent-transitions">
            <div className="recent-transitions-label">Recent</div>
            <div className="recent-transitions-list">
              {recentTransitions.map((code, index) => (
                <button
                  key={index}
                  className="recent-transition-chip"
                  onClick={() => handleRecentClick(code)}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="transition-dialog-content">
          {/* Category sidebar */}
          <div className="transition-categories">
            {(Object.keys(CATEGORY_INFO) as TransitionCategory[]).map((category) => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {getCategoryIcon(category)} {CATEGORY_INFO[category].label}
              </button>
            ))}
          </div>

          {/* Transition list */}
          <div className="transition-list-container">
            <div className="transition-list">
              {categoryTransitions.map((transition) => (
                <div
                  key={transition.name}
                  className={`transition-item ${
                    selectedTransition?.name === transition.name ? 'selected' : ''
                  }`}
                  onClick={() => handleTransitionSelect(transition)}
                >
                  <div className="transition-item-icon">
                    {getTransitionIcon(transition.name)}
                  </div>
                  <div className="transition-item-info">
                    <div className="transition-item-name">{transition.displayName}</div>
                    <div className="transition-item-description">
                      {transition.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Options panel */}
            {selectedTransition && selectedTransition.supportsDuration && (
              <div className="transition-options">
                <div className="option-group">
                  <label htmlFor="duration">Duration</label>
                  <div className="duration-input-wrapper">
                    <input
                      id="duration"
                      type="number"
                      min="0"
                      step="0.1"
                      value={duration ?? ''}
                      onChange={(e) => setDuration(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder={selectedTransition.defaultDuration?.toString() || '0.5'}
                      disabled={useCustomParams}
                    />
                    <span className="duration-unit">seconds</span>
                  </div>
                </div>

                {selectedTransition.supportsCustomParams && (
                  <div className="option-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={useCustomParams}
                        onChange={(e) => setUseCustomParams(e.target.checked)}
                      />{' '}
                      Use custom parameters
                    </label>
                    {useCustomParams && (
                      <input
                        type="text"
                        value={customParams}
                        onChange={(e) => setCustomParams(e.target.value)}
                        placeholder={`e.g., Dissolve(0.5, alpha=True)`}
                        style={{ marginTop: '8px' }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Custom transition input */}
        <div className="custom-transition-section">
          <label htmlFor="custom-transition">Custom Transition</label>
          <input
            id="custom-transition"
            type="text"
            value={customTransition}
            onChange={(e) => {
              setCustomTransition(e.target.value)
              if (e.target.value) {
                setSelectedTransition(null)
              }
            }}
            placeholder="e.g., Dissolve(0.5, alpha=True) or my_custom_transition"
          />
          <div className="custom-hint">
            Enter any valid Ren'Py transition expression
          </div>
        </div>

        {/* Code preview */}
        {currentCode && (
          <div className="code-preview">
            <label>Generated Code:</label>
            <code>with {currentCode}</code>
          </div>
        )}

        {/* Actions */}
        <div className="dialog-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="apply-btn" 
            onClick={handleApply}
            disabled={!canApply}
          >
            Apply Transition
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline transition selector (compact dropdown version)
 */
interface InlineTransitionSelectorProps {
  value: string
  onChange: (value: string) => void
  onOpenDialog?: () => void
}

export const InlineTransitionSelector: React.FC<InlineTransitionSelectorProps> = ({
  value,
  onChange,
  onOpenDialog,
}) => {
  return (
    <div className="transition-selector-inline">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select transition...</option>
        {BUILT_IN_TRANSITIONS.map((transition) => (
          <option key={transition.name} value={transition.name}>
            {transition.displayName}
          </option>
        ))}
      </select>
      {onOpenDialog && (
        <button className="custom-btn" onClick={onOpenDialog}>
          Custom...
        </button>
      )}
    </div>
  )
}

export default TransitionSelector
