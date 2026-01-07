/**
 * AboutDialog Component
 * 
 * Modal dialog showing application information.
 * Accessible from Help > About menu.
 */

import React, { useEffect, useCallback } from 'react'
import './AboutDialog.css'

export interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * AboutDialog - Modal dialog showing app info
 */
export const AboutDialog: React.FC<AboutDialogProps> = ({
  isOpen,
  onClose,
}) => {
  /**
   * Handle Escape key to close
   */
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  /**
   * Handle overlay click to close
   */
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  if (!isOpen) return null

  return (
    <div 
      className="about-dialog-overlay" 
      onClick={handleOverlayClick}
      data-testid="about-dialog-overlay"
    >
      <div 
        className="about-dialog" 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="about-dialog-title"
        data-testid="about-dialog"
      >
        {/* Header */}
        <div className="about-dialog-header">
          <h2 id="about-dialog-title" className="about-dialog-title">
            关于 Ren'Py Editor
          </h2>
          <button
            className="about-dialog-close"
            onClick={onClose}
            aria-label="关闭"
            data-testid="about-dialog-close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="about-dialog-content">
          <div className="about-dialog-logo">
            <span style={{ fontSize: '48px', color: 'var(--accent-primary)' }}>◆</span>
          </div>
          
          <div className="about-dialog-info">
            <h3 className="about-dialog-app-name">Ren'Py Visual Editor</h3>
            <p className="about-dialog-version">版本 0.1.0</p>
            <p className="about-dialog-description">
              一个可视化的 Ren'Py 游戏脚本编辑器，让视觉小说开发更简单。
            </p>
          </div>

          <div className="about-dialog-credits">
            <p>基于 Electron + React + TypeScript 构建</p>
            <p>支持 Ren'Py 8.x</p>
          </div>
        </div>

        {/* Footer */}
        <div className="about-dialog-footer">
          <button
            className="about-dialog-btn about-dialog-btn-primary"
            onClick={onClose}
            data-testid="btn-close"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

export default AboutDialog
