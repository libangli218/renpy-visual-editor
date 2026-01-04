/**
 * LayeredImageEditor Component
 * 
 * Editor for managing layered image definitions for characters.
 * Implements Requirements 7.4: Layered Image support
 */

import React, { useState } from 'react'
import { LayeredImageDef, LayerAttribute, isValidLayerName } from './types'
import './LayeredImageEditor.css'

interface LayeredImageEditorProps {
  layers: LayeredImageDef | undefined
  characterImagePrefix: string
  characterName: string
  onLayersChange: (layers: LayeredImageDef | undefined) => void
  showCodePreview?: boolean
}

export const LayeredImageEditor: React.FC<LayeredImageEditorProps> = ({
  layers,
  characterImagePrefix,
  characterName,
  onLayersChange,
  showCodePreview = false,
}) => {
  const [editingLayerIndex, setEditingLayerIndex] = useState<number | null>(null)
  const [newLayerName, setNewLayerName] = useState('')
  const [newLayerError, setNewLayerError] = useState<string | null>(null)
  const [showAddLayer, setShowAddLayer] = useState(false)

  const imageName = layers?.name || characterImagePrefix || characterName

  const handleAddLayer = () => {
    if (!newLayerName.trim()) {
      setNewLayerError('Layer name is required')
      return
    }
    if (!isValidLayerName(newLayerName)) {
      setNewLayerError('Invalid identifier')
      return
    }
    if (layers?.attributes.some(a => a.name === newLayerName)) {
      setNewLayerError('Layer already exists')
      return
    }

    const newAttribute: LayerAttribute = {
      name: newLayerName.trim(),
      options: [],
      default: undefined,
    }

    const newLayers: LayeredImageDef = layers
      ? { ...layers, attributes: [...layers.attributes, newAttribute] }
      : { name: imageName, attributes: [newAttribute] }

    onLayersChange(newLayers)
    setNewLayerName('')
    setNewLayerError(null)
    setShowAddLayer(false)
    setEditingLayerIndex(newLayers.attributes.length - 1)
  }

  const handleRemoveLayer = (index: number) => {
    if (!layers) return

    const newAttributes = layers.attributes.filter((_, i) => i !== index)
    if (newAttributes.length === 0) {
      onLayersChange(undefined)
    } else {
      onLayersChange({ ...layers, attributes: newAttributes })
    }
    
    if (editingLayerIndex === index) {
      setEditingLayerIndex(null)
    } else if (editingLayerIndex !== null && editingLayerIndex > index) {
      setEditingLayerIndex(editingLayerIndex - 1)
    }
  }

  const handleUpdateLayer = (index: number, attribute: LayerAttribute) => {
    if (!layers) return
    const newAttributes = [...layers.attributes]
    newAttributes[index] = attribute
    onLayersChange({ ...layers, attributes: newAttributes })
  }

  const handleEnableLayeredImage = () => {
    onLayersChange({
      name: imageName,
      attributes: [],
    })
    setShowAddLayer(true)
  }

  // Generate code preview
  const generateCodePreview = (): string => {
    if (!layers || layers.attributes.length === 0) {
      return '# No layered image defined'
    }

    const lines: string[] = []
    lines.push(`layeredimage ${layers.name}:`)

    for (const attr of layers.attributes) {
      if (!attr.name) continue
      lines.push(`    group ${attr.name}:`)
      for (const option of attr.options) {
        const isDefault = attr.default === option
        lines.push(`        attribute ${option}${isDefault ? ' default' : ''}`)
      }
      if (attr.options.length === 0) {
        lines.push(`        # No options defined`)
      }
    }

    return lines.join('\n')
  }

  return (
    <div className="layered-image-editor">
      <div className="layered-image-header">
        <h4>Layered Image</h4>
        {!layers && (
          <button
            className="enable-layers-btn"
            onClick={handleEnableLayeredImage}
            title="Enable layered image for this character"
          >
            + Enable
          </button>
        )}
      </div>

      {layers ? (
        <>
          <div className="layers-image-name">
            <span className="label">Image Name:</span>
            <span className="value">{layers.name}</span>
          </div>

          <div className="layers-list">
            {layers.attributes.map((attr, index) => (
              <LayerAttributeItem
                key={index}
                attribute={attr}
                isExpanded={editingLayerIndex === index}
                onToggleExpand={() => setEditingLayerIndex(
                  editingLayerIndex === index ? null : index
                )}
                onUpdate={(updated) => handleUpdateLayer(index, updated)}
                onRemove={() => handleRemoveLayer(index)}
              />
            ))}
          </div>

          {showAddLayer ? (
            <div className="add-layer-form">
              <input
                type="text"
                value={newLayerName}
                onChange={(e) => {
                  setNewLayerName(e.target.value)
                  setNewLayerError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddLayer()
                  if (e.key === 'Escape') {
                    setShowAddLayer(false)
                    setNewLayerName('')
                    setNewLayerError(null)
                  }
                }}
                placeholder="Layer name (e.g., outfit, expression)"
                className={newLayerError ? 'error' : ''}
                autoFocus
              />
              {newLayerError && <span className="error-text">{newLayerError}</span>}
              <div className="add-layer-actions">
                <button className="btn-add" onClick={handleAddLayer}>Add</button>
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setShowAddLayer(false)
                    setNewLayerName('')
                    setNewLayerError(null)
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="add-layer-btn"
              onClick={() => setShowAddLayer(true)}
            >
              + Add Layer Group
            </button>
          )}

          {layers.attributes.length === 0 && !showAddLayer && (
            <p className="layers-empty-hint">
              Add layer groups like "outfit", "expression", or "accessory"
            </p>
          )}
        </>
      ) : (
        <p className="layers-disabled-hint">
          Enable layered images to define character variations like outfits and expressions.
        </p>
      )}

      {showCodePreview && layers && (
        <div className="layers-code-preview">
          <h5>Generated Code</h5>
          <pre><code>{generateCodePreview()}</code></pre>
        </div>
      )}
    </div>
  )
}


