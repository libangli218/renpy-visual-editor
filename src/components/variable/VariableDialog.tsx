/**
 * Variable Dialog Component
 * 
 * Dialog for creating and editing variables.
 * Implements Requirements 8.1, 8.2, 8.3
 */

import React, { useState, useEffect } from 'react'
import { useVariableStore } from './variableStore'
import {
  Variable,
  VariableFormData,
  VariableScope,
  VariableType,
  DEFAULT_VARIABLE_FORM,
  SCOPE_INFO,
  TYPE_INFO,
  isValidVariableName,
  getDefaultValueForType,
} from './types'
import './VariableDialog.css'

interface VariableDialogProps {
  isOpen: boolean
  variable?: Variable | null
  onClose: () => void
  onSave?: (data: VariableFormData) => void
}

export const VariableDialog: React.FC<VariableDialogProps> = ({
  isOpen,
  variable,
  onClose,
  onSave,
}) => {
  const { addVariable, updateVariable } = useVariableStore()
  const [formData, setFormData] = useState<VariableFormData>(DEFAULT_VARIABLE_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof VariableFormData, string>>>({})

  const isEditing = !!variable

  // Reset form when dialog opens/closes or variable changes
  useEffect(() => {
    if (isOpen) {
      if (variable) {
        setFormData({
          name: variable.name,
          scope: variable.scope,
          type: variable.type,
          value: variable.value,
          description: variable.description || '',
        })
      } else {
        setFormData(DEFAULT_VARIABLE_FORM)
      }
      setErrors({})
    }
  }, [isOpen, variable])

  // Update default value when type changes
  const handleTypeChange = (type: VariableType) => {
    setFormData((prev) => ({
      ...prev,
      type,
      value: getDefaultValueForType(type),
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VariableFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (!isValidVariableName(formData.name)) {
      newErrors.name = 'Invalid variable name (must be valid Python identifier)'
    }

    if (!formData.value.trim()) {
      newErrors.value = 'Value is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (onSave) {
      onSave(formData)
    } else if (isEditing && variable) {
      updateVariable(variable.id, formData)
    } else {
      addVariable(formData)
    }

    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="variable-dialog-overlay" onClick={onClose}>
      <div className="variable-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="variable-dialog-header">
          <h2>{isEditing ? 'Edit Variable' : 'Add Variable'}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="var-name">Name</label>
            <input
              id="var-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., player_score"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="var-scope">Scope</label>
            <select
              id="var-scope"
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value as VariableScope })}
            >
              {(Object.keys(SCOPE_INFO) as VariableScope[]).map((scope) => (
                <option key={scope} value={scope}>
                  {SCOPE_INFO[scope].label} - {SCOPE_INFO[scope].description}
                </option>
              ))}
            </select>
            <div 
              className="scope-indicator"
              style={{ backgroundColor: SCOPE_INFO[formData.scope].color }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="var-type">Type</label>
            <select
              id="var-type"
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value as VariableType)}
            >
              {(Object.keys(TYPE_INFO) as VariableType[]).map((type) => (
                <option key={type} value={type}>
                  {TYPE_INFO[type].label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="var-value">Initial Value</label>
            <input
              id="var-value"
              type="text"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder={TYPE_INFO[formData.type].placeholder}
              className={errors.value ? 'error' : ''}
            />
            {errors.value && <span className="error-message">{errors.value}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="var-description">Description (optional)</label>
            <textarea
              id="var-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this variable is used for"
              rows={2}
            />
          </div>

          <div className="code-preview">
            <label>Generated Code:</label>
            <code>{generatePreviewCode(formData)}</code>
          </div>

          <div className="dialog-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              {isEditing ? 'Save Changes' : 'Add Variable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Generate preview code for the variable
 */
function generatePreviewCode(data: VariableFormData): string {
  const { name, scope, value } = data

  switch (scope) {
    case 'define':
      return `define ${name} = ${value}`
    case 'persistent':
      return `default persistent.${name} = ${value}`
    case 'default':
    default:
      return `default ${name} = ${value}`
  }
}

export default VariableDialog
