/**
 * ResourceItem Component
 * 
 * Displays a single resource item with thumbnail and name.
 * Supports drag-and-drop, click, double-click, and context menu events.
 * 
 * Implements Requirements:
 * - 1.1: Display thumbnail previews for images in Backgrounds section
 * - 1.2: Display thumbnail previews for images in Sprites section
 * - 1.4: Display image name below or beside the thumbnail
 * - 4.1: Resource items are draggable
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { thumbnailService, generatePlaceholder } from '../../resource/ThumbnailService'
import {
  ResourceDragData,
  RESOURCE_DRAG_DATA_TYPE,
  serializeDragData,
  ThumbnailSize,
  THUMBNAIL_SIZES,
} from '../../store/resourceStore'
import './ResourceItem.css'

/**
 * Props for ResourceItem component
 */
export interface ResourceItemProps {
  /** Image tag (e.g., "bg room" or "eileen happy") */
  imageTag: string
  /** Resource type */
  type: 'sprite' | 'background'
  /** Image file path */
  imagePath: string
  /** Thumbnail size */
  thumbnailSize: ThumbnailSize
  /** Whether this item is selected */
  selected?: boolean
  /** Click callback */
  onClick?: (event: React.MouseEvent) => void
  /** Double-click callback (for preview) */
  onDoubleClick?: (event: React.MouseEvent) => void
  /** Context menu callback */
  onContextMenu?: (event: React.MouseEvent) => void
  /** Drag start callback */
  onDragStart?: (event: React.DragEvent, data: ResourceDragData) => void
  /** Drag end callback */
  onDragEnd?: (event: React.DragEvent) => void
  /** Custom class name */
  className?: string
}

/**
 * ResourceItem - Single resource item component
 * 
 * Displays a thumbnail preview with the resource name.
 * Supports drag-and-drop for use in the block editor.
 */
export const ResourceItem: React.FC<ResourceItemProps> = ({
  imageTag,
  type,
  imagePath,
  thumbnailSize,
  selected = false,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onDragEnd,
  className = '',
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)

  // Get thumbnail size in pixels
  const sizePixels = THUMBNAIL_SIZES[thumbnailSize]

  // Load thumbnail
  useEffect(() => {
    let mounted = true

    const loadThumbnail = async () => {
      setIsLoading(true)
      setHasError(false)

      try {
        const url = await thumbnailService.getThumbnail(imagePath, sizePixels)
        if (mounted) {
          setThumbnailUrl(url)
          setIsLoading(false)
        }
      } catch (error) {
        console.warn(`Failed to load thumbnail for ${imagePath}:`, error)
        if (mounted) {
          setThumbnailUrl(generatePlaceholder(sizePixels, '?'))
          setHasError(true)
          setIsLoading(false)
        }
      }
    }

    loadThumbnail()

    return () => {
      mounted = false
    }
  }, [imagePath, sizePixels])

  /**
   * Create drag data for this resource
   */
  const createDragData = useCallback((): ResourceDragData => {
    return {
      type: type === 'background' ? 'background' : 'sprite',
      imageTag,
      imagePath,
    }
  }, [type, imageTag, imagePath])

  /**
   * Handle drag start
   * Sets up the drag data and creates a drag preview
   */
  const handleDragStart = useCallback((event: React.DragEvent) => {
    const dragData = createDragData()
    
    // Set drag data
    event.dataTransfer.setData(RESOURCE_DRAG_DATA_TYPE, serializeDragData(dragData))
    event.dataTransfer.setData('text/plain', imageTag)
    event.dataTransfer.effectAllowed = 'copy'

    // Create drag preview using canvas
    const canvas = document.createElement('canvas')
    const previewSize = 64
    canvas.width = previewSize
    canvas.height = previewSize + 20 // Extra space for label
    const ctx = canvas.getContext('2d')

    if (ctx) {
      // Draw background
      ctx.fillStyle = '#2d2d2d'
      ctx.fillRect(0, 0, previewSize, previewSize)

      // Draw border
      ctx.strokeStyle = type === 'background' ? '#4a9eff' : '#ff9f4a'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, previewSize - 2, previewSize - 2)

      // Draw thumbnail if available
      if (thumbnailUrl && !hasError) {
        const img = new Image()
        img.src = thumbnailUrl
        // Note: Image may not be loaded yet, so preview might be empty
        // This is acceptable as the drag operation still works
        try {
          ctx.drawImage(img, 2, 2, previewSize - 4, previewSize - 4)
        } catch {
          // Ignore draw errors
        }
      }

      // Draw label
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      
      // Truncate label if too long
      let label = imageTag
      const maxWidth = previewSize - 4
      while (ctx.measureText(label).width > maxWidth && label.length > 3) {
        label = label.slice(0, -4) + '...'
      }
      ctx.fillText(label, previewSize / 2, previewSize + 4)
    }

    event.dataTransfer.setDragImage(canvas, previewSize / 2, previewSize / 2)

    setIsDragging(true)

    // Call external handler
    if (onDragStart) {
      onDragStart(event, dragData)
    }
  }, [createDragData, imageTag, type, thumbnailUrl, hasError, onDragStart])

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback((event: React.DragEvent) => {
    setIsDragging(false)

    if (onDragEnd) {
      onDragEnd(event)
    }
  }, [onDragEnd])

  /**
   * Handle click
   */
  const handleClick = useCallback((event: React.MouseEvent) => {
    if (onClick) {
      onClick(event)
    }
  }, [onClick])

  /**
   * Handle double-click
   */
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    if (onDoubleClick) {
      onDoubleClick(event)
    }
  }, [onDoubleClick])

  /**
   * Handle context menu (right-click)
   */
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    if (onContextMenu) {
      onContextMenu(event)
    }
  }, [onContextMenu])

  /**
   * Handle keyboard interaction
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (onDoubleClick) {
        onDoubleClick(event as unknown as React.MouseEvent)
      } else if (onClick) {
        onClick(event as unknown as React.MouseEvent)
      }
    }
  }, [onClick, onDoubleClick])

  // Extract display name from image tag
  const displayName = imageTag.split(' ').slice(-1)[0] || imageTag

  return (
    <div
      ref={itemRef}
      className={`resource-item-thumbnail ${className} ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${hasError ? 'error' : ''} size-${thumbnailSize}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${type === 'background' ? 'Background' : 'Sprite'}: ${imageTag}`}
      aria-selected={selected}
      title={imageTag}
      data-image-tag={imageTag}
      data-resource-type={type}
    >
      {/* Thumbnail */}
      <div 
        className="resource-thumbnail"
        style={{ 
          width: sizePixels, 
          height: sizePixels,
        }}
      >
        {isLoading ? (
          <div className="thumbnail-loading">
            <span className="loading-spinner" />
          </div>
        ) : (
          <img
            src={thumbnailUrl}
            alt={imageTag}
            className="thumbnail-image"
            draggable={false}
          />
        )}
        
        {/* Type indicator */}
        <span className={`type-indicator ${type}`}>
          {type === 'background' ? '🖼️' : '👤'}
        </span>
      </div>

      {/* Name */}
      <span className="resource-name-label" title={imageTag}>
        {displayName}
      </span>

      {/* Hover preview tooltip - shown on hover */}
      <div className="resource-preview-tooltip">
        <img
          src={thumbnailUrl}
          alt={imageTag}
          className="preview-image"
          draggable={false}
        />
        <div className="preview-info">
          <span className="preview-tag">{imageTag}</span>
          <span className="preview-type">{type === 'background' ? '背景' : '立绘'}</span>
        </div>
      </div>
    </div>
  )
}

export default ResourceItem
