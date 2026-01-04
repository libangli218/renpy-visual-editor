/**
 * Transition Types
 * 
 * Types for transition effects in the editor.
 * Implements Requirements 11.2, 11.3, 11.5
 */

/**
 * Built-in transition types available in Ren'Py
 * Implements Requirement 11.2
 */
export type BuiltInTransitionType =
  | 'dissolve'
  | 'fade'
  | 'pixellate'
  | 'move'
  | 'ease'
  | 'wipeleft'
  | 'wiperight'
  | 'wipeup'
  | 'wipedown'
  | 'slideright'
  | 'slideleft'
  | 'slideup'
  | 'slidedown'
  | 'slideawayright'
  | 'slideawayleft'
  | 'slideawayup'
  | 'slideawaydown'
  | 'pushright'
  | 'pushleft'
  | 'pushup'
  | 'pushdown'
  | 'irisin'
  | 'irisout'
  | 'squares'
  | 'blinds'
  | 'vpunch'
  | 'hpunch'
  | 'flash'
  | 'None'

/**
 * Transition category for grouping in UI
 */
export type TransitionCategory =
  | 'basic'
  | 'wipe'
  | 'slide'
  | 'push'
  | 'iris'
  | 'special'

/**
 * Transition definition with metadata
 */
export interface TransitionDefinition {
  name: BuiltInTransitionType
  displayName: string
  category: TransitionCategory
  description: string
  supportsDuration: boolean
  supportsCustomParams: boolean
  defaultDuration?: number
  parameterTemplate?: string  // e.g., "Dissolve({duration})" for custom params
}

/**
 * Custom transition configuration
 * Implements Requirement 11.3
 */
export interface CustomTransition {
  name: string
  parameters: string  // Raw parameter string, e.g., "0.5, alpha=True"
}

/**
 * Transition selection state
 */
export interface TransitionSelection {
  type: 'builtin' | 'custom'
  transition: BuiltInTransitionType | string
  duration?: number
  customParams?: string
}

/**
 * Built-in transitions with metadata
 * Implements Requirement 11.2
 */
export const BUILT_IN_TRANSITIONS: TransitionDefinition[] = [
  // Basic transitions
  {
    name: 'dissolve',
    displayName: 'Dissolve',
    category: 'basic',
    description: 'Gradually fades from one image to another',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 0.5,
    parameterTemplate: 'Dissolve({duration})',
  },
  {
    name: 'fade',
    displayName: 'Fade',
    category: 'basic',
    description: 'Fades to black, then to the new image',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 0.5,
    parameterTemplate: 'Fade({duration})',
  },
  {
    name: 'pixellate',
    displayName: 'Pixellate',
    category: 'basic',
    description: 'Pixelates the old image, then unpixelates to the new image',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
    parameterTemplate: 'Pixellate({duration})',
  },
  {
    name: 'None',
    displayName: 'None (Instant)',
    category: 'basic',
    description: 'Instant transition with no animation',
    supportsDuration: false,
    supportsCustomParams: false,
  },

  // Wipe transitions
  {
    name: 'wipeleft',
    displayName: 'Wipe Left',
    category: 'wipe',
    description: 'Wipes from right to left',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'wiperight',
    displayName: 'Wipe Right',
    category: 'wipe',
    description: 'Wipes from left to right',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'wipeup',
    displayName: 'Wipe Up',
    category: 'wipe',
    description: 'Wipes from bottom to top',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'wipedown',
    displayName: 'Wipe Down',
    category: 'wipe',
    description: 'Wipes from top to bottom',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },

  // Slide transitions
  {
    name: 'slideleft',
    displayName: 'Slide Left',
    category: 'slide',
    description: 'New image slides in from the right',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'slideright',
    displayName: 'Slide Right',
    category: 'slide',
    description: 'New image slides in from the left',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'slideup',
    displayName: 'Slide Up',
    category: 'slide',
    description: 'New image slides in from the bottom',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'slidedown',
    displayName: 'Slide Down',
    category: 'slide',
    description: 'New image slides in from the top',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'slideawayleft',
    displayName: 'Slide Away Left',
    category: 'slide',
    description: 'Old image slides out to the left',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'slideawayright',
    displayName: 'Slide Away Right',
    category: 'slide',
    description: 'Old image slides out to the right',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'slideawayup',
    displayName: 'Slide Away Up',
    category: 'slide',
    description: 'Old image slides out to the top',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'slideawaydown',
    displayName: 'Slide Away Down',
    category: 'slide',
    description: 'Old image slides out to the bottom',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },

  // Push transitions
  {
    name: 'pushleft',
    displayName: 'Push Left',
    category: 'push',
    description: 'New image pushes old image to the left',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'pushright',
    displayName: 'Push Right',
    category: 'push',
    description: 'New image pushes old image to the right',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'pushup',
    displayName: 'Push Up',
    category: 'push',
    description: 'New image pushes old image up',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'pushdown',
    displayName: 'Push Down',
    category: 'push',
    description: 'New image pushes old image down',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },

  // Iris transitions
  {
    name: 'irisin',
    displayName: 'Iris In',
    category: 'iris',
    description: 'New image appears in an expanding circle',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'irisout',
    displayName: 'Iris Out',
    category: 'iris',
    description: 'Old image disappears in a shrinking circle',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },

  // Special transitions
  {
    name: 'move',
    displayName: 'Move',
    category: 'special',
    description: 'Moves images to their new positions',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 0.5,
  },
  {
    name: 'ease',
    displayName: 'Ease',
    category: 'special',
    description: 'Moves images with easing animation',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 0.5,
  },
  {
    name: 'squares',
    displayName: 'Squares',
    category: 'special',
    description: 'Transition using square pattern',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'blinds',
    displayName: 'Blinds',
    category: 'special',
    description: 'Transition using blinds effect',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 1.0,
  },
  {
    name: 'vpunch',
    displayName: 'Vertical Punch',
    category: 'special',
    description: 'Screen shakes vertically',
    supportsDuration: false,
    supportsCustomParams: false,
  },
  {
    name: 'hpunch',
    displayName: 'Horizontal Punch',
    category: 'special',
    description: 'Screen shakes horizontally',
    supportsDuration: false,
    supportsCustomParams: false,
  },
  {
    name: 'flash',
    displayName: 'Flash',
    category: 'special',
    description: 'Screen flashes white',
    supportsDuration: true,
    supportsCustomParams: true,
    defaultDuration: 0.5,
  },
]

