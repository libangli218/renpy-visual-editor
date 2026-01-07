/**
 * Settings Parser for Ren'Py gui.rpy and options.rpy files
 * 
 * Parses and serializes define statements while preserving
 * comments, formatting, and unchanged lines.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a parsed define statement from a .rpy file
 */
export interface ParsedDefine {
  variable: string      // e.g., "gui.accent_color"
  value: string         // e.g., "'#cc6600'"
  lineNumber: number
  originalLine: string  // Preserve original line for format retention
}

/**
 * GUI Settings interface for gui.rpy
 */
export interface GuiSettings {
  // Colors
  accentColor: string
  idleColor: string
  hoverColor: string
  selectedColor: string
  textColor: string
  
  // Font sizes
  textSize: number
  nameTextSize: number
  interfaceTextSize: number
  
  // Dialogue box
  textboxHeight: number
  textboxYalign: number // 0.0 = top, 0.5 = center, 1.0 = bottom
  dialogueWidth: number
}

/**
 * Project Settings interface for options.rpy
 */
export interface ProjectSettings {
  // Basic info
  name: string
  version: string
  
  // Audio
  hasSound: boolean
  hasMusic: boolean
  hasVoice: boolean
  
  // Display
  showName: boolean
  windowMode: 'auto' | 'show' | 'hide'
}

// ============================================================================
// Default Values (based on Ren'Py 8.x default gui.rpy at 1920x1080)
// ============================================================================

export const DEFAULT_GUI_SETTINGS: GuiSettings = {
  accentColor: '#0099cc',
  idleColor: '#888888',
  hoverColor: '#33add6',
  selectedColor: '#ffffff',
  textColor: '#ffffff',
  textSize: 33,
  nameTextSize: 45,
  interfaceTextSize: 33,
  textboxHeight: 278,
  textboxYalign: 1.0,
  dialogueWidth: 1116,
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  name: 'My Game',
  version: '1.0',
  hasSound: true,
  hasMusic: true,
  hasVoice: false,
  showName: true,
  windowMode: 'auto',
}

// ============================================================================
// Variable Mappings
// ============================================================================

/**
 * Mapping from GuiSettings keys to Ren'Py variable names
 */
export const GUI_VARIABLE_MAP: Record<keyof GuiSettings, string> = {
  accentColor: 'gui.accent_color',
  idleColor: 'gui.idle_color',
  hoverColor: 'gui.hover_color',
  selectedColor: 'gui.selected_color',
  textColor: 'gui.text_color',
  textSize: 'gui.text_size',
  nameTextSize: 'gui.name_text_size',
  interfaceTextSize: 'gui.interface_text_size',
  textboxHeight: 'gui.textbox_height',
  textboxYalign: 'gui.textbox_yalign',
  dialogueWidth: 'gui.dialogue_width',
}

/**
 * Mapping from ProjectSettings keys to Ren'Py variable names
 */
export const PROJECT_VARIABLE_MAP: Record<keyof ProjectSettings, string> = {
  name: 'config.name',
  version: 'config.version',
  hasSound: 'config.has_sound',
  hasMusic: 'config.has_music',
  hasVoice: 'config.has_voice',
  showName: 'gui.show_name',
  windowMode: 'config.window',
}

// Reverse mappings for parsing
const GUI_REVERSE_MAP = Object.fromEntries(
  Object.entries(GUI_VARIABLE_MAP).map(([k, v]) => [v, k])
) as Record<string, keyof GuiSettings>

const PROJECT_REVERSE_MAP = Object.fromEntries(
  Object.entries(PROJECT_VARIABLE_MAP).map(([k, v]) => [v, k])
) as Record<string, keyof ProjectSettings>

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Regex pattern for matching define statements
 * Matches: define <variable> = <value>
 * 
 * Groups:
 * 1. variable name (e.g., "gui.accent_color" or "config.name")
 * 2. value (everything after the = sign)
 */
const DEFINE_PATTERN = /^(\s*)define\s+([\w.]+)\s*=\s*(.+?)\s*$/

/**
 * Parse a .rpy file content and extract all define statements
 * 
 * @param content - The file content to parse
 * @returns Array of ParsedDefine objects
 */
