import React, { useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { projectManager, electronFileSystem } from '../../project/ProjectManager'
import { resourceManager } from '../../resource/ResourceManager'
import {
  CharacterList,
  CharacterDialog,
  useCharacterStore,
  CharacterFormData,
} from '../character'
import { NewProjectWizard, ProjectConfig } from '../project'
import { findDefaultFile } from '../../utils/FileClassifier'
import { useSettingsStore } from '../../settings/settingsStore'
import { showUnsavedChangesDialog } from '../../store/confirmDialogStore'

/**
 * LeftPanel component - Project browser panel (Figma-style collapsible)
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

// Storage key for panel collapsed state
const PANEL_COLLAPSED_KEY = 'left-panel-collapsed'

export const LeftPanel: React.FC = () => {
  const { projectPath, setProjectPath, setAst, setCurrentFile, resetHistory, ast } = useEditorStore()
  const [expandedSections, setExpandedSections] = useState<Set<PanelSection>>(
    new Set(['labels', 'characters'])
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  
  // Panel collapsed state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(PANEL_COLLAPSED_KEY)
    return stored === 'true'
  })
  
  // Resource state
  const [backgrounds, setBackgrounds] = useState<string[]>([])
  const [audioFiles, setAudioFiles] = useState<string[]>([])

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
    extractCharactersFromAST,
  } = useCharacterStore()

  // Settings store
  const { loadSettings } = useSettingsStore()

  // Create file system adapter for settings
  const settingsFileSystem = {
    readFile: (path: string) => electronFileSystem.readFile(path),
    writeFile: (path: string, content: string) => electronFileSystem.writeFile(path, content),
    exists: (path: string) => electronFileSystem.exists(path),
  }

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem(PANEL_COLLAPSED_KEY, String(isCollapsed))
  }, [isCollapsed])

  // Listen for menu:newProject event to open new project wizard
  useEffect(() => {
    const handleMenuNewProject = () => {
      setShowNewProjectDialog(true)
    }

    window.addEventListener('menu:newProject', handleMenuNewProject)

    return () => {
      window.removeEventListener('menu:newProject', handleMenuNewProject)
    }
  }, [])

  // Toggle panel collapse
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  // Extract characters from AST when AST changes
  useEffect(() => {
    if (ast) {
      extractCharactersFromAST(ast)
    }
  }, [ast, extractCharactersFromAST])

  // Scan resources when project path changes
  useEffect(() => {
    const scanResources = async () => {
      if (!projectPath) {
        setBackgrounds([])
        setAudioFiles([])
        return
      }

      try {
        await resourceManager.scanResources(projectPath)
        
        // Get backgrounds
        const bgTags = resourceManager.getBackgroundTags()
        const bgNames = bgTags.flatMap(tag => {
          if (tag.attributes.length === 0) {
            return [tag.tag]
          }
          return tag.attributes.map(attrs => `${tag.tag} ${attrs.join(' ')}`)
        })
        setBackgrounds(bgNames)
        
        // Get audio
        const audio = resourceManager.getResources('audio')
        setAudioFiles(audio.map(r => r.name))
      } catch (error) {
        console.error('Failed to scan resources:', error)
        setBackgrounds([])
        setAudioFiles([])
      }
    }

    scanResources()
  }, [projectPath])

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

  /**
   * Check if there are unsaved changes in the current project
   */
  const hasUnsavedChanges = useCallback((): boolean => {
    const modifiedScripts = projectManager.getModifiedScripts()
    const settingsState = useSettingsStore.getState()
    const hasModifiedSettings = settingsState.gui.modified || settingsState.project.modified
    
    return modifiedScripts.length > 0 || hasModifiedSettings
  }, [])

  /**
   * Prompt user to save unsaved changes before switching projects
   * Returns true if user wants to proceed, false if cancelled
   */
  const promptSaveChanges = useCallback(async (): Promise<boolean> => {
    const modifiedScripts = projectManager.getModifiedScripts()
    const settingsState = useSettingsStore.getState()
    const hasModifiedSettings = settingsState.gui.modified || settingsState.project.modified
    
    const items: string[] = []
    if (modifiedScripts.length > 0) {
      items.push(`${modifiedScripts.length} 个脚本`)
    }
    if (hasModifiedSettings) {
      items.push('设置')
    }
    
    // Use Figma-style confirm dialog
    const result = await showUnsavedChangesDialog(items.join(' 和 '))
    
    if (result === 'save') {
      // Trigger save and wait for it to complete
      window.dispatchEvent(new CustomEvent('editor:save'))
      // Give some time for save to complete
      await new Promise(resolve => setTimeout(resolve, 500))
      return true
    } else if (result === 'discard') {
      // Continue without saving
      return true
    } else {
      // Cancel - don't proceed
      return false
    }
  }, [])

  const handleOpenProject = async () => {
    if (!window.electronAPI) {
      setError('Electron API not available')
      return
    }

    // Check for unsaved changes before switching projects
    if (projectPath && hasUnsavedChanges()) {
      const shouldProceed = await promptSaveChanges()
      if (!shouldProceed) {
        return // User cancelled
      }
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
        // Find the best default file to open (prioritizes script.rpy, then story scripts)
        // Implements Requirements 1.4, 1.5
        const defaultFilePath = findDefaultFile(result.project.scripts)
        if (defaultFilePath) {
          // Set current file first so AST changes can be tracked
          setCurrentFile(defaultFilePath)
          const defaultScript = result.project.scripts.get(defaultFilePath)
          if (defaultScript) {
            setAst(defaultScript)
          }
        }
        // Reset history after loading project to prevent undo from going back to empty state
        resetHistory()
        // Clear modified scripts since we just loaded the project
        projectManager.clearModifiedScripts()
        
        // Load settings from gui.rpy and options.rpy
        // Implements Requirement 9.1
        try {
          await loadSettings(result.project.path, settingsFileSystem)
        } catch (settingsError) {
          console.error('Failed to load settings:', settingsError)
          // Don't fail project open if settings fail to load
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

    // Check for unsaved changes before creating new project
    if (projectPath && hasUnsavedChanges()) {
      const shouldProceed = await promptSaveChanges()
      if (!shouldProceed) {
        return // User cancelled
      }
    }

    // Show the new project wizard
    setShowNewProjectDialog(true)
  }

  const handleCreateProject = async (config: ProjectConfig) => {
    setShowNewProjectDialog(false)
    
    if (!window.electronAPI) {
      setError('Electron API not available')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const result = await projectManager.createProject({
        name: config.name,
        path: config.path,
        width: config.width,
        height: config.height,
        accentColor: config.accentColor,
        backgroundColor: config.backgroundColor,
        lightTheme: config.lightTheme,
      })

      if (result.success && result.project) {
        setProjectPath(result.project.path)
        // Find the best default file to open (prioritizes script.rpy, then story scripts)
        // Implements Requirements 1.4, 1.5
        const defaultFilePath = findDefaultFile(result.project.scripts)
        if (defaultFilePath) {
          // Set current file first so AST changes can be tracked
          setCurrentFile(defaultFilePath)
          const defaultScript = result.project.scripts.get(defaultFilePath)
          if (defaultScript) {
            setAst(defaultScript)
          }
        }
        // Reset history after creating project to prevent undo from going back to empty state
        resetHistory()
        // Clear modified scripts since we just created the project
        projectManager.clearModifiedScripts()
        
        // Load settings from gui.rpy and options.rpy
        // Implements Requirement 9.1
        try {
          await loadSettings(result.project.path, settingsFileSystem)
        } catch (settingsError) {
          console.error('Failed to load settings:', settingsError)
          // Don't fail project creation if settings fail to load
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
      case 'backgrounds':
        if (backgrounds.length === 0) {
          return <p className="section-empty">No backgrounds found</p>
        }
        return (
          <ul className="resource-list">
            {backgrounds.map((bg, index) => (
              <li key={index} className="resource-item">
                <span className="resource-icon">🖼️</span>
                <span className="resource-name">{bg}</span>
              </li>
            ))}
          </ul>
        )
      case 'audio':
        if (audioFiles.length === 0) {
          return <p className="section-empty">No audio found</p>
        }
        return (
          <ul className="resource-list">
            {audioFiles.map((audio, index) => (
              <li key={index} className="resource-item">
                <span className="resource-icon">🎵</span>
                <span className="resource-name">{audio}</span>
              </li>
            ))}
          </ul>
        )
      case 'labels':
        // Extract labels from AST
        const labels = ast?.statements
          .filter(s => s.type === 'label')
          .map(s => (s as { name: string }).name) || []
        if (labels.length === 0) {
          return <p className="section-empty">No labels found</p>
        }
        return (
          <ul className="resource-list">
            {labels.map((label, index) => (
              <li key={index} className="resource-item">
                <span className="resource-icon">🏷️</span>
                <span className="resource-name">{label}</span>
              </li>
            ))}
          </ul>
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
    <aside 
      className={`left-panel ${isCollapsed ? 'collapsed' : ''}`} 
      aria-label="Project browser"
    >
      {/* Panel Header */}
      <div 
        className="panel-header"
        onDoubleClick={toggleCollapse}
      >
        {!isCollapsed && <h2>Project</h2>}
        <button
          className="panel-collapse-btn"
          onClick={toggleCollapse}
          title={isCollapsed ? '展开面板' : '折叠面板'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? '»' : '«'}
        </button>
      </div>
      
      {/* Collapsed View - Show icons only */}
      {isCollapsed ? (
        <div className="panel-collapsed-content">
          {projectPath && sections.map(({ id, icon, label }) => (
            <button
              key={id}
              className="collapsed-section-btn"
              onClick={() => {
                setIsCollapsed(false)
                setExpandedSections(prev => new Set([...prev, id]))
              }}
              title={label}
            >
              {icon}
            </button>
          ))}
          {!projectPath && (
            <>
              <button
                className="collapsed-section-btn"
                onClick={() => {
                  setIsCollapsed(false)
                  handleOpenProject()
                }}
                title="打开项目"
              >
                📂
              </button>
              <button
                className="collapsed-section-btn"
                onClick={() => {
                  setIsCollapsed(false)
                  handleNewProject()
                }}
                title="新建项目"
              >
                ➕
              </button>
            </>
          )}
        </div>
      ) : (
        /* Expanded View */
        <>
          {!projectPath ? (
            <div className="panel-empty">
              <p>No project open</p>
              {error && <p className="error-message" style={{ color: 'var(--error)', fontSize: '11px' }}>{error}</p>}
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
                    <span className="section-toggle">
                      {expandedSections.has(id) ? '▾' : '▸'}
                    </span>
                    <span className="section-icon">{icon}</span>
                    <span className="section-label">{label}</span>
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
        </>
      )}

      {/* Character Dialog */}
      <CharacterDialog
        isOpen={dialogOpen}
        character={editingCharacter}
        existingNames={characters.map((c) => c.name)}
        onSave={handleSaveCharacter}
        onCancel={closeDialog}
      />

      {/* New Project Wizard */}
      <NewProjectWizard
        isOpen={showNewProjectDialog}
        onComplete={handleCreateProject}
        onCancel={() => setShowNewProjectDialog(false)}
      />
    </aside>
  )
}
