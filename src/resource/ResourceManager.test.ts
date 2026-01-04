/**
 * ResourceManager Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ResourceManager } from './ResourceManager'
import { FileSystem } from '../project/ProjectManager'

// Mock file system for testing
function createMockFileSystem(files: Record<string, string | { isDir: true; entries: string[] }>): FileSystem {
  return {
    readFile: vi.fn(async (path: string) => {
      const content = files[path]
      if (content === undefined) {
        throw new Error(`File not found: ${path}`)
      }
      if (typeof content === 'object' && content.isDir) {
        throw new Error(`Cannot read directory as file: ${path}`)
      }
      return content as string
    }),
    writeFile: vi.fn(async () => {}),
    readDir: vi.fn(async (path: string) => {
      const content = files[path]
      if (content === undefined) {
        throw new Error(`Directory not found: ${path}`)
      }
      if (typeof content !== 'object' || !content.isDir) {
        throw new Error(`Not a directory: ${path}`)
      }
      return content.entries.map(name => {
        const fullPath = `${path}/${name}`
        const entry = files[fullPath]
        return {
          name,
          isDirectory: () => typeof entry === 'object' && entry !== null && 'isDir' in entry && entry.isDir === true,
        }
      })
    }),
    exists: vi.fn(async (path: string) => path in files),
    mkdir: vi.fn(async () => {}),
  }
}

describe('ResourceManager', () => {
  describe('scanResources', () => {
    it('should scan images directory and categorize resources', async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: ['images', 'audio'] },
        'project/game/images': { isDir: true, entries: ['bg_room.png', 'sylvie.png'] },
        'project/game/images/bg_room.png': 'image data',
        'project/game/images/sylvie.png': 'image data',
        'project/game/audio': { isDir: true, entries: ['music.mp3'] },
        'project/game/audio/music.mp3': 'audio data',
      })

      const manager = new ResourceManager(mockFs)
      const index = await manager.scanResources('project')

      expect(index.backgrounds.length).toBe(1)
      expect(index.backgrounds[0].name).toBe('bg_room')
      expect(index.images.length).toBe(1)
      expect(index.images[0].name).toBe('sylvie')
      expect(index.audio.length).toBe(1)
      expect(index.audio[0].name).toBe('music')
    })

    it('should scan subdirectories when enabled', async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: ['images', 'audio'] },
        'project/game/images': { isDir: true, entries: ['characters'] },
        'project/game/images/characters': { isDir: true, entries: ['sylvie.png'] },
        'project/game/images/characters/sylvie.png': 'image data',
        'project/game/audio': { isDir: true, entries: [] },
      })

      const manager = new ResourceManager(mockFs)
      const index = await manager.scanResources('project', { includeSubdirectories: true })

      expect(index.characters.length).toBe(1)
      expect(index.characters[0].name).toBe('sylvie')
    })

    it('should detect variants from file names', async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: ['images', 'audio'] },
        'project/game/images': { isDir: true, entries: ['bg_room.png', 'bg_room_night.png', 'bg_room_rain.png'] },
        'project/game/images/bg_room.png': 'image data',
        'project/game/images/bg_room_night.png': 'image data',
        'project/game/images/bg_room_rain.png': 'image data',
        'project/game/audio': { isDir: true, entries: [] },
      })

      const manager = new ResourceManager(mockFs)
      const index = await manager.scanResources('project', { detectVariants: true })

      // All bg_ files should be backgrounds
      expect(index.backgrounds.length).toBe(3)
      
      // The base bg_room should have variants detected
      const bgRoom = index.backgrounds.find(r => r.name === 'bg_room')
      expect(bgRoom).toBeDefined()
      expect(bgRoom?.variants).toContain('room_night')
      expect(bgRoom?.variants).toContain('room_rain')
    })

    it('should handle missing directories gracefully', async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: [] },
      })

      const manager = new ResourceManager(mockFs)
      const index = await manager.scanResources('project')

      expect(index.images).toEqual([])
      expect(index.backgrounds).toEqual([])
      expect(index.audio).toEqual([])
      expect(index.characters).toEqual([])
    })

    it('should recognize different image extensions', async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: ['images', 'audio'] },
        'project/game/images': { isDir: true, entries: ['a.png', 'b.jpg', 'c.jpeg', 'd.webp', 'e.gif'] },
        'project/game/images/a.png': 'data',
        'project/game/images/b.jpg': 'data',
        'project/game/images/c.jpeg': 'data',
        'project/game/images/d.webp': 'data',
        'project/game/images/e.gif': 'data',
        'project/game/audio': { isDir: true, entries: [] },
      })

      const manager = new ResourceManager(mockFs)
      const index = await manager.scanResources('project')

      expect(index.images.length).toBe(5)
    })

    it('should recognize different audio extensions', async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: ['images', 'audio'] },
        'project/game/images': { isDir: true, entries: [] },
        'project/game/audio': { isDir: true, entries: ['a.mp3', 'b.ogg', 'c.wav', 'd.opus'] },
        'project/game/audio/a.mp3': 'data',
        'project/game/audio/b.ogg': 'data',
        'project/game/audio/c.wav': 'data',
        'project/game/audio/d.opus': 'data',
      })

      const manager = new ResourceManager(mockFs)
      const index = await manager.scanResources('project')

      expect(index.audio.length).toBe(4)
    })
  })

  describe('searchResources', () => {
    let manager: ResourceManager

    beforeEach(async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: ['images', 'audio'] },
        'project/game/images': { isDir: true, entries: ['bg_room.png', 'bg_office.png', 'sylvie.png', 'eileen.png'] },
        'project/game/images/bg_room.png': 'data',
        'project/game/images/bg_office.png': 'data',
        'project/game/images/sylvie.png': 'data',
        'project/game/images/eileen.png': 'data',
        'project/game/audio': { isDir: true, entries: ['theme.mp3', 'click.ogg'] },
        'project/game/audio/theme.mp3': 'data',
        'project/game/audio/click.ogg': 'data',
      })

      manager = new ResourceManager(mockFs)
      await manager.scanResources('project')
    })

    it('should search resources by name', () => {
      const results = manager.searchResources('sylvie')
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('sylvie')
    })

    it('should search case-insensitively', () => {
      const results = manager.searchResources('SYLVIE')
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('sylvie')
    })

    it('should return partial matches', () => {
      const results = manager.searchResources('bg')
      expect(results.length).toBe(2)
      expect(results.every(r => r.name.includes('bg'))).toBe(true)
    })

    it('should filter by type when searching', () => {
      const results = manager.searchResources('', 'audio')
      expect(results.length).toBe(2)
      expect(results.every(r => r.type === 'audio')).toBe(true)
    })

    it('should return all resources for empty query', () => {
      const results = manager.searchResources('')
      expect(results.length).toBe(6) // 2 backgrounds + 2 images + 2 audio
    })

    it('should return empty array for no matches', () => {
      const results = manager.searchResources('nonexistent')
      expect(results.length).toBe(0)
    })
  })

  describe('getResources', () => {
    let manager: ResourceManager

    beforeEach(async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: ['images', 'audio'] },
        'project/game/images': { isDir: true, entries: ['bg_room.png', 'sylvie.png'] },
        'project/game/images/bg_room.png': 'data',
        'project/game/images/sylvie.png': 'data',
        'project/game/audio': { isDir: true, entries: ['music.mp3'] },
        'project/game/audio/music.mp3': 'data',
      })

      manager = new ResourceManager(mockFs)
      await manager.scanResources('project')
    })

    it('should return all resources when no type specified', () => {
      const resources = manager.getResources()
      expect(resources.length).toBe(3)
    })

    it('should filter by image type', () => {
      const resources = manager.getResources('image')
      expect(resources.length).toBe(1)
      expect(resources[0].type).toBe('image')
    })

    it('should filter by background type', () => {
      const resources = manager.getResources('background')
      expect(resources.length).toBe(1)
      expect(resources[0].type).toBe('background')
    })

    it('should filter by audio type', () => {
      const resources = manager.getResources('audio')
      expect(resources.length).toBe(1)
      expect(resources[0].type).toBe('audio')
    })

    it('should return empty array when no resources scanned', () => {
      const emptyManager = new ResourceManager(createMockFileSystem({}))
      expect(emptyManager.getResources()).toEqual([])
    })
  })

  describe('getResourceById', () => {
    it('should find resource by ID', async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: ['images', 'audio'] },
        'project/game/images': { isDir: true, entries: ['test.png'] },
        'project/game/images/test.png': 'data',
        'project/game/audio': { isDir: true, entries: [] },
      })

      const manager = new ResourceManager(mockFs)
      await manager.scanResources('project')

      const resources = manager.getResources()
      const resource = manager.getResourceById(resources[0].id)
      
      expect(resource).toBeDefined()
      expect(resource?.name).toBe('test')
    })

    it('should return undefined for non-existent ID', async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: ['images', 'audio'] },
        'project/game/images': { isDir: true, entries: [] },
        'project/game/audio': { isDir: true, entries: [] },
      })

      const manager = new ResourceManager(mockFs)
      await manager.scanResources('project')

      const resource = manager.getResourceById('nonexistent')
      expect(resource).toBeUndefined()
    })
  })

  describe('getResourceByPath', () => {
    it('should find resource by path', async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: ['images', 'audio'] },
        'project/game/images': { isDir: true, entries: ['test.png'] },
        'project/game/images/test.png': 'data',
        'project/game/audio': { isDir: true, entries: [] },
      })

      const manager = new ResourceManager(mockFs)
      await manager.scanResources('project')

      const resource = manager.getResourceByPath('project/game/images/test.png')
      
      expect(resource).toBeDefined()
      expect(resource?.name).toBe('test')
    })
  })

  describe('clear', () => {
    it('should clear the resource index', async () => {
      const mockFs = createMockFileSystem({
        'project/game': { isDir: true, entries: ['images', 'audio'] },
        'project/game/images': { isDir: true, entries: ['test.png'] },
        'project/game/images/test.png': 'data',
        'project/game/audio': { isDir: true, entries: [] },
      })

      const manager = new ResourceManager(mockFs)
      await manager.scanResources('project')
      
      expect(manager.getResources().length).toBeGreaterThan(0)
      
      manager.clear()
      
      expect(manager.getResourceIndex()).toBeNull()
      expect(manager.getResources()).toEqual([])
    })
  })
})
