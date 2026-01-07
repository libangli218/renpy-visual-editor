/**
 * CharacterPropertiesPanel Component
 * 
 * Displays and allows editing of character properties in the right panel.
 * Implements Requirements 7.3: Character property editing
 * Implements Requirements 7.4: Layered Image support
 */

import React, { useState, useEffect } from 'react'
import { useCharacterStore } from './characterStore'
import {
  Character,
  isValidCharacterName,
  isValidHexColor,
  generateCharacterValue,
  generateLayeredImageCode,
  LayeredImageDef,
} from './types'
import { LayeredImageEditor } from './LayeredImageEditor'
import { FigmaColorPicker } from '../common'
import './CharacterPropertiesPanel.css'

interface CharacterPropertiesPanelProps {
  showCodePreview?: boolean
  allowCodeEdit?: boolean
}

export const CharacterPropertiesPanel: React.FC<CharacterPropertiesPanelProps> = ({
  showCodePreview = false,
  allowCodeEdit = false,
}) => {
  const { characters, selectedCharacterId, updateCharacter, openDialog, setCharacterLayers } =
    useCharacterStore()

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId)

  // Local state for editing
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset editing state when selection changes
  useEffect(() => {
    setEditingField(null)
    setEditValue('')
    setError(null)
  }, [selectedCharacterId])

  if (!selectedCharacter) {
    return (
      <div className="character-properties-empty">
        <p>Select a character to view properties</p>
      </div>
    )
  }

  const startEditing = (field: string, value: string) => {
    setEditingField(field)
    setEditValue(value)
    setError(null)
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditValue('')
    setError(null)
  }

  const saveField = (field: keyof Character) => {
    // Validate based on field type
    let isValid = true
    let errorMsg = ''

    switch (field) {
      case 'name':
        if (!editValue.trim()) {
          isValid = false
          errorMsg = 'Name is required'
        } else if (!isValidCharacterName(editValue)) {
          isValid = false
          errorMsg = 'Invalid identifier'
        } else if (
          characters.some((c) => c.name === editValue && c.id !== selectedCharacter.id)
        ) {
          isValid = false
          errorMsg = 'Name already in use'
        }
        break
      case 'displayName':
        if (!editValue.trim()) {
          isValid = false
          errorMsg = 'Display name is required'
        }
        break
      case 'color':
        if (editValue && !isValidHexColor(editValue)) {
          isValid = false
          errorMsg = 'Invalid hex color'
        }
        break
      case 'imagePrefix':
        if (editValue && !isValidCharacterName(editValue)) {
          isValid = false
          errorMsg = 'Invalid identifier'
        }
        break
    }

    if (!isValid) {
      setError(errorMsg)
      return
    }

    // Update character
    updateCharacter(selectedCharacter.id, {
      name: field === 'name' ? editValue : selectedCharacter.name,
      displayName: field === 'displayName' ? editValue : selectedCharacter.displayName,
      color: field === 'color' ? editValue || '#ffffff' : selectedCharacter.color || '#ffffff',
      imagePrefix:
        field === 'imagePrefix' ? editValue : selectedCharacter.imagePrefix || '',
      kind: field === 'kind' ? editValue : selectedCharacter.kind || '',
    })

    setEditingField(null)
    setEditValue('')
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, field: keyof Character) => {
    if (e.key === 'Enter') {
      saveField(field)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const renderEditableField = (
    field: keyof Character,
    label: string,
    value: string,
    placeholder?: string
  ) => {
    const isEditing = editingField === field

    return (
      <div className="property-item">
        <label>{label}</label>
        {isEditing ? (
          <div className="property-edit-container">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              onBlur={() => saveField(field)}
              placeholder={placeholder}
              autoFocus
              className={error ? 'error' : ''}
            />
            {error && <span className="property-error">{error}</span>}
          </div>
        ) : (
          <span
            className="property-value editable"
            onClick={() => startEditing(field, value)}
            title="Click to edit"
          >
            {value || <span className="placeholder">{placeholder || 'Not set'}</span>}
          </span>
        )}
      </div>
    )
  }

  const renderColorField = () => {
    const colorValue = selectedCharacter.color || '#ffffff'

    const handleColorChange = (newColor: string) => {
      updateCharacter(selectedCharacter.id, {
        name: selectedCharacter.name,
        displayName: selectedCharacter.displayName,
        color: newColor,
        imagePrefix: selectedCharacter.imagePrefix || '',
        kind: selectedCharacter.kind || '',
      })
    }

    return (
      <div className="property-item">
        <FigmaColorPicker
          label="Color"
          color={colorValue}
          onChange={handleColorChange}
        />
      </div>
    )
  }

  const renderKindField = () => {
    const isEditing = editingField === 'kind'

    return (
      <div className="property-item">
        <label>Kind</label>
        {isEditing ? (
          <div className="property-edit-container">
            <select
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value)
                // Auto-save on select change
                updateCharacter(selectedCharacter.id, {
                  name: selectedCharacter.name,
                  displayName: selectedCharacter.displayName,
                  color: selectedCharacter.color || '#ffffff',
                  imagePrefix: selectedCharacter.imagePrefix || '',
                  kind: e.target.value,
                })
                setEditingField(null)
              }}
              onBlur={cancelEditing}
              autoFocus
            >
              <option value="">Default (ADV)</option>
              <option value="nvl">NVL Mode</option>
            </select>
          </div>
        ) : (
          <span
            className="property-value editable"
            onClick={() => startEditing('kind', selectedCharacter.kind || '')}
            title="Click to edit"
          >
            {selectedCharacter.kind === 'nvl' ? 'NVL Mode' : 'Default (ADV)'}
          </span>
        )}
      </div>
    )
  }

  // Generate code preview
  const generatedCode = `define ${selectedCharacter.name} = ${generateCharacterValue({
    name: selectedCharacter.name,
    displayName: selectedCharacter.displayName,
    color: selectedCharacter.color || '#ffffff',
    imagePrefix: selectedCharacter.imagePrefix || '',
    kind: selectedCharacter.kind || '',
  })}`

  // Generate layered image code if layers are defined
  const layeredImageCode = selectedCharacter.layers
    ? generateLayeredImageCode(selectedCharacter.layers)
    : ''

  const fullGeneratedCode = layeredImageCode
    ? `${generatedCode}\n\n${layeredImageCode}`
    : generatedCode

  // Handle layers change
  const handleLayersChange = (layers: LayeredImageDef | undefined) => {
    setCharacterLayers(selectedCharacter.id, layers)
  }

  return (
    <div className="character-properties-panel">
      <div className="property-group">
        <h3 className="property-group-title">Character</h3>
        {renderEditableField('name', 'Variable Name', selectedCharacter.name, 'e.g., s')}
        {renderEditableField(
          'displayName',
          'Display Name',
          selectedCharacter.displayName,
          'e.g., Sylvie'
        )}
        {renderColorField()}
        {renderEditableField(
          'imagePrefix',
          'Image Prefix',
          selectedCharacter.imagePrefix || '',
          'e.g., sylvie'
        )}
        {renderKindField()}
      </div>

      {/* Layered Image Section - Requirement 7.4 */}
      <div className="property-group">
        <h3 className="property-group-title">Layered Image</h3>
        <LayeredImageEditor
          layers={selectedCharacter.layers}
          characterImagePrefix={selectedCharacter.imagePrefix || ''}
          characterName={selectedCharacter.name}
          onLayersChange={handleLayersChange}
          showCodePreview={false}
        />
      </div>

      <div className="property-group">
        <h3 className="property-group-title">Actions</h3>
        <button
          className="property-action-btn"
          onClick={() => openDialog(selectedCharacter)}
        >
          Edit in Dialog
        </button>
      </div>

      {showCodePreview && (
        <div className="property-group code-preview-group">
          <h3 className="property-group-title">Generated Code</h3>
          <div className="code-preview">
            <pre>
              <code>{fullGeneratedCode}</code>
            </pre>
          </div>
          {allowCodeEdit && (
            <p className="code-edit-hint">Edit code directly in advanced mode</p>
          )}
        </div>
      )}
    </div>
  )
}
