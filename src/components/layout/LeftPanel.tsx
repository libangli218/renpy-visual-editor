import React, { useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { projectManager, electronFileSystem } from '../../project/ProjectManager'
import { resourceManager, ImageTag } from '../../resource/ResourceManager'
import {
  CharacterList,
  CharacterDialog,
  useCharacterStore,
  CharacterFormData,
} from '../character'
import {
  VariableList,
  VariableDialog,
  useVariableStore,
  VariableFormData,
  Variable,
} from '../variable'
import { NewProjectWizard, ProjectConfig } from '../project'
import { findDefaultFile } from '../../utils/FileClassifier'
import { useSettingsStore } from '../../settings/settingsStore'
import { showUnsavedChangesDialog, showConfirmDialog } from '../../store/confirmDialogStore'
import { ResourceSection, ResourceContextMenu, ResourcePreviewPanel } from '../resource'
import { useResourceStore, ResourceDragData } from '../../store/resourceStore'

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

type PanelSection = 'labels' | 'characters' | 'sprites' | 'backgrounds' | 'audio' | 'variables'

// Tab definitions for the new tabbed layout
type PanelTab = 'project' | 'resources' | 'data'

interface TabConfig {
  id: PanelTab
  label: string
  icon: string
  sections: PanelSection[]
}

const tabs: TabConfig[] = [
  { id: 'project', label: '项目', icon: '📁', sections: ['labels'] },
  { id: 'resources', label: '资源', icon: '🎨', sections: ['sprites', 'backgrounds', 'audio'] },
  { id: 'data', label: '数据', icon: '📊', sections: ['characters', 'variables'] },
]

interface SectionConfig {
  id: PanelSection
  label: string
  icon: string
}

const sections: SectionConfig[] = [
  { id: 'labels', label: 'Labels', icon: '🏷️' },
  { id: 'characters', label: 'Characters', icon: '👤' },
  { id: 'sprites', label: 'Sprites', icon: '🎭' },
  { id: 'backgrounds', label: 'Backgrounds', icon: '🖼️' },
  { id: 'audio', label: 'Audio', icon: '🎵' },
  { id: 'variables', label: 'Variables', icon: '📊' },
]

// Storage keys
const PANEL_COLLAPSED_KEY = 'left-panel-collapsed'
const PANEL_ACTIVE_TAB_KEY = 'left-panel-active-tab'

export const LeftPanel: React.FC = () => {
  const { projectPath, setProjectPath, setAst, setCurrentFile, resetHistory, ast, currentFile } = useEditorStore()
  const [expandedSections, setExpandedSections] = useState<Set<PanelSection>>(
    new Set(['labels', 'characters', 'sprites', 'backgrounds', 'variables'])
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  
  // Panel collapsed state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(PANEL_COLLAPSED_KEY)
    return stored === 'true'
  })
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<PanelTab>(() => {
    const stored = localStorage.getItem(PANEL_ACTIVE_TAB_KEY)
    return (stored as PanelTab) || 'project'
  })
  
  // Resource state
  const [audioFiles, setAudioFiles] = useState<string[]>([])
  const [spriteTags, setSpriteTags] = useState<ImageTag[]>([])
  const [backgroundTags, setBackgroundTags] = useState<ImageTag[]>([])

  // Resource store for ResourceSection components
  const {
    expandedSections: resourceExpandedSections,
    searchQueries,
    thumbnailSize,
    selectedResource,
    previewOpen,
    contextMenu,
    toggleSection: toggleResourceSection,
    setSearchQuery,
    selectResource,
    openPreview,
    closePreview,
    openContextMenu,
    closeContextMenu,
  } = useResourceStore()
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

  // Variable store
  const {
    variables,
    dialogOpen: variableDialogOpen,
    editingVariable,
    openDialog: openVariableDialog,
    closeDialog: closeVariableDialog,
    addVariable,
    updateVariable,
    deleteVariable,
    extractVariablesFromAST,
  } = useVariableStore()

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

  // Save active tab state
  useEffect(() => {
    localStorage.setItem(PANEL_ACTIVE_TAB_KEY, activeTab)
  }, [activeTab])

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
  // Extract characters from AST when AST changes
  useEffect(() => {
    if (ast) {
      extractCharactersFromAST(ast)
      extractVariablesFromAST(ast)
    }
  }, [ast, extractCharactersFromAST, extractVariablesFromAST])

  // Update script-defined images when AST changes
  // Implements Requirement 2.7: Incremental update on script changes
  useEffect(() => {
    if (ast && currentFile) {
      // Call onScriptChange to incrementally update script-defined images
      resourceManager.onScriptChange(currentFile, ast)
      
      // Update the image tags state to reflect any changes
      const bgTags = resourceManager.getBackgroundTags()
      setBackgroundTags(bgTags)
      
      const imgTags = resourceManager.getImageTags()
      setSpriteTags(imgTags)
    }
  }, [ast, currentFile])

  // Scan resources when project path changes
  useEffect(() => {
    const scanResources = async () => {
      if (!projectPath) {
        setAudioFiles([])
        setSpriteTags([])
        setBackgroundTags([])
        return
      }

      try {
        await resourceManager.scanResources(projectPath)
        
        // Scan script-defined images from all loaded scripts
        // Implements Requirement 2.6: Scan script files for `image` statements
        const project = projectManager.getProject()
        if (project && project.scripts.size > 0) {
          resourceManager.scanScriptDefinedImages(project.scripts)
        }
        
        // Get backgrounds
        const bgTags = resourceManager.getBackgroundTags()
        setBackgroundTags(bgTags)
        
        // Get sprites (non-background images)
        const imgTags = resourceManager.getImageTags()
        setSpriteTags(imgTags)
        
        // Get audio
        const audio = resourceManager.getResources('audio')
        setAudioFiles(audio.map(r => r.name))
      } catch (error) {
        console.error('Failed to scan resources:', error)
        setAudioFiles([])
        setSpriteTags([])
        setBackgroundTags([])
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

  const handleDeleteCharacter = async (id: string) => {
    const character = characters.find(c => c.id === id)
    const result = await showConfirmDialog({
      title: '删除角色',
      message: `确定要删除角色 "${character?.displayName || character?.name || id}" 吗？`,
      showSaveOption: false,
      confirmLabel: '删除',
      cancelLabel: '取消',
    })
    if (result === 'save') {
      deleteCharacter(id)
    }
  }

  const handleSaveVariable = (data: VariableFormData) => {
    if (editingVariable) {
      updateVariable(editingVariable.id, data)
    } else {
      addVariable(data)
    }
  }

  const handleEditVariable = (variable: Variable) => {
    openVariableDialog(variable)
  }

  const handleDeleteVariable = async (id: string) => {
    const variable = variables.find(v => v.id === id)
    const result = await showConfirmDialog({
      title: '删除变量',
      message: `确定要删除变量 "${variable?.name || id}" 吗？`,
      showSaveOption: false,
      confirmLabel: '删除',
      cancelLabel: '取消',
    })
    if (result === 'save') {
      deleteVariable(id)
    }
  }

  // Helper function to get image path from tag
  const getImagePath = useCallback((imageTag: string): string | null => {
    return resourceManager.getImagePath(imageTag)
  }, [])

  // Handle resource click
  const handleResourceClick = useCallback((resource: ResourceDragData) => {
    selectResource(resource)
  }, [selectResource])

  // Handle resource double-click (open preview)
  const handleResourceDoubleClick = useCallback((resource: ResourceDragData) => {
    openPreview(resource)
  }, [openPreview])

  // Handle resource context menu
  const handleResourceContextMenu = useCallback((event: React.MouseEvent, resource: ResourceDragData) => {
    event.preventDefault()
    openContextMenu({ x: event.clientX, y: event.clientY }, resource)
  }, [openContextMenu])

  // Handle resource refresh (after rename/delete operations)
  const handleResourceRefresh = useCallback(async () => {
    if (!projectPath) return
    
    try {
      await resourceManager.scanResources(projectPath)
      
      // Get backgrounds
      const bgTags = resourceManager.getBackgroundTags()
      setBackgroundTags(bgTags)
      
      // Get sprites (non-background images)
      const imgTags = resourceManager.getImageTags()
      setSpriteTags(imgTags)
      
      // Get audio
      const audio = resourceManager.getResources('audio')
      setAudioFiles(audio.map(r => r.name))
    } catch (error) {
      console.error('Failed to refresh resources:', error)
    }
  }, [projectPath])

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
      case 'sprites':
        // Use ResourceSection for sprites - implements Requirements 2.1, 2.2
        // Note: ResourceSection handles its own expansion state via resourceStore
        // This section header is just a placeholder - actual content is rendered by ResourceSection
        return null
      case 'backgrounds':
        // Use ResourceSection for backgrounds - implements Requirements 2.1, 2.2
        // Note: ResourceSection handles its own expansion state via resourceStore
        // This section header is just a placeholder - actual content is rendered by ResourceSection
        return null
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
      case 'variables':
        return (
          <VariableList
            variables={variables}
            onAdd={() => openVariableDialog()}
            onEdit={handleEditVariable}
            onDelete={handleDeleteVariable}
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

  // Check if a section should use ResourceSection component
  const isResourceSection = (sectionId: PanelSection): boolean => {
    return sectionId === 'sprites' || sectionId === 'backgrounds'
  }

  // Render ResourceSection for sprites or backgrounds
  const renderResourceSection = (sectionId: 'sprites' | 'backgrounds') => {
    const isSprites = sectionId === 'sprites'
    const sectionType = isSprites ? 'sprites' : 'backgrounds'
    const imageTags = isSprites ? spriteTags : backgroundTags
    const sectionConfig = sections.find(s => s.id === sectionId)!
    
    return (
      <ResourceSection
        title={sectionConfig.label}
        icon={sectionConfig.icon}
        sectionType={sectionType}
        imageTags={imageTags}
        projectPath={projectPath || ''}
        getImagePath={getImagePath}
        expanded={resourceExpandedSections.has(sectionType)}
        onToggle={() => toggleResourceSection(sectionType)}
        onRefresh={handleResourceRefresh}
        searchQuery={searchQueries[sectionType]}
        onSearchChange={(query) => setSearchQuery(sectionType, query)}
        thumbnailSize={thumbnailSize}
        onResourceClick={handleResourceClick}
        onResourceDoubleClick={handleResourceDoubleClick}
        onResourceContextMenu={handleResourceContextMenu}
        selectedResource={selectedResource}
      />
    )
  }

  // Get sections for current active tab
  const currentTabSections = tabs.find(t => t.id === activeTab)?.sections || []

  return (
    <aside 
      className={`left-panel ${isCollapsed ? 'collapsed' : ''}`} 
      aria-label="Project browser"
    >
      {/* Panel Header with Tabs */}
      <div className="panel-header-container">
        <div 
          className="panel-header"
          onDoubleClick={toggleCollapse}
        >
          <button
            className="panel-collapse-btn"
            onClick={toggleCollapse}
            title={isCollapsed ? '展开面板' : '折叠面板'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? '»' : '«'}
          </button>
        </div>
        
        {/* Tab Bar - only show when expanded and project is open */}
        {!isCollapsed && projectPath && (
          <div className="panel-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`panel-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Collapsed View - Show tab icons only */}
      {isCollapsed ? (
        <div className="panel-collapsed-content">
          {projectPath && tabs.map(({ id, icon, label }) => (
            <button
              key={id}
              className={`collapsed-section-btn ${activeTab === id ? 'active' : ''}`}
              onClick={() => {
                setIsCollapsed(false)
                setActiveTab(id)
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
              {/* Only render sections that belong to the active tab */}
              {sections
                .filter(({ id }) => currentTabSections.includes(id))
                .map(({ id, label, icon }) => {
                  // Use ResourceSection for sprites and backgrounds
                  if (isResourceSection(id)) {
                    return (
                      <div key={id} className="panel-section">
                        {renderResourceSection(id as 'sprites' | 'backgrounds')}
                      </div>
                    )
                  }
                  
                  // Regular section rendering for other sections
                  return (
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
                  )
                })}
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

      {/* Variable Dialog */}
      <VariableDialog
        isOpen={variableDialogOpen}
        variable={editingVariable}
        existingNames={variables.map((v) => v.name)}
        onSave={handleSaveVariable}
        onCancel={closeVariableDialog}
      />

      {/* New Project Wizard */}
      <NewProjectWizard
        isOpen={showNewProjectDialog}
        onComplete={handleCreateProject}
        onCancel={() => setShowNewProjectDialog(false)}
      />

      {/* Resource Context Menu */}
      <ResourceContextMenu
        open={contextMenu.open}
        position={contextMenu.position}
        resource={contextMenu.resource}
        onClose={closeContextMenu}
        onRefresh={handleResourceRefresh}
      />

      {/* Resource Preview Panel */}
      <ResourcePreviewPanel
        open={previewOpen}
        resource={selectedResource}
        onClose={closePreview}
      />
    </aside>
  )
}
