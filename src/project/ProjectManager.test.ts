/**
 * ProjectManager Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProjectManager, FileSystem } from './ProjectManager'
import { RENPY_PROJECT_STRUCTURE } from './types'

/**
 * Create a mock file system for testing
 */
function createMockFileSystem(): FileSystem & {
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

describe('ProjectManager', () => {
  let mockFs: ReturnType<typeof createMockFileSystem>
  let projectManager: ProjectManager

  beforeEach(() => {
    mockFs = createMockFileSystem()
    projectManager = new ProjectManager(mockFs)
  })

  describe('createProject', () => {
    it('should create a new project with standard directory structure', async () => {
      const result = await projectManager.createProject({
        name: 'TestProject',
        path: '/projects',
      })

      expect(result.success).toBe(true)
      expect(result.project).toBeDefined()
      expect(result.project?.name).toBe('TestProject')

      // Verify directory structure was created
      for (const dir of Object.values(RENPY_PROJECT_STRUCTURE)) {
        const fullPath = `/projects/TestProject/${dir}`
        expect(await mockFs.exists(fullPath)).toBe(true)
      }
    })

    it('should create default script.rpy when requested', async () => {
      const result = await projectManager.createProject({
        name: 'TestProject',
        path: '/projects',
        createDefaultScript: true,
      })

      expect(result.success).toBe(true)
      
      const scriptPath = '/projects/TestProject/game/script.rpy'
      expect(mockFs.files.has(scriptPath)).toBe(true)
      
      const content = mockFs.files.get(scriptPath)
      expect(content).toContain('label start:')
    })

    it('should fail if directory already exists', async () => {
      mockFs.directories.add('/projects/TestProject')

      const result = await projectManager.createProject({
        name: 'TestProject',
        path: '/projects',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })
  })

  describe('openProject', () => {
    beforeEach(() => {
      // Set up a valid project structure
      mockFs.directories.add('/projects/MyGame')
      mockFs.directories.add('/projects/MyGame/game')
      mockFs.directories.add('/projects/MyGame/game/images')
      mockFs.directories.add('/projects/MyGame/game/audio')
      
      mockFs.files.set('/projects/MyGame/game/script.rpy', `
define s = Character("Sylvie", color="#c8ffc8")
default points = 0

label start:
    s "Hello!"
    return
`)
    })

    it('should open an existing project', async () => {
      const result = await projectManager.openProject('/projects/MyGame')

      expect(result.success).toBe(true)
      expect(result.project).toBeDefined()
      expect(result.project?.name).toBe('MyGame')
    })

    it('should scan and parse .rpy files', async () => {
      const result = await projectManager.openProject('/projects/MyGame')

      expect(result.success).toBe(true)
      expect(result.project?.scripts.size).toBe(1)
      
      const scriptPath = '/projects/MyGame/game/script.rpy'
      expect(result.project?.scripts.has(scriptPath)).toBe(true)
    })

    it('should extract characters from define statements', async () => {
      const result = await projectManager.openProject('/projects/MyGame')

      expect(result.success).toBe(true)
      expect(result.project?.characters.length).toBe(1)
      expect(result.project?.characters[0].name).toBe('s')
      expect(result.project?.characters[0].displayName).toBe('Sylvie')
    })

    it('should extract variables from default statements', async () => {
      const result = await projectManager.openProject('/projects/MyGame')

      expect(result.success).toBe(true)
      expect(result.project?.variables.length).toBeGreaterThan(0)
      
      const pointsVar = result.project?.variables.find(v => v.name === 'points')
      expect(pointsVar).toBeDefined()
      expect(pointsVar?.scope).toBe('default')
      expect(pointsVar?.type).toBe('int')
    })

    it('should fail if game directory is missing', async () => {
      mockFs.directories.clear()
      mockFs.directories.add('/projects/InvalidProject')

      const result = await projectManager.openProject('/projects/InvalidProject')

      expect(result.success).toBe(false)
      expect(result.error).toContain('missing')
    })
  })

  describe('saveProject', () => {
    beforeEach(async () => {
      mockFs.directories.add('/projects/MyGame')
      mockFs.directories.add('/projects/MyGame/game')
      mockFs.files.set('/projects/MyGame/game/script.rpy', `
label start:
    "Hello!"
    return
`)
      await projectManager.openProject('/projects/MyGame')
    })

    it('should save all scripts', async () => {
      const result = await projectManager.saveProject()

      expect(result.success).toBe(true)
      expect(mockFs.writeFile).toHaveBeenCalled()
    })

    it('should mark project as not modified after save', async () => {
      projectManager.setModified(true)
      expect(projectManager.isModified()).toBe(true)

      await projectManager.saveProject()

      expect(projectManager.isModified()).toBe(false)
    })

    it('should fail if no project is open', async () => {
      projectManager.closeProject()

      const result = await projectManager.saveProject()

      expect(result.success).toBe(false)
      expect(result.error).toContain('No project')
    })
  })

  describe('saveScript', () => {
    beforeEach(async () => {
      mockFs.directories.add('/projects/MyGame')
      mockFs.directories.add('/projects/MyGame/game')
      mockFs.files.set('/projects/MyGame/game/script.rpy', `
label start:
    "Hello!"
    return
`)
      await projectManager.openProject('/projects/MyGame')
    })

    it('should save a specific script', async () => {
      const result = await projectManager.saveScript('/projects/MyGame/game/script.rpy')

      expect(result.success).toBe(true)
    })

    it('should fail for non-existent script', async () => {
      const result = await projectManager.saveScript('/projects/MyGame/game/nonexistent.rpy')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should handle write errors gracefully (Requirement 1.6)', async () => {
      // Make writeFile throw an error
      mockFs.writeFile = vi.fn().mockRejectedValue(new Error('Permission denied'))

      const result = await projectManager.saveScript('/projects/MyGame/game/script.rpy')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Permission denied')
    })

    it('should generate valid Ren\'Py code when saving (Requirement 1.5)', async () => {
      const result = await projectManager.saveScript('/projects/MyGame/game/script.rpy')

      expect(result.success).toBe(true)
      
      const savedContent = mockFs.files.get('/projects/MyGame/game/script.rpy')
      expect(savedContent).toBeDefined()
      expect(savedContent).toContain('label start:')
    })
  })

  describe('error handling (Requirement 1.6)', () => {
    beforeEach(async () => {
      mockFs.directories.add('/projects/MyGame')
      mockFs.directories.add('/projects/MyGame/game')
      mockFs.files.set('/projects/MyGame/game/script.rpy', 'label start:')
      mockFs.files.set('/projects/MyGame/game/chars.rpy', 'define s = Character("S")')
      await projectManager.openProject('/projects/MyGame')
    })

    it('should preserve user data when save fails', async () => {
      // Get the original AST
      const originalAst = projectManager.getScript('/projects/MyGame/game/script.rpy')
      expect(originalAst).toBeDefined()

      // Make writeFile throw an error
      mockFs.writeFile = vi.fn().mockRejectedValue(new Error('Disk full'))

      const result = await projectManager.saveProject()

      expect(result.success).toBe(false)
      
      // Verify the AST is still intact
      const astAfterError = projectManager.getScript('/projects/MyGame/game/script.rpy')
      expect(astAfterError).toBeDefined()
      expect(astAfterError).toEqual(originalAst)
    })

    it('should report all errors when multiple files fail to save', async () => {
      // Make writeFile throw an error
      mockFs.writeFile = vi.fn().mockRejectedValue(new Error('Write failed'))

      const result = await projectManager.saveProject()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      // Should contain error messages for both files
      expect(result.error).toContain('Write failed')
    })

    it('should continue saving other files when one fails', async () => {
      let callCount = 0
      mockFs.writeFile = vi.fn().mockImplementation(async (path: string, content: string) => {
        callCount++
        if (path.includes('script.rpy')) {
          throw new Error('Script save failed')
        }
        mockFs.files.set(path, content)
      })

      const result = await projectManager.saveProject()

      expect(result.success).toBe(false)
      // Should have attempted to save both files
      expect(callCount).toBe(2)
    })
  })

  describe('scanRpyFiles', () => {
    beforeEach(() => {
      mockFs.directories.add('/projects/MyGame')
      mockFs.directories.add('/projects/MyGame/game')
      mockFs.files.set('/projects/MyGame/game/script.rpy', 'label start:')
      mockFs.files.set('/projects/MyGame/game/characters.rpy', 'define s = Character("S")')
      mockFs.files.set('/projects/MyGame/game/options.rpy', '# Options')
    })

    it('should find all .rpy files', async () => {
      const result = await projectManager.scanRpyFiles('/projects/MyGame')

      expect(result.files.length).toBe(3)
      expect(result.errors.length).toBe(0)
    })

    it('should skip saves and cache directories', async () => {
      mockFs.files.set('/projects/MyGame/game/saves/auto.rpy', 'save data')
      mockFs.files.set('/projects/MyGame/game/cache/temp.rpy', 'cache data')

      const result = await projectManager.scanRpyFiles('/projects/MyGame')

      expect(result.files.length).toBe(3)
      expect(result.files.some(f => f.includes('saves'))).toBe(false)
      expect(result.files.some(f => f.includes('cache'))).toBe(false)
    })
  })

  describe('validateProjectStructure', () => {
    it('should return valid for complete structure', async () => {
      for (const dir of Object.values(RENPY_PROJECT_STRUCTURE)) {
        mockFs.directories.add(`/projects/MyGame/${dir}`)
      }

      const result = await projectManager.validateProjectStructure('/projects/MyGame')

      expect(result.valid).toBe(true)
      expect(result.missing.length).toBe(0)
    })

    it('should return missing directories', async () => {
      mockFs.directories.add('/projects/MyGame/game')
      // Missing images, audio, gui, saves, tl

      const result = await projectManager.validateProjectStructure('/projects/MyGame')

      expect(result.valid).toBe(false)
      expect(result.missing).toContain('images')
      expect(result.missing).toContain('audio')
    })
  })

  describe('createScript', () => {
    beforeEach(async () => {
      mockFs.directories.add('/projects/MyGame')
      mockFs.directories.add('/projects/MyGame/game')
      mockFs.files.set('/projects/MyGame/game/script.rpy', 'label start:')
      await projectManager.openProject('/projects/MyGame')
    })

    it('should create a new script file', async () => {
      const result = await projectManager.createScript('newscript.rpy')

      expect(result.success).toBe(true)
      expect(mockFs.files.has('/projects/MyGame/game/newscript.rpy')).toBe(true)
    })

    it('should add .rpy extension if missing', async () => {
      const result = await projectManager.createScript('newscript')

      expect(result.success).toBe(true)
      expect(mockFs.files.has('/projects/MyGame/game/newscript.rpy')).toBe(true)
    })

    it('should fail if file already exists', async () => {
      mockFs.files.set('/projects/MyGame/game/existing.rpy', 'content')

      const result = await projectManager.createScript('existing.rpy')

      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })
  })

  describe('getScriptFiles', () => {
    it('should return empty array when no project is open', () => {
      const files = projectManager.getScriptFiles()
      expect(files).toEqual([])
    })

    it('should return all script file paths', async () => {
      mockFs.directories.add('/projects/MyGame')
      mockFs.directories.add('/projects/MyGame/game')
      mockFs.files.set('/projects/MyGame/game/script.rpy', 'label start:')
      mockFs.files.set('/projects/MyGame/game/chars.rpy', 'define s = Character("S")')
      
      await projectManager.openProject('/projects/MyGame')

      const files = projectManager.getScriptFiles()
      expect(files.length).toBe(2)
    })
  })
})
