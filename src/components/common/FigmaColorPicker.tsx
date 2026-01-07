/**
 * FigmaColorPicker Component
 * 
 * A Figma-style color picker with:
 * - Color swatch that opens picker on click
 * - HSV color wheel/gradient picker
 * - Preset color palette
 * - No manual hex input required
 * 
 * Design inspired by Dylan Field's Figma color picker philosophy:
 * Simple, visual, intuitive - let users pick colors, not type them.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import './FigmaColorPicker.css'

interface FigmaColorPickerProps {
  color: string
  onChange: (color: string) => void
  label?: string
}

// Preset colors - common colors for visual novels
const PRESET_COLORS = [
  // Row 1 - Whites and grays
  '#ffffff', '#e5e5e5', '#cccccc', '#999999', '#666666', '#333333', '#000000',
  // Row 2 - Warm colors
  '#ff6b6b', '#ff8787', '#ffa8a8', '#ffc9c9', '#ffe3e3',
  // Row 3 - Cool colors  
  '#4dabf7', '#74c0fc', '#a5d8ff', '#d0ebff', '#e7f5ff',
  // Row 4 - Accent colors
  '#ff922b', '#ffd43b', '#a9e34b', '#69db7c', '#38d9a9',
  // Row 5 - Purple/Pink
  '#da77f2', '#e599f7', '#f783ac', '#faa2c1', '#fcc2d7',
]

// Convert hex to HSV
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, v: v * 100 }
}

// Convert HSV to hex
function hsvToHex(h: number, s: number, v: number): string {
  h = h / 360
  s = s / 100
  v = v / 100

  let r = 0, g = 0, b = 0

  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }

  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const FigmaColorPicker: React.FC<FigmaColorPickerProps> = ({
  color,
  onChange,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [hsv, setHsv] = useState(() => hexToHsv(color || '#ffffff'))
  const pickerRef = useRef<HTMLDivElement>(null)
  const satValRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const isDraggingSatVal = useRef(false)
  const isDraggingHue = useRef(false)

  // Update HSV when color prop changes
  useEffect(() => {
    if (color) {
      setHsv(hexToHsv(color))
    }
  }, [color])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        // Check if click is within the right panel (properties panel)
        const rightPanel = (e.target as Element).closest('.right-panel, .character-properties-panel')
        if (rightPanel) {
          // Don't propagate if clicking within the properties panel
          e.stopPropagation()
        }
        setIsOpen(false)
      }
    }

    if (isOpen) {
      // Use capture phase to intercept before other handlers
      document.addEventListener('mousedown', handleClickOutside, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [isOpen])

  // Handle saturation/value drag
  const handleSatValChange = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!satValRef.current) return

    const rect = satValRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    const newHsv = { ...hsv, s: x * 100, v: (1 - y) * 100 }
    setHsv(newHsv)
    onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v))
  }, [hsv, onChange])

  // Handle hue drag
  const handleHueChange = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!hueRef.current) return

    const rect = hueRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))

    const newHsv = { ...hsv, h: x * 360 }
    setHsv(newHsv)
    onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v))
  }, [hsv, onChange])

  // Mouse event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSatVal.current) {
        handleSatValChange(e)
      } else if (isDraggingHue.current) {
        handleHueChange(e)
      }
    }

    const handleMouseUp = () => {
      isDraggingSatVal.current = false
      isDraggingHue.current = false
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleSatValChange, handleHueChange])

  const handlePresetClick = (presetColor: string) => {
    setHsv(hexToHsv(presetColor))
    onChange(presetColor)
  }

  const currentColor = hsvToHex(hsv.h, hsv.s, hsv.v)
  const hueColor = hsvToHex(hsv.h, 100, 100)

  return (
    <div className="figma-color-picker" ref={pickerRef}>
      {label && <label className="figma-color-label">{label}</label>}
      
      {/* Color Swatch Button */}
      <button
        className="figma-color-swatch-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="选择颜色"
      >
        <span 
          className="figma-color-swatch"
          style={{ backgroundColor: currentColor }}
        />
      </button>

      {/* Color Picker Popup */}
      {isOpen && (
        <div className="figma-color-popup">
          {/* Saturation/Value Gradient */}
          <div
            ref={satValRef}
            className="figma-satval-area"
            style={{ backgroundColor: hueColor }}
            onMouseDown={(e) => {
              isDraggingSatVal.current = true
              handleSatValChange(e)
            }}
          >
            <div className="figma-satval-white" />
            <div className="figma-satval-black" />
            <div
              className="figma-satval-cursor"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                backgroundColor: currentColor,
              }}
            />
          </div>

          {/* Hue Slider */}
          <div
            ref={hueRef}
            className="figma-hue-slider"
            onMouseDown={(e) => {
              isDraggingHue.current = true
              handleHueChange(e)
            }}
          >
            <div
              className="figma-hue-cursor"
              style={{ left: `${(hsv.h / 360) * 100}%` }}
            />
          </div>

          {/* Preset Colors */}
          <div className="figma-preset-colors">
            {PRESET_COLORS.map((presetColor, index) => (
              <button
                key={index}
                className={`figma-preset-swatch ${presetColor === currentColor ? 'active' : ''}`}
                style={{ backgroundColor: presetColor }}
                onClick={() => handlePresetClick(presetColor)}
                title={presetColor}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FigmaColorPicker
