/**
 * ProjectInfoGroup Component
 * 
 * Displays text inputs for game name and version.
 * Implements Requirements 5.1, 5.2, 5.3, 5.4
 */

import React from 'react'
import { useSettingsStore } from '../../settings/settingsStore'

export const ProjectInfoGroup: React.FC = () => {
  const { project, updateProjectSetting } = useSettingsStore()
  
  if (!project.settings) {
    return null
  }

  const handleNameChange = (value: string) => {
    updateProjectSetting('name', value)
  }

  const handleVersionChange = (value: string) => {
    updateProjectSetting('version', value)
  }

  return (
    <div className="settings-group">
      <div className="settings-group-title">基本信息</div>
      
      <div className="project-info-list">
        {/* Game Name */}
        <div className="project-info-item">
          <label className="project-info-label">游戏名称</label>
          <input
            type="text"
            className="project-text-input"
            value={project.settings.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Game"
            data-testid="project-name-input"
          />
        </div>

        {/* Version */}
        <div className="project-info-item">
          <label className="project-info-label">版本号</label>
          <input
            type="text"
            className="project-text-input"
            value={project.settings.version}
            onChange={(e) => handleVersionChange(e.target.value)}
            placeholder="1.0"
            data-testid="project-version-input"
          />
        </div>
      </div>
    </div>
  )
}

export default ProjectInfoGroup
