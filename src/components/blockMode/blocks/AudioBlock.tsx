/**
 * AudioBlock Component
 * 音频积木组件
 * 
 * Provides audio control blocks: Play Music, Stop Music, and Play Sound.
 * Includes audio preview/playback functionality.
 * 
 * Requirements: 6.1-6.5
 */

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { Block, SlotOption } from '../types'
import { BaseBlock, BaseBlockProps } from './BaseBlock'
import './Block.css'

/**
 * Props for AudioBlock component
 */
export interface AudioBlockProps extends Omit<BaseBlockProps, 'children'> {
  /** Available music files */
  availableMusic?: SlotOption[]
  /** Available sound files */
  availableSounds?: SlotOption[]
  /** Callback when a slot value changes */
  onSlotChange?: (blockId: string, slotName: string, value: unknown) => void
  /** Validation errors for slots */
  slotErrors?: Record<string, string>
  /** Base path for audio files (for preview) */
  audioBasePath?: string
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
 * AudioBlock - Audio control block component
 * 
 * Implements Requirements:
 * - 6.1: Play Music block contains music file selection
 * - 6.2: Play Music block contains optional fade-in time
 * - 6.3: Stop Music block contains optional fade-out time
 * - 6.4: Play Sound block contains sound file selection
 * - 6.5: Provide audio preview/playback functionality
 */
export const AudioBlock: React.FC<AudioBlockProps> = ({
  block,
  availableMusic = [],
  availableSounds = [],
  onSlotChange,
  slotErrors = {},
  audioBasePath = '',
  ...baseProps
}) => {
  // Audio preview state
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  /**
   * Handle slot value change
   */
  const handleSlotChange = useCallback((slotName: string, value: unknown) => {
    onSlotChange?.(block.id, slotName, value)
  }, [block.id, onSlotChange])
  
  /**
   * Handle audio preview toggle
   */
  const handlePreviewToggle = useCallback(() => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {
        // Handle play error (e.g., file not found)
        setIsPlaying(false)
      })
      setIsPlaying(true)
    }
  }, [isPlaying])
  
  /**
   * Handle audio ended event
   */
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false)
  }, [])
  
  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])
  
  // Check for errors
  const hasSlotErrors = Object.keys(slotErrors).length > 0
  const hasError = baseProps.hasError || hasSlotErrors
  
  // Render different content based on block type
  const renderContent = () => {
    switch (block.type) {
      case 'play-music':
        return renderPlayMusicContent()
      case 'stop-music':
        return renderStopMusicContent()
      case 'play-sound':
        return renderPlaySoundContent()
      default:
        return null
    }
  }
  
  /**
   * Render Play Music block content
   */
  const renderPlayMusicContent = () => {
    const file = getSlotValue(block, 'file') as string
    const fadein = getSlotValue(block, 'fadein') as number | null
    const loop = getSlotValue(block, 'loop') as boolean | string
    
    // Build audio source URL
    const audioSrc = file ? `${audioBasePath}${file}` : ''
    
    return (
      <div className="block-slots">
        {/* Hidden audio element for preview */}
        {audioSrc && (
          <audio
            ref={audioRef}
            src={audioSrc}
            onEnded={handleAudioEnded}
            preload="none"
          />
        )}
        
        {/* Music File Selection */}
        <div className="audio-file-row">
          <div className="block-slot" style={{ flex: 1 }}>
            <label className={`block-slot-label ${isSlotRequired(block, 'file') ? 'required' : ''}`}>
              音乐文件
            </label>
            <select
              className={`block-slot-input block-slot-select audio-file-select ${slotErrors['file'] ? 'has-error' : ''}`}
              value={file || ''}
              onChange={(e) => handleSlotChange('file', e.target.value)}
              title={slotErrors['file']}
            >
              <option value="">选择音乐文件...</option>
              {availableMusic.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon ? `${option.icon} ${option.label}` : option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Preview Button */}
          <button
            className={`audio-preview-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handlePreviewToggle}
            disabled={!file}
            type="button"
            title={isPlaying ? '停止试听' : '试听'}
          >
            {isPlaying ? '⏹️' : '▶️'}
          </button>
        </div>
        
        {/* Options Row */}
        <div className="audio-options-row">
          {/* Fade-in Time */}
          <div className="block-slot">
            <label className="block-slot-label">
              淡入时间 (秒)
            </label>
            <input
              type="number"
              className={`block-slot-input ${slotErrors['fadein'] ? 'has-error' : ''}`}
              value={fadein ?? ''}
              onChange={(e) => handleSlotChange('fadein', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0"
              min="0"
              max="60"
              step="0.1"
              title={slotErrors['fadein']}
            />
          </div>
          
          {/* Loop Option */}
          <div className="block-slot">
            <label className="block-slot-label">
              循环播放
            </label>
            <select
              className="block-slot-input block-slot-select"
              value={String(loop ?? true)}
              onChange={(e) => handleSlotChange('loop', e.target.value === 'true')}
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>
        </div>
      </div>
    )
  }
  
  /**
   * Render Stop Music block content
   */
  const renderStopMusicContent = () => {
    const fadeout = getSlotValue(block, 'fadeout') as number | null
    
    return (
      <div className="block-slots">
        <div className="block-slot">
          <label className="block-slot-label">
            淡出时间 (秒)
          </label>
          <input
            type="number"
            className={`block-slot-input ${slotErrors['fadeout'] ? 'has-error' : ''}`}
            value={fadeout ?? ''}
            onChange={(e) => handleSlotChange('fadeout', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="0"
            min="0"
            max="60"
            step="0.1"
            title={slotErrors['fadeout']}
          />
        </div>
      </div>
    )
  }
  
  /**
   * Render Play Sound block content
   */
  const renderPlaySoundContent = () => {
    const file = getSlotValue(block, 'file') as string
    
    // Build audio source URL
    const audioSrc = file ? `${audioBasePath}${file}` : ''
    
    return (
      <div className="block-slots">
        {/* Hidden audio element for preview */}
        {audioSrc && (
          <audio
            ref={audioRef}
            src={audioSrc}
            onEnded={handleAudioEnded}
            preload="none"
          />
        )}
        
        {/* Sound File Selection */}
        <div className="audio-file-row">
          <div className="block-slot" style={{ flex: 1 }}>
            <label className={`block-slot-label ${isSlotRequired(block, 'file') ? 'required' : ''}`}>
              音效文件
            </label>
            <select
              className={`block-slot-input block-slot-select audio-file-select ${slotErrors['file'] ? 'has-error' : ''}`}
              value={file || ''}
              onChange={(e) => handleSlotChange('file', e.target.value)}
              title={slotErrors['file']}
            >
              <option value="">选择音效文件...</option>
              {availableSounds.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon ? `${option.icon} ${option.label}` : option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Preview Button */}
          <button
            className={`audio-preview-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handlePreviewToggle}
            disabled={!file}
            type="button"
            title={isPlaying ? '停止试听' : '试听'}
          >
            {isPlaying ? '⏹️' : '▶️'}
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <BaseBlock
      {...baseProps}
      block={block}
      hasError={hasError}
      className={`audio-block audio-block-${block.type} ${baseProps.className || ''}`}
    >
      {renderContent()}
    </BaseBlock>
  )
}

export default AudioBlock
