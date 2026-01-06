/**
 * Canvas Layout Persistence Tests
 * 画布布局持久化测试
 * 
 * Unit tests for canvas layout persistence functionality.
 * 
 * Requirements: 4.1, 4.2, 4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  loadCanvasLayout,
  saveCanvasLayout,
  positionsRecordToMap,
  positionsMapToRecord,
  CanvasLayoutConfig,
  CanvasLayoutFileSystem,
  CANVAS_LAYOUT_CONFIG_VERSION,
  CANVAS_LAYOUT_CONFIG_PATH,
} from './canvasLayoutPersistence'
import { Point, CanvasTransform } from './canvasLayoutStore'

/**
 * Create a mock file system for testing
 */
function createMockFileSystem(files: Record<string, string> = {}): CanvasLayoutFileSystem {
  const storage = new Map<string, string>(Object.entries(files))
  const directories = new Set<string>()
  
  return {
    readFile: vi.fn(async (path: string) => {
      const content = storage.get(path)
      if (content === undefined) {
        throw new Error(`File not found: ${path}`)
      }
      return content
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      storage.set(path, content)
    }),
    exists: vi.fn(async (path: string) => {
      return storage.has(path) || directories.has(path)
    }),
    mkdir: vi.fn(async (path: string) => {
      directories.add(path)
    }),
  }
}

describe('loadCanvasLayout', () => {
  it('returns null when config file does not exist', async () => {
    const fs = createMockFileSystem()
    const result = await loadCanvasLayout('/project', fs)
    expect(result).toBeNull()
  })

  it('loads valid config file', async () => {
    const config: CanvasLayoutConfig = {
      version: 1,
      positions: {
        start: { x: 100, y: 200 },
        chapter1: { x: 400, y: 100 },
      },
    }
    const fs = createMockFileSystem({
      '/project/.renpy-editor/canvas-layout.json': JSON.stringify(config),
    })
    
    const result = await loadCanvasLayout('/project', fs)
    
    expect(result).not.toBeNull()
    expect(result?.version).toBe(1)
    expect(result?.positions.start).toEqual({ x: 100, y: 200 })
    expect(result?.positions.chapter1).toEqual({ x: 400, y: 100 })
  })

  it('loads config with lastTransform', async () => {
    const config: CanvasLayoutConfig = {
      version: 1,
      positions: { start: { x: 0, y: 0 } },
      lastTransform: { offsetX: 100, offsetY: 200, scale: 1.5 },
    }
    const fs = createMockFileSystem({
      '/project/.renpy-editor/canvas-layout.json': JSON.stringify(config),
    })
    
    const result = await loadCanvasLayout('/project', fs)
    
    expect(result?.lastTransform).toEqual({ offsetX: 100, offsetY: 200, scale: 1.5 })
  })

  it('returns null for invalid JSON', async () => {
    const fs = createMockFileSystem({
      '/project/.renpy-editor/canvas-layout.json': 'not valid json',
    })
    
    const result = await loadCanvasLayout('/project', fs)
    expect(result).toBeNull()
  })

  it('returns null for config without version', async () => {
    const fs = createMockFileSystem({
      '/project/.renpy-editor/canvas-layout.json': JSON.stringify({ positions: {} }),
    })
    
    const result = await loadCanvasLayout('/project', fs)
    expect(result).toBeNull()
  })

  it('skips invalid positions', async () => {
    const config = {
      version: 1,
      positions: {
        valid: { x: 100, y: 200 },
        invalid1: { x: 'not a number', y: 200 },
        invalid2: { x: NaN, y: 200 },
        invalid3: null,
      },
    }
    const fs = createMockFileSystem({
      '/project/.renpy-editor/canvas-layout.json': JSON.stringify(config),
    })
    
    const result = await loadCanvasLayout('/project', fs)
    
    expect(result?.positions.valid).toEqual({ x: 100, y: 200 })
    expect(result?.positions.invalid1).toBeUndefined()
    expect(result?.positions.invalid2).toBeUndefined()
    expect(result?.positions.invalid3).toBeUndefined()
  })

  it('clamps positions to valid range', async () => {
    const config: CanvasLayoutConfig = {
      version: 1,
      positions: {
        tooFar: { x: 200000, y: -200000 },
      },
    }
    const fs = createMockFileSystem({
      '/project/.renpy-editor/canvas-layout.json': JSON.stringify(config),
    })
    
    const result = await loadCanvasLayout('/project', fs)
    
    expect(result?.positions.tooFar.x).toBe(100000)
    expect(result?.positions.tooFar.y).toBe(-100000)
  })

  it('ignores invalid lastTransform', async () => {
    const config = {
      version: 1,
      positions: {},
      lastTransform: { offsetX: 'invalid', offsetY: 0, scale: 1 },
    }
    const fs = createMockFileSystem({
      '/project/.renpy-editor/canvas-layout.json': JSON.stringify(config),
    })
    
    const result = await loadCanvasLayout('/project', fs)
    
    expect(result?.lastTransform).toBeUndefined()
  })
})

