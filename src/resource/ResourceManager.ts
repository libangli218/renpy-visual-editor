/**
 * Resource Manager
 * 
 * Handles scanning, searching, and managing project resources (images, audio).
 * Implements Requirements 9.1, 9.4
 */

import {
  Resource,
  ResourceIndex,
  IMAGE_EXTENSIONS,
  AUDIO_EXTENSIONS,
} from '../project/types'
import { FileSystem, electronFileSystem } from '../project/ProjectManager'

/**
 * Resource type for categorization
 */
export type ResourceType = 'image' | 'background' | 'audio' | 'character'

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
 * Resource Manager class
 */
export class ResourceManager {
  private fs: FileSystem
  private resourceIndex: ResourceIndex | null = null
  private projectPath: string | null = null

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
   * Scan project resources from game/images/ and game/audio/ directories
   * Implements Requirement 9.1
   */
  async scanResources(projectPath: string, options: ScanOptions = {}): Promise<ResourceIndex> {
    const { includeSubdirectories = true, detectVariants: shouldDetectVariants = true } = options
    
    this.projectPath = projectPath
    
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
   * Clear the resource index
   */
  clear(): void {
    this.resourceIndex = null
    this.projectPath = null
  }
}

// Export a singleton instance for convenience
export const resourceManager = new ResourceManager()
