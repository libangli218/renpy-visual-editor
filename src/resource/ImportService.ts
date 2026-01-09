/**
 * Import Service
 * 
 * Handles importing image resources into the project.
 * Implements Requirements:
 * - 3.3, 3.4, 3.10: Import dialog with file picker
 * - 3.5, 3.6, 3.7: File copy and conflict handling
 * - 3.8, 3.9: File name validation
 */

import { IMAGE_EXTENSIONS } from '../project/types'

// ============================================================================
// Types
// ============================================================================

/**
 * File validation result
 */
export interface FileValidationResult {
  /** Whether the file name is valid */
  valid: boolean
  /** Warning messages (non-blocking) */
  warnings: string[]
  /** Error messages (blocking) */
  errors: string[]
  /** Suggested file name (if different from original) */
  suggestedName?: string
}

/**
 * Import conflict type
 */
export type ConflictResolution = 'overwrite' | 'rename' | 'skip'

/**
 * Import result for a single file
 */
export interface ImportFileResult {
  /** Original source path */
  sourcePath: string
  /** Target path (where file was copied) */
  targetPath: string | null
  /** Whether import was successful */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Whether file was skipped due to conflict */
  skipped?: boolean
  /** Whether file was renamed */
  renamed?: boolean
  /** New name if renamed */
  newName?: string
}

/**
 * Import batch result
 */
export interface ImportBatchResult {
  /** Total files processed */
  total: number
  /** Successfully imported files */
  successful: number
  /** Failed imports */
  failed: number
  /** Skipped files */
  skipped: number
  /** Individual file results */
  results: ImportFileResult[]
}

/**
 * Import options
 */
export interface ImportOptions {
  /** Target directory (relative to project) */
  targetDir: string
  /** How to handle conflicts */
  conflictResolution?: ConflictResolution
  /** Callback for conflict resolution (if not specified in options) */
  onConflict?: (fileName: string, targetPath: string) => Promise<ConflictResolution>
  /** Callback for validation warnings */
  onValidationWarning?: (fileName: string, warnings: string[]) => Promise<boolean>
}

// ============================================================================
// File Name Validation
// ============================================================================

/**
 * Validate a file name for Ren'Py compatibility
 * Implements Requirements 3.8, 3.9
 * 
 * Ren'Py naming conventions:
 * - Letters (a-z, A-Z)
 * - Numbers (0-9)
 * - Underscores (_)
 * - Spaces (allowed but may cause issues)
 * 
 * @param fileName - The file name to validate (with extension)
 * @returns Validation result with warnings and errors
 */
export function validateFileName(fileName: string): FileValidationResult {
  const warnings: string[] = []
  const errors: string[] = []
  let suggestedName: string | undefined
  
  // Extract base name and extension
  const lastDot = fileName.lastIndexOf('.')
  const baseName = lastDot >= 0 ? fileName.substring(0, lastDot) : fileName
  const extension = lastDot >= 0 ? fileName.substring(lastDot) : ''
  
  // Check for empty name
  if (!baseName || baseName.trim() === '') {
    errors.push('文件名不能为空')
    return { valid: false, warnings, errors }
  }
  
  // Check for spaces (warning, not error)
  // Requirement 3.8: Warn if file name contains spaces
  if (baseName.includes(' ')) {
    warnings.push('文件名包含空格，建议使用下划线替代')
    suggestedName = baseName.replace(/\s+/g, '_') + extension
  }
  
  // Check for invalid characters
  // Requirement 3.9: Validate Ren'Py naming conventions
  const invalidChars = baseName.match(/[^a-zA-Z0-9_\s\u4e00-\u9fa5]/g)
  if (invalidChars) {
    const uniqueChars = [...new Set(invalidChars)]
    errors.push(`文件名包含无效字符: ${uniqueChars.join(', ')}`)
    // Suggest a cleaned name
    const cleanedName = baseName.replace(/[^a-zA-Z0-9_\s\u4e00-\u9fa5]/g, '_')
    suggestedName = cleanedName + extension
  }
  
  // Check for leading/trailing spaces or underscores
  if (baseName !== baseName.trim()) {
    warnings.push('文件名包含前导或尾随空格')
    if (!suggestedName) {
      suggestedName = baseName.trim() + extension
    }
  }
  
  // Check for consecutive underscores or spaces
  if (/[_\s]{2,}/.test(baseName)) {
    warnings.push('文件名包含连续的空格或下划线')
  }
  
  // Check for valid extension
  const lowerExt = extension.toLowerCase()
  if (!IMAGE_EXTENSIONS.includes(lowerExt as typeof IMAGE_EXTENSIONS[number])) {
    errors.push(`不支持的图像格式: ${extension || '(无扩展名)'}`)
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors,
    suggestedName: suggestedName !== fileName ? suggestedName : undefined,
  }
}

