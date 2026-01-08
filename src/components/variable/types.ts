/**
 * Variable Types
 * 
 * Type definitions for variable management.
 * Supports 'default', 'define', and 'persistent' scopes.
 */

/**
 * Variable scope - determines how the variable is declared
 * - default: Runtime variable, reset on game restart
 * - define: Compile-time constant
 * - persistent: Saved across game sessions
 */
export type VariableScope = 'default' | 'define' | 'persistent'

/**
 * Variable value type for type inference
 */
export type VariableType = 'bool' | 'int' | 'str' | 'list' | 'dict' | 'any'

/**
 * Variable definition
 */
export interface Variable {
  id: string
  name: string
  value: string
  scope: VariableScope
  type: VariableType
  description?: string
}

/**
 * Form data for creating/editing variables
 */
export interface VariableFormData {
  name: string
  value: string
  scope: VariableScope
  type: VariableType
  description: string
}

/**
 * Default form values
 */
export const DEFAULT_VARIABLE_FORM: VariableFormData = {
  name: '',
  value: 'None',
  scope: 'default',
  type: 'any',
  description: '',
}

/**
 * Generate unique variable ID
 */
export function generateVariableId(): string {
  return `var_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Python keywords that cannot be used as variable names
 */
const PYTHON_KEYWORDS = [
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
  'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
  'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
  'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
  'while', 'with', 'yield',
]

/**
 * Validate variable name (must be valid Python identifier)
 */
export function isValidVariableName(name: string): boolean {
  if (!name || name.length === 0) return false
  if (PYTHON_KEYWORDS.includes(name)) return false
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

/**
 * Get default value for a variable type
 */
export function getDefaultValueForType(type: VariableType): string {
  switch (type) {
    case 'bool':
      return 'False'
    case 'int':
      return '0'
    case 'str':
      return '""'
    case 'list':
      return '[]'
    case 'dict':
      return '{}'
    case 'any':
    default:
      return 'None'
  }
}

/**
 * Infer variable type from value string
 */
export function inferTypeFromValue(value: string): VariableType {
  const trimmed = value.trim()
  
  // Boolean
  if (trimmed === 'True' || trimmed === 'False') {
    return 'bool'
  }
  
  // Integer (including negative)
  if (/^-?\d+$/.test(trimmed)) {
    return 'int'
  }
  
  // String (quoted)
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return 'str'
  }
  
  // List
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return 'list'
  }
  
  // Dict
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return 'dict'
  }
  
  return 'any'
}
