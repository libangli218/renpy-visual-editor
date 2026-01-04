/**
 * Property-Based Tests for Project Management
 * 
 * Feature: renpy-visual-editor, Property 18: Project Structure Validity
 * Validates: Requirements 1.1
 * 
 * For any newly created project, it should have the standard Ren'Py directory structure.
 * 
 * ∀ project ∈ NewProject:
 *   exists(project.path + '/game/') = true
 *   exists(project.path + '/game/images/') = true
 *   exists(project.path + '/game/audio/') = true
 *   exists(project.path + '/game/gui/') = true
 */

import { describe, it, vi } from 'vitest'
import * as fc from 'fast-check'
import { ProjectManager, FileSystem } from './ProjectManager'
import { RENPY_PROJECT_STRUCTURE } from './types'

/**
 * Create a fresh mock file system for testing
 * Each call creates a completely new instance with no shared state
 */
function createFreshMockFileSystem(): FileSystem & {
  files: Map<string, string>
  directories: Set<string>
} {
  const files = new Map<string, string>()
  const directories = new Set<string>()

  return {
    files,
    directories,
    
    readFile: vi.fn(async (path: string) => {
      const content = files.get(path)
      if (content === undefined) {
        throw new Error(`File not found: ${path}`)
      }
      return content
    }),
    
    writeFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content)
      // Ensure parent directories exist
      const parts = path.split('/')
      for (let i = 1; i < parts.length; i++) {
        directories.add(parts.slice(0, i).join('/'))
      }
    }),
    
    readDir: vi.fn(async (path: string) => {
      const entries: { name: string; isDirectory: () => boolean }[] = []
      const prefix = path.endsWith('/') ? path : path + '/'
      
      // Find all direct children
      const seen = new Set<string>()
      
      for (const filePath of files.keys()) {
        if (filePath.startsWith(prefix)) {
          const rest = filePath.substring(prefix.length)
          const firstPart = rest.split('/')[0]
          if (firstPart && !seen.has(firstPart)) {
            seen.add(firstPart)
            const isDir = rest.includes('/')
            entries.push({
              name: firstPart,
              isDirectory: () => isDir,
            })
          }
        }
      }
      
      for (const dirPath of directories) {
        if (dirPath.startsWith(prefix)) {
          const rest = dirPath.substring(prefix.length)
          const firstPart = rest.split('/')[0]
          if (firstPart && !seen.has(firstPart)) {
            seen.add(firstPart)
            entries.push({
              name: firstPart,
              isDirectory: () => true,
            })
          }
        }
      }
      
      return entries
    }),
    
    exists: vi.fn(async (path: string) => {
      if (files.has(path)) return true
      if (directories.has(path)) return true
      // Check if any file starts with this path as a directory
      const prefix = path.endsWith('/') ? path : path + '/'
      for (const filePath of files.keys()) {
        if (filePath.startsWith(prefix)) return true
      }
      for (const dirPath of directories) {
        if (dirPath === path || dirPath.startsWith(prefix)) return true
      }
      return false
    }),
    
    mkdir: vi.fn(async (path: string) => {
      directories.add(path)
      // Add parent directories
      const parts = path.split('/')
      for (let i = 1; i < parts.length; i++) {
        directories.add(parts.slice(0, i).join('/'))
      }
    }),
  }
}

// ============================================================================
// Arbitrary Generators
// ============================================================================

// Generate valid project names (alphanumeric with underscores, no spaces)
const arbProjectName = fc.stringMatching(/^[A-Za-z][A-Za-z0-9_]{2,20}$/)

