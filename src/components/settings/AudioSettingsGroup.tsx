/**
 * AudioSettingsGroup Component
 * 
 * Displays toggle switches for sound, music, and voice settings.
 * Implements Requirements 6.1, 6.2, 6.3
 */

import React from 'react'
import { useSettingsStore } from '../../settings/settingsStore'
import { ProjectSettings } from '../../settings/SettingsParser'

interface AudioSettingConfig {
  key: keyof Pick<ProjectSettings, 'hasSound' | 'hasMusic' | 'hasVoice'>
  label: string
}

const AUDIO_SETTINGS: AudioSettingConfig[] = [
  { key: 'hasSound', label: '音效' },
  { key: 'hasMusic', label: '音乐' },
  { key: 'hasVoice', label: '语音' },
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

export const AudioSettingsGroup: React.FC = () => {
  const { project, updateProjectSetting } = useSettingsStore()
  
  if (!project.settings) {
    return null
  }

  const handleToggle = (key: AudioSettingConfig['key'], value: boolean) => {
    updateProjectSetting(key, value)
  }

  return (
    <div className="settings-group">
      <div className="settings-group-title">音频</div>
      
      <div className="audio-settings-list">
        {AUDIO_SETTINGS.map(({ key, label }) => (
          <div key={key} className="audio-setting-item">
            <span className="audio-setting-label">{label}</span>
            <ToggleSwitch
              checked={project.settings![key]}
              onChange={(value) => handleToggle(key, value)}
              testId={`audio-toggle-${key}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default AudioSettingsGroup