/**
 * Check if a file name contains spaces
 * Implements Requirement 3.8
 */
export function hasSpaces(fileName: string): boolean {
  const lastDot = fileName.lastIndexOf('.')
  const baseName = lastDot >= 0 ? fileName.substring(0, lastDot) : fileName
  return baseName.includes(' ')
}

/**
 * Convert spaces to underscores in a file name
 */
export function convertSpacesToUnderscores(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  const baseName = lastDot >= 0 ? fileName.substring(0, lastDot) : fileName
  const extension = lastDot >= 0 ? fileName.substring(lastDot) : ''
  return baseName.replace(/\s+/g, '_') + extension
}

/**
 * Check if a file name is valid for Ren'Py
 * Implements Requirement 3.9
 */
export function isValidRenpyFileName(fileName: string): boolean {
  const result = validateFileName(fileName)
  return result.valid
}

// ============================================================================
// Import Service Class
// ============================================================================

/**
 * Import Service for handling resource imports
 */
export class ImportService {
  private projectPath: string | null = null
  
  /**
   * Set the current project path
   */
  setProjectPath(path: string): void {
    this.projectPath = path
  }
  
  /**
   * Get the current project path
   */
  getProjectPath(): string | null {
    return this.projectPath
  }
  
  /**
   * Open file picker dialog for selecting images
   * Implements Requirements 3.3, 3.4, 3.10
   * 
   * @param title - Dialog title
   * @returns Array of selected file paths, or null if cancelled
   */
  async selectImages(title?: string): Promise<string[] | null> {
    if (typeof window === 'undefined' || !window.electronAPI?.selectImages) {
      console.warn('selectImages not available in this environment')
      return null
    }
    
    return window.electronAPI.selectImages(title)
  }
  
  /**
   * Check if a file exists at the target path
   */
  async fileExists(path: string): Promise<boolean> {
    if (typeof window === 'undefined' || !window.electronAPI?.exists) {
      return false
    }
    
    return window.electronAPI.exists(path)
  }
  
  /**
   * Copy a file to the target location
   */
  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    if (typeof window === 'undefined' || !window.electronAPI?.copyFile) {
      throw new Error('copyFile not available in this environment')
    }
    
