/**
 * ColorPreview Component
 * 
 * Displays a mini preview card showing sample text with current color scheme.
 * Updates immediately when colors change.
 * Implements Requirements 10.1, 10.2, 10.3
 */

import React from 'react'

export interface ColorPreviewProps {
  accentColor: string
  idleColor: string
  hoverColor: string
  selectedColor: string
  textColor: string
}

export const ColorPreview: React.FC<ColorPreviewProps> = ({
  accentColor,
  idleColor,
  hoverColor,
  selectedColor,
  textColor,
}) => {
  return (
    <div className="color-preview-card" data-testid="color-preview">
      <div className="color-preview-title">预览</div>
      <div 
        className="color-preview-content"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        {/* Character Name */}
        <div 
          className="color-preview-name"
          style={{ color: accentColor }}
          data-testid="preview-name"
        >
          角色名
        </div>
        
        {/* Dialogue Text */}
        <div 
          className="color-preview-dialogue"
          style={{ color: textColor }}
          data-testid="preview-dialogue"
        >
          这是一段示例对话文字。
        </div>
        
        {/* Menu Choices */}
        <div className="color-preview-choices">
          <div 
            className="color-preview-choice"
            style={{ color: idleColor }}
            data-testid="preview-idle"
          >
            ▸ 默认选项
          </div>
          <div 
            className="color-preview-choice"
            style={{ color: hoverColor }}
            data-testid="preview-hover"
          >
            ▸ 悬停选项
          </div>
          <div 
            className="color-preview-choice"
            style={{ 
              color: selectedColor,
              backgroundColor: `${accentColor}33`
            }}
            data-testid="preview-selected"
          >
            ▸ 选中选项
          </div>
        </div>
      </div>
    </div>
  )
}

export default ColorPreview
