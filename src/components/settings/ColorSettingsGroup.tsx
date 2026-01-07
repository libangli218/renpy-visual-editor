/**
 * ColorSettingsGroup Component
 * 
 * Displays color settings with swatches and integrates FigmaColorPicker.
 * Implements Requirements 2.1, 2.2, 2.3, 2.4
 */

import React from 'react'
import { useSettingsStore } from '../../settings/settingsStore'
import { GuiSettings } from '../../settings/SettingsParser'
import { FigmaColorPicker } from '../common/FigmaColorPicker'
import { ColorPreview } from './ColorPreview'

interface ColorSettingConfig {
  key: keyof Pick<GuiSettings, 'accentColor' | 'idleColor' | 'hoverColor' | 'selectedColor' | 'textColor'>
  label: string
}

const COLOR_SETTINGS: ColorSettingConfig[] = [
  { key: 'accentColor', label: '强调色' },
  { key: 'textColor', label: '对话文字色' },
  { key: 'idleColor', label: '默认文字色' },
  { key: 'hoverColor', label: '悬停色' },
  { key: 'selectedColor', label: '选中色' },
]

export const ColorSettingsGroup: React.FC = () => {
  const { gui, updateGuiSetting } = useSettingsStore()
  
  if (!gui.settings) {
    return null
  }

  const handleColorChange = (key: ColorSettingConfig['key'], color: string) => {
    updateGuiSetting(key, color)
  }

  return (
    <div className="settings-group">
      <div className="settings-group-title">颜色</div>
      
      <div className="color-settings-grid">
        {COLOR_SETTINGS.map(({ key, label }) => (
          <div key={key} className="color-setting-item">
            <span className="color-setting-label">{label}</span>
            <FigmaColorPicker
              color={gui.settings![key]}
              onChange={(color) => handleColorChange(key, color)}
            />
          </div>
        ))}
      </div>

      {/* Color Preview Card */}
      <ColorPreview
        accentColor={gui.settings.accentColor}
        idleColor={gui.settings.idleColor}
        hoverColor={gui.settings.hoverColor}
        selectedColor={gui.settings.selectedColor}
        textColor={gui.settings.textColor}
      />
    </div>
  )
}

export default ColorSettingsGroup
