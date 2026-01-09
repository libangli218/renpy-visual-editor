/**
 * Resource Manager
 * 
 * Handles scanning, searching, and managing project resources (images, audio).
 * Implements Requirements 9.1, 9.4
 * 
 * Extended for Image Management System:
 * - 2.6: Scan script files for `image` statements
 * - 2.7: Incremental update on script changes
 * - 5.2, 5.3, 5.4: Resource management (rename, delete, show in folder)
 */

import {
  Resource,
  ResourceIndex,
  IMAGE_EXTENSIONS,
  AUDIO_EXTENSIONS,
} from '../project/types'
import { FileSystem, electronFileSystem } from '../project/ProjectManager'
import { RenpyScript, RawNode } from '../types/ast'

/**
 * Resource type for categorization
 */
export type ResourceType = 'image' | 'background' | 'audio' | 'character'

/**
 * Image tag with attributes (Ren'Py naming convention)
 * e.g., "sylvie blue normal.png" → tag: "sylvie", attributes: ["blue", "normal"]
 */
export interface ImageTag {
  /** The image tag (first word of filename) */
  tag: string
  /** Available attributes for this tag */
  attributes: string[][]
  /** Whether this is a background image (tag starts with "bg") */
  isBackground: boolean
}

/**
 * Script-defined image (from `image` statements in scripts)
 * Implements Requirement 2.6
 */
export interface ScriptDefinedImage {
  /** Image tag (e.g., "eileen happy") */
  tag: string
  /** Actual file path or expression */
  path: string
  /** Source script file path */
  sourceFile: string
  /** Line number in source file */
  lineNumber: number
}

/**
 * Resource scan options
 */
export interface ScanOptions {
  includeSubdirectories?: boolean
  detectVariants?: boolean
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
 * Get file name from path (without extension)
 */
function getBaseName(path: string): string {
  const parts = path.split(/[/\\]/)
  const fileName = parts[parts.length - 1] || ''
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 ? fileName.substring(0, dotIndex) : fileName
}

/**
 * Get file extension (lowercase, with dot)
 */
function getExtension(path: string): string {
  const parts = path.split(/[/\\]/)
  const fileName = parts[parts.length - 1] || ''
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 ? fileName.substring(dotIndex).toLowerCase() : ''
}

/**
 * Detect resource type based on file path and name
 */
function detectResourceType(path: string, name: string): ResourceType {
  const lowerPath = path.toLowerCase()
  const lowerName = name.toLowerCase()
  
  // Check if it's in a specific directory
  if (lowerPath.includes('/audio/') || lowerPath.includes('\\audio\\')) {
    return 'audio'
  }
  
  // Check for background indicators
  if (
    lowerPath.includes('/bg/') || 
    lowerPath.includes('\\bg\\') ||
    lowerPath.includes('/backgrounds/') ||
    lowerPath.includes('\\backgrounds\\') ||
    lowerName.startsWith('bg_') ||
    lowerName.startsWith('bg ')
  ) {
    return 'background'
  }
  
  // Check for character indicators
  if (
    lowerPath.includes('/characters/') ||
    lowerPath.includes('\\characters\\')
  ) {
    return 'character'
  }
  
  // Default to image for image files
  const ext = getExtension(path)
  if (IMAGE_EXTENSIONS.includes(ext as typeof IMAGE_EXTENSIONS[number])) {
    return 'image'
  }
  
  return 'audio'
}

/**
 * Detect variants from file name
 * e.g., "bg_room_night.png" -> variant "night"
 * e.g., "sylvie_happy.png" -> variant "happy"
 */
function detectVariants(baseName: string, allBaseNames: string[]): string[] {
  const variants: string[] = []
  
  // Find files that share a common prefix with this file
  const parts = baseName.split(/[_\s-]/)
  if (parts.length < 2) return variants
  
  // Get the base prefix (first part)
  const prefix = parts[0]
  
  // Find all files with the same prefix
  for (const otherName of allBaseNames) {
    if (otherName === baseName) continue
    
    const otherParts = otherName.split(/[_\s-]/)
    if (otherParts[0] === prefix && otherParts.length > 1) {
      // Extract the variant part (everything after the prefix)
      const variant = otherParts.slice(1).join('_')
      if (variant && !variants.includes(variant)) {
        variants.push(variant)
      }
    }
  }
  
  return variants
}

/**
 * Parse Ren'Py image name to extract tag and attributes
 * Ren'Py uses space-separated naming: "sylvie blue normal.png" → tag: "sylvie", attrs: ["blue", "normal"]
 */
function parseRenpyImageName(baseName: string): { tag: string; attributes: string[] } {
  // Split by spaces (Ren'Py convention)
  const parts = baseName.split(' ')
  const tag = parts[0]
  const attributes = parts.slice(1)
  return { tag, attributes }
}

/**
 * Resource Manager class
 */
export class ResourceManager {
  private fs: FileSystem
  private resourceIndex: ResourceIndex | null = null
  private projectPath: string | null = null
  private imageTags: Map<string, ImageTag> = new Map()
  /** Script-defined images indexed by tag */
  private scriptDefinedImages: Map<string, ScriptDefinedImage> = new Map()
  /** Map of file path to image file path for quick lookup */
  private imagePathMap: Map<string, string> = new Map()

