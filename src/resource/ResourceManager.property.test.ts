/**
 * Property-Based Tests for Resource Management
 * 
 * Feature: renpy-visual-editor
 * 
 * Property 13: Resource Scanning Completeness
 * Validates: Requirements 9.1
 * 
 * For any project with resources in standard directories, all resources should be discovered.
 * 
 * ∀ project ∈ Project:
 *   let scanned = scanResources(project.path)
 *   filesIn(project.path + '/game/images/') ⊆ scanned.images
 *   filesIn(project.path + '/game/audio/') ⊆ scanned.audio
 * 
 * Property 14: Resource Search Correctness
 * Validates: Requirements 9.4
 * 
 * For any search query, all returned resources should match the query.
 * 
 * ∀ query ∈ String, resources ∈ Resource[]:
 *   let results = searchResources(query, resources)
 *   ∀ r ∈ results: matches(r.name, query) = true
 */

import { describe, it, vi } from 'vitest'
import * as fc from 'fast-check'
import { ResourceManager, ResourceType } from './ResourceManager'
import { FileSystem } from '../project/ProjectManager'
import { IMAGE_EXTENSIONS, AUDIO_EXTENSIONS } from '../project/types'

/**
 * Create a mock file system with specified files
 */
function createMockFileSystem(
  imageFiles: string[],
  audioFiles: string[]
): FileSystem & {
  files: Map<string, string>
  directories: Set<string>
} {
  const files = new Map<string, string>()
  const directories = new Set<string>()

  // Add base directories
  directories.add('project')
  directories.add('project/game')
  directories.add('project/game/images')
  directories.add('project/game/audio')

  // Add image files
  for (const file of imageFiles) {
    const path = `project/game/images/${file}`
    files.set(path, 'image data')
    // Add parent directories
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i++) {
      directories.add(parts.slice(0, i).join('/'))
    }
  }

  // Add audio files
  for (const file of audioFiles) {
    const path = `project/game/audio/${file}`
    files.set(path, 'audio data')
    // Add parent directories
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i++) {
      directories.add(parts.slice(0, i).join('/'))
    }
  }

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
    }),

    readDir: vi.fn(async (path: string) => {
      const entries: { name: string; isDirectory: boolean }[] = []
      const prefix = path.endsWith('/') ? path : path + '/'
      const seen = new Set<string>()

      // Find files in this directory
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

      // Find subdirectories
      for (const dirPath of directories) {
        if (dirPath.startsWith(prefix) && dirPath !== path) {
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
    }),

    copyDir: vi.fn(async () => {}),
    copyFile: vi.fn(async () => {}),
    getAppPath: vi.fn(async () => '/app'),
  }
}

// ============================================================================
// Arbitrary Generators
// ============================================================================

// Generate valid file names (alphanumeric with underscores)
const arbFileName = fc.stringMatching(/^[a-z][a-z0-9_]{1,15}$/)

// Generate image file names with valid extensions
const arbImageFileName = fc.tuple(
  arbFileName,
  fc.constantFrom(...IMAGE_EXTENSIONS)
).map(([name, ext]) => `${name}${ext}`)

// Generate audio file names with valid extensions
const arbAudioFileName = fc.tuple(
  arbFileName,
  fc.constantFrom(...AUDIO_EXTENSIONS)
).map(([name, ext]) => `${name}${ext}`)

// Generate arrays of unique image files
const arbImageFiles = fc.uniqueArray(arbImageFileName, { minLength: 0, maxLength: 20 })

// Generate arrays of unique audio files
const arbAudioFiles = fc.uniqueArray(arbAudioFileName, { minLength: 0, maxLength: 20 })

