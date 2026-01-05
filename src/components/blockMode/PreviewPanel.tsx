/**
 * PreviewPanel Component
 * 实时预览面板
 * 
 * Displays a real-time preview of the game state including:
 * - Background image
 * - Characters (position, expression)
 * - Dialogue box and text
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { GameState, CharacterState, Block } from './types'
import { createPreviewStateCalculator } from './PreviewStateCalculator'
import './PreviewPanel.css'

/**
 * Props for PreviewPanel component
 */
export interface PreviewPanelProps {
  /** Block tree for state calculation */
  blockTree: Block | null
  /** Currently selected block ID */
  selectedBlockId: string | null
  /** Game state override (for playback) */
  gameState?: GameState
  /** Whether to use calculated state from selected block */
  useCalculatedState?: boolean
  /** Project path for resolving image URLs */
  projectPath?: string | null
  /** Callback when panel is resized */
  onResize?: (width: number) => void
  /** Initial width of the panel */
  initialWidth?: number
  /** Minimum width of the panel */
  minWidth?: number
  /** Maximum width of the panel */
  maxWidth?: number
  /** Custom class name */
  className?: string
}

/**
 * Character position mapping to CSS
 */
const POSITION_STYLES: Record<string, React.CSSProperties> = {
  left: { left: '15%', transform: 'translateX(-50%)' },
  center: { left: '50%', transform: 'translateX(-50%)' },
  right: { left: '85%', transform: 'translateX(-50%)' },
  // Additional positions
  'far-left': { left: '5%', transform: 'translateX(-50%)' },
  'far-right': { left: '95%', transform: 'translateX(-50%)' },
  'left-center': { left: '33%', transform: 'translateX(-50%)' },
  'right-center': { left: '67%', transform: 'translateX(-50%)' },
}

/**
 * Default game state when nothing is selected
 */
const DEFAULT_GAME_STATE: GameState = {
  background: undefined,
  characters: [],
  dialogue: undefined,
  music: undefined,
  transition: undefined,
}

/**
 * Image extensions to try when loading images
 */
const IMAGE_EXTENSIONS = ['.jpg', '.png', '.jpeg', '.webp', '.gif']

/**
 * PreviewPanel - Real-time preview panel component
 * 
 * Implements Requirements:
 * - 11.1: Display real-time preview panel
 * - 11.2: Update background and characters when scene blocks change
 * - 11.3: Display dialogue box and text when dialogue blocks change
 * - 11.4: Show state after selected block execution
 * - 11.5: Support resizing preview window
 */
