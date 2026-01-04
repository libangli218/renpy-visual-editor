/**
 * CharacterDialog Component
 * 
 * Dialog for creating and editing characters.
 * Implements Requirements 7.2: Character creation dialog
 */

import React, { useState, useEffect } from 'react'
import {
  Character,
  CharacterFormData,
  DEFAULT_CHARACTER_FORM,
  isValidCharacterName,
  isValidHexColor,
} from './types'
import './CharacterDialog.css'

interface CharacterDialogProps {
  isOpen: boolean
  character: Character | null  // null for create, Character for edit
  existingNames: string[]      // Names already in use (for validation)
  onSave: (data: CharacterFormData) => void
  onCancel: () => void
}

export const CharacterDialog: React.FC<CharacterDialogProps> = ({
  isOpen,
  character,
  existingNames,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CharacterFormData>(DEFAULT_CHARACTER_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof CharacterFormData, string>>>({})

  // Reset form when dialog opens/closes or character changes
  useEffect(() => {
    if (isOpen) {
      if (character) {
        // Edit mode - populate form with character data
        setFormData({
          name: character.name,
          displayName: character.displayName,
          color: character.color || '#ffffff',
          imagePrefix: character.imagePrefix || '',
          kind: character.kind || '',
        })
      } else {
        // Create mode - reset to defaults
        setFormData(DEFAULT_CHARACTER_FORM)
      }
      setErrors({})
    }
  }, [isOpen, character])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CharacterFormData, string>> = {}

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Variable name is required'
    } else if (!isValidCharacterName(formData.name)) {
      newErrors.name = 'Must be a valid Python identifier (letters, numbers, underscores)'
    } else if (
      existingNames.includes(formData.name) &&
      (!character || character.name !== formData.name)
    ) {
      newErrors.name = 'This name is already in use'
    }

    // Validate display name
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required'
    }

    // Validate color
    if (formData.color && !isValidHexColor(formData.color)) {
      newErrors.color = 'Must be a valid hex color (e.g., #ff0000)'
    }

    // Validate image prefix (if provided, must be valid identifier)
    if (formData.imagePrefix && !isValidCharacterName(formData.imagePrefix)) {
      newErrors.imagePrefix = 'Must be a valid identifier'
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

  const handleChange = (field: keyof CharacterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="character-dialog-overlay" onClick={onCancel}>
      <div
        className="character-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="character-dialog-title"
        aria-modal="true"
      >
        <div className="character-dialog-header">
          <h2 id="character-dialog-title">
            {character ? 'Edit Character' : 'Create Character'}
          </h2>
          <button
            className="character-dialog-close"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="character-dialog-form">
          <div className="form-group">
            <label htmlFor="char-name">Variable Name *</label>
            <input
              id="char-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., s, sylvie, narrator"
              className={errors.name ? 'error' : ''}
              autoFocus
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
            <span className="hint">Used in script: {formData.name || 'name'} "Hello!"</span>
          </div>

          <div className="form-group">
            <label htmlFor="char-display-name">Display Name *</label>
            <input
              id="char-display-name"
              type="text"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              placeholder="e.g., Sylvie, Narrator"
              className={errors.displayName ? 'error' : ''}
            />
            {errors.displayName && (
              <span className="error-message">{errors.displayName}</span>
            )}
            <span className="hint">Shown in dialogue box</span>
          </div>

          <div className="form-group">
            <label htmlFor="char-color">Name Color</label>
            <div className="color-input-group">
              <input
                id="char-color"
                type="color"
                value={formData.color || '#ffffff'}
                onChange={(e) => handleChange('color', e.target.value)}
                className="color-picker"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="#ffffff"
                className={`color-text ${errors.color ? 'error' : ''}`}
              />
            </div>
            {errors.color && <span className="error-message">{errors.color}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="char-image-prefix">Image Prefix</label>
            <input
              id="char-image-prefix"
              type="text"
              value={formData.imagePrefix}
              onChange={(e) => handleChange('imagePrefix', e.target.value)}
              placeholder="e.g., sylvie"
              className={errors.imagePrefix ? 'error' : ''}
            />
            {errors.imagePrefix && (
              <span className="error-message">{errors.imagePrefix}</span>
            )}
            <span className="hint">Used for "show {formData.imagePrefix || 'prefix'} happy"</span>
          </div>

          <div className="form-group">
            <label htmlFor="char-kind">Character Kind</label>
            <select
              id="char-kind"
              value={formData.kind}
              onChange={(e) => handleChange('kind', e.target.value)}
            >
              <option value="">Default (ADV)</option>
              <option value="nvl">NVL Mode</option>
            </select>
            <span className="hint">NVL mode shows text in full-screen style</span>
          </div>

          <div className="character-dialog-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {character ? 'Save Changes' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
