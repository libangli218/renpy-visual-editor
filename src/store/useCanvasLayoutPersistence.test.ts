/**
 * Canvas Layout Persistence Hook Tests
 * 画布布局持久化 Hook 测试
 * 
 * Unit tests for the persistence hook and utility functions.
 * 
 * Requirements: 4.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createDebouncedSave,
  saveOnDragEnd,
} from './useCanvasLayoutPersistence'
import { CanvasLayoutFileSystem } from './canvasLayoutPersistence'
import { Point, CanvasTransform } from './canvasLayoutStore'

/**
 * Create a mock file system for testing
 */
function createMockFileSystem(): CanvasLayoutFileSystem & {
  getWrittenContent: () => string | null
} {
  let writtenContent: string | null = null
  const directories = new Set<string>()
  
  return {
    readFile: vi.fn(async () => '{}'),
    writeFile: vi.fn(async (_path: string, content: string) => {
      writtenContent = content
    }),
    exists: vi.fn(async (path: string) => directories.has(path)),
    mkdir: vi.fn(async (path: string) => {
      directories.add(path)
    }),
    getWrittenContent: () => writtenContent,
  }
}

describe('saveOnDragEnd', () => {
  it('saves positions to file', async () => {
    const fs = createMockFileSystem()
    const positions = new Map<string, Point>([
      ['start', { x: 100, y: 200 }],
    ])
    
    await saveOnDragEnd('/project', positions, undefined, fs)
    
    expect(fs.writeFile).toHaveBeenCalled()
    const content = fs.getWrittenContent()
    expect(content).not.toBeNull()
    const parsed = JSON.parse(content!)
    expect(parsed.positions.start).toEqual({ x: 100, y: 200 })
  })

  it('saves transform when provided', async () => {
    const fs = createMockFileSystem()
    const positions = new Map<string, Point>()
    const transform: CanvasTransform = { offsetX: 50, offsetY: 100, scale: 1.5 }
    
    await saveOnDragEnd('/project', positions, transform, fs)
    
    const content = fs.getWrittenContent()
    const parsed = JSON.parse(content!)
    expect(parsed.lastTransform).toEqual(transform)
  })

  it('handles errors gracefully', async () => {
    const fs = createMockFileSystem()
    fs.writeFile = vi.fn(async () => {
      throw new Error('Write failed')
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Should not throw
    await saveOnDragEnd('/project', new Map(), undefined, fs)
    
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('createDebouncedSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces save calls', async () => {
    const fs = createMockFileSystem()
    const { save } = createDebouncedSave('/project', fs, 100)
    
    // Call save multiple times quickly
    save(new Map([['a', { x: 1, y: 1 }]]))
    save(new Map([['a', { x: 2, y: 2 }]]))
    save(new Map([['a', { x: 3, y: 3 }]]))
    
    // Should not have saved yet
    expect(fs.writeFile).not.toHaveBeenCalled()
    
    // Advance time past debounce delay
    await vi.advanceTimersByTimeAsync(150)
    
    // Should have saved once with the last value
    expect(fs.writeFile).toHaveBeenCalledTimes(1)
    const content = fs.getWrittenContent()
    const parsed = JSON.parse(content!)
    expect(parsed.positions.a).toEqual({ x: 3, y: 3 })
  })

  it('saveImmediate bypasses debounce', async () => {
    const fs = createMockFileSystem()
    const { saveImmediate } = createDebouncedSave('/project', fs, 100)
    
    await saveImmediate(new Map([['a', { x: 1, y: 1 }]]))
    
    // Should have saved immediately
    expect(fs.writeFile).toHaveBeenCalledTimes(1)
  })

  it('cancel stops pending save', async () => {
    const fs = createMockFileSystem()
    const { save, cancel } = createDebouncedSave('/project', fs, 100)
    
    save(new Map([['a', { x: 1, y: 1 }]]))
    cancel()
    
    // Advance time past debounce delay
    await vi.advanceTimersByTimeAsync(150)
    
    // Should not have saved
    expect(fs.writeFile).not.toHaveBeenCalled()
  })

  it('includes transform in save', async () => {
    const fs = createMockFileSystem()
    const { save } = createDebouncedSave('/project', fs, 100)
    const transform: CanvasTransform = { offsetX: 10, offsetY: 20, scale: 2 }
    
    save(new Map(), transform)
    await vi.advanceTimersByTimeAsync(150)
    
    const content = fs.getWrittenContent()
    const parsed = JSON.parse(content!)
    expect(parsed.lastTransform).toEqual(transform)
  })

  it('handles save errors gracefully', async () => {
    const fs = createMockFileSystem()
    fs.writeFile = vi.fn(async () => {
      throw new Error('Write failed')
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const { save } = createDebouncedSave('/project', fs, 100)
    save(new Map())
    
    // Should not throw
    await vi.advanceTimersByTimeAsync(150)
    
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