export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  blockTree,
  selectedBlockId,
  gameState: externalGameState,
  useCalculatedState = true,
  projectPath,
  onResize,
  initialWidth = 300,
  minWidth = 200,
  maxWidth = 500,
  className = '',
}) => {
  // State for panel width (resizable)
  const [panelWidth, setPanelWidth] = useState(initialWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [backgroundDataUrl, setBackgroundDataUrl] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  // Create preview state calculator
  const calculator = useMemo(() => createPreviewStateCalculator(), [])

  // Calculate game state based on selected block
  const calculatedState = useMemo(() => {
    if (!useCalculatedState || !blockTree || !selectedBlockId) {
      return DEFAULT_GAME_STATE
    }

    // Get children blocks for calculation
    const blocks = blockTree.children || []
    return calculator.calculateState(blocks, selectedBlockId)
  }, [blockTree, selectedBlockId, useCalculatedState, calculator])

  // Use external state if provided, otherwise use calculated state
  const gameState = externalGameState || calculatedState

  // Load background image as base64 when background changes
  useEffect(() => {
    const loadBackgroundImage = async () => {
      if (!gameState.background || !projectPath) {
        setBackgroundDataUrl(null)
        return
      }

      // Try to load the image with different extensions
      const basePath = `${projectPath}/game/images/${gameState.background}`
      
      for (const ext of IMAGE_EXTENSIONS) {
        const filePath = `${basePath}${ext}`
        try {
          // Check if we're in Electron environment
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const electronAPI = window.electronAPI as any
          if (electronAPI?.readFileAsBase64) {
            const dataUrl = await electronAPI.readFileAsBase64(filePath)
            if (dataUrl) {
              console.log('[PreviewPanel] Loaded background:', filePath)
              setBackgroundDataUrl(dataUrl)
              return
            }
          }
        } catch (error) {
          // Try next extension
          continue
        }
      }
      
      console.log('[PreviewPanel] Failed to load background:', gameState.background)
      setBackgroundDataUrl(null)
    }

    loadBackgroundImage()
  }, [gameState.background, projectPath])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = panelWidth
  }, [panelWidth])

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = resizeStartX.current - e.clientX
      const newWidth = Math.min(maxWidth, Math.max(minWidth, resizeStartWidth.current + delta))
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      onResize?.(panelWidth)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth, panelWidth, onResize])

  // Render character
  const renderCharacter = useCallback((character: CharacterState, index: number) => {
    const positionStyle = POSITION_STYLES[character.position] || POSITION_STYLES.center

    return (
      <div
        key={`${character.name}-${index}`}
        className="preview-character"
        style={positionStyle}
        title={`${character.name}${character.expression ? ` (${character.expression})` : ''}`}
      >
        <div className="character-sprite">
          {/* Character image placeholder - in real implementation, load actual image */}
          <div className="character-placeholder">
            <span className="character-icon">👤</span>
            <span className="character-name">{character.name}</span>
            {character.expression && (
              <span className="character-expression">{character.expression}</span>
            )}
          </div>
        </div>
      </div>
    )
  }, [])

  // Render dialogue box
  const renderDialogue = useCallback(() => {
    if (!gameState.dialogue) return null

    return (
      <div className="preview-dialogue-box">
        {gameState.dialogue.speaker && (
          <div className="dialogue-speaker">
            <span className="speaker-name">{gameState.dialogue.speaker}</span>
          </div>
        )}
        <div className="dialogue-text">
          {gameState.dialogue.text || '...'}
        </div>
      </div>
    )
  }, [gameState.dialogue])

  // Check if there's any content to display
  const hasContent = backgroundDataUrl || 
                     gameState.characters.length > 0 || 
                     gameState.dialogue

  return (
    <div
      ref={panelRef}
      className={`preview-panel ${className} ${isResizing ? 'resizing' : ''}`}
      style={{ width: panelWidth }}
    >
      {/* Resize Handle */}
      <div
        className="preview-resize-handle"
        onMouseDown={handleResizeStart}
        title="拖拽调整大小"
      />

      {/* Header */}
      <div className="preview-panel-header">
        <span className="preview-panel-icon">👁️</span>
        <span className="preview-panel-title">预览</span>
        {gameState.music && (
          <span className="preview-music-indicator" title={`正在播放: ${gameState.music}`}>
            🎵
          </span>
        )}
      </div>

      {/* Preview Content */}
      <div className="preview-panel-content">
        {hasContent ? (
          <div className="preview-stage">
            {/* Background Layer */}
            <div 
              className="preview-background"
              style={{
                backgroundImage: backgroundDataUrl 
                  ? `url(${backgroundDataUrl})` 
                  : undefined,
              }}
            >
              {!backgroundDataUrl && (
                <div className="background-placeholder">
                  <span className="placeholder-icon">🎬</span>
                  <span className="placeholder-text">无背景</span>
                </div>
              )}
            </div>

            {/* Characters Layer */}
            <div className="preview-characters">
              {gameState.characters.map((char, index) => renderCharacter(char, index))}
            </div>

            {/* Dialogue Layer */}
            <div className="preview-dialogue">
              {renderDialogue()}
            </div>

            {/* Transition Overlay */}
            {gameState.transition && (
              <div className="preview-transition-indicator">
                <span className="transition-icon">✨</span>
                <span className="transition-name">{gameState.transition}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="preview-empty">
            <span className="empty-icon">🎮</span>
            <span className="empty-text">
              {selectedBlockId 
                ? '选中的积木无预览内容' 
                : '选择一个积木查看预览效果'}
            </span>
          </div>
        )}
      </div>

      {/* Footer with state info */}
      <div className="preview-panel-footer">
        {selectedBlockId ? (
          <span className="preview-status">
            <span className="status-icon">📍</span>
            <span className="status-text">已选中积木</span>
          </span>
        ) : (
          <span className="preview-status inactive">
            <span className="status-text">未选中</span>
          </span>
        )}
      </div>
    </div>
  )
}

export default PreviewPanel
