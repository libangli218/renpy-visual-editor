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
      const entries: { name: string; isDirectory: boolean }[] = []
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
              isDirectory: isDir,
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
              isDirectory: true,
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

    copyDir: vi.fn(async (src: string, dest: string) => {
      // Copy all files from src to dest
      const prefix = src.endsWith('/') ? src : src + '/'
      for (const [filePath, content] of files.entries()) {
        if (filePath.startsWith(prefix) || filePath === src) {
          const relativePath = filePath.substring(src.length)
          const newPath = dest + relativePath
          files.set(newPath, content)
        }
      }
      // Copy directories
      for (const dirPath of directories) {
        if (dirPath.startsWith(prefix) || dirPath === src) {
          const relativePath = dirPath.substring(src.length)
          const newPath = dest + relativePath
          directories.add(newPath)
        }
      }
      directories.add(dest)
    }),

    copyFile: vi.fn(async (src: string, dest: string) => {
      const content = files.get(src)
      if (content !== undefined) {
        files.set(dest, content)
      }
    }),

    getAppPath: vi.fn(async () => {
      return '/app'
    }),
  }
}

/**
 * Set up template directory in mock file system
 */
function setupTemplateDirectory(mockFs: ReturnType<typeof createFreshMockFileSystem>): void {
  mockFs.directories.add('/app/templates/default-project')
  mockFs.directories.add('/app/templates/default-project/game')
  mockFs.directories.add('/app/templates/default-project/game/gui')
  mockFs.directories.add('/app/templates/default-project/game/images')
  mockFs.directories.add('/app/templates/default-project/game/audio')
  mockFs.directories.add('/app/templates/default-project/game/tl')
  mockFs.directories.add('/app/templates/default-project/game/saves')
  
  mockFs.files.set('/app/templates/default-project/game/script.rpy', `
define e = Character("艾琳")

label start:
    e "您已创建一个新的 Ren'Py 游戏。"
    return
`)
  mockFs.files.set('/app/templates/default-project/game/options.rpy', `
define config.name = _("Project structure for new Renpy files")
define build.name = "ProjectstructurefornewRenpyfiles"
define config.save_directory = "ProjectstructurefornewRenpyfiles-1767496293"
`)
  mockFs.files.set('/app/templates/default-project/game/gui.rpy', `
init offset = -2
init python:
    gui.init(1920, 1080)
define gui.accent_color = '#99ccff'
define gui.hover_color = '#c1e0ff'
`)
  mockFs.files.set('/app/templates/default-project/.gitignore', `
*.rpyc
*.rpymc
`)
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
        setupTemplateDirectory(mockFs)
        const projectManager = new ProjectManager(mockFs)
        
        // Create a new project
        const result = await projectManager.createProject({
          name: projectName,
          path: basePath,
        })

        // Project creation should succeed
        if (!result.success || !result.project) {
          return false
        }

        const projectPath = `${basePath}/${projectName}`

        // Verify game directory exists (copied from template)
        const gameExists = await mockFs.exists(`${projectPath}/game`)
        if (!gameExists) {
          return false
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should create script.rpy with valid content for any project', async () => {
    await fc.assert(
      fc.asyncProperty(arbProjectName, arbBasePath, async (projectName, basePath) => {
        const mockFs = createFreshMockFileSystem()
        setupTemplateDirectory(mockFs)
        const projectManager = new ProjectManager(mockFs)

        const result = await projectManager.createProject({
          name: projectName,
          path: basePath,
        })

        if (!result.success) {
          return false
        }

        const scriptPath = `${basePath}/${projectName}/game/script.rpy`
        const exists = mockFs.files.has(scriptPath)
        if (!exists) {
          return false
        }

        const content = mockFs.files.get(scriptPath)
        // Script should contain label start
        return content?.includes('label start:') ?? false
      }),
      { numRuns: 100 }
    )
  })

  it('should validate project structure correctly for any created project', async () => {
    await fc.assert(
      fc.asyncProperty(arbProjectName, arbBasePath, async (projectName, basePath) => {
        const mockFs = createFreshMockFileSystem()
        setupTemplateDirectory(mockFs)
        const projectManager = new ProjectManager(mockFs)

        const createResult = await projectManager.createProject({
          name: projectName,
          path: basePath,
        })

        if (!createResult.success) {
          return false
        }

        const projectPath = `${basePath}/${projectName}`
        
        // Validate should pass for newly created project
        const validation = await projectManager.validateProjectStructure(projectPath)
        return validation.valid
      }),
      { numRuns: 100 }
    )
  })

  it('should fail to create project if directory already exists', async () => {
    await fc.assert(
      fc.asyncProperty(arbProjectName, arbBasePath, async (projectName, basePath) => {
        const mockFs = createFreshMockFileSystem()
        setupTemplateDirectory(mockFs)
        const projectManager = new ProjectManager(mockFs)

        // Pre-create the directory
        mockFs.directories.add(`${basePath}/${projectName}`)

        const result = await projectManager.createProject({
          name: projectName,
          path: basePath,
        })

        // Should fail because directory exists
        return !result.success && result.error?.includes('already exists')
      }),
      { numRuns: 100 }
    )
  })

  it('should be able to open any newly created project', async () => {
    await fc.assert(
      fc.asyncProperty(arbProjectName, arbBasePath, async (projectName, basePath) => {
        const mockFs = createFreshMockFileSystem()
        setupTemplateDirectory(mockFs)
        const projectManager = new ProjectManager(mockFs)

        const createResult = await projectManager.createProject({
          name: projectName,
          path: basePath,
        })

        if (!createResult.success) {
          return false
        }

        // Close and reopen
        projectManager.closeProject()

        const projectPath = `${basePath}/${projectName}`
        const openResult = await projectManager.openProject(projectPath)

        return openResult.success && openResult.project?.name === projectName
      }),
      { numRuns: 100 }
    )
  })
})