export function parseFile(content: string): ParsedDefine[] {
  const lines = content.split(/\r?\n/)
  const defines: ParsedDefine[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(DEFINE_PATTERN)
    
    if (match) {
      defines.push({
        variable: match[2],
        value: match[3],
        lineNumber: i + 1,
        originalLine: line,
      })
    }
  }
  
  return defines
}


// ============================================================================
// Value Parsing Helpers
// ============================================================================

/**
 * Parse a string value from Ren'Py format
 * Handles: 'string', "string", _("string"), _('string')
 */
function parseStringValue(value: string): string {
  // Handle _() function calls (translatable strings)
  const translatableMatch = value.match(/^_\(\s*(['"])(.*?)\1\s*\)$/)
  if (translatableMatch) {
    return translatableMatch[2]
  }
  
  // Handle regular quoted strings
  const quotedMatch = value.match(/^(['"])(.*?)\1$/)
  if (quotedMatch) {
    return quotedMatch[2]
  }
  
  return value
}

/**
 * Parse a numeric value from Ren'Py format
 */
function parseNumberValue(value: string): number {
  const num = parseFloat(value)
  return isNaN(num) ? 0 : num
}

/**
 * Parse a boolean value from Ren'Py format
 */
function parseBooleanValue(value: string): boolean {
  return value.trim() === 'True'
}

/**
 * Parse a color value from Ren'Py format
 * Handles: '#rrggbb', '#rgb', 'color_name'
 */
function parseColorValue(value: string): string {
  const str = parseStringValue(value)
  // Ensure it starts with # for hex colors
  if (str.match(/^#[0-9a-fA-F]{3,8}$/)) {
    return str
  }
  return str
}

// ============================================================================
// Converter Functions
// ============================================================================

/**
 * Convert ParsedDefine array to GuiSettings object
 * Applies default values for missing settings
 */
export function toGuiSettings(defines: ParsedDefine[]): GuiSettings {
  const settings: GuiSettings = { ...DEFAULT_GUI_SETTINGS }
  
  for (const define of defines) {
    const key = GUI_REVERSE_MAP[define.variable]
    if (!key) continue
    
    switch (key) {
      case 'accentColor':
      case 'idleColor':
      case 'hoverColor':
      case 'selectedColor':
      case 'textColor':
        settings[key] = parseColorValue(define.value)
        break
      case 'textSize':
      case 'nameTextSize':
      case 'interfaceTextSize':
      case 'textboxHeight':
      case 'dialogueWidth':
        settings[key] = parseNumberValue(define.value)
        break
      case 'textboxYalign':
        settings[key] = parseNumberValue(define.value)
        break
    }
  }
  
  return settings
}

/**
 * Convert ParsedDefine array to ProjectSettings object
 * Applies default values for missing settings
 */
export function toProjectSettings(defines: ParsedDefine[]): ProjectSettings {
  const settings: ProjectSettings = { ...DEFAULT_PROJECT_SETTINGS }
  
  for (const define of defines) {
    const key = PROJECT_REVERSE_MAP[define.variable]
    if (!key) continue
    
    switch (key) {
      case 'name':
      case 'version':
        settings[key] = parseStringValue(define.value)
        break
      case 'hasSound':
      case 'hasMusic':
      case 'hasVoice':
      case 'showName':
        settings[key] = parseBooleanValue(define.value)
        break
      case 'windowMode':
        const mode = parseStringValue(define.value)
        if (mode === 'auto' || mode === 'show' || mode === 'hide') {
          settings[key] = mode
        }
        break
    }
  }
  
  return settings
}

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Format a string value for Ren'Py
 * Uses single quotes by default
 */
function formatStringValue(value: string): string {
  // Escape single quotes in the string
  const escaped = value.replace(/'/g, "\\'")
  return `'${escaped}'`
}

/**
 * Format a translatable string value for Ren'Py
 * Uses _("string") format
 */
function formatTranslatableString(value: string): string {
  // Escape double quotes in the string
  const escaped = value.replace(/"/g, '\\"')
  return `_("${escaped}")`
}

/**
 * Format a boolean value for Ren'Py
 */
function formatBooleanValue(value: boolean): string {
  return value ? 'True' : 'False'
}

/**
 * Format a number value for Ren'Py
 */
function formatNumberValue(value: number): string {
  // Use integer format if it's a whole number
  if (Number.isInteger(value)) {
    return value.toString()
  }
  return value.toString()
}

/**
 * Format a float value for Ren'Py (always with decimal point)
 */
function formatFloatValue(value: number): string {
  // Always include decimal point for float values
  if (Number.isInteger(value)) {
    return value.toFixed(1)
  }
  return value.toString()
}

/**
 * Convert GuiSettings to Map of variable -> formatted value
 */
export function fromGuiSettings(settings: GuiSettings): Map<string, string> {
  const updates = new Map<string, string>()
  
  // Colors - use single quotes
  updates.set(GUI_VARIABLE_MAP.accentColor, formatStringValue(settings.accentColor))
  updates.set(GUI_VARIABLE_MAP.idleColor, formatStringValue(settings.idleColor))
  updates.set(GUI_VARIABLE_MAP.hoverColor, formatStringValue(settings.hoverColor))
  updates.set(GUI_VARIABLE_MAP.selectedColor, formatStringValue(settings.selectedColor))
  updates.set(GUI_VARIABLE_MAP.textColor, formatStringValue(settings.textColor))
  
  // Font sizes - integers
  updates.set(GUI_VARIABLE_MAP.textSize, formatNumberValue(settings.textSize))
  updates.set(GUI_VARIABLE_MAP.nameTextSize, formatNumberValue(settings.nameTextSize))
  updates.set(GUI_VARIABLE_MAP.interfaceTextSize, formatNumberValue(settings.interfaceTextSize))
  
  // Dialogue box
  updates.set(GUI_VARIABLE_MAP.textboxHeight, formatNumberValue(settings.textboxHeight))
  updates.set(GUI_VARIABLE_MAP.textboxYalign, formatFloatValue(settings.textboxYalign))
  updates.set(GUI_VARIABLE_MAP.dialogueWidth, formatNumberValue(settings.dialogueWidth))
  
  return updates
}

/**
 * Convert ProjectSettings to Map of variable -> formatted value
 */
export function fromProjectSettings(settings: ProjectSettings): Map<string, string> {
  const updates = new Map<string, string>()
  
  // Basic info - use translatable strings for name
  updates.set(PROJECT_VARIABLE_MAP.name, formatTranslatableString(settings.name))
  updates.set(PROJECT_VARIABLE_MAP.version, formatStringValue(settings.version))
  
  // Audio - booleans
  updates.set(PROJECT_VARIABLE_MAP.hasSound, formatBooleanValue(settings.hasSound))
  updates.set(PROJECT_VARIABLE_MAP.hasMusic, formatBooleanValue(settings.hasMusic))
  updates.set(PROJECT_VARIABLE_MAP.hasVoice, formatBooleanValue(settings.hasVoice))
  
  // Display
  updates.set(PROJECT_VARIABLE_MAP.showName, formatBooleanValue(settings.showName))
  updates.set(PROJECT_VARIABLE_MAP.windowMode, formatStringValue(settings.windowMode))
  
  return updates
}

// ============================================================================
// Update Functions
// ============================================================================

/**
 * Update define statements in file content
 * 
 * Takes original content and a Map of variable -> newValue,
 * replaces only the value portion of matching define statements,
 * and preserves all comments, whitespace, and unchanged lines.
 * 
 * @param content - Original file content
 * @param updates - Map of variable names to new values
 * @returns Updated file content
 */
export function updateDefines(content: string, updates: Map<string, string>): string {
  const lines = content.split(/\r?\n/)
  const updatedLines: string[] = []
  
  for (const line of lines) {
    const match = line.match(DEFINE_PATTERN)
    
    if (match && updates.has(match[2])) {
      // Found a define statement that needs updating
      const indent = match[1]
      const variable = match[2]
      const newValue = updates.get(variable)!
      
      // Reconstruct the line with the new value, preserving indentation
      updatedLines.push(`${indent}define ${variable} = ${newValue}`)
    } else {
      // Keep the line unchanged
      updatedLines.push(line)
    }
  }
  
  return updatedLines.join('\n')
}
