/**
 * VariableDialog Component
 * 
 * Dialog for creating and editing variables (default/define/persistent).
 */

import React, { useState, useEffect } from 'react'
import {
  Variable,
  VariableFormData,
  VariableScope,
  VariableType,
  DEFAULT_VARIABLE_FORM,
  isValidVariableName,
  getDefaultValueForType,
  inferTypeFromValue,
} from './types'
import './VariableDialog.css'

interface VariableDialogProps {
  isOpen: boolean
  variable: Variable | null  // null for create, Variable for edit
  existingNames: string[]    // Names already in use
  onSave: (data: VariableFormData) => void
  onCancel: () => void
}

export const VariableDialog: React.FC<VariableDialogProps> = ({
  isOpen,
  variable,
  existingNames,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<VariableFormData>(DEFAULT_VARIABLE_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof VariableFormData, string>>>({})

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      if (variable) {
        setFormData({
          name: variable.name,
          value: variable.value,
          scope: variable.scope,
          type: variable.type,
          description: variable.description || '',
        })
      } else {
        setFormData(DEFAULT_VARIABLE_FORM)
      }
      setErrors({})
    }
  }, [isOpen, variable])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VariableFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = '变量名不能为空'
    } else if (!isValidVariableName(formData.name)) {
      newErrors.name = '必须是有效的标识符（字母、数字、下划线，不能以数字开头）'
    } else if (
      existingNames.includes(formData.name) &&
      (!variable || variable.name !== formData.name)
    ) {
      newErrors.name = '该名称已被使用'
    }

    if (!formData.value.trim()) {
      newErrors.value = '值不能为空'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  const handleChange = (field: keyof VariableFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleScopeChange = (scope: VariableScope) => {
    setFormData((prev) => ({ ...prev, scope }))
  }

  const handleTypeChange = (type: VariableType) => {
    // Update type and set default value for that type
    setFormData((prev) => ({
      ...prev,
      type,
      value: getDefaultValueForType(type),
    }))
  }

  const handleValueChange = (value: string) => {
    // Auto-infer type from value
    const inferredType = inferTypeFromValue(value)
    setFormData((prev) => ({
      ...prev,
      value,
      type: inferredType,
    }))
    if (errors.value) {
      setErrors((prev) => ({ ...prev, value: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="variable-dialog-overlay" onClick={onCancel}>
      <div
        className="variable-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="variable-dialog-title"
        aria-modal="true"
      >
        <div className="variable-dialog-header">
          <h2 id="variable-dialog-title">
            {variable ? '编辑变量' : '添加变量'}
          </h2>
          <button
            className="variable-dialog-close"
            onClick={onCancel}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="variable-dialog-form">
          <div className="form-group">
            <label htmlFor="var-scope">作用域 *</label>
            <select
              id="var-scope"
              value={formData.scope}
              onChange={(e) => handleScopeChange(e.target.value as VariableScope)}
            >
              <option value="default">default（可变变量）</option>
              <option value="define">define（常量）</option>
              <option value="persistent">persistent（持久化）</option>
            </select>
            <span className="hint">
              {formData.scope === 'default' && 'default 变量可在游戏中修改，会被存档保存'}
              {formData.scope === 'define' && 'define 常量不可修改，用于配置'}
              {formData.scope === 'persistent' && 'persistent 变量跨存档保存，如成就、设置'}
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="var-name">变量名 *</label>
            <input
              id="var-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="例如: player_name, score"
              className={errors.name ? 'error' : ''}
              autoFocus
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="var-type">值类型</label>
            <select
              id="var-type"
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value as VariableType)}
            >
              <option value="any">any（任意）</option>
              <option value="bool">bool（布尔）</option>
              <option value="int">int（整数）</option>
              <option value="str">str（字符串）</option>
              <option value="list">list（列表）</option>
              <option value="dict">dict（字典）</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="var-value">值 *</label>
            <input
              id="var-value"
              type="text"
              value={formData.value}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder='例如: "默认名字", 0, True'
              className={errors.value ? 'error' : ''}
            />
            {errors.value && <span className="error-message">{errors.value}</span>}
            <span className="hint">
              字符串需要加引号，如 "文本"；数字直接写，如 100
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="var-description">描述（可选）</label>
            <input
              id="var-description"
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="变量用途说明"
            />
          </div>

          <div className="variable-dialog-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="btn-primary">
              {variable ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
