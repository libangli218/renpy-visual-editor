/**
 * PlaybackControls Component
 * 播放控制组件
 * 
 * Provides playback controls for the block editor:
 * - Play/Pause button
 * - Stop button
 * - Step forward/backward buttons
 * - Progress indicator
 * 
 * Requirements: 12.1, 12.4, 12.6
 */

import React, { useCallback, useMemo } from 'react'
import { Block } from './types'
import './PlaybackControls.css'

/**
 * Props for PlaybackControls component
 */
export interface PlaybackControlsProps {
  /** Whether playback is currently active */
  isPlaying: boolean
  /** Current block ID being played */
  currentBlockId: string | null
  /** Block tree for calculating progress */
  blockTree: Block | null
  /** Callback when play/pause is clicked */
  onPlayPause: () => void
  /** Callback when stop is clicked */
  onStop: () => void
  /** Callback when step forward is clicked */
  onStepForward: () => void
  /** Callback when step backward is clicked */
  onStepBackward: () => void
  /** Whether controls are disabled */
  disabled?: boolean
  /** Whether to show compact version */
  compact?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Helper function to flatten blocks for progress calculation
 */
function flattenBlocks(blocks: Block[]): Block[] {
  const result: Block[] = []
  for (const block of blocks) {
    result.push(block)
    if (block.children && block.children.length > 0) {
      result.push(...flattenBlocks(block.children))
    }
  }
  return result
}

/**
 * PlaybackControls - Playback control buttons and progress indicator
 * 
 * Implements Requirements:
 * - 12.1: Play/pause button for sequential block execution
 * - 12.4: Step forward/backward buttons for single-step execution
 * - 12.6: Progress indicator showing current position
 */
export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  currentBlockId,
  blockTree,
  onPlayPause,
  onStop,
  onStepForward,
  onStepBackward,
  disabled = false,
  compact = false,
  className = '',
}) => {
  // Calculate progress information
  const progressInfo = useMemo(() => {
    if (!blockTree || !blockTree.children) {
      return { current: 0, total: 0, percentage: 0 }
    }

    const flatBlocks = flattenBlocks(blockTree.children)
    const total = flatBlocks.length
    
    if (!currentBlockId || total === 0) {
      return { current: 0, total, percentage: 0 }
    }

    const currentIndex = flatBlocks.findIndex(b => b.id === currentBlockId)
    const current = currentIndex >= 0 ? currentIndex + 1 : 0
    const percentage = total > 0 ? (current / total) * 100 : 0

    return { current, total, percentage }
  }, [blockTree, currentBlockId])

  // Check if at start/end for disabling step buttons
  const isAtStart = progressInfo.current <= 1
  const isAtEnd = progressInfo.current >= progressInfo.total

  // Handle play/pause click
  const handlePlayPause = useCallback(() => {
    if (!disabled) {
      onPlayPause()
    }
  }, [disabled, onPlayPause])

  // Handle stop click
  const handleStop = useCallback(() => {
    if (!disabled) {
      onStop()
    }
  }, [disabled, onStop])

  // Handle step forward click
  const handleStepForward = useCallback(() => {
    if (!disabled && !isAtEnd) {
      onStepForward()
    }
  }, [disabled, isAtEnd, onStepForward])

  // Handle step backward click
  const handleStepBackward = useCallback(() => {
    if (!disabled && !isAtStart) {
      onStepBackward()
    }
  }, [disabled, isAtStart, onStepBackward])

  // Determine if controls should be disabled
  const hasBlocks = progressInfo.total > 0
  const canPlay = hasBlocks && !disabled
  const canStop = (isPlaying || currentBlockId !== null) && !disabled
  const canStepForward = hasBlocks && !isAtEnd && !disabled
  const canStepBackward = hasBlocks && !isAtStart && !disabled

  return (
    <div className={`playback-controls ${compact ? 'compact' : ''} ${className}`}>
      {/* Step Backward Button */}
      <button
        className="playback-button step-button step-backward"
        onClick={handleStepBackward}
        disabled={!canStepBackward}
        title="上一步 (Previous)"
        aria-label="Step backward"
      >
        <span className="button-icon">⏮</span>
        {!compact && <span className="button-label">上一步</span>}
      </button>

      {/* Play/Pause Button */}
      <button
        className={`playback-button play-pause-button ${isPlaying ? 'playing' : ''}`}
        onClick={handlePlayPause}
        disabled={!canPlay}
        title={isPlaying ? '暂停 (Pause)' : '播放 (Play)'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        <span className="button-icon">{isPlaying ? '⏸' : '▶'}</span>
        {!compact && <span className="button-label">{isPlaying ? '暂停' : '播放'}</span>}
      </button>

      {/* Stop Button */}
      <button
        className="playback-button stop-button"
        onClick={handleStop}
        disabled={!canStop}
        title="停止 (Stop)"
        aria-label="Stop"
      >
        <span className="button-icon">⏹</span>
        {!compact && <span className="button-label">停止</span>}
      </button>

      {/* Step Forward Button */}
      <button
        className="playback-button step-button step-forward"
        onClick={handleStepForward}
        disabled={!canStepForward}
        title="下一步 (Next)"
        aria-label="Step forward"
      >
        <span className="button-icon">⏭</span>
        {!compact && <span className="button-label">下一步</span>}
      </button>

      {/* Progress Indicator */}
      {!compact && (
        <div className="playback-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressInfo.percentage}%` }}
            />
          </div>
          <span className="progress-text">
            {progressInfo.current} / {progressInfo.total}
          </span>
        </div>
      )}

      {/* Compact Progress */}
      {compact && progressInfo.total > 0 && (
        <span className="progress-compact">
          {progressInfo.current}/{progressInfo.total}
        </span>
      )}
    </div>
  )
}

export default PlaybackControls
