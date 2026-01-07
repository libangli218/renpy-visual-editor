/**
 * DialogueSettingsGroup Component
 * 
 * Displays dialogue box settings: height, position, and width.
 * Implements Requirements 4.1, 4.2, 4.3
 */

import React from 'react'
import { useSettingsStore } from '../../settings/settingsStore'

interface PositionOption {
  value: number
  label: string
}

const POSITION_OPTIONS: PositionOption[] = [
  { value: 0.0, label: '顶部' },
  { value: 0.5, label: '中间' },
  { value: 1.0, label: '底部' },
]

export const DialogueSettingsGroup: React.FC = () => {
  const { gui, updateGuiSetting } = useSettingsStore()
  
  if (!gui.settings) {
    return null
  }

  const handleHeightChange = (value: string) => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num > 0) {
      updateGuiSetting('textboxHeight', num)
    }
  }

  const handleWidthChange = (value: string) => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num > 0) {
      updateGuiSetting('dialogueWidth', num)
    }
  }

  const handlePositionChange = (value: string) => {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      updateGuiSetting('textboxYalign', num)
    }
  }

  return (
    <div className="settings-group">
      <div className="settings-group-title">对话框</div>
      
      <div className="dialogue-settings-list">
        {/* Textbox Height */}
        <div className="dialogue-setting-item">
          <span className="dialogue-setting-label">对话框高度</span>
          <input
            type="number"
            className="dialogue-number-input"
            value={gui.settings.textboxHeight}
            onChange={(e) => handleHeightChange(e.target.value)}
            min={50}
            max={500}
            data-testid="dialogue-height-input"
          />
        </div>

        {/* Textbox Position */}
        <div className="dialogue-setting-item">
          <span className="dialogue-setting-label">对话框位置</span>
          <select
            className="dialogue-select"
            value={gui.settings.textboxYalign}
            onChange={(e) => handlePositionChange(e.target.value)}
            data-testid="dialogue-position-select"
          >
            {POSITION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Dialogue Width */}
        <div className="dialogue-setting-item">
          <span className="dialogue-setting-label">对话宽度</span>
          <input
            type="number"
            className="dialogue-number-input"
            value={gui.settings.dialogueWidth}
            onChange={(e) => handleWidthChange(e.target.value)}
            min={100}
            max={2000}
            data-testid="dialogue-width-input"
          />
        </div>
      </div>
    </div>
  )
}

export default DialogueSettingsGroup
