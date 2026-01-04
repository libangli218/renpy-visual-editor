/**
 * Character Management Types
 * 
 * Types for character definition and management in the editor.
 * Implements Requirements 7.1, 7.2, 7.3, 7.4
 */

/**
 * Layer attribute for Layered Image system
 */
export interface LayerAttribute {
  name: string           // e.g., 'outfit', 'expression', 'accessory'
  options: string[]      // e.g., ['casual', 'formal'] for outfit
  default?: string       // Default option
}

/**
 * Layered Image definition
 */
export interface LayeredImageDef {
  name: string           // Image name
  attributes: LayerAttribute[]
}

/**
 * Character definition
 * Implements Requirements 7.3, 7.4
 */
export interface Character {
  id: string
  name: string           // Variable name, e.g., 's'
  displayName: string    // Display name, e.g., 'Sylvie'
  color?: string         // Name color (hex format)
  imagePrefix?: string   // Image prefix for show statements
  kind?: string          // Character type, e.g., 'nvl'
  layers?: LayeredImageDef
}

/**
 * Character creation/edit form data
 */
export interface CharacterFormData {
  name: string
  displayName: string
  color: string
  imagePrefix: string
  kind: string
}

/**
 * Default character form values
 */
export const DEFAULT_CHARACTER_FORM: CharacterFormData = {
  name: '',
  displayName: '',
  color: '#ffffff',
  imagePrefix: '',
  kind: '',
}

/**
 * Validate character name (must be valid Python identifier)
 */
export function isValidCharacterName(name: string): boolean {
  return /^[a-z_][a-z0-9_]*$/i.test(name)
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(color)
}

/**
 * Generate unique character ID
 */
export function generateCharacterId(): string {
  return `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Parse Character() call from define statement value
 * e.g., "Character('Sylvie', color='#c8ffc8', image='sylvie')"
 */
export function parseCharacterValue(value: string): Partial<CharacterFormData> | null {
  // Match Character(...) pattern
  const match = value.match(/^Character\s*\(\s*(.+)\s*\)$/s)
  if (!match) return null

  const argsStr = match[1]
  const result: Partial<CharacterFormData> = {}

  // Parse first positional argument (display name)
  const displayNameMatch = argsStr.match(/^['"]([^'"]*)['"]\s*(?:,|$)/)
  if (displayNameMatch) {
    result.displayName = displayNameMatch[1]
  }

  // Parse keyword arguments
  const colorMatch = argsStr.match(/color\s*=\s*['"]([^'"]*)['"]/i)
  if (colorMatch) {
    result.color = colorMatch[1]
  }

  const imageMatch = argsStr.match(/image\s*=\s*['"]([^'"]*)['"]/i)
  if (imageMatch) {
    result.imagePrefix = imageMatch[1]
  }

  const kindMatch = argsStr.match(/kind\s*=\s*(\w+)/i)
  if (kindMatch) {
    result.kind = kindMatch[1]
  }

  return result
}

/**
 * Generate Character() call for define statement
 */
export function generateCharacterValue(data: CharacterFormData): string {
  const args: string[] = []

  // Display name (required)
  args.push(`'${data.displayName}'`)

  // Optional arguments
  if (data.color && data.color !== '#ffffff') {
    args.push(`color='${data.color}'`)
  }

  if (data.imagePrefix) {
    args.push(`image='${data.imagePrefix}'`)
  }

  if (data.kind) {
    args.push(`kind=${data.kind}`)
  }

  return `Character(${args.join(', ')})`
}

/**
 * Generate unique layer attribute ID
 */
export function generateLayerAttributeId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate layer attribute name (must be valid Python identifier)
 */
export function isValidLayerName(name: string): boolean {
  return /^[a-z_][a-z0-9_]*$/i.test(name)
}

/**
 * Create a new empty layer attribute
 */
export function createEmptyLayerAttribute(): LayerAttribute {
  return {
    name: '',
    options: [],
    default: undefined,
  }
}

/**
 * Create a default LayeredImageDef for a character
 */
export function createDefaultLayeredImageDef(characterImagePrefix: string): LayeredImageDef {
  return {
    name: characterImagePrefix,
    attributes: [],
  }
}

/**
 * Generate layeredimage Ren'Py code
 * 
 * Example output:
 * layeredimage sylvie:
 *     group outfit:
 *         attribute casual default
 *         attribute dress
 *     group expression:
 *         attribute happy default
 *         attribute sad
 */
export function generateLayeredImageCode(layers: LayeredImageDef): string {
  if (!layers.name || layers.attributes.length === 0) {
    return ''
  }

  const lines: string[] = []
  lines.push(`layeredimage ${layers.name}:`)

  for (const attr of layers.attributes) {
    if (!attr.name || attr.options.length === 0) continue

    lines.push(`    group ${attr.name}:`)
    for (const option of attr.options) {
      const isDefault = attr.default === option
      lines.push(`        attribute ${option}${isDefault ? ' default' : ''}`)
    }
  }

  return lines.join('\n')
}

/**
 * Parse layeredimage code to LayeredImageDef
 * 
 * Example input:
 * layeredimage sylvie:
 *     group outfit:
 *         attribute casual default
 *         attribute dress
 */
export function parseLayeredImageCode(code: string): LayeredImageDef | null {
  const lines = code.split('\n')
  
  // Parse header: layeredimage <name>:
  const headerMatch = lines[0]?.match(/^layeredimage\s+(\w+)\s*:/)
  if (!headerMatch) return null

  const result: LayeredImageDef = {
    name: headerMatch[1],
    attributes: [],
  }

  let currentGroup: LayerAttribute | null = null

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    
    // Parse group: group <name>:
    const groupMatch = line.match(/^\s+group\s+(\w+)\s*:/)
    if (groupMatch) {
      if (currentGroup && currentGroup.options.length > 0) {
        result.attributes.push(currentGroup)
      }
      currentGroup = {
        name: groupMatch[1],
        options: [],
        default: undefined,
      }
      continue
    }

    // Parse attribute: attribute <name> [default]
    const attrMatch = line.match(/^\s+attribute\s+(\w+)(\s+default)?/)
    if (attrMatch && currentGroup) {
      currentGroup.options.push(attrMatch[1])
      if (attrMatch[2]) {
        currentGroup.default = attrMatch[1]
      }
    }
  }

  // Add last group
  if (currentGroup && currentGroup.options.length > 0) {
    result.attributes.push(currentGroup)
  }

  return result
}
