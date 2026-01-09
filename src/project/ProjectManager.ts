/**
 * Project Manager
 * 
 * Handles Ren'Py project creation, opening, and file management.
 * Implements Requirements 1.1, 1.2, 1.5, 1.6
 */

import { RenpyScript } from '../types/ast'
import { parse } from '../parser'
import { generate } from '../generator'
import {
  Project,
  Character,
  Variable,
  ResourceIndex,
  CreateProjectOptions,
  OpenProjectResult,
  SaveResult,
  ScanResult,
  RENPY_PROJECT_STRUCTURE,
  RENPY_SCRIPT_EXTENSIONS,
} from './types'

/**
 * File system interface for abstraction (allows testing without Electron)
 */
export interface FileSystem {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  readDir(path: string): Promise<{ name: string; isDirectory: boolean }[]>
  exists(path: string): Promise<boolean>
  mkdir(path: string): Promise<void>
  copyDir(src: string, dest: string): Promise<void>
  copyFile(src: string, dest: string): Promise<void>
  getAppPath(): Promise<string>
}

/**
 * Electron API type declaration
 */
declare global {
  interface Window {
    electronAPI?: {
      readFile: (path: string) => Promise<string>
      writeFile: (path: string, content: string) => Promise<void>
      readDir: (path: string) => Promise<{ name: string; isDirectory: boolean }[]>
      exists: (path: string) => Promise<boolean>
      mkdir: (path: string) => Promise<void>
      copyDir: (src: string, dest: string) => Promise<void>
      copyFile: (src: string, dest: string) => Promise<void>
      getAppPath: () => Promise<string>
      openDirectory: () => Promise<string | null>
      selectDirectory: (title?: string) => Promise<string | null>
      selectRenpySdk: () => Promise<string | null>
      launchGame: (projectPath: string, sdkPath: string) => Promise<{ success: boolean; pid?: number; error?: string }>
      stopGame: () => Promise<{ success: boolean; error?: string }>
      isGameRunning: () => Promise<boolean>
      onGameError: (callback: (error: string) => void) => void
      onGameExit: (callback: (code: number | null) => void) => void
      removeGameListeners: () => void
    }
  }
}

/**
 * Default file system implementation using Electron API
 */
export const electronFileSystem: FileSystem = {
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
  readDir: (path: string) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return window.electronAPI.readDir(path)
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
  copyDir: (src: string, dest: string) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return window.electronAPI.copyDir(src, dest)
  },
  copyFile: (src: string, dest: string) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return window.electronAPI.copyFile(src, dest)
  },
  getAppPath: () => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available')
    }
    return window.electronAPI.getAppPath()
  },
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Join path segments (cross-platform)
 */
function joinPath(...segments: string[]): string {
  return segments.join('/').replace(/\/+/g, '/')
}

/**
 * Get file name from path
 */
function getFileName(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || ''
}

/**
 * Get file extension
 */
function getExtension(path: string): string {
  const fileName = getFileName(path)
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 ? fileName.substring(dotIndex).toLowerCase() : ''
}

/**
 * Project Manager class
 */
export class ProjectManager {
  private fs: FileSystem
  private currentProject: Project | null = null
  /** Original file contents - used to detect if a file was actually modified */
  private originalContents: Map<string, string> = new Map()
  /** Set of file paths that have been modified */
  private modifiedScripts: Set<string> = new Set()

  constructor(fileSystem: FileSystem = electronFileSystem) {
    this.fs = fileSystem
  }

  /**
   * Get the current project
   */
  getProject(): Project | null {
    return this.currentProject
  }

  /**
   * Mark a script as modified
   */
  markScriptModified(filePath: string): void {
    this.modifiedScripts.add(filePath)
    if (this.currentProject) {
      this.currentProject.modified = true
    }
  }

  /**
   * Check if a script has been modified
   */
  isScriptModified(filePath: string): boolean {
    return this.modifiedScripts.has(filePath)
  }

  /**
   * Get the original content of a file
   */
  getOriginalContent(filePath: string): string | undefined {
    return this.originalContents.get(filePath)
  }

  /**
   * Get all modified script paths
   */
  getModifiedScripts(): string[] {
    return Array.from(this.modifiedScripts)
  }

