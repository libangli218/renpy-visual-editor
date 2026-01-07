/**
 * SettingsDialog Component
 * 
 * Modal dialog for project settings, accessible from Project menu.
 * Contains tabs for 外观 (Appearance) and 项目 (Project) settings.
 * 
 * Implements Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSettingsStore } from '../../settings/settingsStore'
import { useEditorStore } from '../../store/editorStore'
import { ColorSettingsGroup } from './ColorSettingsGroup'
import { FontSettingsGroup } from './FontSettingsGroup'
import { DialogueSettingsGroup } from './DialogueSettingsGroup'
import { ProjectInfoGroup } from './ProjectInfoGroup'
import { AudioSettingsGroup } from './AudioSettingsGroup'
import { DisplaySettingsGroup } from './DisplaySettingsGroup'
import type { GuiSettings, ProjectSettings } from '../../settings/SettingsParser'
import './SettingsDialog.css'

export interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = 'appearance' | 'project'

/**
 * Deep clone settings for comparison
 */
function cloneSettings<T>(settings: T | null): T | null {
  if (settings === null) return null
  return JSON.parse(JSON.stringify(settings))
}

/**
 * Compare two settings objects for equality
 */
function settingsEqual<T>(a: T | null, b: T | null): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  // Store original settings when dialog opens for cancel functionality
  const originalGuiRef = useRef<GuiSettings | null>(null)
  const originalProjectRef = useRef<ProjectSettings | null>(null)
  
  const { 
    gui, 
    project, 
    isLoading, 
    error, 
    resetToDefaults,
    saveSettings,
    resetSettings,
  } = useSettingsStore()
  
  const { projectPath } = useEditorStore()

  // File system adapter for saving settings
  const settingsFileSystem = {
    readFile: async (path: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (api?.readFile) {
        return api.readFile(path)
      }
      throw new Error('File system not available')
    },
    writeFile: async (path: string, content: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (api?.writeFile) {
        return api.writeFile(path, content)
      }
      throw new Error('File system not available')
    },
    exists: async (path: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (api?.exists) {
        return api.exists(path)
      }
      return false
    },
  }

  /**
   * Store original settings when dialog opens
   * Requirement 6.6: Cancel should restore original values
   */
  useEffect(() => {
    if (isOpen) {
      originalGuiRef.current = cloneSettings(gui.settings)
      originalProjectRef.current = cloneSettings(project.settings)
    }
  }, [isOpen]) // Only capture on open, not on settings change

  /**
   * Check if there are unsaved changes
   */
  const hasUnsavedChanges = useCallback((): boolean => {
    const guiChanged = !settingsEqual(gui.settings, originalGuiRef.current)
    const projectChanged = !settingsEqual(project.settings, originalProjectRef.current)
    return guiChanged || projectChanged
  }, [gui.settings, project.settings])

  /**
   * Handle save button click
   * Requirement 6.5: Save changes and close
   */
  const handleSave = useCallback(async () => {
    if (projectPath) {
      const success = await saveSettings(projectPath, settingsFileSystem)
      if (success) {
        onClose()
      }
    }
  }, [projectPath, saveSettings, onClose])

  /**
   * Handle cancel button click
   * Requirement 6.6: Discard changes and close
   */
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowConfirmDialog(true)
    } else {
      onClose()
    }
  }, [hasUnsavedChanges, onClose])

  /**
   * Confirm discard changes
   */
  const handleConfirmDiscard = useCallback(() => {
    resetSettings()
    setShowConfirmDialog(false)
    onClose()
  }, [resetSettings, onClose])

  /**
   * Cancel discard and return to dialog
   */
  const handleCancelDiscard = useCallback(() => {
    setShowConfirmDialog(false)
  }, [])

  /**
   * Handle reset to defaults
   * Requirement 6.4: Reset to default values
   */
  const handleResetToDefaults = useCallback(() => {
    if (window.confirm('确定要恢复所有设置为默认值吗？')) {
      resetToDefaults()
    }
  }, [resetToDefaults])

  /**
   * Handle Escape key
   * Requirement 6.7: Closable with Escape key
   */
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleCancel])

  /**
   * Handle overlay click to close
   */
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel()
    }
  }, [handleCancel])

  if (!isOpen) return null

  return (
    <div 
      className="settings-dialog-overlay" 
      onClick={handleOverlayClick}
      data-testid="settings-dialog-overlay"
    >
      <div 
        className="settings-dialog" 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        data-testid="settings-dialog"
      >
        {/* Header */}
        <div className="settings-dialog-header">
          <h2 id="settings-dialog-title" className="settings-dialog-title">
            项目设置
          </h2>
          <button
            className="settings-dialog-close"
            onClick={handleCancel}
            aria-label="关闭"
            data-testid="settings-dialog-close"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-dialog-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'appearance'}
            aria-controls="appearance-panel"
            className={`settings-dialog-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
            data-testid="tab-appearance"
          >
            外观
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'project'}
            aria-controls="project-panel"
            className={`settings-dialog-tab ${activeTab === 'project' ? 'active' : ''}`}
            onClick={() => setActiveTab('project')}
            data-testid="tab-project"
          >
            项目
          </button>
        </div>

        {/* Content */}
        <div className="settings-dialog-content">
          {isLoading && (
            <div className="settings-dialog-loading">加载设置中...</div>
          )}
          
          {error && (
            <div className="settings-dialog-error">{error}</div>
          )}

          {!isLoading && !error && (
            <>
              {/* Appearance Tab Panel */}
              <div
                id="appearance-panel"
                role="tabpanel"
                aria-labelledby="tab-appearance"
                className={`settings-dialog-panel ${activeTab === 'appearance' ? 'active' : ''}`}
                data-testid="panel-appearance"
              >
                {gui.settings && (
                  <div className="settings-dialog-groups">
                    <ColorSettingsGroup />
                    <FontSettingsGroup />
                    <DialogueSettingsGroup />
                  </div>
                )}
              </div>

              {/* Project Tab Panel */}
              <div
                id="project-panel"
                role="tabpanel"
                aria-labelledby="tab-project"
                className={`settings-dialog-panel ${activeTab === 'project' ? 'active' : ''}`}
                data-testid="panel-project"
              >
                {project.settings && (
                  <div className="settings-dialog-groups">
                    <ProjectInfoGroup />
                    <AudioSettingsGroup />
                    <DisplaySettingsGroup />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="settings-dialog-footer">
          <button
            className="settings-dialog-btn settings-dialog-btn-secondary"
            onClick={handleResetToDefaults}
            data-testid="btn-reset-defaults"
          >
            恢复默认
          </button>
          <div className="settings-dialog-footer-right">
            <button
              className="settings-dialog-btn settings-dialog-btn-secondary"
              onClick={handleCancel}
              data-testid="btn-cancel"
            >
              取消
            </button>
            <button
              className="settings-dialog-btn settings-dialog-btn-primary"
              onClick={handleSave}
              data-testid="btn-save"
            >
              保存
            </button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      {showConfirmDialog && (
        <div 
          className="settings-confirm-overlay"
          data-testid="confirm-dialog-overlay"
        >
          <div 
            className="settings-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            data-testid="confirm-dialog"
          >
            <h3 id="confirm-dialog-title" className="settings-confirm-title">
              未保存的更改
            </h3>
            <p className="settings-confirm-message">
              您有未保存的更改。确定要放弃这些更改吗？
            </p>
            <div className="settings-confirm-actions">
              <button
                className="settings-dialog-btn settings-dialog-btn-secondary"
                onClick={handleCancelDiscard}
                data-testid="btn-cancel-discard"
              >
                继续编辑
              </button>
              <button
                className="settings-dialog-btn settings-dialog-btn-danger"
                onClick={handleConfirmDiscard}
                data-testid="btn-confirm-discard"
              >
                放弃更改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsDialog
