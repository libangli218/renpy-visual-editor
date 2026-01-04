/**
 * Variable Management Types
 * 
 * Types for variable definition and management in the editor.
 * Implements Requirements 8.1, 8.2, 8.3, 8.4
 */

/**
 * Variable scope types
 * - default: Mutable variable (can be changed during gameplay)
 * - define: Constant variable (cannot be changed)
 * - persistent: Persists across save files
 */
export type VariableScope = 'default' | 'define' | 'persistent'

/**
 * Variable value types
 * - bool: Boolean (True/False)
 * - int: Integer number
 * - str: String
 * - list: List/Array
 * - dict: Dictionary/Object
 * - any: Any Python expression
 */
export type VariableType = 'bool' | 'int' | 'str' | 'list' | 'dict' | 'any'

/**
 * Variable definition
 * Implements Requirements 8.1, 8.2, 8.3
 */
export interface Variable {
  id: string
  name: string
  scope: VariableScope
  type: VariableType
  value: string  // String representation of the value
  description?: string
}

/**
 * Variable creation/edit form data
 */
export interface VariableFormData {
  name: string
  scope: VariableScope
  type: VariableType
  value: string
  description: string
}

/**
 * Default variable form values
 */
export const DEFAULT_VARIABLE_FORM: VariableFormData = {
  name: '',
  scope: 'default',
  type: 'bool',
  value: 'False',
  description: '',
}

/**
 * Scope display information
 */
export const SCOPE_INFO: Record<VariableScope, { label: string; color: string; description: string }> = {
  default: {
    label: 'Default',
    color: '#4CAF50',  // Green
    description: 'Mutable variable that can be changed during gameplay',
  },
  define: {
    label: 'Define',
    color: '#2196F3',  // Blue
    description: 'Constant variable that cannot be changed',
  },
  persistent: {
    label: 'Persistent',
    color: '#FF9800',  // Orange
    description: 'Variable that persists across save files',
  },
}

/**
 * Type display information
 */
export const TYPE_INFO: Record<VariableType, { label: string; defaultValue: string; placeholder: string }> = {
  bool: {
    label: 'Boolean',
    defaultValue: 'False',
    placeholder: 'True or False',
  },
  int: {
    label: 'Integer',
    defaultValue: '0',
    placeholder: 'e.g., 0, 42, -10',
  },
  str: {
    label: 'String',
    defaultValue: '""',
    placeholder: 'e.g., "Hello World"',
  },
  list: {
    label: 'List',
    defaultValue: '[]',
    placeholder: 'e.g., [1, 2, 3] or ["a", "b"]',
  },
  dict: {
    label: 'Dictionary',
    defaultValue: '{}',
    placeholder: 'e.g., {"key": "value"}',
  },
  any: {
    label: 'Any',
    defaultValue: 'None',
    placeholder: 'Any Python expression',
  },
}

/**
 * Validate variable name (must be valid Python identifier)
 */
export function isValidVariableName(name: string): boolean {
  // Python identifier: starts with letter or underscore, followed by letters, digits, or underscores
  // Also check it's not a Python keyword
  const pythonKeywords = [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
    'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
    'while', 'with', 'yield',
  ]
  
  if (!name || pythonKeywords.includes(name)) {
    return false
  }
  
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

/**
 * Generate unique variable ID
 */
export function generateVariableId(): string {
  return `var_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Get default value for a variable type
 */
export function getDefaultValueForType(type: VariableType): string {
  return TYPE_INFO[type].defaultValue
}

/**
 * Validate variable value based on type
 */
export function isValidVariableValue(value: string, type: VariableType): boolean {
  if (!value.trim()) {
    return false
  }
  
  switch (type) {
    case 'bool':
      return value === 'True' || value === 'False'
    case 'int':
      return /^-?\d+$/.test(value.trim())
    case 'str':
      // Must be quoted string
      return /^["'].*["']$/.test(value.trim()) || /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value.trim())
    case 'list':
      // Basic check for list syntax
      return value.trim().startsWith('[') && value.trim().endsWith(']')
    case 'dict':
      // Basic check for dict syntax
      return value.trim().startsWith('{') && value.trim().endsWith('}')
    case 'any':
      // Any non-empty value is valid
      return true
    default:
      return true
  }
}

/**
 * Format value for display
 */
export function formatValueForDisplay(value: string, type: VariableType): string {
  if (type === 'str' && !value.startsWith('"') && !value.startsWith("'")) {
    return `"${value}"`
  }
  return value
}

/**
 * Parse value from Ren'Py code to determine type
 */
export function inferTypeFromValue(value: string): VariableType {
  const trimmed = value.trim()
  
  if (trimmed === 'True' || trimmed === 'False') {
    return 'bool'
  }
  
  if (/^-?\d+$/.test(trimmed)) {
    return 'int'
  }
  
  if (/^["'].*["']$/.test(trimmed)) {
    return 'str'
  }
  
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return 'list'
  }
  
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return 'dict'
  }
  
  return 'any'
}
