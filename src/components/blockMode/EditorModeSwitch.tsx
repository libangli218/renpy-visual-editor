/**
 * EditorModeSwitch Component
 * 编辑器模式切换组件
 * 
 * Provides mode switching functionality between flow mode and block mode.
 * Supports keyboard shortcuts for quick mode switching.
 * 
 * Requirements: 9.1
 */

import React, { useCallback, useEffect } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { EditorMode } from '../../types/editor'
import './EditorModeSwitch.css'

/**
 * Props for EditorModeSwitch component
 */
export interface EditorModeSwitchProps {
  /** Custom class name */
  className?: string
  /** Whether to show the block mode option (only when a label is selected) */
  showBlockMode?: boolean
  /** The label name for block mode (required when showBlockMode is true) */
  labelName?: string
  /** Callback when mode changes */
  onModeChange?: (mode: EditorMode) => void
}

/**
 * Mode configuration for display
 */
interface ModeConfig {
  mode: EditorMode
  label: string
  icon: string
  shortcut: string
  description: string
}

/**
 * Available modes configuration
 */
const MODES: ModeConfig[] = [
  {
    mode: 'story',
    label: 'Story',
    icon: '📖',
    shortcut: 'Alt+1',
    description: '线性脚本编辑',
  },
  {
    mode: 'node',
    label: 'Flow',
    icon: '🔗',
    shortcut: 'Alt+2',
    description: '流程图编辑',
  },
  {
    mode: 'block',
    label: 'Block',
    icon: '🧩',
    shortcut: 'Alt+3',
    description: '积木模式编辑',
  },
]

/**
 * EditorModeSwitch - Mode switching component
 * 
 * Implements Requirements:
 * - 9.1: Provide mode switch button/shortcut
 */
export const EditorModeSwitch: React.FC<EditorModeSwitchProps> = ({
  className = '',
  showBlockMode = false,
  labelName,
  onModeChange,
}) => {
  const { mode, setMode, enterBlockMode, exitBlockMode, currentBlockLabel } = useEditorStore()

  /**
   * Handle mode change
   */
  const handleModeChange = useCallback((newMode: EditorMode) => {
    if (newMode === mode) return

    if (newMode === 'block') {
      // Enter block mode requires a label name
      if (labelName) {
        enterBlockMode(labelName)
        onModeChange?.(newMode)
      }
    } else if (mode === 'block') {
      // Exit block mode
      exitBlockMode()
      onModeChange?.(newMode)
    } else {
      // Switch between story and node modes
      setMode(newMode)
      onModeChange?.(newMode)
    }
  }, [mode, labelName, setMode, enterBlockMode, exitBlockMode, onModeChange])

  /**
   * Handle keyboard shortcuts
   * Alt+1: Story mode
   * Alt+2: Node/Flow mode
   * Alt+3: Block mode (if available)
   * Escape: Exit block mode
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt+1: Story mode
      if (event.altKey && event.key === '1') {
        event.preventDefault()
        handleModeChange('story')
        return
      }

      // Alt+2: Node/Flow mode
      if (event.altKey && event.key === '2') {
        event.preventDefault()
        handleModeChange('node')
        return
      }

      // Alt+3: Block mode (if available)
      if (event.altKey && event.key === '3' && showBlockMode && labelName) {
        event.preventDefault()
        handleModeChange('block')
        return
      }

      // Escape: Exit block mode
      if (event.key === 'Escape' && mode === 'block') {
        event.preventDefault()
        exitBlockMode()
        onModeChange?.('node')
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, showBlockMode, labelName, handleModeChange, exitBlockMode, onModeChange])

  // Filter modes based on showBlockMode
  const availableModes = showBlockMode 
    ? MODES 
    : MODES.filter(m => m.mode !== 'block')

  return (
    <div className={`editor-mode-switch ${className}`} role="tablist" aria-label="Editor mode">
      {availableModes.map((modeConfig) => {
        const isActive = mode === modeConfig.mode
        const isDisabled = modeConfig.mode === 'block' && !labelName

        return (
          <button
            key={modeConfig.mode}
            role="tab"
            aria-selected={isActive}
            className={`mode-switch-button ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && handleModeChange(modeConfig.mode)}
            disabled={isDisabled}
            title={`${modeConfig.description} (${modeConfig.shortcut})`}
          >
            <span className="mode-switch-icon">{modeConfig.icon}</span>
            <span className="mode-switch-label">{modeConfig.label}</span>
          </button>
        )
      })}

      {/* Show current block label when in block mode */}
      {mode === 'block' && currentBlockLabel && (
        <div className="mode-switch-label-indicator">
          <span className="label-indicator-icon">🏷️</span>
          <span className="label-indicator-text">{currentBlockLabel}</span>
        </div>
      )}
    </div>
  )
}

export default EditorModeSwitch
