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

describe('ProjectManager', () => {
  let mockFs: ReturnType<typeof createMockFileSystem>
  let projectManager: ProjectManager

  beforeEach(() => {
    mockFs = createMockFileSystem()
    projectManager = new ProjectManager(mockFs)
    
    // Set up template directory for createProject tests
    mockFs.directories.add('/app/templates/default-project')
    mockFs.directories.add('/app/templates/default-project/game')
    mockFs.directories.add('/app/templates/default-project/game/gui')
    mockFs.directories.add('/app/templates/default-project/game/images')
    mockFs.directories.add('/app/templates/default-project/game/audio')
    mockFs.directories.add('/app/templates/default-project/game/tl')
    mockFs.directories.add('/app/templates/default-project/game/saves')
    
    // Add template files
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

      // Verify project was created (copied from template)
      expect(await mockFs.exists('/projects/TestProject/game')).toBe(true)
    })

    it('should customize project files after copying template', async () => {
      const result = await projectManager.createProject({
        name: 'TestProject',
        path: '/projects',
        accentColor: '#ff0000',
      })

      expect(result.success).toBe(true)
      
      const optionsPath = '/projects/TestProject/game/options.rpy'
      expect(mockFs.files.has(optionsPath)).toBe(true)
      
      const content = mockFs.files.get(optionsPath)
      expect(content).toContain('TestProject')
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

    it('should save modified scripts', async () => {
      // Mark the script as modified first
      projectManager.markScriptModified('/projects/MyGame/game/script.rpy')
      
      const result = await projectManager.saveProject()

      expect(result.success).toBe(true)
      expect(mockFs.writeFile).toHaveBeenCalled()
    })

    it('should not save if no scripts are modified', async () => {
      // Don't mark any scripts as modified
      const result = await projectManager.saveProject()

      expect(result.success).toBe(true)
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it('should mark project as not modified after save', async () => {
      // Mark script as modified
      projectManager.markScriptModified('/projects/MyGame/game/script.rpy')
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

      // Mark script as modified
      projectManager.markScriptModified('/projects/MyGame/game/script.rpy')

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
      // Mark both scripts as modified
      projectManager.markScriptModified('/projects/MyGame/game/script.rpy')
      projectManager.markScriptModified('/projects/MyGame/game/chars.rpy')

      // Make writeFile throw an error
      mockFs.writeFile = vi.fn().mockRejectedValue(new Error('Write failed'))

      const result = await projectManager.saveProject()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      // Should contain error messages for both files
      expect(result.error).toContain('Write failed')
    })

    it('should continue saving other files when one fails', async () => {
      // Mark both scripts as modified
      projectManager.markScriptModified('/projects/MyGame/game/script.rpy')
      projectManager.markScriptModified('/projects/MyGame/game/chars.rpy')

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