    await window.electronAPI.copyFile(sourcePath, targetPath)
  }
  
  /**
   * Ensure a directory exists
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    if (typeof window === 'undefined' || !window.electronAPI?.mkdir) {
      throw new Error('mkdir not available in this environment')
    }
    
    await window.electronAPI.mkdir(dirPath)
  }
  
  /**
   * Get file name from path
   */
  getFileName(path: string): string {
    const parts = path.split(/[/\\]/)
    return parts[parts.length - 1] || ''
  }
  
  /**
   * Join path segments
   */
  joinPath(...segments: string[]): string {
    return segments.join('/').replace(/\/+/g, '/')
  }
  
  /**
   * Generate a unique file name by appending a number
   */
  async generateUniqueName(targetDir: string, fileName: string): Promise<string> {
    const lastDot = fileName.lastIndexOf('.')
    const baseName = lastDot >= 0 ? fileName.substring(0, lastDot) : fileName
    const extension = lastDot >= 0 ? fileName.substring(lastDot) : ''
    
    let counter = 1
    let newName = fileName
    let targetPath = this.joinPath(targetDir, newName)
    
    while (await this.fileExists(targetPath)) {
      newName = `${baseName}_${counter}${extension}`
      targetPath = this.joinPath(targetDir, newName)
      counter++
      
      // Safety limit
      if (counter > 1000) {
        throw new Error('无法生成唯一文件名')
      }
    }
    
    return newName
  }
  
  /**
   * Import a single file
   * Implements Requirements 3.5, 3.6, 3.7
   * 
   * @param sourcePath - Source file path
   * @param options - Import options
   * @returns Import result
   */
  async importFile(sourcePath: string, options: ImportOptions): Promise<ImportFileResult> {
    const fileName = this.getFileName(sourcePath)
    
    // Validate file name
    const validation = validateFileName(fileName)
    
    // Handle validation errors
    if (!validation.valid) {
      return {
        sourcePath,
        targetPath: null,
        success: false,
        error: validation.errors.join('; '),
      }
    }
    
    // Handle validation warnings
    if (validation.warnings.length > 0 && options.onValidationWarning) {
      const proceed = await options.onValidationWarning(fileName, validation.warnings)
      if (!proceed) {
        return {
          sourcePath,
          targetPath: null,
          success: false,
          skipped: true,
          error: '用户取消导入',
        }
      }
    }
    
    // Determine target path
    const targetDir = this.joinPath(this.projectPath || '', options.targetDir)
    let targetFileName = fileName
    let targetPath = this.joinPath(targetDir, targetFileName)
    let renamed = false
    
    // Ensure target directory exists
    try {
      await this.ensureDirectory(targetDir)
    } catch (error) {
      return {
        sourcePath,
        targetPath: null,
        success: false,
        error: `无法创建目标目录: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
    
    // Check for conflicts
    // Implements Requirement 3.7
    if (await this.fileExists(targetPath)) {
      let resolution = options.conflictResolution
      
      // Ask user if no default resolution
      if (!resolution && options.onConflict) {
        resolution = await options.onConflict(fileName, targetPath)
      }
      
      // Default to skip if no resolution
      if (!resolution) {
        resolution = 'skip'
      }
      
      switch (resolution) {
        case 'skip':
          return {
            sourcePath,
            targetPath: null,
            success: false,
            skipped: true,
            error: '文件已存在，已跳过',
          }
        
        case 'rename':
          targetFileName = await this.generateUniqueName(targetDir, fileName)
          targetPath = this.joinPath(targetDir, targetFileName)
          renamed = true
          break
        
        case 'overwrite':
          // Continue with copy, will overwrite
          break
      }
    }
    
    // Copy file
    // Implements Requirement 3.5
    try {
      await this.copyFile(sourcePath, targetPath)
      
      return {
        sourcePath,
        targetPath,
        success: true,
        renamed,
        newName: renamed ? targetFileName : undefined,
      }
    } catch (error) {
      return {
        sourcePath,
        targetPath: null,
        success: false,
        error: `复制文件失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
  
  /**
   * Import multiple files
   * Implements Requirement 3.10
   * 
   * @param sourcePaths - Array of source file paths
   * @param options - Import options
   * @returns Batch import result
   */
  async importFiles(sourcePaths: string[], options: ImportOptions): Promise<ImportBatchResult> {
    const results: ImportFileResult[] = []
    let successful = 0
    let failed = 0
    let skipped = 0
    
    for (const sourcePath of sourcePaths) {
      const result = await this.importFile(sourcePath, options)
      results.push(result)
      
      if (result.success) {
        successful++
      } else if (result.skipped) {
        skipped++
      } else {
        failed++
      }
    }
    
    return {
      total: sourcePaths.length,
      successful,
      failed,
      skipped,
      results,
    }
  }
  
  /**
   * Import images for backgrounds
   * Convenience method for importing to game/images/ directory
   */
  async importBackgrounds(
    sourcePaths: string[],
    onConflict?: (fileName: string, targetPath: string) => Promise<ConflictResolution>,
    onValidationWarning?: (fileName: string, warnings: string[]) => Promise<boolean>
  ): Promise<ImportBatchResult> {
    return this.importFiles(sourcePaths, {
      targetDir: 'game/images',
      onConflict,
      onValidationWarning,
    })
  }
  
  /**
   * Import images for sprites
   * Convenience method for importing to game/images/ directory
   */
  async importSprites(
    sourcePaths: string[],
    onConflict?: (fileName: string, targetPath: string) => Promise<ConflictResolution>,
    onValidationWarning?: (fileName: string, warnings: string[]) => Promise<boolean>
  ): Promise<ImportBatchResult> {
    return this.importFiles(sourcePaths, {
      targetDir: 'game/images',
      onConflict,
      onValidationWarning,
    })
  }
}

// Export singleton instance
export const importService = new ImportService()
