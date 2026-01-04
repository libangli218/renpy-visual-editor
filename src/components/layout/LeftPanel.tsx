import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import {
  CharacterList,
  CharacterDialog,
  useCharacterStore,
  CharacterFormData,
} from '../character'

/**
 * LeftPanel component - Project browser panel
 * Implements Requirements 1.3: Display project structure
 * Implements Requirements 7.1: Display all defined characters
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
    new Set(['labels', 'characters'])
  )

  // Character store
  const {
    characters,
    selectedCharacterId,
    dialogOpen,
    editingCharacter,
    selectCharacter,
    openDialog,
    closeDialog,
    addCharacter,
    updateCharacter,
    deleteCharacter,
  } = useCharacterStore()

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

  const handleSaveCharacter = (data: CharacterFormData) => {
    if (editingCharacter) {
      updateCharacter(editingCharacter.id, data)
    } else {
      addCharacter(data)
    }
  }

  const handleDeleteCharacter = (id: string) => {
    if (window.confirm('Are you sure you want to delete this character?')) {
      deleteCharacter(id)
    }
  }

  const renderSectionContent = (sectionId: PanelSection) => {
    switch (sectionId) {
      case 'characters':
        return (
          <CharacterList
            characters={characters}
            selectedId={selectedCharacterId}
            onSelect={(char) => selectCharacter(char.id)}
            onAdd={() => openDialog()}
            onDelete={handleDeleteCharacter}
          />
        )
      default:
        return (
          <p className="section-empty">
            No {sections.find((s) => s.id === sectionId)?.label.toLowerCase()} found
          </p>
        )
    }
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
                  {renderSectionContent(id)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Character Dialog */}
      <CharacterDialog
        isOpen={dialogOpen}
        character={editingCharacter}
        existingNames={characters.map((c) => c.name)}
        onSave={handleSaveCharacter}
        onCancel={closeDialog}
      />
    </aside>
  )
}
