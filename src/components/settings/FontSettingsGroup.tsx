/**
 * FontSettingsGroup Component
 * 
 * Displays font size settings with sliders and number inputs.
 * Validates and clamps values to 10-100 range.
 * Implements Requirements 3.1, 3.2, 3.3, 3.4
 */

import React from 'react'
import { useSettingsStore } from '../../settings/settingsStore'
import { GuiSettings } from '../../settings/SettingsParser'

interface FontSettingConfig {
  key: keyof Pick<GuiSettings, 'textSize' | 'nameTextSize' | 'interfaceTextSize'>
  label: string
}

const FONT_SETTINGS: FontSettingConfig[] = [
  { key: 'textSize', label: '对话文字' },
  { key: 'nameTextSize', label: '角色名' },
  { key: 'interfaceTextSize', label: '界面文字' },
]

const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 100

/**
 * Clamp a font size value to valid range [10, 100]
 * Implements Requirements 3.3, 3.4
 */
export function clampFontSize(value: number): number {
  if (isNaN(value)) return MIN_FONT_SIZE
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(value)))
}

export const FontSettingsGroup: React.FC = () => {
  const { gui, updateGuiSetting } = useSettingsStore()
  
  if (!gui.settings) {
    return null
  }

  const handleFontSizeChange = (key: FontSettingConfig['key'], value: number) => {
    const clampedValue = clampFontSize(value)
    updateGuiSetting(key, clampedValue)
  }

  const handleInputChange = (key: FontSettingConfig['key'], inputValue: string) => {
    const value = parseInt(inputValue, 10)
    handleFontSizeChange(key, value)
  }

  const handleSliderChange = (key: FontSettingConfig['key'], inputValue: string) => {
    const value = parseInt(inputValue, 10)
    handleFontSizeChange(key, value)
  }

  return (
    <div className="settings-group">
      <div className="settings-group-title">字体大小</div>
      
      <div className="font-settings-list">
        {FONT_SETTINGS.map(({ key, label }) => (
          <div key={key} className="font-setting-item">
            <span className="font-setting-label">{label}</span>
            <div className="font-setting-input">
              <input
                type="range"
                className="font-slider"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={gui.settings![key]}
                onChange={(e) => handleSliderChange(key, e.target.value)}
                data-testid={`font-slider-${key}`}
              />
              <input
                type="number"
                className="font-number-input"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={gui.settings![key]}
                onChange={(e) => handleInputChange(key, e.target.value)}
                onBlur={(e) => {
                  // Ensure value is clamped on blur
                  const value = parseInt(e.target.value, 10)
                  handleFontSizeChange(key, value)
                }}
                data-testid={`font-input-${key}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FontSettingsGroup
