import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { projectManager } from '../../project/ProjectManager'
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
  const { projectPath, setProjectPath, setAst } = useEditorStore()
  const [expandedSections, setExpandedSections] = useState<Set<PanelSection>>(
    new Set(['labels', 'characters'])
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleOpenProject = async () => {
    if (!window.electronAPI) {
      setError('Electron API not available')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const selectedPath = await window.electronAPI.openDirectory()
      if (!selectedPath) {
        setIsLoading(false)
        return
      }

      const result = await projectManager.openProject(selectedPath)
      if (result.success && result.project) {
        setProjectPath(result.project.path)
        // Set the first script's AST if available
        const scripts = Array.from(result.project.scripts.values())
        if (scripts.length > 0) {
          setAst(scripts[0])
        }
      } else {
        setError(result.error || 'Failed to open project')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewProject = async () => {
    if (!window.electronAPI) {
      setError('Electron API not available')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Ask for project name
      const projectName = window.prompt('Enter project name:', 'MyVisualNovel')
      if (!projectName) {
        setIsLoading(false)
        return
      }

      // Select directory for the new project
      const selectedPath = await window.electronAPI.selectDirectory('Select location for new project')
      if (!selectedPath) {
        setIsLoading(false)
        return
      }

      const result = await projectManager.createProject({
        name: projectName,
        path: selectedPath,
        createDefaultScript: true,
      })

      if (result.success && result.project) {
        setProjectPath(result.project.path)
        // Set the first script's AST if available
        const scripts = Array.from(result.project.scripts.values())
        if (scripts.length > 0) {
          setAst(scripts[0])
        }
      } else {
        setError(result.error || 'Failed to create project')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsLoading(false)
    }
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
          {error && <p className="error-message" style={{ color: 'red', fontSize: '12px' }}>{error}</p>}
          <button 
            className="btn-primary" 
            onClick={handleOpenProject}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Open Project'}
          </button>
          <button 
            className="btn-secondary" 
            onClick={handleNewProject}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'New Project'}
          </button>
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