// Generate valid base paths
const arbBasePath = fc.constantFrom(
  '/projects',
  '/home/user/games',
  '/Users/dev/renpy',
  '/var/projects',
  '/tmp/test'
)

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 18: Project Structure Validity', () => {
  /**
   * Feature: renpy-visual-editor, Property 18: Project Structure Validity
   * Validates: Requirements 1.1
   * 
   * For any newly created project, it should have the standard Ren'Py directory structure.
   */
  it('should create all required directories for any valid project name and path', async () => {
    await fc.assert(
      fc.asyncProperty(arbProjectName, arbBasePath, async (projectName, basePath) => {
        // Create fresh mock file system and project manager for each iteration
        const mockFs = createFreshMockFileSystem()
        const projectManager = new ProjectManager(mockFs)
        
        // Create a new project
        const result = await projectManager.createProject({
          name: projectName,
          path: basePath,
          createDefaultScript: true,
        })

        // Project creation should succeed
        if (!result.success || !result.project) {
          return false
        }

        const projectPath = `${basePath}/${projectName}`

        // Verify all required directories exist
        for (const dir of Object.values(RENPY_PROJECT_STRUCTURE)) {
          const fullPath = `${projectPath}/${dir}`
          const exists = await mockFs.exists(fullPath)
          if (!exists) {
            return false
          }
        }

        // Verify game directory specifically (core requirement)
        const gameExists = await mockFs.exists(`${projectPath}/game`)
        const imagesExists = await mockFs.exists(`${projectPath}/game/images`)
        const audioExists = await mockFs.exists(`${projectPath}/game/audio`)
        const guiExists = await mockFs.exists(`${projectPath}/game/gui`)

        return gameExists && imagesExists && audioExists && guiExists
      }),
      { numRuns: 100 }
    )
  })

  it('should create default script.rpy with valid content for any project', async () => {
    await fc.assert(
      fc.asyncProperty(arbProjectName, arbBasePath, async (projectName, basePath) => {
        // Create fresh mock file system and project manager for each iteration
        const mockFs = createFreshMockFileSystem()
        const projectManager = new ProjectManager(mockFs)
        
        // Create a new project with default script
        const result = await projectManager.createProject({
          name: projectName,
          path: basePath,
          createDefaultScript: true,
        })

        if (!result.success) {
          return false
        }

        const scriptPath = `${basePath}/${projectName}/game/script.rpy`
        
        // Verify script file exists
        if (!mockFs.files.has(scriptPath)) {
          return false
        }
        
        // Verify script content is valid
        const content = mockFs.files.get(scriptPath)!
        return content.includes('label start:') && content.includes(projectName)
      }),
      { numRuns: 100 }
    )
  })

  it('should validate project structure correctly for any created project', async () => {
    await fc.assert(
      fc.asyncProperty(arbProjectName, arbBasePath, async (projectName, basePath) => {
        // Create fresh mock file system and project manager for each iteration
        const mockFs = createFreshMockFileSystem()
        const projectManager = new ProjectManager(mockFs)
        
        // Create a new project
        const createResult = await projectManager.createProject({
          name: projectName,
          path: basePath,
        })

        if (!createResult.success) {
          return false
        }

        const projectPath = `${basePath}/${projectName}`
        
        // Validate the structure
        const validation = await projectManager.validateProjectStructure(projectPath)
        
        // Should be valid with no missing directories
        return validation.valid && validation.missing.length === 0
      }),
      { numRuns: 100 }
    )
  })

  it('should fail to create project if directory already exists', async () => {
    await fc.assert(
      fc.asyncProperty(arbProjectName, arbBasePath, async (projectName, basePath) => {
        // Create fresh mock file system and project manager for each iteration
        const mockFs = createFreshMockFileSystem()
        const projectManager = new ProjectManager(mockFs)
        
        const projectPath = `${basePath}/${projectName}`
        
        // Pre-create the directory
        mockFs.directories.add(projectPath)
        
        // Try to create a project at the same location
        const result = await projectManager.createProject({
          name: projectName,
          path: basePath,
        })

        // Should fail
        return !result.success && result.error !== undefined && result.error.includes('already exists')
      }),
      { numRuns: 100 }
    )
  })

  it('should be able to open any newly created project', async () => {
    await fc.assert(
      fc.asyncProperty(arbProjectName, arbBasePath, async (projectName, basePath) => {
        // Create fresh mock file system and project manager for each iteration
        const mockFs = createFreshMockFileSystem()
        const projectManager = new ProjectManager(mockFs)
        
        // Create a new project
        const createResult = await projectManager.createProject({
          name: projectName,
          path: basePath,
          createDefaultScript: true,
        })

        if (!createResult.success) {
          return false
        }

        // Close the project
        projectManager.closeProject()

        const projectPath = `${basePath}/${projectName}`
        
        // Re-open the project
        const openResult = await projectManager.openProject(projectPath)
        
        // Should succeed
        return (
          openResult.success &&
          openResult.project !== undefined &&
          openResult.project.name === projectName &&
          openResult.project.scripts.size > 0
        )
      }),
      { numRuns: 100 }
    )
  })
})
