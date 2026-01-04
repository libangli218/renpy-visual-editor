/**
 * Project Management Types
 */

import { RenpyScript } from '../types/ast'

/**
 * Character definition extracted from Ren'Py scripts
 */
export interface Character {
  id: string
  name: string           // Variable name, e.g., 's'
  displayName: string    // Display name, e.g., 'Sylvie'
  color?: string         // Name color
  imagePrefix?: string   // Image prefix
  kind?: string          // Character type, e.g., 'nvl'
}

/**
 * Variable definition extracted from Ren'Py scripts
 */
export interface Variable {
  id: string
  name: string
  scope: 'default' | 'define' | 'persistent'
  type: 'bool' | 'int' | 'str' | 'list' | 'dict' | 'any'
  value: string
  description?: string
}

/**
 * Resource index for project assets
 */
export interface ResourceIndex {
  images: Resource[]
  backgrounds: Resource[]
  audio: Resource[]
  characters: Resource[]
}

/**
 * Single resource entry
 */
export interface Resource {
  id: string
  name: string
  type: 'image' | 'background' | 'audio' | 'character'
  path: string
  variants?: string[]
  thumbnail?: string
}

/**
 * Project structure
 */
export interface Project {
  name: string
  path: string
  scripts: Map<string, RenpyScript>  // File path -> AST
  characters: Character[]
  variables: Variable[]
  resources: ResourceIndex
  modified: boolean
}

/**
 * Standard Ren'Py project directory structure
 */
export const RENPY_PROJECT_STRUCTURE = {
  game: 'game',
  images: 'game/images',
  audio: 'game/audio',
  gui: 'game/gui',
  saves: 'game/saves',
  tl: 'game/tl',
} as const

/**
 * File extensions for Ren'Py scripts
 */
export const RENPY_SCRIPT_EXTENSIONS = ['.rpy'] as const

/**
 * File extensions for images
 */
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'] as const

/**
 * File extensions for audio
 */
export const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.opus'] as const

/**
 * Project creation options
 */
export interface CreateProjectOptions {
  name: string
  path: string
  createDefaultScript?: boolean
}

/**
 * Project open result
 */
export interface OpenProjectResult {
  success: boolean
  project?: Project
  error?: string
}

/**
 * Save result
 */
export interface SaveResult {
  success: boolean
  error?: string
}

/**
 * Scan result for .rpy files
 */
export interface ScanResult {
  files: string[]
  errors: string[]
}
