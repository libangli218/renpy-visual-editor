/**
 * Canvas Layout Persistence
 * 画布布局持久化
 * 
 * Handles saving and loading of Label positions to/from project configuration files.
 * Positions are stored in .renpy-editor/canvas-layout.json within the project directory.
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { Point, CanvasTransform } from './canvasLayoutStore'

/**
 * Configuration file version for future compatibility
 */
export const CANVAS_LAYOUT_CONFIG_VERSION = 1

/**
 * Configuration file path relative to project root
 */
export const CANVAS_LAYOUT_CONFIG_PATH = '.renpy-editor/canvas-layout.json'

/**
 * Canvas layout configuration file format
 */
export interface CanvasLayoutConfig {
  /** Configuration version for migration support */
  version: number
  /** Label positions mapped by label name */
  positions: Record<string, Point>
  /** Last canvas transform state (optional) */
  lastTransform?: CanvasTransform
}

/**
 * File system interface for abstraction (allows testing without Electron)
 */
export interface CanvasLayoutFileSystem {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  exists(path: string): Promise<boolean>
  mkdir(path: string): Promise<void>
}

/**
 * Default file system implementation using Electron API
 */
export const electronCanvasLayoutFileSystem: CanvasLayoutFileSystem = {
  readFile: (path: string) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return window.electronAPI.readFile(path)
  },
  writeFile: (path: string, content: string) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return window.electronAPI.writeFile(path, content)
  },
  exists: (path: string) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return window.electronAPI.exists(path)
  },
  mkdir: (path: string) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return window.electronAPI.mkdir(path)
  },
}

/**
 * Join path segments (cross-platform)
 */
function joinPath(...segments: string[]): string {
  return segments.join('/').replace(/\/+/g, '/')
}

/**
 * Get directory path from file path
 */
function getDirPath(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  parts.pop()
  return parts.join('/')
}

/**
 * Validate a Point object
 */
function isValidPoint(point: unknown): point is Point {
  if (typeof point !== 'object' || point === null) return false
  const p = point as Record<string, unknown>
  return (
    typeof p.x === 'number' &&
    typeof p.y === 'number' &&
    !isNaN(p.x) &&
    !isNaN(p.y) &&
    isFinite(p.x) &&
    isFinite(p.y)
  )
}

/**
 * Validate a CanvasTransform object
 */
function isValidTransform(transform: unknown): transform is CanvasTransform {
  if (typeof transform !== 'object' || transform === null) return false
  const t = transform as Record<string, unknown>
  return (
    typeof t.offsetX === 'number' &&
    typeof t.offsetY === 'number' &&
    typeof t.scale === 'number' &&
    !isNaN(t.offsetX) &&
    !isNaN(t.offsetY) &&
    !isNaN(t.scale) &&
    isFinite(t.offsetX) &&
    isFinite(t.offsetY) &&
    isFinite(t.scale) &&
    t.scale > 0
  )
}

/**
 * Clamp position coordinates to reasonable range
 * Prevents positions from being too far from origin
 */
const MAX_POSITION = 100000

function clampPosition(position: Point): Point {
  return {
    x: Math.max(-MAX_POSITION, Math.min(MAX_POSITION, position.x)),
    y: Math.max(-MAX_POSITION, Math.min(MAX_POSITION, position.y)),
  }
}

/**
 * Load canvas layout configuration from project
 * 
 * @param projectPath - Path to the project root directory
 * @param fs - File system interface (defaults to Electron API)
 * @returns Canvas layout configuration or null if not found/invalid
 * 
 * Requirements: 4.2
 */