  /**
   * Clear all modified script markers
   * Used after project open/create to reset modification state
   */
  clearModifiedScripts(): void {
    this.modifiedScripts.clear()
    if (this.currentProject) {
      this.currentProject.modified = false
    }
  }

  /**
   * Create a new Ren'Py project with standard directory structure
   * Implements Requirement 1.1
   */
  async createProject(options: CreateProjectOptions): Promise<OpenProjectResult> {
    try {
      const { name, path } = options
      const projectPath = joinPath(path, name)

      // Check if directory already exists
      if (await this.fs.exists(projectPath)) {
        return {
          success: false,
          error: `Directory already exists: ${projectPath}`,
        }
      }

      // Get template path
      const appPath = await this.fs.getAppPath()
      const templatePath = joinPath(appPath, 'templates', 'default-project')

      // Check if template exists
      if (!await this.fs.exists(templatePath)) {
        return {
          success: false,
          error: `Project template not found at: ${templatePath}. Please ensure the templates directory is properly installed.`,
        }
      }

      // Copy template to project path
      await this.fs.copyDir(templatePath, projectPath)
      
      // Customize project files based on options
      await this.customizeProjectFiles(projectPath, options)

      // Open the newly created project
      return this.openProject(projectPath)
    } catch (error) {
      return {
        success: false,
        error: `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Customize project files after copying from template
   */
  private async customizeProjectFiles(projectPath: string, options: CreateProjectOptions): Promise<void> {
    const { name, width = 1920, height = 1080, accentColor = '#99ccff' } = options

    // Read and customize options.rpy
    const optionsPath = joinPath(projectPath, 'game', 'options.rpy')
    let optionsContent = await this.fs.readFile(optionsPath)
    
    // Replace project name
    optionsContent = optionsContent.replace(
      /define config\.name = _\(".*?"\)/,
      `define config.name = _("${name}")`
    )
    optionsContent = optionsContent.replace(
      /define build\.name = ".*?"/,
      `define build.name = "${name.replace(/[^A-Za-z0-9]/g, '')}"`
    )
    optionsContent = optionsContent.replace(
      /define config\.save_directory = ".*?"/,
      `define config.save_directory = "${name.replace(/[^A-Za-z0-9]/g, '')}-${Date.now()}"`
    )
    
    await this.fs.writeFile(optionsPath, optionsContent)

    // Read and customize gui.rpy
    const guiPath = joinPath(projectPath, 'game', 'gui.rpy')
    let guiContent = await this.fs.readFile(guiPath)
    
    // Replace resolution
    guiContent = guiContent.replace(
      /gui\.init\(\d+,\s*\d+\)/,
      `gui.init(${width}, ${height})`
    )
    
    // Replace accent color
    guiContent = guiContent.replace(
      /define gui\.accent_color = ['"].*?['"]/,
      `define gui.accent_color = '${accentColor}'`
    )
    
    // Calculate and replace related colors
    const hoverColor = this.lightenColor(accentColor, 0.2)
    guiContent = guiContent.replace(
      /define gui\.hover_color = ['"].*?['"]/,
      `define gui.hover_color = '${hoverColor}'`
    )
    
    await this.fs.writeFile(guiPath, guiContent)

    // Customize script.rpy
    const scriptPath = joinPath(projectPath, 'game', 'script.rpy')
    let scriptContent = await this.fs.readFile(scriptPath)
    
    // Update welcome message
    scriptContent = scriptContent.replace(
      /e "您已创建一个新的 Ren'Py 游戏。"/,
      `e "欢迎来到 ${name}！"`
    )
    
    await this.fs.writeFile(scriptPath, scriptContent)
  }

  /**
   * Lighten a hex color
   */
  private lightenColor(hex: string, amount: number): string {
    const rgb = this.hexToRgb(hex)
    if (!rgb) return hex
    
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount))
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount))
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount))
    
    return this.rgbToHex(r, g, b)
  }

  /**
   * Convert hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  /**
   * Convert RGB to hex
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  /**
   * Open an existing Ren'Py project
   * Implements Requirement 1.2
   */
  async openProject(projectPath: string): Promise<OpenProjectResult> {
    try {
      // Verify project structure
      const gameDir = joinPath(projectPath, 'game')
      if (!await this.fs.exists(gameDir)) {
        return {
          success: false,
          error: `Invalid Ren'Py project: missing 'game' directory at ${projectPath}`,
        }
      }

      // Get project name from path
      const name = getFileName(projectPath) || 'Untitled Project'

      // Scan for .rpy files
      const scanResult = await this.scanRpyFiles(projectPath)
      
      // Clear previous state
      this.originalContents.clear()
      this.modifiedScripts.clear()
      
      // Parse all script files
      const scripts = new Map<string, RenpyScript>()
      const characters: Character[] = []
      const variables: Variable[] = []

      for (const filePath of scanResult.files) {
        try {
          const content = await this.fs.readFile(filePath)
          // Save original content for later comparison
          this.originalContents.set(filePath, content)
          
          const parseResult = parse(content, filePath)
          scripts.set(filePath, parseResult.ast)

          // Extract characters and variables from the AST
          this.extractCharactersAndVariables(parseResult.ast, characters, variables)
        } catch (error) {
          console.warn(`Failed to parse ${filePath}:`, error)
          // Continue with other files
        }
      }

      // Create empty resource index (will be populated by ResourceManager)
      const resources: ResourceIndex = {
        images: [],
        backgrounds: [],
        audio: [],
        characters: [],
      }

      // Create project object
      const project: Project = {
        name,
        path: projectPath,
        scripts,
        characters,
        variables,
        resources,
        modified: false,
      }

      this.currentProject = project

      return {
        success: true,
        project,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to open project: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Scan for .rpy files in the project
   * Implements Requirement 1.2
   */
  async scanRpyFiles(projectPath: string): Promise<ScanResult> {
    const files: string[] = []
    const errors: string[] = []
    const gameDir = joinPath(projectPath, 'game')

    try {
      await this.scanDirectory(gameDir, files, errors)
    } catch (error) {
      errors.push(`Failed to scan directory: ${error instanceof Error ? error.message : String(error)}`)
    }

    return { files, errors }
  }

  /**
   * Recursively scan a directory for .rpy files
   * 
   * Skips the following directories:
   * - saves: Save game data
   * - cache: Compiled bytecode cache
   * - tl: Translation files (auto-generated, should not be edited in visual editor)
   * - Directories starting with '.' (hidden directories)
   */
  private async scanDirectory(dirPath: string, files: string[], errors: string[]): Promise<void> {
    try {
      const entries = await this.fs.readDir(dirPath)

      for (const entry of entries) {
        const fullPath = joinPath(dirPath, entry.name)

        if (entry.isDirectory) {
          // Skip certain directories
          // - saves: Save game data
          // - cache: Compiled bytecode cache  
          // - tl: Translation files (auto-generated, should not be edited in visual editor)
          // - Hidden directories (starting with '.')
          if (entry.name === 'saves' || entry.name === 'cache' || entry.name === 'tl' || entry.name.startsWith('.')) {
            continue
          }
          await this.scanDirectory(fullPath, files, errors)
        } else {
          const ext = getExtension(entry.name)
          if (RENPY_SCRIPT_EXTENSIONS.includes(ext as typeof RENPY_SCRIPT_EXTENSIONS[number])) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Extract characters and variables from an AST
   */
  private extractCharactersAndVariables(
    ast: RenpyScript,
    characters: Character[],
    variables: Variable[]
  ): void {
    for (const node of ast.statements) {
      if (node.type === 'define') {
        // Check if it's a Character definition
        if (node.value.includes('Character(')) {
          const character = this.parseCharacterDefinition(node.name, node.value)
          if (character) {
            characters.push(character)
          }
        } else {
          // Regular define variable
          variables.push({
            id: generateId(),
            name: node.name,
            scope: 'define',
            type: this.inferType(node.value),
            value: node.value,
          })
        }
      } else if (node.type === 'default') {
        variables.push({
          id: generateId(),
          name: node.name,
          scope: 'default',
          type: this.inferType(node.value),
          value: node.value,
        })
      }
    }
  }

  /**
   * Parse a Character definition from its value string
   */
  private parseCharacterDefinition(name: string, value: string): Character | null {
    // Match Character("DisplayName", ...) or Character('DisplayName', ...)
    const match = value.match(/Character\s*\(\s*["']([^"']+)["']/)
    if (!match) return null

    const displayName = match[1]

    // Try to extract color
    const colorMatch = value.match(/color\s*=\s*["']([^"']+)["']/)
    const color = colorMatch ? colorMatch[1] : undefined

    // Try to extract image
    const imageMatch = value.match(/image\s*=\s*["']([^"']+)["']/)
    const imagePrefix = imageMatch ? imageMatch[1] : undefined

    return {
      id: generateId(),
      name,
      displayName,
      color,
      imagePrefix,
    }
  }

  /**
   * Infer variable type from its value string
   */
  private inferType(value: string): 'bool' | 'int' | 'str' | 'list' | 'dict' | 'any' {
    const trimmed = value.trim()
    
    if (trimmed === 'True' || trimmed === 'False') {
      return 'bool'
    }
    if (/^-?\d+$/.test(trimmed)) {
      return 'int'
    }
    if (/^["']/.test(trimmed)) {
      return 'str'
    }
    if (trimmed.startsWith('[')) {
      return 'list'
    }
    if (trimmed.startsWith('{')) {
      return 'dict'
    }
    return 'any'
  }


  /**
   * Save the current project
   * Implements Requirements 1.5, 1.6
   * 
   * Only saves scripts that have been explicitly marked as modified.
   * This preserves the original formatting of unmodified files.
   */
  async saveProject(): Promise<SaveResult> {
    if (!this.currentProject) {
      return {
        success: false,
        error: 'No project is currently open',
      }
    }

    // If no scripts are modified, nothing to save
    if (this.modifiedScripts.size === 0) {
      return { success: true }
    }

    const errors: string[] = []
    let savedCount = 0

    // Only save modified scripts
    for (const filePath of this.modifiedScripts) {
      const ast = this.currentProject.scripts.get(filePath)
      if (!ast) {
        errors.push(`Script not found in project: ${filePath}`)
        continue
      }

      try {
        const code = generate(ast)
        await this.fs.writeFile(filePath, code)
        // Update original content after successful save
        this.originalContents.set(filePath, code)
        savedCount++
      } catch (error) {
        errors.push(`Failed to save ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join('\n'),
      }
    }

    // Clear modified scripts set after successful save
    this.modifiedScripts.clear()
    
    // Mark project as not modified
    this.currentProject.modified = false

    console.log(`Saved ${savedCount} modified script(s)`)
    return { success: true }
  }

  /**
   * Save a specific script file
   * Implements Requirements 1.5, 1.6
   */
  async saveScript(filePath: string): Promise<SaveResult> {
    if (!this.currentProject) {
      return {
        success: false,
        error: 'No project is currently open',
      }
    }

    const ast = this.currentProject.scripts.get(filePath)
    if (!ast) {
      return {
        success: false,
        error: `Script not found: ${filePath}`,
      }
    }

    try {
      const code = generate(ast)
      await this.fs.writeFile(filePath, code)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Failed to save ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Update a script's AST in the project
   */
  updateScript(filePath: string, ast: RenpyScript): void {
    if (!this.currentProject) {
      throw new Error('No project is currently open')
    }

    this.currentProject.scripts.set(filePath, ast)
    this.currentProject.modified = true
  }

  /**
   * Get all script file paths
   */
  getScriptFiles(): string[] {
    if (!this.currentProject) {
      return []
    }
    return Array.from(this.currentProject.scripts.keys())
  }

  /**
   * Get a script's AST by file path
   */
  getScript(filePath: string): RenpyScript | undefined {
    return this.currentProject?.scripts.get(filePath)
  }

  /**
   * Check if the project has unsaved changes
   */
  isModified(): boolean {
    return this.currentProject?.modified ?? false
  }

  /**
   * Mark the project as modified
   */
  setModified(modified: boolean): void {
    if (this.currentProject) {
      this.currentProject.modified = modified
    }
  }

  /**
   * Close the current project
   */
  closeProject(): void {
    this.currentProject = null
  }

  /**
   * Create a new script file in the project
   */
  async createScript(fileName: string, initialContent?: string): Promise<SaveResult> {
    if (!this.currentProject) {
      return {
        success: false,
        error: 'No project is currently open',
      }
    }

    // Ensure .rpy extension
    if (!fileName.endsWith('.rpy')) {
      fileName += '.rpy'
    }

    const filePath = joinPath(this.currentProject.path, 'game', fileName)

    // Check if file already exists
    if (await this.fs.exists(filePath)) {
      return {
        success: false,
        error: `File already exists: ${filePath}`,
      }
    }

    try {
      const content = initialContent ?? `# ${fileName}\n\n`
      await this.fs.writeFile(filePath, content)

      // Parse and add to project
      const parseResult = parse(content, filePath)
      this.currentProject.scripts.set(filePath, parseResult.ast)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Failed to create script: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Validate project structure
   * Returns true if the project has the standard Ren'Py directory structure
   */
  async validateProjectStructure(projectPath: string): Promise<{ valid: boolean; missing: string[] }> {
    const missing: string[] = []

    for (const [key, dir] of Object.entries(RENPY_PROJECT_STRUCTURE)) {
      const fullPath = joinPath(projectPath, dir)
      if (!await this.fs.exists(fullPath)) {
        missing.push(key)
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    }
  }

  /**
   * Check if a script file exists on disk
   * Implements Requirement 1.7: Handle external file deletion
   */
  async checkFileExists(filePath: string): Promise<boolean> {
    try {
      return await this.fs.exists(filePath)
    } catch {
      return false
    }
  }

  /**
   * Check which script files have been deleted externally
   * Returns array of deleted file paths
   * Implements Requirement 1.7: Handle external file deletion
   */
  async checkDeletedFiles(): Promise<string[]> {
    if (!this.currentProject) {
      return []
    }

    const deletedFiles: string[] = []
    const scriptPaths = Array.from(this.currentProject.scripts.keys())

    for (const filePath of scriptPaths) {
      const exists = await this.checkFileExists(filePath)
      if (!exists) {
        deletedFiles.push(filePath)
      }
    }

    return deletedFiles
  }

  /**
   * Remove a script from the project (used when file is deleted externally)
   * Implements Requirement 1.7: Handle external file deletion
   */
  removeScript(filePath: string): void {
    if (!this.currentProject) {
      return
    }

    this.currentProject.scripts.delete(filePath)
    this.modifiedScripts.delete(filePath)
    this.originalContents.delete(filePath)
  }

  /**
   * Reload a script from disk
   * Implements Requirement 3.8: Reload current file from disk
   */
  async reloadScript(filePath: string): Promise<RenpyScript | null> {
    if (!this.currentProject) {
      return null
    }

    try {
      const exists = await this.fs.exists(filePath)
      if (!exists) {
        return null
      }

      const content = await this.fs.readFile(filePath)
      this.originalContents.set(filePath, content)
      
      const parseResult = parse(content, filePath)
      this.currentProject.scripts.set(filePath, parseResult.ast)
      
      // Clear modified flag since we just loaded from disk
      this.modifiedScripts.delete(filePath)
      
      return parseResult.ast
    } catch (error) {
      console.error(`Failed to reload script ${filePath}:`, error)
      return null
    }
  }

  /**
   * Rescan project for new script files
   * Returns newly discovered files
   * Implements Requirement 1.7: Handle external file changes
   */
  async rescanScriptFiles(): Promise<{ added: string[]; removed: string[] }> {
    if (!this.currentProject) {
      return { added: [], removed: [] }
    }

    const currentFiles = new Set(this.currentProject.scripts.keys())
    const scanResult = await this.scanRpyFiles(this.currentProject.path)
    const diskFiles = new Set(scanResult.files)

    const added: string[] = []
    const removed: string[] = []

    // Find new files
    for (const filePath of diskFiles) {
      if (!currentFiles.has(filePath)) {
        added.push(filePath)
        // Parse and add new file
        try {
          const content = await this.fs.readFile(filePath)
          this.originalContents.set(filePath, content)
          const parseResult = parse(content, filePath)
          this.currentProject.scripts.set(filePath, parseResult.ast)
        } catch (error) {
          console.warn(`Failed to parse new file ${filePath}:`, error)
        }
      }
    }

    // Find removed files
    for (const filePath of currentFiles) {
      if (!diskFiles.has(filePath)) {
        removed.push(filePath)
        this.removeScript(filePath)
      }
    }

    return { added, removed }
  }
}

// Export a singleton instance for convenience
export const projectManager = new ProjectManager()
