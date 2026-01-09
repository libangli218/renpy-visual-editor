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
import ReactDOM from 'react-dom'
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
// Preview size for hover tooltip (larger than thumbnail)
const PREVIEW_SIZE = 180

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
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
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

  // Load original image for preview when hovering (lazy load)
  useEffect(() => {
    if (!isHovering || previewLoaded) return

    let mounted = true

    const loadPreview = async () => {
      try {
        // Load original image via IPC for full preview (not cropped thumbnail)
        const electronAPI = (window as unknown as { 
          electronAPI?: { 
            readFileAsBase64?: (path: string) => Promise<string | null> 
          } 
        }).electronAPI

        if (electronAPI?.readFileAsBase64) {
          const dataUrl = await electronAPI.readFileAsBase64(imagePath)
          if (mounted && dataUrl) {
            setPreviewUrl(dataUrl)
            setPreviewLoaded(true)
            return
          }
        }

        // Fallback to thumbnail if IPC fails
        const url = await thumbnailService.getThumbnail(imagePath, PREVIEW_SIZE)
        if (mounted) {
          setPreviewUrl(url)
          setPreviewLoaded(true)
        }
      } catch (error) {
        console.warn(`Failed to load preview for ${imagePath}:`, error)
        // Fallback to thumbnail URL if preview fails
        if (mounted) {
          setPreviewUrl(thumbnailUrl)
          setPreviewLoaded(true)
        }
      }
    }

    loadPreview()

    return () => {
      mounted = false
    }
  }, [isHovering, previewLoaded, imagePath, thumbnailUrl])

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

    // Create a custom drag preview element
    const dragPreview = document.createElement('div')
    dragPreview.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      width: 64px;
      height: 84px;
      background-color: #2d2d2d;
      border: 2px solid ${type === 'background' ? '#4a9eff' : '#ff9f4a'};
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2px;
      box-sizing: border-box;
      pointer-events: none;
      z-index: 10000;
    `
    
    // Add thumbnail image
    if (thumbnailUrl && !hasError) {
      const img = document.createElement('img')
      img.src = thumbnailUrl
      img.style.cssText = `
        width: 56px;
        height: 56px;
        object-fit: cover;
        border-radius: 2px;
      `
      dragPreview.appendChild(img)
    }
    
    // Add label
    const label = document.createElement('span')
    label.textContent = imageTag.length > 10 ? imageTag.slice(0, 8) + '...' : imageTag
    label.style.cssText = `
      font-size: 10px;
      color: white;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 60px;
      margin-top: 2px;
    `
    dragPreview.appendChild(label)
    
    // Append to body temporarily
    document.body.appendChild(dragPreview)
    
    // Set as drag image
    event.dataTransfer.setDragImage(dragPreview, 32, 42)
    
    // Remove after a short delay (after drag image is captured)
    requestAnimationFrame(() => {
      document.body.removeChild(dragPreview)
    })

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

  /**
   * Handle mouse enter - start loading preview
   */
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true)
  }, [])

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
  }, [])

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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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

      {/* Hover preview tooltip - rendered with fixed position via portal */}
      {isHovering && itemRef.current && (
        <TooltipPortal targetRef={itemRef}>
          <div 
            className="preview-image-container"
            style={{
              backgroundImage: `url(${previewUrl || thumbnailUrl})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div className="preview-info">
            <span className="preview-tag">{imageTag}</span>
            <span className="preview-type">{type === 'background' ? '背景' : '立绘'}</span>
          </div>
        </TooltipPortal>
      )}
    </div>
  )
}

/**
 * TooltipPortal - Renders tooltip with fixed positioning outside of overflow containers
 */
interface TooltipPortalProps {
  targetRef: React.RefObject<HTMLDivElement>
  children: React.ReactNode
}

const TooltipPortal: React.FC<TooltipPortalProps> = ({ targetRef, children }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  
  useEffect(() => {
    if (!targetRef.current) return
    
    const updatePosition = () => {
      const rect = targetRef.current?.getBoundingClientRect()
      if (!rect) return
      
      // Position tooltip to the right of the item
      const tooltipWidth = 180
      const tooltipHeight = 260 // Taller for portrait sprites
      const gap = 8
      
      let left = rect.right + gap
      let top = rect.top + (rect.height / 2) - (tooltipHeight / 2)
      
      // If tooltip would go off right edge, show on left side
      if (left + tooltipWidth > window.innerWidth - 10) {
        left = rect.left - tooltipWidth - gap
      }
      
      // Keep tooltip within vertical bounds
      if (top < 10) {
        top = 10
      } else if (top + tooltipHeight > window.innerHeight - 10) {
        top = window.innerHeight - tooltipHeight - 10
      }
      
      setPosition({ top, left })
    }
    
    updatePosition()
    
    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [targetRef])
  
  return ReactDOM.createPortal(
    <div 
      className="resource-preview-tooltip-fixed"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 10000,
      }}
    >
      {children}
    </div>,
    document.body
  )
}

export default ResourceItem
