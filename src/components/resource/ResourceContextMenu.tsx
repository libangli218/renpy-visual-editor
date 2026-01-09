/**
 * ResourceContextMenu Component
 * 
 * Context menu for resource items with actions like rename, delete, show in folder, and copy tag.
 * 
 * Implements Requirements:
 * - 5.1: Show context menu on right-click
 * - 5.2: Rename option
 * - 5.3: Delete option
 * - 5.4: Show in Folder option
 * - 5.5: Copy Image Tag option
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ResourceDragData, useResourceStore } from '../../store/resourceStore'
import { resourceManager } from '../../resource/ResourceManager'
import './ResourceContextMenu.css'

// ============================================================================
// Types
// ============================================================================

export interface ResourceContextMenuProps {
  /** Whether the menu is open */
  open: boolean
  /** Menu position */
  position: { x: number; y: number }
  /** Resource associated with the menu */
  resource: ResourceDragData | null
  /** Close callback */
  onClose: () => void
  /** Rename callback - called after successful rename */
  onRename?: (oldPath: string, newName: string) => void
  /** Delete callback - called after successful delete */
  onDelete?: (path: string) => void
  /** Refresh callback - called after operations that modify resources */
  onRefresh?: () => void
}

// ============================================================================
// Rename Dialog Component
// ============================================================================

interface RenameDialogProps {
  isOpen: boolean
  currentName: string
  onConfirm: (newName: string) => void
  onCancel: () => void
}

const RenameDialog: React.FC<RenameDialogProps> = ({
  isOpen,
  currentName,
  onConfirm,
  onCancel,
}) => {
  const [newName, setNewName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName)
      // Focus and select input after a short delay
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen, currentName])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = newName.trim()
    if (trimmedName && trimmedName !== currentName) {
      onConfirm(trimmedName)
    } else {
      onCancel()
    }
  }, [newName, currentName, onConfirm, onCancel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }, [onCancel])

  if (!isOpen) return null

  return (
    <div className="context-menu-dialog-overlay" onClick={onCancel}>
      <div 
        className="context-menu-dialog" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-dialog-title"
      >
        <h3 id="rename-dialog-title" className="context-menu-dialog-title">重命名资源</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="context-menu-dialog-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入新名称"
            autoFocus
          />
          <div className="context-menu-dialog-actions">
            <button
              type="button"
              className="context-menu-dialog-btn context-menu-dialog-btn-secondary"
              onClick={onCancel}
            >
              取消
            </button>
            <button
              type="submit"
              className="context-menu-dialog-btn context-menu-dialog-btn-primary"
              disabled={!newName.trim() || newName.trim() === currentName}
            >
              确定
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// Delete Confirmation Dialog Component
// ============================================================================

interface DeleteDialogProps {
  isOpen: boolean
  resourceName: string
  onConfirm: () => void
  onCancel: () => void
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({
  isOpen,
  resourceName,
  onConfirm,
  onCancel,
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }, [onCancel])

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="context-menu-dialog-overlay" onClick={onCancel}>
      <div 
        className="context-menu-dialog" 
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-message"
      >
        <div className="context-menu-dialog-icon danger">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
          </svg>
        </div>
        <h3 id="delete-dialog-title" className="context-menu-dialog-title">删除资源</h3>
        <p id="delete-dialog-message" className="context-menu-dialog-message">
          确定要删除 <strong>{resourceName}</strong> 吗？此操作无法撤销。
        </p>
        <div className="context-menu-dialog-actions">
          <button
            type="button"
            className="context-menu-dialog-btn context-menu-dialog-btn-secondary"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="context-menu-dialog-btn context-menu-dialog-btn-danger"
            onClick={onConfirm}
            autoFocus
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Context Menu Component
// ============================================================================

/**
 * ResourceContextMenu - Context menu for resource items
 * 
 * Provides actions for managing resources:
 * - Rename: Opens a dialog to rename the resource file
 * - Delete: Opens a confirmation dialog to delete the resource
 * - Show in Folder: Opens the file explorer at the resource location
 * - Copy Tag: Copies the Ren'Py image tag to clipboard
 */
export const ResourceContextMenu: React.FC<ResourceContextMenuProps> = ({
  open,
  position,
  resource,
  onClose,
  onRename,
  onDelete,
  onRefresh,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [menuPosition, setMenuPosition] = useState(position)

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (open && menuRef.current) {
      const menu = menuRef.current
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let adjustedX = position.x
      let adjustedY = position.y

      // Adjust horizontal position
      if (position.x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 8
      }

      // Adjust vertical position
      if (position.y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 8
      }

      setMenuPosition({ x: adjustedX, y: adjustedY })
    }
  }, [open, position])

  // Close menu on click outside
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    // Add listeners with a small delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  // Get resource name from path
  const getResourceName = useCallback(() => {
    if (!resource) return ''
    const parts = resource.imagePath.split(/[/\\]/)
    return parts[parts.length - 1] || ''
  }, [resource])

  // Get resource name without extension
  const getResourceBaseName = useCallback(() => {
    const fullName = getResourceName()
    const dotIndex = fullName.lastIndexOf('.')
    return dotIndex >= 0 ? fullName.substring(0, dotIndex) : fullName
  }, [getResourceName])

  /**
   * Handle rename action
   * Implements Requirement 5.2
   */
  const handleRename = useCallback(() => {
    onClose()
    setShowRenameDialog(true)
  }, [onClose])

  /**
   * Handle rename confirmation
   */
  const handleRenameConfirm = useCallback(async (newName: string) => {
    if (!resource) return

    try {
      await resourceManager.renameResource(resource.imagePath, newName)
      setShowRenameDialog(false)
      
      if (onRename) {
        onRename(resource.imagePath, newName)
      }
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to rename resource:', error)
      // Could show an error toast here
    }
  }, [resource, onRename, onRefresh])

  /**
   * Handle delete action
   * Implements Requirement 5.3, 5.6
   */
  const handleDelete = useCallback(() => {
    onClose()
    setShowDeleteDialog(true)
  }, [onClose])

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (!resource) return

    try {
      await resourceManager.deleteResource(resource.imagePath)
      setShowDeleteDialog(false)
      
      if (onDelete) {
        onDelete(resource.imagePath)
      }
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to delete resource:', error)
      // Could show an error toast here
    }
  }, [resource, onDelete, onRefresh])

  /**
   * Handle show in folder action
   * Implements Requirement 5.4, 5.7
   */
  const handleShowInFolder = useCallback(() => {
    if (!resource) return
    
    resourceManager.showInFolder(resource.imagePath)
    onClose()
  }, [resource, onClose])

  /**
   * Handle copy tag action
   * Implements Requirement 5.5
   */
  const handleCopyTag = useCallback(async () => {
    if (!resource) return

    try {
      await navigator.clipboard.writeText(resource.imageTag)
      onClose()
      // Could show a success toast here
    } catch (error) {
      console.error('Failed to copy tag to clipboard:', error)
    }
  }, [resource, onClose])

  if (!open || !resource) {
    return (
      <>
        <RenameDialog
          isOpen={showRenameDialog}
          currentName={getResourceBaseName()}
          onConfirm={handleRenameConfirm}
          onCancel={() => setShowRenameDialog(false)}
        />
        <DeleteDialog
          isOpen={showDeleteDialog}
          resourceName={getResourceName()}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteDialog(false)}
        />
      </>
    )
  }

  return (
    <>
      <div
        ref={menuRef}
        className="resource-context-menu"
        style={{
          left: menuPosition.x,
          top: menuPosition.y,
        }}
        role="menu"
        aria-label="资源操作菜单"
      >
        <button
          className="resource-context-menu-item"
          onClick={handleRename}
          role="menuitem"
        >
          <span className="menu-item-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
            </svg>
          </span>
          <span className="menu-item-label">重命名</span>
        </button>

        <button
          className="resource-context-menu-item"
          onClick={handleDelete}
          role="menuitem"
        >
          <span className="menu-item-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
            </svg>
          </span>
          <span className="menu-item-label">删除</span>
        </button>

        <div className="resource-context-menu-separator" />

        <button
          className="resource-context-menu-item"
          onClick={handleShowInFolder}
          role="menuitem"
        >
          <span className="menu-item-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="currentColor"/>
            </svg>
          </span>
          <span className="menu-item-label">在文件夹中显示</span>
        </button>

        <button
          className="resource-context-menu-item"
          onClick={handleCopyTag}
          role="menuitem"
        >
          <span className="menu-item-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>
            </svg>
          </span>
          <span className="menu-item-label">复制图像标签</span>
        </button>
      </div>

      <RenameDialog
        isOpen={showRenameDialog}
        currentName={getResourceBaseName()}
        onConfirm={handleRenameConfirm}
        onCancel={() => setShowRenameDialog(false)}
      />
      <DeleteDialog
        isOpen={showDeleteDialog}
        resourceName={getResourceName()}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  )
}

// ============================================================================
// Hook for using context menu with resource store
// ============================================================================

/**
 * Hook to connect ResourceContextMenu with the resource store
 */
export function useResourceContextMenu() {
  const { contextMenu, openContextMenu, closeContextMenu } = useResourceStore()

  const handleContextMenu = useCallback((
    event: React.MouseEvent,
    resource: ResourceDragData
  ) => {
    event.preventDefault()
    openContextMenu({ x: event.clientX, y: event.clientY }, resource)
  }, [openContextMenu])

  return {
    contextMenu,
    openContextMenu: handleContextMenu,
    closeContextMenu,
  }
}

export default ResourceContextMenu
