/**
 * DisplaySettingsGroup Component
 * 
 * Displays toggle for show title and dropdown for window mode.
 * Implements Requirements 7.1, 7.2, 7.3
 */

import React from 'react'
import { useSettingsStore } from '../../settings/settingsStore'
import { ProjectSettings } from '../../settings/SettingsParser'

interface WindowModeOption {
  value: ProjectSettings['windowMode']
  label: string
}

const WINDOW_MODE_OPTIONS: WindowModeOption[] = [
  { value: 'auto', label: '自动' },
  { value: 'show', label: '始终显示' },
  { value: 'hide', label: '始终隐藏' },
]

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  testId?: string
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, testId }) => {
  return (
    <button
      type="button"
      className={`toggle-switch ${checked ? 'active' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      data-testid={testId}
    >
      <span className="toggle-switch-thumb" />
    </button>
  )
}

export const DisplaySettingsGroup: React.FC = () => {
  const { project, updateProjectSetting } = useSettingsStore()
  
  if (!project.settings) {
    return null
  }

  const handleShowNameToggle = (value: boolean) => {
    updateProjectSetting('showName', value)
  }

  const handleWindowModeChange = (value: string) => {
    if (value === 'auto' || value === 'show' || value === 'hide') {
      updateProjectSetting('windowMode', value)
    }
  }

  return (
    <div className="settings-group">
      <div className="settings-group-title">显示</div>
      
      <div className="display-settings-list">
        {/* Show Name Toggle */}
        <div className="display-setting-item">
          <span className="display-setting-label">在主菜单显示标题</span>
          <ToggleSwitch
            checked={project.settings.showName}
            onChange={handleShowNameToggle}
            testId="display-toggle-showName"
          />
        </div>

        {/* Window Mode Dropdown */}
        <div className="display-setting-item">
          <span className="display-setting-label">对话窗口</span>
          <select
            className="display-select"
            value={project.settings.windowMode}
            onChange={(e) => handleWindowModeChange(e.target.value)}
            data-testid="display-window-mode-select"
          >
            {WINDOW_MODE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default DisplaySettingsGroup
