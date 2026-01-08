/**
 * VariableList Component
 * 
 * Displays list of variables with add/delete actions.
 * Figma-style design with colored scope indicators.
 */

import React from 'react'
import { Variable, VariableScope } from './types'
import './VariableList.css'

interface VariableListProps {
  variables: Variable[]
  onAdd: () => void
  onEdit: (variable: Variable) => void
  onDelete: (id: string) => void
}

/**
 * Get color for variable scope indicator
 */
function getScopeColor(scope: VariableScope): string {
  switch (scope) {
    case 'default':
      return '#0d99ff' // Figma blue
    case 'define':
      return '#ffcd29' // Warning yellow
    case 'persistent':
      return '#14ae5c' // Success green
    default:
      return '#0d99ff'
  }
}

/**
 * Get scope label for tooltip
 */
function getScopeLabel(scope: VariableScope): string {
  switch (scope) {
    case 'default':
      return 'default'
    case 'define':
      return 'define'
    case 'persistent':
      return 'persistent'
    default:
      return scope
  }
}

export const VariableList: React.FC<VariableListProps> = ({
  variables,
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="variable-list">
      <button className="add-variable-btn" onClick={onAdd}>
        + 添加变量
      </button>
      
      {variables.length === 0 ? (
        <p className="section-empty">暂无变量</p>
      ) : (
        <ul className="variable-items">
          {variables.map((variable) => (
            <li 
              key={variable.id} 
              className="variable-item"
              onClick={() => onEdit(variable)}
              title={`${getScopeLabel(variable.scope)} ${variable.name} = ${variable.value}${variable.description ? `\n${variable.description}` : ''}`}
            >
              <span 
                className="variable-icon"
                style={{ backgroundColor: getScopeColor(variable.scope) }}
              />
              <div className="variable-info">
                <span className="variable-name">{variable.name}</span>
                <span className="variable-value">
                  {variable.value.length > 20 
                    ? variable.value.substring(0, 20) + '...' 
                    : variable.value}
                </span>
              </div>
              <button
                className="variable-delete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(variable.id)
                }}
                title="删除变量"
                aria-label={`删除 ${variable.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
