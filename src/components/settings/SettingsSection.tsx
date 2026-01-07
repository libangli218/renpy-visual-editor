/**
 * SettingsSection Component
 * 
 * Collapsible section in LeftPanel for GUI and Project settings.
 * Implements Requirements 1.1, 1.2, 1.3, 1.4
 */

import React, { useState } from 'react'
import { useSettingsStore } from '../../settings/settingsStore'
import { useEditorStore } from '../../store/editorStore'
import { ColorSettingsGroup } from './ColorSettingsGroup'
import { FontSettingsGroup } from './FontSettingsGroup'
import { DialogueSettingsGroup } from './DialogueSettingsGroup'
import { ProjectInfoGroup } from './ProjectInfoGroup'
import { AudioSettingsGroup } from './AudioSettingsGroup'
import { DisplaySettingsGroup } from './DisplaySettingsGroup'
import './Settings.css'

export interface SettingsSectionProps {
  expanded: boolean
  onToggle: () => void
}

type SettingsSubSection = 'appearance' | 'project'

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  expanded,
  onToggle,
}) => {
  const { gui, project, isLoading, error } = useSettingsStore()
  const { projectPath } = useEditorStore()
  
  // Track which sub-sections are expanded
  const [expandedSubSections, setExpandedSubSections] = useState<Set<SettingsSubSection>>(
    new Set(['appearance'])
  )

  const toggleSubSection = (section: SettingsSubSection) => {
    setExpandedSubSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // Don't render if no project is open (Requirement 1.5)
  if (!projectPath) {
    return null
  }

  return (
    <div className="settings-section">
      {/* Main Section Header */}
      <button
        className="section-header"
        onClick={onToggle}
        aria-expanded={expanded}
        data-testid="settings-section-header"
      >
        <span className="section-toggle">
          {expanded ? '▾' : '▸'}
        </span>
        <span className="section-icon">⚙️</span>
        <span className="section-label">Settings</span>
        {(gui.modified || project.modified) && (
          <span className="settings-modified-indicator" title="Unsaved changes">•</span>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="section-content settings-content">
          {isLoading && (
            <div className="settings-loading">Loading settings...</div>
          )}
          
          {error && (
            <div className="settings-error">{error}</div>
          )}

          {!isLoading && !error && (
            <>
              {/* 外观 (Appearance) Sub-section */}
              <div className="settings-subsection">
                <button
                  className="settings-subsection-header"
                  onClick={() => toggleSubSection('appearance')}
                  aria-expanded={expandedSubSections.has('appearance')}
                  data-testid="appearance-subsection-header"
                >
                  <span className="subsection-toggle">
                    {expandedSubSections.has('appearance') ? '▾' : '▸'}
                  </span>
                  <span className="subsection-label">外观</span>
                </button>
                
                {expandedSubSections.has('appearance') && gui.settings && (
                  <div className="settings-subsection-content">
                    <ColorSettingsGroup />
                    <FontSettingsGroup />
                    <DialogueSettingsGroup />
                  </div>
                )}
              </div>

              {/* 项目 (Project) Sub-section */}
              <div className="settings-subsection">
                <button
                  className="settings-subsection-header"
                  onClick={() => toggleSubSection('project')}
                  aria-expanded={expandedSubSections.has('project')}
                  data-testid="project-subsection-header"
                >
                  <span className="subsection-toggle">
                    {expandedSubSections.has('project') ? '▾' : '▸'}
                  </span>
                  <span className="subsection-label">项目</span>
                </button>
                
                {expandedSubSections.has('project') && project.settings && (
                  <div className="settings-subsection-content">
                    <ProjectInfoGroup />
                    <AudioSettingsGroup />
                    <DisplaySettingsGroup />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SettingsSection
