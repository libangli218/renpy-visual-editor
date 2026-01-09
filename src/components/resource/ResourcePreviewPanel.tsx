/**
 * ResourcePreviewPanel Component
 * 
 * Full-size image preview panel with metadata display and insert actions.
 * 
 * Implements Requirements:
 * - 6.1: Open preview panel on double-click
 * - 6.2: Display full-size image (scaled to fit)
 * - 6.3: Show image metadata (dimensions, format, file size)
 * - 6.4: Show Ren'Py image tag
 * - 6.5: "Insert to Scene" button for backgrounds
 * - 6.6: "Insert to Show" button for sprites
 * - 6.7: Close by clicking outside or pressing Escape
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ResourceDragData, useResourceStore } from '../../store/resourceStore'
import './ResourcePreviewPanel.css'

// ============================================================================
// Types
// ============================================================================

export interface ResourcePreviewPanelProps {
  /** Whether the panel is open */
  open: boolean
  /** Resource to preview */
  resource: ResourceDragData | null
  /** Close callback */
  onClose: () => void
  /** Insert to scene callback (for backgrounds) */
  onInsertToScene?: (imageTag: string) => void
  /** Insert to show callback (for sprites) */
  onInsertToShow?: (imageTag: string) => void
}

/**
 * Image metadata interface
 */
export interface ImageMetadata {
  /** Image width in pixels */
  width: number
  /** Image height in pixels */
  height: number
  /** File format (e.g., "PNG", "JPEG", "WebP") */
  format: string
  /** File size in bytes */
  fileSize: number
  /** File size formatted for display */
  fileSizeFormatted: string
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)
  
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * Get file format from path
 */
export function getFileFormat(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const formatMap: Record<string, string> = {
    'png': 'PNG',
    'jpg': 'JPEG',
    'jpeg': 'JPEG',
    'webp': 'WebP',
    'gif': 'GIF',
    'bmp': 'BMP',
  }
  return formatMap[ext] || ext.toUpperCase()
}

/**
 * Get file name from path
 */
export function getFileName(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ResourcePreviewPanel - Full-size image preview with metadata
 * 
 * Displays a full-size preview of the selected resource with:
 * - Image scaled to fit the panel
 * - Metadata: dimensions, format, file size
 * - Ren'Py image tag
 * - Insert buttons based on resource type
 */
export const ResourcePreviewPanel: React.FC<ResourcePreviewPanelProps> = ({
  open,
  resource,
  onClose,
  onInsertToScene,
  onInsertToShow,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Reset state when resource changes
  useEffect(() => {
    setMetadata(null)
    setImageLoaded(false)
    setImageError(false)
  }, [resource?.imagePath])

  // Handle Escape key to close
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Handle click outside to close
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  // Handle image load to get dimensions
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageLoaded(true)
    
    // Get image dimensions
    const width = img.naturalWidth
    const height = img.naturalHeight
    
    // Get file format from path
    const format = resource ? getFileFormat(resource.imagePath) : ''
    
    // Note: File size would need to be fetched from the file system
    // For now, we'll show dimensions and format
    setMetadata({
      width,
      height,
      format,
      fileSize: 0, // Would need IPC call to get actual file size
      fileSizeFormatted: '—', // Placeholder
    })
  }, [resource])

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageError(true)
    setImageLoaded(false)
  }, [])

  // Handle insert to scene
  const handleInsertToScene = useCallback(() => {
    if (resource && onInsertToScene) {
      onInsertToScene(resource.imageTag)
      onClose()
    }
  }, [resource, onInsertToScene, onClose])

  // Handle insert to show
  const handleInsertToShow = useCallback(() => {
    if (resource && onInsertToShow) {
      onInsertToShow(resource.imageTag)
      onClose()
    }
  }, [resource, onInsertToShow, onClose])

  // Handle copy tag to clipboard
  const handleCopyTag = useCallback(async () => {
    if (resource) {
      try {
        await navigator.clipboard.writeText(resource.imageTag)
      } catch (error) {
        console.error('Failed to copy tag:', error)
      }
    }
  }, [resource])

  if (!open || !resource) {
    return null
  }

  // Build image URL using local-file:// protocol (registered in Electron main process)
  // Format: local-file:///F:/path/to/file.jpg
  const normalizedPath = resource.imagePath.replace(/\\/g, '/')
  const imageUrl = `local-file:///${normalizedPath}`

  return (
    <div 
      className="resource-preview-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div 
        ref={panelRef}
        className="resource-preview-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="preview-header">
          <h2 id="preview-title" className="preview-title">
            {getFileName(resource.imagePath)}
          </h2>
          <button
            className="preview-close-btn"
            onClick={onClose}
            aria-label="关闭预览"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Image Container */}
        <div className="preview-image-container">
          {!imageLoaded && !imageError && (
            <div className="preview-loading">
              <span className="loading-spinner" />
              <span>加载中...</span>
            </div>
          )}
          
          {imageError && (
            <div className="preview-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>无法加载图像</span>
            </div>
          )}
          
          <img
            src={imageUrl}
            alt={resource.imageTag}
            className={`preview-image ${imageLoaded ? 'loaded' : ''}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            draggable={false}
          />
        </div>

        {/* Metadata */}
        <div className="preview-metadata">
          {/* Image Tag */}
          <div className="metadata-row tag-row">
            <span className="metadata-label">图像标签</span>
            <div className="metadata-value tag-value">
              <code className="image-tag">{resource.imageTag}</code>
              <button
                className="copy-tag-btn"
                onClick={handleCopyTag}
                title="复制标签"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Type */}
          <div className="metadata-row">
            <span className="metadata-label">类型</span>
            <span className="metadata-value">
              <span className={`type-badge ${resource.type}`}>
                {resource.type === 'background' ? '🖼️ 背景' : '👤 立绘'}
              </span>
            </span>
          </div>

          {/* Dimensions */}
          {metadata && (
            <>
              <div className="metadata-row">
                <span className="metadata-label">尺寸</span>
                <span className="metadata-value">
                  {metadata.width} × {metadata.height} px
                </span>
              </div>

              <div className="metadata-row">
                <span className="metadata-label">格式</span>
                <span className="metadata-value">{metadata.format}</span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="preview-actions">
          {resource.type === 'background' && onInsertToScene && (
            <button
              className="preview-action-btn primary"
              onClick={handleInsertToScene}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
              </svg>
              插入到场景
            </button>
          )}
          
          {resource.type === 'sprite' && onInsertToShow && (
            <button
              className="preview-action-btn primary"
              onClick={handleInsertToShow}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
              </svg>
              插入到显示
            </button>
          )}
          
          <button
            className="preview-action-btn secondary"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Hook for using preview panel with resource store
// ============================================================================

/**
 * Hook to connect ResourcePreviewPanel with the resource store
 */
export function useResourcePreview() {
  const { previewOpen, selectedResource, openPreview, closePreview } = useResourceStore()

  const handleDoubleClick = useCallback((resource: ResourceDragData) => {
    openPreview(resource)
  }, [openPreview])

  return {
    previewOpen,
    selectedResource,
    openPreview: handleDoubleClick,
    closePreview,
  }
}

export default ResourcePreviewPanel
