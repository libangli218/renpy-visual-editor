import React, { useState, useCallback, useRef, useEffect } from 'react'
import { parseShortcutInput, getShortcutType, getAvailableShortcuts } from './shortcutParser'
import { ASTNode, RenpyScript } from '../../types/ast'

interface QuickInputProps {
  onSubmit: (node: ASTNode) => void
  placeholder?: string
}

/**
 * QuickInput component - Fast input with shortcut support
 * Implements Requirements 6.3: Shortcut input
 * 
 * Shortcuts:
 * - `s:text` - Character dialogue
 * - `>text` - Narration
 * - `[show character]` - Show character
 * - `[hide character]` - Hide character
 * - `[scene background]` - Scene change
 */
export const QuickInput: React.FC<QuickInputProps> = ({
  onSubmit,
  placeholder = 'Type here... (s: for dialogue, > for narration, [show/hide/scene])',
}) => {
  const [value, setValue] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update hint based on input
  useEffect(() => {
    const shortcutType = getShortcutType(value)
    if (shortcutType) {
      const hints: Record<string, string> = {
        dialogue: 'Character dialogue',
        narration: 'Narration',
        extend: 'Extend previous dialogue',
        show: 'Show character',
        hide: 'Hide character',
        scene: 'Scene change',
      }
      setHint(hints[shortcutType] || null)
    } else {
      setHint(null)
    }
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && value.trim()) {
        e.preventDefault()
        const result = parseShortcutInput(value)
        if (result.node) {
          onSubmit(result.node)
          setValue('')
        }
      } else if (e.key === 'Escape') {
        setValue('')
        inputRef.current?.blur()
      } else if (e.key === '?' && e.ctrlKey) {
        e.preventDefault()
        setShowHelp(!showHelp)
      }
    },
    [value, onSubmit, showHelp]
  )

  const shortcuts = getAvailableShortcuts()

  return (
    <div className="quick-input-container">
      <div className="quick-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="quick-input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Quick input"
        />
        {hint && <span className="quick-input-hint">{hint}</span>}
        <button
          className="quick-input-help-btn"
          onClick={() => setShowHelp(!showHelp)}
          aria-label="Show shortcuts help"
          title="Shortcuts (Ctrl+?)"
        >
          ?
        </button>
      </div>
      {showHelp && (
        <div className="quick-input-help">
          <h4>Shortcuts</h4>
          <ul>
            {shortcuts.map((shortcut) => (
              <li key={shortcut.pattern}>
                <code>{shortcut.pattern}</code>
                <span>{shortcut.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Insert a node into the AST at the end
 */
export function insertNodeAtEnd(ast: RenpyScript, node: ASTNode): RenpyScript {
  return {
    ...ast,
    statements: [...ast.statements, node],
  }
}
