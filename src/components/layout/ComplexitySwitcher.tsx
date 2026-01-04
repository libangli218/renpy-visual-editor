import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { ComplexityLevel } from '../../types/editor'

/**
 * ComplexitySwitcher component - Toggle between complexity levels
 * Implements Requirements 3.1: Provide three complexity levels
 * 
 * Levels:
 * - Simple (🟢): Hide all code preview, show only visual interface
 * - Preview (🟡): Show generated Ren'Py code in properties panel
 * - Advanced (🔴): Allow direct code editing with real-time sync
 */
export const ComplexitySwitcher: React.FC = () => {
  const { complexity, setComplexity } = useEditorStore()

  const handleComplexityChange = (level: ComplexityLevel) => {
    setComplexity(level)
  }

  const complexityOptions: Array<{
    level: ComplexityLevel
    icon: string
    label: string
    description: string
  }> = [
    {
      level: 'simple',
      icon: '🟢',
      label: 'Simple',
      description: 'Visual interface only, no code preview',
    },
    {
      level: 'preview',
      icon: '🟡',
      label: 'Preview',
      description: 'Show generated code in properties panel',
    },
    {
      level: 'advanced',
      icon: '🔴',
      label: 'Advanced',
      description: 'Direct code editing with real-time sync',
    },
  ]

  return (
    <div className="complexity-switcher" role="radiogroup" aria-label="Complexity level">
      {complexityOptions.map(({ level, icon, label, description }) => (
        <button
          key={level}
          role="radio"
          aria-checked={complexity === level}
          className={`complexity-button ${complexity === level ? 'active' : ''}`}
          onClick={() => handleComplexityChange(level)}
          title={`${label} Mode - ${description}`}
        >
          <span className="complexity-icon">{icon}</span>
          <span className="complexity-label sr-only">{label}</span>
        </button>
      ))}
    </div>
  )
}