// Generate search queries (substrings that might match file names)
const arbSearchQuery = fc.stringMatching(/^[a-z]{0,5}$/)

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 13: Resource Scanning Completeness', () => {
  /**
   * Feature: renpy-visual-editor, Property 13: Resource Scanning Completeness
   * Validates: Requirements 9.1
   * 
   * For any project with resources in standard directories, all resources should be discovered.
   */
  it('should discover all image files in game/images/', async () => {
    await fc.assert(
      fc.asyncProperty(arbImageFiles, async (imageFiles) => {
        const mockFs = createMockFileSystem(imageFiles, [])
        const manager = new ResourceManager(mockFs)

        const index = await manager.scanResources('project')

        // All image files should be discovered (as images or backgrounds)
        const allImageResources = [...index.images, ...index.backgrounds, ...index.characters]
        const discoveredPaths = new Set(allImageResources.map(r => r.path))

        for (const file of imageFiles) {
          const expectedPath = `project/game/images/${file}`
          if (!discoveredPaths.has(expectedPath)) {
            return false
          }
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should discover all audio files in game/audio/', async () => {
    await fc.assert(
      fc.asyncProperty(arbAudioFiles, async (audioFiles) => {
        const mockFs = createMockFileSystem([], audioFiles)
        const manager = new ResourceManager(mockFs)

        const index = await manager.scanResources('project')

        // All audio files should be discovered
        const discoveredPaths = new Set(index.audio.map(r => r.path))

        for (const file of audioFiles) {
          const expectedPath = `project/game/audio/${file}`
          if (!discoveredPaths.has(expectedPath)) {
            return false
          }
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should discover all resources when both images and audio exist', async () => {
    await fc.assert(
      fc.asyncProperty(arbImageFiles, arbAudioFiles, async (imageFiles, audioFiles) => {
        const mockFs = createMockFileSystem(imageFiles, audioFiles)
        const manager = new ResourceManager(mockFs)

        const index = await manager.scanResources('project')

        // Count total discovered resources
        const totalDiscovered = 
          index.images.length + 
          index.backgrounds.length + 
          index.audio.length + 
          index.characters.length

        // Should match total input files
        return totalDiscovered === imageFiles.length + audioFiles.length
      }),
      { numRuns: 100 }
    )
  })

  it('should assign correct resource types based on file location', async () => {
    await fc.assert(
      fc.asyncProperty(arbImageFiles, arbAudioFiles, async (imageFiles, audioFiles) => {
        const mockFs = createMockFileSystem(imageFiles, audioFiles)
        const manager = new ResourceManager(mockFs)

        const index = await manager.scanResources('project')

        // All audio resources should have type 'audio'
        for (const resource of index.audio) {
          if (resource.type !== 'audio') {
            return false
          }
        }

        // All image-based resources should have appropriate types
        const imageTypes: ResourceType[] = ['image', 'background', 'character']
        for (const resource of [...index.images, ...index.backgrounds, ...index.characters]) {
          if (!imageTypes.includes(resource.type)) {
            return false
          }
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should generate unique IDs for all resources', async () => {
    await fc.assert(
      fc.asyncProperty(arbImageFiles, arbAudioFiles, async (imageFiles, audioFiles) => {
        const mockFs = createMockFileSystem(imageFiles, audioFiles)
        const manager = new ResourceManager(mockFs)

        const index = await manager.scanResources('project')

        // Collect all IDs
        const allResources = [
          ...index.images,
          ...index.backgrounds,
          ...index.audio,
          ...index.characters,
        ]
        const ids = allResources.map(r => r.id)
        const uniqueIds = new Set(ids)

        // All IDs should be unique
        return ids.length === uniqueIds.size
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 14: Resource Search Correctness', () => {
  /**
   * Feature: renpy-visual-editor, Property 14: Resource Search Correctness
   * Validates: Requirements 9.4
   * 
   * For any search query, all returned resources should match the query.
   */
  it('should return only resources whose names contain the query', async () => {
    await fc.assert(
      fc.asyncProperty(arbImageFiles, arbAudioFiles, arbSearchQuery, async (imageFiles, audioFiles, query) => {
        const mockFs = createMockFileSystem(imageFiles, audioFiles)
        const manager = new ResourceManager(mockFs)

        await manager.scanResources('project')
        const results = manager.searchResources(query)

        // All results should match the query (case-insensitive)
        const lowerQuery = query.toLowerCase()
        for (const resource of results) {
          if (!resource.name.toLowerCase().includes(lowerQuery)) {
            return false
          }
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return all matching resources for a query', async () => {
    await fc.assert(
      fc.asyncProperty(arbImageFiles, arbAudioFiles, arbSearchQuery, async (imageFiles, audioFiles, query) => {
        const mockFs = createMockFileSystem(imageFiles, audioFiles)
        const manager = new ResourceManager(mockFs)

        await manager.scanResources('project')
        const results = manager.searchResources(query)
        const allResources = manager.getResources()

        // Count how many resources should match
        const lowerQuery = query.toLowerCase()
        const expectedMatches = allResources.filter(r => 
          r.name.toLowerCase().includes(lowerQuery)
        )

        // Results should contain all matching resources
        return results.length === expectedMatches.length
      }),
      { numRuns: 100 }
    )
  })

  it('should return all resources for empty query', async () => {
    await fc.assert(
      fc.asyncProperty(arbImageFiles, arbAudioFiles, async (imageFiles, audioFiles) => {
        const mockFs = createMockFileSystem(imageFiles, audioFiles)
        const manager = new ResourceManager(mockFs)

        await manager.scanResources('project')
        const results = manager.searchResources('')
        const allResources = manager.getResources()

        // Empty query should return all resources
        return results.length === allResources.length
      }),
      { numRuns: 100 }
    )
  })

  it('should filter by type correctly when searching', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbImageFiles, 
        arbAudioFiles, 
        arbSearchQuery,
        fc.constantFrom<ResourceType>('image', 'background', 'audio', 'character'),
        async (imageFiles, audioFiles, query, filterType) => {
          const mockFs = createMockFileSystem(imageFiles, audioFiles)
          const manager = new ResourceManager(mockFs)

          await manager.scanResources('project')
          const results = manager.searchResources(query, filterType)

          // All results should be of the specified type
          for (const resource of results) {
            if (resource.type !== filterType) {
              return false
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should be case-insensitive in search', async () => {
    await fc.assert(
      fc.asyncProperty(arbImageFiles, arbAudioFiles, arbSearchQuery, async (imageFiles, audioFiles, query) => {
        const mockFs = createMockFileSystem(imageFiles, audioFiles)
        const manager = new ResourceManager(mockFs)

        await manager.scanResources('project')
        
        // Search with different cases should return same results
        const lowerResults = manager.searchResources(query.toLowerCase())
        const upperResults = manager.searchResources(query.toUpperCase())
        const mixedResults = manager.searchResources(query)

        // All should return the same number of results
        return (
          lowerResults.length === upperResults.length &&
          upperResults.length === mixedResults.length
        )
      }),
      { numRuns: 100 }
    )
  })

  it('should return empty array when no resources match', async () => {
    await fc.assert(
      fc.asyncProperty(arbImageFiles, arbAudioFiles, async (imageFiles, audioFiles) => {
        const mockFs = createMockFileSystem(imageFiles, audioFiles)
        const manager = new ResourceManager(mockFs)

        await manager.scanResources('project')
        
        // Search for something that definitely won't match
        const results = manager.searchResources('zzzznonexistentzzzz')

        return results.length === 0
      }),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 4: Script-Defined Image Discovery
// Validates: Requirements 2.6, 2.7
// ============================================================================

import { RenpyScript, RawNode } from '../types/ast'

/**
 * Generate a valid image tag (e.g., "eileen happy", "bg room")
 */
const arbImageTag = fc.tuple(
  fc.stringMatching(/^[a-z][a-z0-9_]{1,10}$/),
  fc.option(fc.stringMatching(/^[a-z][a-z0-9_]{1,10}$/), { nil: undefined })
).map(([base, attr]) => attr ? `${base} ${attr}` : base)

/**
 * Generate a valid image path
 */
const arbImagePath = fc.stringMatching(/^[a-z][a-z0-9_\/]{1,20}\.png$/)

/**
 * Generate an image statement as raw content
 */
const arbImageStatement = fc.tuple(arbImageTag, arbImagePath).map(
  ([tag, path]) => `image ${tag} = "${path}"`
)

/**
 * Generate a RawNode representing an image statement
 */
const arbImageRawNode = fc.tuple(
  fc.uuid(),
  arbImageStatement,
  fc.integer({ min: 1, max: 1000 })
).map(([id, content, line]): RawNode => ({
  id,
  type: 'raw',
  content,
  line,
}))

/**
 * Generate a non-image RawNode (e.g., a comment or other statement)
 */
const arbNonImageRawNode = fc.tuple(
  fc.uuid(),
  fc.stringMatching(/^# [a-z ]{1,20}$/),
  fc.integer({ min: 1, max: 1000 })
).map(([id, content, line]): RawNode => ({
  id,
  type: 'raw',
  content,
  line,
}))

/**
 * Generate a RenpyScript with image statements
 */
const arbScriptWithImages = fc.tuple(
  fc.array(arbImageRawNode, { minLength: 0, maxLength: 10 }),
  fc.array(arbNonImageRawNode, { minLength: 0, maxLength: 5 })
).map(([imageNodes, otherNodes]): RenpyScript => ({
  type: 'script',
  statements: [...imageNodes, ...otherNodes],
  metadata: {
    filePath: 'test.rpy',
    parseTime: new Date(),
    version: '1.0',
  },
}))

/**
 * Generate a file path for a script
 */
const arbFilePath = fc.stringMatching(/^game\/[a-z][a-z0-9_]{1,10}\.rpy$/)

describe('Property 4: Script-Defined Image Discovery', () => {
  /**
   * Feature: image-management-system, Property 4: Script-Defined Image Discovery
   * Validates: Requirements 2.6, 2.7
   * 
   * For any script file containing `image` statements, the system should discover
   * and display these script-defined images using their defined tag names.
   */
  it('should discover all image statements in scripts', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(arbFilePath, arbScriptWithImages), { minLength: 1, maxLength: 5 }),
        (scriptEntries) => {
          const mockFs = createMockFileSystem([], [])
          const manager = new ResourceManager(mockFs)

          // Create a Map of scripts
          const scripts = new Map<string, RenpyScript>()
          for (const [filePath, script] of scriptEntries) {
            scripts.set(filePath, script)
          }

          // Scan script-defined images
          const discovered = manager.scanScriptDefinedImages(scripts)

          // Count expected image statements
          let expectedCount = 0
          const expectedTags = new Set<string>()
          
          for (const [, script] of scripts) {
            for (const statement of script.statements) {
              if (statement.type === 'raw') {
                const rawNode = statement as RawNode
                const match = rawNode.content.match(/^image\s+([a-zA-Z_][a-zA-Z0-9_\s]*?)\s*=\s*["']([^"']+)["']/)
                if (match) {
                  const tag = match[1].trim()
                  // Only count unique tags (later definitions override earlier ones)
                  if (!expectedTags.has(tag)) {
                    expectedTags.add(tag)
                    expectedCount++
                  }
                }
              }
            }
          }

          // All discovered images should have valid tags
          for (const image of discovered) {
            if (!image.tag || image.tag.trim() === '') {
              return false
            }
            if (!image.path || image.path.trim() === '') {
              return false
            }
            if (!image.sourceFile || image.sourceFile.trim() === '') {
              return false
            }
          }

          // The number of discovered images should match expected unique tags
          return discovered.length === expectedCount
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly parse image tag and path from image statements', () => {
    fc.assert(
      fc.property(arbImageTag, arbImagePath, (tag, path) => {
        const mockFs = createMockFileSystem([], [])
        const manager = new ResourceManager(mockFs)

        const script: RenpyScript = {
          type: 'script',
          statements: [{
            id: 'test-id',
            type: 'raw',
            content: `image ${tag} = "${path}"`,
            line: 1,
          }],
          metadata: {
            filePath: 'test.rpy',
            parseTime: new Date(),
            version: '1.0',
          },
        }

        const scripts = new Map<string, RenpyScript>()
        scripts.set('test.rpy', script)

        const discovered = manager.scanScriptDefinedImages(scripts)

        // Should discover exactly one image
        if (discovered.length !== 1) {
          return false
        }

        // Tag and path should match
        const image = discovered[0]
        return image.tag === tag && image.path === path
      }),
      { numRuns: 100 }
    )
  })

  it('should update image tags when onScriptChange is called', () => {
    fc.assert(
      fc.property(arbImageTag, arbImagePath, arbFilePath, (tag, path, filePath) => {
        const mockFs = createMockFileSystem([], [])
        const manager = new ResourceManager(mockFs)

        // Initial script with one image
        const initialScript: RenpyScript = {
          type: 'script',
          statements: [{
            id: 'test-id',
            type: 'raw',
            content: `image ${tag} = "${path}"`,
            line: 1,
          }],
          metadata: {
            filePath,
            parseTime: new Date(),
            version: '1.0',
          },
        }

        const scripts = new Map<string, RenpyScript>()
        scripts.set(filePath, initialScript)
        manager.scanScriptDefinedImages(scripts)

        // Verify initial state
        let discovered = manager.getScriptDefinedImages()
        if (discovered.length !== 1 || discovered[0].tag !== tag) {
          return false
        }

        // Update script with a different image
        const newTag = tag + '_new'
        const newPath = path.replace('.png', '_new.png')
        const updatedScript: RenpyScript = {
          type: 'script',
          statements: [{
            id: 'test-id-2',
            type: 'raw',
            content: `image ${newTag} = "${newPath}"`,
            line: 1,
          }],
          metadata: {
            filePath,
            parseTime: new Date(),
            version: '1.0',
          },
        }

        // Call onScriptChange
        manager.onScriptChange(filePath, updatedScript)

        // Verify updated state
        discovered = manager.getScriptDefinedImages()
        
        // Should have exactly one image with the new tag
        if (discovered.length !== 1) {
          return false
        }
        
        return discovered[0].tag === newTag && discovered[0].path === newPath
      }),
      { numRuns: 100 }
    )
  })

  it('should remove old definitions when script changes', () => {
    fc.assert(
      fc.property(arbFilePath, (filePath) => {
        const mockFs = createMockFileSystem([], [])
        const manager = new ResourceManager(mockFs)

        // Initial script with multiple images
        const initialScript: RenpyScript = {
          type: 'script',
          statements: [
            {
              id: 'id1',
              type: 'raw',
              content: 'image eileen happy = "eileen_happy.png"',
              line: 1,
            },
            {
              id: 'id2',
              type: 'raw',
              content: 'image eileen sad = "eileen_sad.png"',
              line: 2,
            },
          ],
          metadata: {
            filePath,
            parseTime: new Date(),
            version: '1.0',
          },
        }

        const scripts = new Map<string, RenpyScript>()
        scripts.set(filePath, initialScript)
        manager.scanScriptDefinedImages(scripts)

        // Verify initial state has 2 images
        let discovered = manager.getScriptDefinedImages()
        if (discovered.length !== 2) {
          return false
        }

        // Update script with only one image
        const updatedScript: RenpyScript = {
          type: 'script',
          statements: [{
            id: 'id3',
            type: 'raw',
            content: 'image lucy normal = "lucy_normal.png"',
            line: 1,
          }],
          metadata: {
            filePath,
            parseTime: new Date(),
            version: '1.0',
          },
        }

        manager.onScriptChange(filePath, updatedScript)

        // Should now have only 1 image
        discovered = manager.getScriptDefinedImages()
        if (discovered.length !== 1) {
          return false
        }

        // The old images should be gone, only the new one should exist
        return discovered[0].tag === 'lucy normal'
      }),
      { numRuns: 100 }
    )
  })

  it('should add discovered images to image tags for consistency', () => {
    fc.assert(
      fc.property(arbImageTag, arbImagePath, (tag, path) => {
        const mockFs = createMockFileSystem([], [])
        const manager = new ResourceManager(mockFs)

        const script: RenpyScript = {
          type: 'script',
          statements: [{
            id: 'test-id',
            type: 'raw',
            content: `image ${tag} = "${path}"`,
            line: 1,
          }],
          metadata: {
            filePath: 'test.rpy',
            parseTime: new Date(),
            version: '1.0',
          },
        }

        const scripts = new Map<string, RenpyScript>()
        scripts.set('test.rpy', script)
        manager.scanScriptDefinedImages(scripts)

        // The base tag should be added to image tags
        const baseTag = tag.split(' ')[0]
        const isBackground = baseTag.toLowerCase() === 'bg'
        
        const imageTags = isBackground 
          ? manager.getBackgroundTags() 
          : manager.getImageTags()

        // Should find the base tag in the appropriate list
        const found = imageTags.some(t => t.tag === baseTag)
        return found
      }),
      { numRuns: 100 }
    )
  })
})