/**
 * Category display information
 */
export const CATEGORY_INFO: Record<TransitionCategory, { label: string; description: string }> = {
  basic: {
    label: 'Basic',
    description: 'Common fade and dissolve transitions',
  },
  wipe: {
    label: 'Wipe',
    description: 'Wipe transitions in various directions',
  },
  slide: {
    label: 'Slide',
    description: 'Slide transitions for images',
  },
  push: {
    label: 'Push',
    description: 'Push transitions that move both images',
  },
  iris: {
    label: 'Iris',
    description: 'Circular iris transitions',
  },
  special: {
    label: 'Special',
    description: 'Special effects and movements',
  },
}

/**
 * Get transition definition by name
 */
export function getTransitionDefinition(name: string): TransitionDefinition | undefined {
  return BUILT_IN_TRANSITIONS.find((t) => t.name === name)
}

/**
 * Get transitions by category
 */
export function getTransitionsByCategory(category: TransitionCategory): TransitionDefinition[] {
  return BUILT_IN_TRANSITIONS.filter((t) => t.category === category)
}

/**
 * Generate transition code from selection
 * Implements Requirement 11.6
 */
export function generateTransitionCode(selection: TransitionSelection): string {
  if (selection.type === 'custom') {
    return selection.transition
  }

  const definition = getTransitionDefinition(selection.transition)
  
  if (!definition) {
    return selection.transition
  }

  // If no duration or custom params, return simple name
  if (!selection.duration && !selection.customParams) {
    return definition.name
  }

  // If custom params provided, use them directly
  if (selection.customParams) {
    return selection.customParams
  }

  // If duration provided and transition supports it
  if (selection.duration !== undefined && definition.supportsDuration) {
    // Use parameter template if available
    if (definition.parameterTemplate) {
      return definition.parameterTemplate.replace('{duration}', selection.duration.toString())
    }
    // Otherwise, capitalize first letter and add duration
    const capitalizedName = definition.name.charAt(0).toUpperCase() + definition.name.slice(1)
    return `${capitalizedName}(${selection.duration})`
  }

  return definition.name
}

/**
 * Parse transition code to selection
 */
export function parseTransitionCode(code: string): TransitionSelection {
  const trimmed = code.trim()
  
  // Check if it's a simple built-in transition name
  const builtIn = BUILT_IN_TRANSITIONS.find(
    (t) => t.name.toLowerCase() === trimmed.toLowerCase()
  )
  
  if (builtIn) {
    return {
      type: 'builtin',
      transition: builtIn.name,
    }
  }

  // Check if it's a parameterized transition like Dissolve(0.5)
  const paramMatch = trimmed.match(/^(\w+)\s*\(\s*(.+)\s*\)$/)
  if (paramMatch) {
    const [, name, params] = paramMatch
    const matchingBuiltIn = BUILT_IN_TRANSITIONS.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    )
    
    if (matchingBuiltIn) {
      // Try to parse duration from params
      const durationMatch = params.match(/^(\d+(?:\.\d+)?)/)
      const duration = durationMatch ? parseFloat(durationMatch[1]) : undefined
      
      return {
        type: 'builtin',
        transition: matchingBuiltIn.name,
        duration,
        customParams: trimmed,
      }
    }
  }

  // It's a custom transition
  return {
    type: 'custom',
    transition: trimmed,
  }
}

/**
 * Validate transition code
 */
export function isValidTransitionCode(code: string): boolean {
  if (!code || !code.trim()) {
    return false
  }
  
  const trimmed = code.trim()
  
  // Simple identifier
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return true
  }
  
  // Function call like Dissolve(0.5)
  if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\)$/.test(trimmed)) {
    return true
  }
  
  return false
}

/**
 * Generate unique transition ID
 */
export function generateTransitionId(): string {
  return `trans_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}
