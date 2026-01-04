/**
 * Variable List Component
 * 
 * Displays all variables grouped by scope with different colors.
 * Implements Requirements 8.1, 8.4
 */

import React from 'react'
import { useVariableStore } from './variableStore'
import { Variable, VariableScope, SCOPE_INFO, TYPE_INFO } from './types'
import './VariableList.css'

interface VariableListProps {
  onAddClick?: () => void
  onEditClick?: (variable: Variable) => void
  onDeleteClick?: (variable: Variable) => void
}

export const VariableList: React.FC<VariableListProps> = ({
  onAddClick,
  onEditClick,
  onDeleteClick,
}) => {
  const { variables, selectedVariableId, selectVariable, openDialog, deleteVariable } = useVariableStore()

  // Group variables by scope
  const groupedVariables: Record<VariableScope, Variable[]> = {
    default: variables.filter((v) => v.scope === 'default'),
    define: variables.filter((v) => v.scope === 'define'),
    persistent: variables.filter((v) => v.scope === 'persistent'),
  }

  const handleAddClick = () => {
    if (onAddClick) {
      onAddClick()
    } else {
      openDialog()
    }
  }

  const handleEditClick = (variable: Variable) => {
    if (onEditClick) {
      onEditClick(variable)
    } else {
      openDialog(variable)
    }
  }

  const handleDeleteClick = (variable: Variable, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDeleteClick) {
      onDeleteClick(variable)
    } else {
      if (window.confirm(`Delete variable "${variable.name}"?`)) {
        deleteVariable(variable.id)
      }
    }
  }

  const renderVariableItem = (variable: Variable) => {
    const isSelected = selectedVariableId === variable.id
    const scopeInfo = SCOPE_INFO[variable.scope]
    const typeInfo = TYPE_INFO[variable.type]

    return (
      <div
        key={variable.id}
        className={`variable-item ${isSelected ? 'selected' : ''}`}
        onClick={() => selectVariable(variable.id)}
        onDoubleClick={() => handleEditClick(variable)}
      >
        <div className="variable-info">
          <span 
            className="variable-name"
            style={{ color: scopeInfo.color }}
          >
            {variable.name}
          </span>
          <span className="variable-type">{typeInfo.label}</span>
        </div>
        <div className="variable-value" title={variable.value}>
          {variable.value}
        </div>
        <div className="variable-actions">
          <button
            className="variable-action-btn edit"
            onClick={(e) => {
              e.stopPropagation()
              handleEditClick(variable)
            }}
            title="Edit variable"
          >
            ✏️
          </button>
          <button
            className="variable-action-btn delete"
            onClick={(e) => handleDeleteClick(variable, e)}
            title="Delete variable"
          >
            🗑️
          </button>
        </div>
      </div>
    )
  }

  const renderScopeGroup = (scope: VariableScope) => {
    const scopeVariables = groupedVariables[scope]
    const scopeInfo = SCOPE_INFO[scope]

    if (scopeVariables.length === 0) {
      return null
    }

    return (
      <div key={scope} className="variable-scope-group">
        <div 
          className="scope-header"
          style={{ borderLeftColor: scopeInfo.color }}
        >
          <span className="scope-label" style={{ color: scopeInfo.color }}>
            {scopeInfo.label}
          </span>
          <span className="scope-count">{scopeVariables.length}</span>
        </div>
        <div className="scope-variables">
          {scopeVariables.map(renderVariableItem)}
        </div>
      </div>
    )
  }

  return (
    <div className="variable-list">
      <div className="variable-list-header">
        <h3>Variables</h3>
        <button 
          className="add-variable-btn"
          onClick={handleAddClick}
          title="Add new variable"
        >
          + Add
        </button>
      </div>
      
      <div className="variable-list-content">
        {variables.length === 0 ? (
          <div className="empty-state">
            <p>No variables defined</p>
            <button onClick={handleAddClick}>Add your first variable</button>
          </div>
        ) : (
          <>
            {renderScopeGroup('default')}
            {renderScopeGroup('define')}
            {renderScopeGroup('persistent')}
          </>
        )}
      </div>
    </div>
  )
}

export default VariableList