  constructor(fileSystem: FileSystem = electronFileSystem) {
    this.fs = fileSystem
  }

  /**
   * Get the current resource index
   */
  getResourceIndex(): ResourceIndex | null {
    return this.resourceIndex
  }

  /**
   * Get all image tags (for Show block)
   * Returns character image tags (non-background)
   */
  getImageTags(): ImageTag[] {
    return Array.from(this.imageTags.values()).filter(t => !t.isBackground)
  }

  /**
   * Get background image tags (for Scene block)
   */
  getBackgroundTags(): ImageTag[] {
    return Array.from(this.imageTags.values()).filter(t => t.isBackground)
  }

  /**
   * Get attributes for a specific image tag
   */
  getTagAttributes(tag: string): string[][] {
    return this.imageTags.get(tag)?.attributes || []
  }

  /**
   * Scan project resources from game/images/ and game/audio/ directories
   * Implements Requirement 9.1
   */
  async scanResources(projectPath: string, options: ScanOptions = {}): Promise<ResourceIndex> {
    const { includeSubdirectories = true, detectVariants: shouldDetectVariants = true } = options
    
    this.projectPath = projectPath
    this.imageTags.clear()
    
    const images: Resource[] = []
    const backgrounds: Resource[] = []
    const audio: Resource[] = []
    const characters: Resource[] = []
    
    // Scan images directory
    const imagesDir = joinPath(projectPath, 'game', 'images')
    if (await this.fs.exists(imagesDir)) {
      const imageFiles = await this.scanDirectory(imagesDir, IMAGE_EXTENSIONS, includeSubdirectories)
      
      // Collect all base names for variant detection
      const allBaseNames = imageFiles.map(f => getBaseName(f))
      
      // Build image tags index (Ren'Py naming convention)
      for (const filePath of imageFiles) {
        const baseName = getBaseName(filePath)
        const { tag, attributes } = parseRenpyImageName(baseName)
        
        // Add to image tags map
        if (!this.imageTags.has(tag)) {
          this.imageTags.set(tag, {
            tag,
            attributes: [],
            isBackground: tag.toLowerCase() === 'bg',
          })
        }
        
        // Add attributes if any
        if (attributes.length > 0) {
          const imageTag = this.imageTags.get(tag)!
          // Check if this attribute combination already exists
          const attrKey = attributes.join(' ')
          const exists = imageTag.attributes.some(a => a.join(' ') === attrKey)
          if (!exists) {
            imageTag.attributes.push(attributes)
          }
        }
      }
      
      for (const filePath of imageFiles) {
        const baseName = getBaseName(filePath)
        const resourceType = detectResourceType(filePath, baseName)
        
        const resource: Resource = {
          id: generateId(),
          name: baseName,
          type: resourceType,
          path: filePath,
        }
        
        // Detect variants if enabled
        if (shouldDetectVariants) {
          const variants = detectVariants(baseName, allBaseNames)
          if (variants.length > 0) {
            resource.variants = variants
          }
        }
        
        // Categorize by type
        switch (resourceType) {
          case 'background':
            backgrounds.push(resource)
            break
          case 'character':
            characters.push(resource)
            break
          default:
            images.push(resource)
        }
      }
    }
    
    // Scan audio directory
    const audioDir = joinPath(projectPath, 'game', 'audio')
    if (await this.fs.exists(audioDir)) {
      const audioFiles = await this.scanDirectory(audioDir, AUDIO_EXTENSIONS, includeSubdirectories)
      
      for (const filePath of audioFiles) {
        const baseName = getBaseName(filePath)
        
        audio.push({
          id: generateId(),
          name: baseName,
          type: 'audio',
          path: filePath,
        })
      }
    }
    
    this.resourceIndex = { images, backgrounds, audio, characters }
    
    // Build image path map for quick lookup
    this.buildImagePathMap()
    
    return this.resourceIndex
  }