/**
 * LayerAttributeItem Component
 * 
 * Individual layer attribute editor with expandable options.
 */
interface LayerAttributeItemProps {
  attribute: LayerAttribute
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (attribute: LayerAttribute) => void
  onRemove: () => void
}

const LayerAttributeItem: React.FC<LayerAttributeItemProps> = ({
  attribute,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
}) => {
  const [newOption, setNewOption] = useState('')
  const [optionError, setOptionError] = useState<string | null>(null)

  const handleAddOption = () => {
    const trimmed = newOption.trim()
    if (!trimmed) {
      setOptionError('Option name is required')
      return
    }
    if (!isValidLayerName(trimmed)) {
      setOptionError('Invalid identifier')
      return
    }
    if (attribute.options.includes(trimmed)) {
      setOptionError('Option already exists')
      return
    }

    const newOptions = [...attribute.options, trimmed]
    onUpdate({
      ...attribute,
      options: newOptions,
      // Set as default if it's the first option
      default: attribute.default || (newOptions.length === 1 ? trimmed : undefined),
    })
    setNewOption('')
    setOptionError(null)
  }

  const handleRemoveOption = (option: string) => {
    const newOptions = attribute.options.filter(o => o !== option)
    onUpdate({
      ...attribute,
      options: newOptions,
      // Clear default if removed option was default
      default: attribute.default === option
        ? (newOptions[0] || undefined)
        : attribute.default,
    })
  }

  const handleSetDefault = (option: string) => {
    onUpdate({
      ...attribute,
      default: option,
    })
  }

  return (
    <div className={`layer-attribute-item ${isExpanded ? 'expanded' : ''}`}>
      <div className="layer-attribute-header" onClick={onToggleExpand}>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="layer-name">{attribute.name}</span>
        <span className="layer-options-count">
          {attribute.options.length} option{attribute.options.length !== 1 ? 's' : ''}
        </span>
        <button
          className="layer-remove-btn"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          title="Remove layer"
        >
          ×
        </button>
      </div>

      {isExpanded && (
        <div className="layer-attribute-content">
          <div className="layer-options-list">
            {attribute.options.map((option) => (
              <div key={option} className="layer-option-item">
                <span className="option-name">{option}</span>
                {attribute.default === option ? (
                  <span className="option-default-badge">default</span>
                ) : (
                  <button
                    className="option-set-default-btn"
                    onClick={() => handleSetDefault(option)}
                    title="Set as default"
                  >
                    set default
                  </button>
                )}
                <button
                  className="option-remove-btn"
                  onClick={() => handleRemoveOption(option)}
                  title="Remove option"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="add-option-form">
            <input
              type="text"
              value={newOption}
              onChange={(e) => {
                setNewOption(e.target.value)
                setOptionError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddOption()
              }}
              placeholder="Add option (e.g., happy, sad)"
              className={optionError ? 'error' : ''}
            />
            <button className="btn-add-option" onClick={handleAddOption}>+</button>
          </div>
          {optionError && <span className="option-error-text">{optionError}</span>}

          {attribute.options.length === 0 && (
            <p className="options-empty-hint">
              Add options like "casual", "formal" for outfit, or "happy", "sad" for expression
            </p>
          )}
        </div>
      )}
    </div>
  )
}
