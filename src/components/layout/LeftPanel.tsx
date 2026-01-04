import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

/**
 * LeftPanel component - Project browser panel
 * Implements Requirements 1.3: Display project structure
 * 
 * Sections:
 * - Labels (Scenes)
 * - Characters
 * - Backgrounds
 * - Audio
 * - Variables
 */

type PanelSection = 'labels' | 'characters' | 'backgrounds' | 'audio' | 'variables'

interface SectionConfig {
  id: PanelSection
  label: string
  icon: string
}

const sections: SectionConfig[] = [
  { id: 'labels', label: 'Labels', icon: '🏷️' },
  { id: 'characters', label: 'Characters', icon: '👤' },
  { id: 'backgrounds', label: 'Backgrounds', icon: '🖼️' },
  { id: 'audio', label: 'Audio', icon: '🎵' },
  { id: 'variables', label: 'Variables', icon: '📊' },
]

export const LeftPanel: React.FC = () => {
  const { projectPath } = useEditorStore()
  const [expandedSections, setExpandedSections] = useState<Set<PanelSection>>(
    new Set(['labels'])
  )

  const toggleSection = (section: PanelSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  return (
    <aside className="left-panel" aria-label="Project browser">
      <div className="panel-header">
        <h2>Project</h2>
      </div>
      
      {!projectPath ? (
        <div className="panel-empty">
          <p>No project open</p>
          <button className="btn-primary">Open Project</button>
          <button className="btn-secondary">New Project</button>
        </div>
      ) : (
        <div className="panel-content">
          {sections.map(({ id, label, icon }) => (
            <div key={id} className="panel-section">
              <button
                className="section-header"
                onClick={() => toggleSection(id)}
                aria-expanded={expandedSections.has(id)}
              >
                <span className="section-icon">{icon}</span>
                <span className="section-label">{label}</span>
                <span className="section-toggle">
                  {expandedSections.has(id) ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.has(id) && (
                <div className="section-content">
                  <p className="section-empty">No {label.toLowerCase()} found</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