  /**
   * Scan a directory for files with specific extensions
   */
  private async scanDirectory(
    dirPath: string,
    extensions: readonly string[],
    includeSubdirectories: boolean
  ): Promise<string[]> {
    const files: string[] = []
    
    try {
      const entries = await this.fs.readDir(dirPath)
      
      for (const entry of entries) {
        const fullPath = joinPath(dirPath, entry.name)
        
        if (entry.isDirectory) {
          if (includeSubdirectories && !entry.name.startsWith('.')) {
            const subFiles = await this.scanDirectory(fullPath, extensions, true)
            files.push(...subFiles)
          }
        } else {
          const ext = getExtension(entry.name)
          if (extensions.includes(ext as typeof extensions[number])) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dirPath}:`, error)
    }
    
    return files
  }

  /**
   * Get resources by type
   * Implements Requirement 9.1
   */
  getResources(type?: ResourceType): Resource[] {
    if (!this.resourceIndex) {
      return []
    }
    
    if (!type) {
      // Return all resources
      return [
        ...this.resourceIndex.images,
        ...this.resourceIndex.backgrounds,
        ...this.resourceIndex.audio,
        ...this.resourceIndex.characters,
      ]
    }
    
    switch (type) {
      case 'image':
        return this.resourceIndex.images
      case 'background':
        return this.resourceIndex.backgrounds
      case 'audio':
        return this.resourceIndex.audio
      case 'character':
        return this.resourceIndex.characters
      default:
        return []
    }
  }

  /**
   * Search resources by name
   * Implements Requirement 9.4
   */
  searchResources(query: string, type?: ResourceType): Resource[] {
    const resources = this.getResources(type)
    
    if (!query || query.trim() === '') {
      return resources
    }
    
    const lowerQuery = query.toLowerCase().trim()
    
    return resources.filter(resource => 
      resource.name.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Filter resources by type
   * Implements Requirement 9.4
   */
  filterByType(type: ResourceType): Resource[] {
    return this.getResources(type)
  }

  /**
   * Get a resource by ID
   */
  getResourceById(id: string): Resource | undefined {
    const allResources = this.getResources()
    return allResources.find(r => r.id === id)
  }

  /**
   * Get a resource by path
   */
  getResourceByPath(path: string): Resource | undefined {
    const allResources = this.getResources()
    return allResources.find(r => r.path === path)
  }

  /**
   * Import a resource to the project
   * Implements Requirement 9.6
   */
  async importResource(sourcePath: string, type: ResourceType): Promise<Resource> {
    if (!this.projectPath) {
      throw new Error('No project is currently open')
    }
    
    const baseName = getBaseName(sourcePath)
    const ext = getExtension(sourcePath)
    
    // Determine target directory based on type
    let targetDir: string
    switch (type) {
      case 'audio':
        targetDir = joinPath(this.projectPath, 'game', 'audio')
        break
      case 'background':
        targetDir = joinPath(this.projectPath, 'game', 'images', 'bg')
        break
      case 'character':
        targetDir = joinPath(this.projectPath, 'game', 'images', 'characters')
        break
      default:
        targetDir = joinPath(this.projectPath, 'game', 'images')
    }
    
    // Ensure target directory exists
    if (!await this.fs.exists(targetDir)) {
      await this.fs.mkdir(targetDir)
    }
    
    const targetPath = joinPath(targetDir, baseName + ext)
    
    // Read source file and write to target
    const content = await this.fs.readFile(sourcePath)
    await this.fs.writeFile(targetPath, content)
    
    // Create resource entry
    const resource: Resource = {
      id: generateId(),
      name: baseName,
      type,
      path: targetPath,
    }
    
    // Add to index
    if (this.resourceIndex) {
      switch (type) {
        case 'audio':
          this.resourceIndex.audio.push(resource)
          break
        case 'background':
          this.resourceIndex.backgrounds.push(resource)
          break
        case 'character':
          this.resourceIndex.characters.push(resource)
          break
        default:
          this.resourceIndex.images.push(resource)
      }
    }
    
    return resource
  }

  /**
   * Get image file path from image tag
   * Implements Requirement 2.6
   * 
   * @param imageTag - The image tag (e.g., "bg room" or "eileen happy")
   * @returns The file path or null if not found
   */
  getImagePath(imageTag: string): string | null {
    // First check the image path map (built during scan)
    if (this.imagePathMap.has(imageTag)) {
      return this.imagePathMap.get(imageTag) || null
    }
    
    // Check script-defined images
    const scriptImage = this.scriptDefinedImages.get(imageTag)
    if (scriptImage) {
      return scriptImage.path
    }
    
    // Try to find by matching resource name
    const allResources = this.getResources()
    for (const resource of allResources) {
      // Convert resource name to tag format (replace underscores with spaces)
      const resourceTag = resource.name.replace(/_/g, ' ')
      if (resourceTag === imageTag || resource.name === imageTag) {
        return resource.path
      }
    }
    
    return null
  }

  /**
   * Get all script-defined images
   * Implements Requirement 2.6
   */
  getScriptDefinedImages(): ScriptDefinedImage[] {
    return Array.from(this.scriptDefinedImages.values())
  }

  /**
   * Scan script files for `image` statements
   * Implements Requirement 2.6
   * 
   * Parses AST to find image definitions like:
   * - image eileen happy = "eileen_happy.png"
   * - image bg room = "backgrounds/room.png"
   * 
   * @param scripts - Map of file path to parsed AST
   */
  scanScriptDefinedImages(scripts: Map<string, RenpyScript>): ScriptDefinedImage[] {
    this.scriptDefinedImages.clear()
    
    for (const [filePath, ast] of scripts.entries()) {
      this.extractImageDefinitions(filePath, ast)
    }
    
    return Array.from(this.scriptDefinedImages.values())
  }

  /**
   * Handle script change for incremental update
   * Implements Requirement 2.7
   * 
   * @param filePath - Path to the changed script file
   * @param ast - The new AST for the script
   */
  onScriptChange(filePath: string, ast: RenpyScript): void {
    // Remove old definitions from this file
    for (const [tag, image] of this.scriptDefinedImages.entries()) {
      if (image.sourceFile === filePath) {
        this.scriptDefinedImages.delete(tag)
      }
    }
    
    // Extract new definitions
    this.extractImageDefinitions(filePath, ast)
  }

  /**
   * Extract image definitions from an AST
   * 
   * @param filePath - Source file path
   * @param ast - Parsed AST
   */
  private extractImageDefinitions(filePath: string, ast: RenpyScript): void {
    for (const statement of ast.statements) {
      // Image statements are typically parsed as RawNode
      if (statement.type === 'raw') {
        const rawNode = statement as RawNode
        const imageMatch = this.parseImageStatement(rawNode.content)
        
        if (imageMatch) {
          const scriptImage: ScriptDefinedImage = {
            tag: imageMatch.tag,
            path: imageMatch.path,
            sourceFile: filePath,
            lineNumber: statement.line || 0,
          }
          
          this.scriptDefinedImages.set(imageMatch.tag, scriptImage)
          
          // Also add to image tags for consistency
          const parts = imageMatch.tag.split(' ')
          const tag = parts[0]
          const attributes = parts.slice(1)
          
          if (!this.imageTags.has(tag)) {
            this.imageTags.set(tag, {
              tag,
              attributes: [],
              isBackground: tag.toLowerCase() === 'bg',
            })
          }
          
          if (attributes.length > 0) {
            const imageTag = this.imageTags.get(tag)!
            const attrKey = attributes.join(' ')
            const exists = imageTag.attributes.some(a => a.join(' ') === attrKey)
            if (!exists) {
              imageTag.attributes.push(attributes)
            }
          }
        }
      }
    }
  }

  /**
   * Parse an image statement from raw content
   * 
   * Matches patterns like:
   * - image eileen happy = "eileen_happy.png"
   * - image bg room = "backgrounds/room.png"
   * - image eileen = "eileen.png"
   * 
   * @param content - Raw statement content
   * @returns Parsed image tag and path, or null if not an image statement
   */
  private parseImageStatement(content: string): { tag: string; path: string } | null {
    // Match: image <tag> [<attributes>...] = "<path>"
    // or: image <tag> [<attributes>...] = '<path>'
    const match = content.match(/^image\s+([a-zA-Z_][a-zA-Z0-9_\s]*?)\s*=\s*["']([^"']+)["']/)
    
    if (match) {
      const tag = match[1].trim()
      const path = match[2]
      return { tag, path }
    }
    
    return null
  }

  /**
   * Rename a resource file
   * Implements Requirement 5.2
   * 
   * @param oldPath - Current file path
   * @param newName - New file name (without path)
   * @returns True if successful
   */
  async renameResource(oldPath: string, newName: string): Promise<boolean> {
    if (!this.projectPath) {
      throw new Error('No project is currently open')
    }
    
    try {
      // Get directory from old path
      const pathParts = oldPath.split(/[/\\]/)
      pathParts.pop() // Remove old filename
      const directory = pathParts.join('/')
      
      // Get extension from old path
      const ext = getExtension(oldPath)
      
      // Ensure new name has extension
      const newFileName = newName.endsWith(ext) ? newName : newName + ext
      const newPath = joinPath(directory, newFileName)
      
      // Check if target already exists
      if (await this.fs.exists(newPath)) {
        throw new Error(`File already exists: ${newFileName}`)
      }
      
      // Read old file
      const content = await this.fs.readFile(oldPath)
      
      // Write to new path
      await this.fs.writeFile(newPath, content)
      
      // Delete old file using Electron API directly
      if (typeof window !== 'undefined') {
        const electronAPI = (window as unknown as { 
          electronAPI?: { 
            deleteFile?: (path: string) => Promise<void> 
          } 
        }).electronAPI
        
        if (electronAPI?.deleteFile) {
          await electronAPI.deleteFile(oldPath)
        } else {
          console.warn('deleteFile not available, old file may remain')
        }
      }
      
      // Update resource index
      if (this.resourceIndex) {
        const allArrays = [
          this.resourceIndex.images,
          this.resourceIndex.backgrounds,
          this.resourceIndex.audio,
          this.resourceIndex.characters,
        ]
        
        for (const arr of allArrays) {
          const resource = arr.find(r => r.path === oldPath)
          if (resource) {
            resource.path = newPath
            resource.name = getBaseName(newPath)
            break
          }
        }
      }
      
      // Update image path map
      for (const [tag, path] of this.imagePathMap.entries()) {
        if (path === oldPath) {
          this.imagePathMap.set(tag, newPath)
        }
      }
      
      return true
    } catch (error) {
      console.error('Failed to rename resource:', error)
      throw error
    }
  }

  /**
   * Delete a resource file
   * Implements Requirement 5.3
   * 
   * @param path - File path to delete
   * @returns True if successful
   */
  async deleteResource(path: string): Promise<boolean> {
    if (!this.projectPath) {
      throw new Error('No project is currently open')
    }
    
    try {
      // Delete the file using Electron API directly
      if (typeof window !== 'undefined') {
        const electronAPI = (window as unknown as { 
          electronAPI?: { 
            deleteFile?: (path: string) => Promise<void> 
          } 
        }).electronAPI
        
        if (electronAPI?.deleteFile) {
          await electronAPI.deleteFile(path)
        } else {
          throw new Error('deleteFile not available in this environment')
        }
      } else {
        throw new Error('deleteFile not available in this environment')
      }
      
      // Remove from resource index
      if (this.resourceIndex) {
        const allArrays = [
          this.resourceIndex.images,
          this.resourceIndex.backgrounds,
          this.resourceIndex.audio,
          this.resourceIndex.characters,
        ]
        
        for (const arr of allArrays) {
          const index = arr.findIndex(r => r.path === path)
          if (index >= 0) {
            arr.splice(index, 1)
            break
          }
        }
      }
      
      // Remove from image path map
      for (const [tag, imagePath] of this.imagePathMap.entries()) {
        if (imagePath === path) {
          this.imagePathMap.delete(tag)
        }
      }
      
      return true
    } catch (error) {
      console.error('Failed to delete resource:', error)
      throw error
    }
  }

  /**
   * Show a resource in the system file explorer
   * Implements Requirement 5.4
   * 
   * @param path - File path to show
   */
  showInFolder(path: string): void {
    // Use Electron's shell API if available
    if (typeof window !== 'undefined') {
      const electronAPI = (window as unknown as { 
        electronAPI?: { 
          showItemInFolder?: (path: string) => void 
        } 
      }).electronAPI
      
      if (electronAPI?.showItemInFolder) {
        electronAPI.showItemInFolder(path)
        return
      }
    }
    
    console.warn('showInFolder is not available in this environment')
  }

  /**
   * Build the image path map during resource scanning
   * Maps image tags to file paths for quick lookup
   */
  private buildImagePathMap(): void {
    this.imagePathMap.clear()
    
    if (!this.resourceIndex) return
    
    const allResources = [
      ...this.resourceIndex.images,
      ...this.resourceIndex.backgrounds,
      ...this.resourceIndex.characters,
    ]
    
    for (const resource of allResources) {
      // Map both underscore and space versions
      const tag = resource.name.replace(/_/g, ' ')
      this.imagePathMap.set(tag, resource.path)
      this.imagePathMap.set(resource.name, resource.path)
    }
  }

  /**
   * Clear the resource index
   */
  clear(): void {
    this.resourceIndex = null
    this.projectPath = null
    this.imageTags.clear()
    this.scriptDefinedImages.clear()
    this.imagePathMap.clear()
  }
}

// Export a singleton instance for convenience
export const resourceManager = new ResourceManager()
