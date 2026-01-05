/**
 * ResourceSlot Component
 * 资源选择槽组件
 * 
 * Provides resource selection for images and audio files.
 * Includes thumbnail preview for images and playback for audio.
 * Shows warning for missing resources.
 * 
 * Requirements: 4.5, 6.5, 10.3
 */

import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import './Slots.css'

/**
 * Resource type
 */
export type ResourceType = 'image' | 'audio'

/**
 * Resource definition
 */
export interface ResourceDefinition {
  /** Resource path/identifier */
  path: string
  /** Display name */
  name: string
  /** Full file path for preview */
  fullPath?: string
  /** Resource type */
  type: ResourceType
  /** Duration in seconds (for audio) */
  duration?: number
  /** Thumbnail URL (for images) */
  thumbnail?: string
}

/**
 * Props for ResourceSlot component
 */
export interface ResourceSlotProps {
  /** Slot name for identification */
  name: string
  /** Display label */
  label?: string
  /** Current value (resource path) */
  value: string | null
  /** Resource type */
  resourceType: ResourceType
  /** Available resources */
  resources: ResourceDefinition[]
  /** Whether the slot is required */
  required?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Whether the slot is disabled */
  disabled?: boolean
  /** Error message to display */
  error?: string
  /** Whether the resource is missing */
  isMissing?: boolean
  /** Callback when value changes */
  onChange?: (name: string, value: string | null) => void
  /** Callback when browse button is clicked */
  onBrowse?: (name: string, resourceType: ResourceType) => void
  /** Callback when preview/play is requested */
  onPreview?: (resource: ResourceDefinition) => void
  /** Additional class name */
  className?: string
  /** Whether to show preview */
  showPreview?: boolean
}

/**
 * Format duration in seconds to mm:ss
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * ResourceSlot - Resource selection slot component
 * 
 * Implements Requirements:
 * - 4.5: Show resource preview thumbnail for images
 * - 6.5: Provide audio playback/preview functionality
 * - 10.3: Show missing resource warning
 */
export const ResourceSlot: React.FC<ResourceSlotProps> = ({
  name,
  label,
  value,
  resourceType,
  resources,
  required = false,
  placeholder,
  disabled = false,
  error,
  isMissing = false,
  onChange,
  onBrowse,
  onPreview,
  className = '',
  showPreview = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Default placeholder based on resource type
  const defaultPlaceholder = resourceType === 'image'
    ? '选择图片资源...'
    : '选择音频资源...'

  /**
   * Get current resource definition
   */
  const currentResource = useMemo(() => {
    if (!value) return null
    return resources.find(r => r.path === value) || {
      path: value,
      name: value.split('/').pop() || value,
      type: resourceType,
    }
  }, [value, resources, resourceType])

  /**
   * Check if resource is missing (not in available resources)
   */
  const resourceMissing = useMemo(() => {
    if (isMissing) return true
    if (!value) return false
    return !resources.some(r => r.path === value)
  }, [value, resources, isMissing])

  /**
   * Handle select change
   */
  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || null
    onChange?.(name, newValue)
  }, [name, onChange])

  /**
   * Handle browse button click
   */
  const handleBrowse = useCallback(() => {
    onBrowse?.(name, resourceType)
  }, [name, resourceType, onBrowse])

  /**
   * Handle audio play/pause
   */
  const handlePlayPause = useCallback(() => {
    if (!currentResource) return

    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      // Create audio element if needed
      if (!audioRef.current && currentResource.fullPath) {
        audioRef.current = new Audio(currentResource.fullPath)
        audioRef.current.onended = () => setIsPlaying(false)
      }
      audioRef.current?.play()
      setIsPlaying(true)
      onPreview?.(currentResource)
    }
  }, [currentResource, isPlaying, onPreview])

  /**
   * Handle image preview click
   */
  const handleImagePreview = useCallback(() => {
    if (currentResource) {
      onPreview?.(currentResource)
    }
  }, [currentResource, onPreview])

  /**
   * Cleanup audio on unmount
   */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  /**
   * Stop audio when value changes
   */
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
    }
  }, [value])

  // Build class names
  const slotClasses = [
    'slot',
    'resource-slot',
    `resource-slot-${resourceType}`,
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

      <div className="resource-slot-wrapper">
        {/* Input row with select and browse button */}
        <div className="resource-slot-input-row">
          <select
            className={`slot-input slot-select resource-slot-select ${error ? 'has-error' : ''}`}
            value={value || ''}
            onChange={handleSelectChange}
            disabled={disabled}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : undefined}
          >
            <option value="">{placeholder || defaultPlaceholder}</option>
            {resources.map(resource => (
              <option key={resource.path} value={resource.path}>
                {resource.name}
              </option>
            ))}
            {/* Show current value if not in resources list */}
            {value && !resources.some(r => r.path === value) && (
              <option value={value} disabled>
                {value} (缺失)
              </option>
            )}
          </select>

          {onBrowse && (
            <button
              type="button"
              className="resource-slot-browse-btn"
              onClick={handleBrowse}
              disabled={disabled}
              title="浏览..."
            >
              📁
            </button>
          )}
        </div>

        {/* Missing resource warning */}
        {resourceMissing && value && (
          <div className="resource-missing-warning">
            <span className="resource-missing-warning-icon">⚠️</span>
            <span>资源文件不存在: {value}</span>
          </div>
        )}

        {/* Preview section */}
        {showPreview && currentResource && !resourceMissing && (
          <>
            {/* Image preview */}
            {resourceType === 'image' && (
              <div
                className="resource-image-preview"
                onClick={handleImagePreview}
                style={{ cursor: onPreview ? 'pointer' : 'default' }}
                title="点击预览"
              >
                {currentResource.thumbnail || currentResource.fullPath ? (
                  <img
                    src={currentResource.thumbnail || currentResource.fullPath}
                    alt={currentResource.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="resource-image-placeholder">
                    🖼️ {currentResource.name}
                  </div>
                )}
              </div>
            )}

            {/* Audio preview */}
            {resourceType === 'audio' && (
              <div className="resource-audio-preview">
                <button
                  type="button"
                  className={`resource-audio-play-btn ${isPlaying ? 'playing' : ''}`}
                  onClick={handlePlayPause}
                  disabled={disabled || !currentResource.fullPath}
                  title={isPlaying ? '暂停' : '播放'}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <span className="resource-audio-name">
                  {currentResource.name}
                </span>
                {currentResource.duration !== undefined && (
                  <span className="resource-audio-duration">
                    {formatDuration(currentResource.duration)}
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {/* Placeholder when no resource selected */}
        {showPreview && !currentResource && resourceType === 'image' && (
          <div className="resource-image-placeholder">
            🖼️ 未选择图片
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

export default ResourceSlot