export async function loadCanvasLayout(
  projectPath: string,
  fs: CanvasLayoutFileSystem = electronCanvasLayoutFileSystem
): Promise<CanvasLayoutConfig | null> {
  const configPath = joinPath(projectPath, CANVAS_LAYOUT_CONFIG_PATH)
  
  try {
    // Check if config file exists
    if (!await fs.exists(configPath)) {
      return null
    }
    
    // Read and parse config file
    const content = await fs.readFile(configPath)
    const config = JSON.parse(content) as unknown
    
    // Validate config structure
    if (typeof config !== 'object' || config === null) {
      console.warn('Canvas layout config is not an object')
      return null
    }
    
    const configObj = config as Record<string, unknown>
    
    // Check version
    if (typeof configObj.version !== 'number') {
      console.warn('Canvas layout config missing version')
      return null
    }
    
    // Validate and sanitize positions
    // Create object with null prototype to properly handle special keys like "__proto__"
    const positions = Object.create(null) as Record<string, Point>
    if (typeof configObj.positions === 'object' && configObj.positions !== null) {
      const rawPositions = configObj.positions as Record<string, unknown>
      // Use Object.keys() to properly enumerate all keys including "__proto__"
      for (const labelName of Object.keys(rawPositions)) {
        const position = rawPositions[labelName]
        if (isValidPoint(position)) {
          Object.defineProperty(positions, labelName, {
            value: clampPosition(position),
            writable: true,
            enumerable: true,
            configurable: true,
          })
        } else {
          console.warn(`Invalid position for label "${labelName}", skipping`)
        }
      }
    }
    
    // Validate lastTransform if present
    let lastTransform: CanvasTransform | undefined
    if (configObj.lastTransform !== undefined) {
      if (isValidTransform(configObj.lastTransform)) {
        lastTransform = configObj.lastTransform
      } else {
        console.warn('Invalid lastTransform in config, ignoring')
      }
    }
    
    return {
      version: configObj.version,
      positions,
      lastTransform,
    }
  } catch (error) {
    console.warn('Failed to load canvas layout config:', error)
    return null
  }
}

/**
 * Save canvas layout configuration to project
 * 
 * @param projectPath - Path to the project root directory
 * @param positions - Map of label names to positions
 * @param lastTransform - Optional last canvas transform state
 * @param fs - File system interface (defaults to Electron API)
 * 
 * Requirements: 4.1, 4.4
 */
export async function saveCanvasLayout(
  projectPath: string,
  positions: Map<string, Point>,
  lastTransform?: CanvasTransform,
  fs: CanvasLayoutFileSystem = electronCanvasLayoutFileSystem
): Promise<void> {
  const configPath = joinPath(projectPath, CANVAS_LAYOUT_CONFIG_PATH)
  const configDir = getDirPath(configPath)
  
  try {
    // Ensure directory exists
    if (!await fs.exists(configDir)) {
      await fs.mkdir(configDir)
    }
    
    // Convert Map to Record and clamp positions
    // Create object with null prototype to properly handle special keys like "__proto__"
    const positionsRecord = Object.create(null) as Record<string, Point>
    for (const [labelName, position] of positions) {
      Object.defineProperty(positionsRecord, labelName, {
        value: clampPosition(position),
        writable: true,
        enumerable: true,
        configurable: true,
      })
    }
    
    // Build config object
    const config: CanvasLayoutConfig = {
      version: CANVAS_LAYOUT_CONFIG_VERSION,
      positions: positionsRecord,
    }
    
    // Add lastTransform if valid
    if (lastTransform && isValidTransform(lastTransform)) {
      config.lastTransform = lastTransform
    }
    
    // Write config file with pretty formatting for readability
    const content = JSON.stringify(config, null, 2)
    await fs.writeFile(configPath, content)
  } catch (error) {
    console.error('Failed to save canvas layout config:', error)
    throw error
  }
}

/**
 * Convert positions Record to Map
 * 
 * Uses Object.keys() with hasOwnProperty check to properly handle
 * special property names like "__proto__" that Object.entries() skips.
 */
export function positionsRecordToMap(positions: Record<string, Point>): Map<string, Point> {
  const map = new Map<string, Point>()
  // Use Object.keys() which properly enumerates all own properties
  // including special names like "__proto__"
  for (const key of Object.keys(positions)) {
    if (Object.prototype.hasOwnProperty.call(positions, key)) {
      map.set(key, positions[key])
    }
  }
  return map
}

/**
 * Convert positions Map to Record
 * 
 * Uses Object.defineProperty for special keys like "__proto__" to ensure
 * they are stored as regular data properties, not as the prototype.
 */
export function positionsMapToRecord(positions: Map<string, Point>): Record<string, Point> {
  // Create object with null prototype to avoid __proto__ issues
  const record = Object.create(null) as Record<string, Point>
  for (const [key, value] of positions) {
    // Use defineProperty to safely set any key including "__proto__"
    Object.defineProperty(record, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    })
  }
  return record
}
