/**
 * ImportDialog Component
 * 
 * Dialog for handling resource import with conflict resolution and validation warnings.
 * Implements Requirements:
 * - 3.7: File name conflict handling (rename or overwrite)
 * - 3.8: Space warning display
 */

import React, { useCallback } from 'react'
import { ConflictResolution } from '../../resource/ImportService'
import './ImportDialog.css'

// ============================================================================
// Conflict Dialog
// ============================================================================

export interface ConflictDialogProps {
  isOpen: boolean
  fileName: string
  targetPath: string
  onResolve: (resolution: ConflictResolution) => void
}

/**
 * ConflictDialog - Dialog for resolving file name conflicts
 */
export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  isOpen,
  fileName,
  onResolve,
}) => {
  const handleOverwrite = useCallback(() => {
    onResolve('overwrite')
  }, [onResolve])
  
  const handleRename = useCallback(() => {
    onResolve('rename')
  }, [onResolve])
  
  const handleSkip = useCallback(() => {
    onResolve('skip')
  }, [onResolve])
  
  if (!isOpen) return null
  
  return (
    <div className="import-dialog-overlay">
      <div className="import-dialog" role="alertdialog" aria-modal="true">
        <div className="import-dialog-icon warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
          </svg>
        </div>
        
        <div className="import-dialog-content">
          <h3 className="import-dialog-title">文件已存在</h3>
          <p className="import-dialog-message">
            文件 <strong>{fileName}</strong> 已存在于目标目录中。
          </p>
          <p className="import-dialog-hint">
            请选择如何处理此冲突：
          </p>
        </div>
        
        <div className="import-dialog-actions">
          <button
            className="import-dialog-btn import-dialog-btn-secondary"
            onClick={handleSkip}
          >
            跳过
          </button>
          <button
            className="import-dialog-btn import-dialog-btn-secondary"
            onClick={handleRename}
          >
            自动重命名
          </button>
          <button
            className="import-dialog-btn import-dialog-btn-primary"
            onClick={handleOverwrite}
          >
            覆盖
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Validation Warning Dialog
// ============================================================================

export interface ValidationWarningDialogProps {
  isOpen: boolean
  fileName: string
  warnings: string[]
  suggestedName?: string
  onProceed: (proceed: boolean) => void
}

/**
 * ValidationWarningDialog - Dialog for showing file name validation warnings
 */
export const ValidationWarningDialog: React.FC<ValidationWarningDialogProps> = ({
  isOpen,
  fileName,
  warnings,
  suggestedName,
  onProceed,
}) => {
  const handleProceed = useCallback(() => {
    onProceed(true)
  }, [onProceed])
  
  const handleCancel = useCallback(() => {
    onProceed(false)
  }, [onProceed])
  
  if (!isOpen) return null
  
  return (
    <div className="import-dialog-overlay">
      <div className="import-dialog" role="alertdialog" aria-modal="true">
        <div className="import-dialog-icon warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
          </svg>
        </div>
        
        <div className="import-dialog-content">
          <h3 className="import-dialog-title">文件名警告</h3>
          <p className="import-dialog-message">
            文件 <strong>{fileName}</strong> 存在以下问题：
          </p>
          <ul className="import-dialog-warnings">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
          {suggestedName && (
            <p className="import-dialog-suggestion">
              建议文件名: <code>{suggestedName}</code>
            </p>
          )}
        </div>
        
        <div className="import-dialog-actions">
          <button
            className="import-dialog-btn import-dialog-btn-secondary"
            onClick={handleCancel}
          >
            取消导入
          </button>
          <button
            className="import-dialog-btn import-dialog-btn-primary"
            onClick={handleProceed}
          >
            继续导入
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Import Progress Dialog
// ============================================================================

export interface ImportProgressDialogProps {
  isOpen: boolean
  total: number
  current: number
  currentFileName: string
}

/**
 * ImportProgressDialog - Dialog showing import progress
 */
export const ImportProgressDialog: React.FC<ImportProgressDialogProps> = ({
  isOpen,
  total,
  current,
  currentFileName,
}) => {
  if (!isOpen) return null
  
  const progress = total > 0 ? (current / total) * 100 : 0
  
  return (
    <div className="import-dialog-overlay">
      <div className="import-dialog" role="dialog" aria-modal="true">
        <div className="import-dialog-content">
          <h3 className="import-dialog-title">正在导入...</h3>
          <p className="import-dialog-message">
            正在导入: {currentFileName}
          </p>
          <div className="import-progress-bar">
            <div 
              className="import-progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="import-progress-text">
            {current} / {total}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Import Result Dialog
// ============================================================================

export interface ImportResultDialogProps {
  isOpen: boolean
  total: number
  successful: number
  failed: number
  skipped: number
  onClose: () => void
}

/**
 * ImportResultDialog - Dialog showing import results
 */
export const ImportResultDialog: React.FC<ImportResultDialogProps> = ({
  isOpen,
  total,
  successful,
  failed,
  skipped,
  onClose,
}) => {
  if (!isOpen) return null
  
  const allSuccessful = failed === 0 && skipped === 0
  
  return (
    <div className="import-dialog-overlay">
      <div className="import-dialog" role="alertdialog" aria-modal="true">
        <div className={`import-dialog-icon ${allSuccessful ? 'success' : 'warning'}`}>
          {allSuccessful ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
            </svg>
          )}
        </div>
        
        <div className="import-dialog-content">
          <h3 className="import-dialog-title">导入完成</h3>
          <div className="import-result-stats">
            <div className="import-result-stat">
              <span className="stat-label">总计:</span>
              <span className="stat-value">{total}</span>
            </div>
            <div className="import-result-stat success">
              <span className="stat-label">成功:</span>
              <span className="stat-value">{successful}</span>
            </div>
            {failed > 0 && (
              <div className="import-result-stat error">
                <span className="stat-label">失败:</span>
                <span className="stat-value">{failed}</span>
              </div>
            )}
            {skipped > 0 && (
              <div className="import-result-stat warning">
                <span className="stat-label">跳过:</span>
                <span className="stat-value">{skipped}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="import-dialog-actions">
          <button
            className="import-dialog-btn import-dialog-btn-primary"
            onClick={onClose}
            autoFocus
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

export default {
  ConflictDialog,
  ValidationWarningDialog,
  ImportProgressDialog,
  ImportResultDialog,
}
