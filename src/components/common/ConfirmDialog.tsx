/**
 * ConfirmDialog Component
 * 
 * Figma-style confirmation dialog for user prompts.
 * Supports Save/Don't Save/Cancel pattern for unsaved changes.
 */

import React, { useEffect, useCallback } from 'react'
import './ConfirmDialog.css'

export type ConfirmDialogResult = 'save' | 'discard' | 'cancel'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  /** Show three buttons: Save, Don't Save, Cancel */
  showSaveOption?: boolean
  /** Custom labels for buttons */
  confirmLabel?: string
  cancelLabel?: string
  discardLabel?: string
  onResult: (result: ConfirmDialogResult) => void
}

/**
 * ConfirmDialog - Figma-style confirmation dialog
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  showSaveOption = true,
  confirmLabel = '保存',
  cancelLabel = '取消',
  discardLabel = '不保存',
  onResult,
}) => {
  /**
   * Handle Escape key to cancel
   */
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onResult('cancel')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onResult])

  /**
   * Handle overlay click to cancel
   */
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onResult('cancel')
    }
  }, [onResult])

  if (!isOpen) return null

  return (
    <div 
      className="confirm-dialog-overlay" 
      onClick={handleOverlayClick}
      data-testid="confirm-dialog-overlay"
    >
      <div 
        className="confirm-dialog" 
        role="alertdialog" 
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        data-testid="confirm-dialog"
      >
        {/* Icon */}
        <div className="confirm-dialog-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
          </svg>
        </div>

        {/* Content */}
        <div className="confirm-dialog-content">
          <h3 id="confirm-dialog-title" className="confirm-dialog-title">
            {title}
          </h3>
          <p id="confirm-dialog-message" className="confirm-dialog-message">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="confirm-dialog-actions">
          {showSaveOption ? (
            <>
              <button
                className="confirm-dialog-btn confirm-dialog-btn-secondary"
                onClick={() => onResult('discard')}
                data-testid="btn-discard"
              >
                {discardLabel}
              </button>
              <button
                className="confirm-dialog-btn confirm-dialog-btn-secondary"
                onClick={() => onResult('cancel')}
                data-testid="btn-cancel"
              >
                {cancelLabel}
              </button>
              <button
                className="confirm-dialog-btn confirm-dialog-btn-primary"
                onClick={() => onResult('save')}
                data-testid="btn-save"
                autoFocus
              >
                {confirmLabel}
              </button>
            </>
          ) : (
            <>
              <button
                className="confirm-dialog-btn confirm-dialog-btn-secondary"
                onClick={() => onResult('cancel')}
                data-testid="btn-cancel"
              >
                {cancelLabel}
              </button>
              <button
                className="confirm-dialog-btn confirm-dialog-btn-primary"
                onClick={() => onResult('save')}
                data-testid="btn-confirm"
                autoFocus
              >
                {confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
