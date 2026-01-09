/**
 * NewScriptDialog Component
 * 新建脚本对话框
 * 
 * Dialog for creating new .rpy script files.
 * 
 * Requirements:
 * - 2.2: Open dialog with text input for file name
 * - 2.3: Validate file name is a valid identifier (letters, numbers, underscores)
 * - 2.4: Validate file does not already exist
 * - 2.5: Create new .rpy file with default template
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import './NewScriptDialog.css'

/**
 * Props for NewScriptDialog component
 */
export interface NewScriptDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog is closed */
  onClose: () => void
  /** Callback when script is created - receives file name without .rpy extension */
  onCreate: (fileName: string) => void | Promise<void>
  /** List of existing file names (for duplicate validation) */
  existingFiles: string[]
  /** Whether creation is in progress */
  isCreating?: boolean
}

/**
 * Validate that a file name is a valid identifier
 * Must start with a letter or underscore, followed by letters, numbers, or underscores
 */
export function isValidFileName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false
  }
  // Valid Python/Ren'Py identifier pattern
  // Must start with letter or underscore, followed by letters, numbers, or underscores
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/
  return validPattern.test(name)
}

/**
 * Check if a file name already exists (case-insensitive)
 */
export function fileExists(name: string, existingFiles: string[]): boolean {
  const normalizedName = name.toLowerCase().replace(/\.rpy$/i, '')
  return existingFiles.some(f => {
    const normalizedExisting = f.toLowerCase().replace(/\.rpy$/i, '')
    return normalizedExisting === normalizedName
  })
}

/**
 * Generate default label name from file name
 * Converts file name to a valid label identifier
 */
export function generateLabelName(fileName: string): string {
  // Remove .rpy extension if present
  let name = fileName.replace(/\.rpy$/i, '')
  // Replace invalid characters with underscores
  name = name.replace(/[^a-zA-Z0-9_]/g, '_')
  // Ensure it starts with a letter or underscore
  if (/^[0-9]/.test(name)) {
    name = '_' + name
  }
  return name || 'new_label'
}

/**
 * NewScriptDialog - Dialog for creating new script files
 * 
 * Implements Requirements:
 * - 2.2: Text input for file name
 * - 2.3: Valid identifier validation
 * - 2.4: Duplicate file validation
 * - 2.5: Default template generation
 */
export const NewScriptDialog: React.FC<NewScriptDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingFiles,
  isCreating = false,
}) => {
  // State
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFileName('')
      setError(null)
      setIsSubmitting(false)
      // Focus input after a short delay to ensure dialog is rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Validate file name
  const validateFileName = useCallback((name: string): string | null => {
    const trimmedName = name.trim()
    
    if (!trimmedName) {
      return '文件名不能为空'
    }
    
    if (!isValidFileName(trimmedName)) {
      return '文件名必须是有效的标识符（字母、数字、下划线，不能以数字开头）'
    }
    
    if (fileExists(trimmedName, existingFiles)) {
      return '该文件名已存在'
    }
    
    return null
  }, [existingFiles])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFileName(value)
    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }, [error])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedName = fileName.trim()
    const validationError = validateFileName(trimmedName)
    
    if (validationError) {
      setError(validationError)
      inputRef.current?.focus()
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await onCreate(trimmedName)
      // Dialog will be closed by parent after successful creation
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建文件失败')
      setIsSubmitting(false)
    }
  }, [fileName, validateFileName, onCreate])

  // Handle close
  const handleClose = useCallback(() => {
    if (!isSubmitting && !isCreating) {
      onClose()
    }
  }, [isSubmitting, isCreating, onClose])

  // Handle overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }, [handleClose])

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose()
    }
  }, [handleClose])

  // Don't render if not open
  if (!isOpen) {
    return null
  }

  const isDisabled = isSubmitting || isCreating
  const previewLabelName = generateLabelName(fileName || 'new_script')

  return (
    <div 
      className="new-script-dialog-overlay" 
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className="new-script-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="new-script-dialog-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="new-script-dialog-header">
          <h2 id="new-script-dialog-title">新建脚本</h2>
          <button
            className="new-script-dialog-close"
            onClick={handleClose}
            disabled={isDisabled}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="new-script-dialog-form">
          <div className="form-group">
            <label htmlFor="script-name">文件名 *</label>
            <div className="input-with-suffix">
              <input
                ref={inputRef}
                id="script-name"
                type="text"
                value={fileName}
                onChange={handleInputChange}
                placeholder="例如: chapter1, characters"
                className={error ? 'error' : ''}
                disabled={isDisabled}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="input-suffix">.rpy</span>
            </div>
            {error && <span className="error-message">{error}</span>}
            <span className="hint">
              文件名只能包含字母、数字和下划线，不能以数字开头
            </span>
          </div>

          {/* Preview */}
          {fileName.trim() && !error && (
            <div className="form-group preview-group">
              <label>预览</label>
              <div className="template-preview">
                <code>
                  <span className="preview-comment"># {fileName.trim()}.rpy</span>
                  <br />
                  <span className="preview-comment"># 由 Ren'Py Visual Editor 创建</span>
                  <br />
                  <br />
                  <span className="preview-keyword">label</span>{' '}
                  <span className="preview-label">{previewLabelName}</span>:
                  <br />
                  <span className="preview-indent">    </span>
                  <span className="preview-string">"这是一个新的场景。"</span>
                  <br />
                  <span className="preview-indent">    </span>
                  <span className="preview-keyword">return</span>
                </code>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="new-script-dialog-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={isDisabled}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isDisabled || !fileName.trim()}
            >
              {isDisabled ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Display name for debugging
NewScriptDialog.displayName = 'NewScriptDialog'

export default NewScriptDialog
