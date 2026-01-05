/**
 * CharacterSlot Component
 * 角色选择槽组件
 * 
 * Provides character selection with autocomplete support.
 * Includes narrator (empty) option for dialogue without speaker.
 * 
 * Requirements: 3.2, 3.3, 14.4
 */

import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import './Slots.css'

/**
 * Character definition for autocomplete
 */
export interface CharacterDefinition {
  /** Character ID/variable name */
  id: string
  /** Display name */
  name: string
  /** Character color (optional) */
  color?: string
  /** Character icon/avatar (optional) */
  icon?: string
}

/**
 * Props for CharacterSlot component
 */
export interface CharacterSlotProps {
  /** Slot name for identification */
  name: string
  /** Display label */
  label?: string
  /** Current value (character ID or null for narrator) */
  value: string | null
  /** Available characters for selection */
  characters: CharacterDefinition[]
  /** Whether the slot is required */
  required?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Whether to show narrator option */
  showNarrator?: boolean
  /** Narrator option label */
  narratorLabel?: string
  /** Whether the slot is disabled */
  disabled?: boolean
  /** Error message to display */
  error?: string
  /** Callback when value changes */
  onChange?: (name: string, value: string | null) => void
  /** Callback when selection loses focus */
  onBlur?: (name: string, value: string | null) => void
  /** Additional class name */
  className?: string
}

/**
 * CharacterSlot - Character selection slot with autocomplete
 * 
 * Implements Requirements:
 * - 3.2: Show dropdown list of defined characters
 * - 3.3: Support narrator mode (empty character)
 * - 14.4: Auto-complete for character names
 */
export const CharacterSlot: React.FC<CharacterSlotProps> = ({
  name,
  label,
  value,
  characters,
  required = false,
  placeholder = '输入或选择角色...',
  showNarrator = true,
  narratorLabel = '旁白 (无角色)',
  disabled = false,
  error,
  onChange,
  onBlur,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  /**
   * Get display value for the input
   */
  const displayValue = useMemo(() => {
    if (value === null || value === '') {
      return ''
    }
    const character = characters.find(c => c.id === value)
    return character?.name || value
  }, [value, characters])

  /**
   * Filter characters based on input
   */
  const filteredCharacters = useMemo(() => {
    const query = inputValue.toLowerCase().trim()
    if (!query) {
      return characters
    }
    return characters.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query)
    )
  }, [characters, inputValue])

  /**
   * Build options list including narrator
   */
  const options = useMemo(() => {
    const result: Array<CharacterDefinition | { id: '__narrator__'; name: string; isNarrator: true }> = []
    
    if (showNarrator) {
      result.push({ id: '__narrator__', name: narratorLabel, isNarrator: true })
    }
    
    result.push(...filteredCharacters)
    return result
  }, [filteredCharacters, showNarrator, narratorLabel])

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true)
    setHighlightedIndex(-1)
  }, [])

  /**
   * Handle option selection
   */
  const handleSelect = useCallback((option: typeof options[0]) => {
    if ('isNarrator' in option && option.isNarrator) {
      onChange?.(name, null)
      setInputValue('')
    } else {
      onChange?.(name, option.id)
      setInputValue('')
    }
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.blur()
  }, [name, onChange])

  /**
   * Handle input focus
   */
  const handleFocus = useCallback(() => {
    setIsOpen(true)
    setInputValue('')
  }, [])

  /**
   * Handle input blur
   */
  const handleBlur = useCallback(() => {
    // Delay to allow click on option
    setTimeout(() => {
      if (!listRef.current?.contains(document.activeElement)) {
        setIsOpen(false)
        setInputValue('')
        onBlur?.(name, value)
      }
    }, 150)
  }, [name, value, onBlur])

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < options.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : options.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelect(options[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setInputValue('')
        break
    }
  }, [isOpen, options, highlightedIndex, handleSelect])

  /**
   * Handle clear button click
   */
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(name, null)
    setInputValue('')
    inputRef.current?.focus()
  }, [name, onChange])

  /**
   * Scroll highlighted option into view
   */
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('.character-autocomplete-item')
      const item = items[highlightedIndex] as HTMLElement
      if (item) {
        item.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  // Check if current value is narrator
  const isNarrator = value === null || value === ''

  // Build class names
  const slotClasses = [
    'slot',
    'character-slot',
    required && 'required',
    error && 'has-error',
    disabled && 'disabled',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={slotClasses}>
      {label && (
        <label className={`slot-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}

      <div className="character-slot-wrapper">
        <div className="character-slot-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className={`slot-input character-slot-input ${error ? 'has-error' : ''}`}
            value={isOpen ? inputValue : displayValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            aria-required={required}
            aria-invalid={!!error}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-describedby={error ? `${name}-error` : undefined}
            role="combobox"
            autoComplete="off"
          />

          {/* Clear button */}
          {value && !disabled && (
            <button
              type="button"
              className="character-slot-clear-btn"
              onClick={handleClear}
              title="清除"
              tabIndex={-1}
            >
              ✕
            </button>
          )}
        </div>

        {/* Narrator badge */}
        {isNarrator && showNarrator && !isOpen && (
          <span className="character-narrator-badge">
            🎭 旁白模式
          </span>
        )}

        {/* Autocomplete dropdown */}
        {isOpen && !disabled && (
          <div
            ref={listRef}
            className="character-autocomplete"
            role="listbox"
          >
            {options.length === 0 ? (
              <div className="character-autocomplete-item">
                <span className="character-autocomplete-name" style={{ color: 'var(--text-tertiary)' }}>
                  未找到匹配的角色
                </span>
              </div>
            ) : (
              options.map((option, index) => {
                const isNarratorOption = 'isNarrator' in option && option.isNarrator
                const isSelected = isNarratorOption
                  ? isNarrator
                  : value === option.id

                return (
                  <div
                    key={option.id}
                    className={[
                      'character-autocomplete-item',
                      highlightedIndex === index && 'highlighted',
                      isSelected && 'selected',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleSelect(option)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="character-autocomplete-icon">
                      {isNarratorOption ? '🎭' : (option as CharacterDefinition).icon || '👤'}
                    </span>
                    <span className={`character-autocomplete-name ${isNarratorOption ? 'character-autocomplete-narrator' : ''}`}>
                      {option.name}
                    </span>
                    {!isNarratorOption && (option as CharacterDefinition).color && (
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: (option as CharacterDefinition).color,
                          marginLeft: 'auto',
                        }}
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {error && (
        <span id={`${name}-error`} className="slot-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export default CharacterSlot