describe('saveCanvasLayout', () => {
  it('saves positions to config file', async () => {
    const fs = createMockFileSystem()
    const positions = new Map<string, Point>([
      ['start', { x: 100, y: 200 }],
      ['chapter1', { x: 400, y: 100 }],
    ])
    
    await saveCanvasLayout('/project', positions, undefined, fs)
    
    expect(fs.writeFile).toHaveBeenCalled()
    const writtenContent = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]
    const savedConfig = JSON.parse(writtenContent) as CanvasLayoutConfig
    
    expect(savedConfig.version).toBe(CANVAS_LAYOUT_CONFIG_VERSION)
    expect(savedConfig.positions.start).toEqual({ x: 100, y: 200 })
    expect(savedConfig.positions.chapter1).toEqual({ x: 400, y: 100 })
  })

  it('saves lastTransform when provided', async () => {
    const fs = createMockFileSystem()
    const positions = new Map<string, Point>()
    const transform: CanvasTransform = { offsetX: 50, offsetY: 100, scale: 2.0 }
    
    await saveCanvasLayout('/project', positions, transform, fs)
    
    const writtenContent = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]
    const savedConfig = JSON.parse(writtenContent) as CanvasLayoutConfig
    
    expect(savedConfig.lastTransform).toEqual(transform)
  })

  it('creates directory if it does not exist', async () => {
    const fs = createMockFileSystem()
    const positions = new Map<string, Point>()
    
    await saveCanvasLayout('/project', positions, undefined, fs)
    
    expect(fs.mkdir).toHaveBeenCalledWith('/project/.renpy-editor')
  })

  it('clamps positions before saving', async () => {
    const fs = createMockFileSystem()
    const positions = new Map<string, Point>([
      ['tooFar', { x: 200000, y: -200000 }],
    ])
    
    await saveCanvasLayout('/project', positions, undefined, fs)
    
    const writtenContent = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]
    const savedConfig = JSON.parse(writtenContent) as CanvasLayoutConfig
    
    expect(savedConfig.positions.tooFar.x).toBe(100000)
    expect(savedConfig.positions.tooFar.y).toBe(-100000)
  })

  it('writes to correct path', async () => {
    const fs = createMockFileSystem()
    const positions = new Map<string, Point>()
    
    await saveCanvasLayout('/my/project/path', positions, undefined, fs)
    
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/my/project/path/.renpy-editor/canvas-layout.json',
      expect.any(String)
    )
  })
})

describe('positionsRecordToMap', () => {
  it('converts empty record to empty map', () => {
    const result = positionsRecordToMap({})
    expect(result.size).toBe(0)
  })

  it('converts record with positions to map', () => {
    const record: Record<string, Point> = {
      start: { x: 100, y: 200 },
      end: { x: 300, y: 400 },
    }
    
    const result = positionsRecordToMap(record)
    
    expect(result.size).toBe(2)
    expect(result.get('start')).toEqual({ x: 100, y: 200 })
    expect(result.get('end')).toEqual({ x: 300, y: 400 })
  })
})

describe('positionsMapToRecord', () => {
  it('converts empty map to empty record', () => {
    const result = positionsMapToRecord(new Map())
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('converts map with positions to record', () => {
    const map = new Map<string, Point>([
      ['start', { x: 100, y: 200 }],
      ['end', { x: 300, y: 400 }],
    ])
    
    const result = positionsMapToRecord(map)
    
    expect(result.start).toEqual({ x: 100, y: 200 })
    expect(result.end).toEqual({ x: 300, y: 400 })
  })
})

describe('CANVAS_LAYOUT_CONFIG_PATH', () => {
  it('has correct value', () => {
    expect(CANVAS_LAYOUT_CONFIG_PATH).toBe('.renpy-editor/canvas-layout.json')
  })
})
