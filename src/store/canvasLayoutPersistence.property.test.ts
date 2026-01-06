/**
 * Canvas Layout Persistence Property Tests
 * 画布布局持久化属性测试
 * 
 * Property-based tests for canvas layout persistence.
 * 
 * Feature: free-canvas-layout, Property 2: Label 位置的持久化一致性
 * 
 * **Validates: Requirements 4.1, 4.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  loadCanvasLayout,
  saveCanvasLayout,
  positionsRecordToMap,
  positionsMapToRecord,
  CanvasLayoutFileSystem,
  CANVAS_LAYOUT_CONFIG_VERSION,
} from './canvasLayoutPersistence'
import { MIN_SCALE, MAX_SCALE } from './canvasLayoutStore'

/**
 * Create an in-memory file system for testing
 */
function createInMemoryFileSystem(): CanvasLayoutFileSystem & {
  getStorage: () => Map<string, string>
} {
  const storage = new Map<string, string>()
  const directories = new Set<string>()

  return {
    readFile: async (path: string) => {
      const content = storage.get(path)
      if (content === undefined) {
        throw new Error(`File not found: ${path}`)
      }
      return content
    },
    writeFile: async (path: string, content: string) => {
      storage.set(path, content)
    },
    exists: async (path: string) => {
      return storage.has(path) || directories.has(path)
    },
    mkdir: async (path: string) => {
      directories.add(path)
    },
    getStorage: () => storage,
  }
}

/**
 * Arbitrary for valid label names
 * Label names should be non-empty strings without special characters
 */
const labelNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !s.includes('\n') && !s.includes('\r'))

/**
 * Arbitrary for valid Point coordinates
 * Coordinates are clamped to ±100000 by the persistence layer
 */
const pointArb = fc.record({
  x: fc.double({ min: -100000, max: 100000, noNaN: true, noDefaultInfinity: true }),
  y: fc.double({ min: -100000, max: 100000, noNaN: true, noDefaultInfinity: true }),
})

/**
 * Arbitrary for valid CanvasTransform
 */
const transformArb = fc.record({
  offsetX: fc.double({ min: -10000, max: 10000, noNaN: true, noDefaultInfinity: true }),
  offsetY: fc.double({ min: -10000, max: 10000, noNaN: true, noDefaultInfinity: true }),
  scale: fc.double({ min: MIN_SCALE, max: MAX_SCALE, noNaN: true, noDefaultInfinity: true }),
})

/**
 * Arbitrary for a map of label positions
 */
const positionsMapArb = fc.array(
  fc.tuple(labelNameArb, pointArb),
  { minLength: 0, maxLength: 20 }
).map(entries => new Map(entries))

/**
 * Feature: free-canvas-layout, Property 2: Label 位置的持久化一致性
 * 
 * For any Label position update, saving then reloading should produce 
 * the same position value (within floating point tolerance).
 * 
 * **Validates: Requirements 4.1, 4.2**
 */
describe('Property 2: Label Position Persistence Consistency', () => {
  it('save then load produces equivalent positions', async () => {
    await fc.assert(
      fc.asyncProperty(
        positionsMapArb,
        async (positions) => {
          const fs = createInMemoryFileSystem()
          const projectPath = '/test-project'

          // Save positions
          await saveCanvasLayout(projectPath, positions, undefined, fs)

          // Load positions
          const loaded = await loadCanvasLayout(projectPath, fs)

          // Verify loaded config exists
          expect(loaded).not.toBeNull()
          expect(loaded!.version).toBe(CANVAS_LAYOUT_CONFIG_VERSION)

          // Verify all positions are preserved
          expect(Object.keys(loaded!.positions).length).toBe(positions.size)

          for (const [labelName, originalPos] of positions) {
            const loadedPos = loaded!.positions[labelName]
            expect(loadedPos).toBeDefined()
            expect(loadedPos.x).toBeCloseTo(originalPos.x, 5)
            expect(loadedPos.y).toBeCloseTo(originalPos.y, 5)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('save then load preserves transform state', async () => {
    await fc.assert(
      fc.asyncProperty(
        positionsMapArb,
        transformArb,
        async (positions, transform) => {
          const fs = createInMemoryFileSystem()
          const projectPath = '/test-project'

          // Save with transform
          await saveCanvasLayout(projectPath, positions, transform, fs)

          // Load
          const loaded = await loadCanvasLayout(projectPath, fs)

          // Verify transform is preserved
          expect(loaded).not.toBeNull()
          expect(loaded!.lastTransform).toBeDefined()
          expect(loaded!.lastTransform!.offsetX).toBeCloseTo(transform.offsetX, 5)
          expect(loaded!.lastTransform!.offsetY).toBeCloseTo(transform.offsetY, 5)
          expect(loaded!.lastTransform!.scale).toBeCloseTo(transform.scale, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('multiple save operations preserve latest positions', async () => {
    await fc.assert(
      fc.asyncProperty(
        positionsMapArb,
        positionsMapArb,
        async (positions1, positions2) => {
          const fs = createInMemoryFileSystem()
          const projectPath = '/test-project'

          // Save first set
          await saveCanvasLayout(projectPath, positions1, undefined, fs)

          // Save second set (should overwrite)
          await saveCanvasLayout(projectPath, positions2, undefined, fs)

          // Load
          const loaded = await loadCanvasLayout(projectPath, fs)

          // Should have second set of positions
          expect(loaded).not.toBeNull()
          expect(Object.keys(loaded!.positions).length).toBe(positions2.size)

          for (const [labelName, originalPos] of positions2) {
            const loadedPos = loaded!.positions[labelName]
            expect(loadedPos).toBeDefined()
            expect(loadedPos.x).toBeCloseTo(originalPos.x, 5)
            expect(loadedPos.y).toBeCloseTo(originalPos.y, 5)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('positionsRecordToMap and positionsMapToRecord are inverse operations', () => {
    fc.assert(
      fc.property(
        positionsMapArb,
        (positions) => {
          // Map -> Record -> Map
          const record = positionsMapToRecord(positions)
          const mapBack = positionsRecordToMap(record)

          // Should have same size
          expect(mapBack.size).toBe(positions.size)

          // Should have same entries
          for (const [key, value] of positions) {
            const backValue = mapBack.get(key)
            expect(backValue).toBeDefined()
            expect(backValue!.x).toBe(value.x)
            expect(backValue!.y).toBe(value.y)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('positions outside valid range are clamped consistently', async () => {
    // Test with positions outside the ±100000 range
    const extremePositionsArb = fc.array(
      fc.tuple(
        labelNameArb,
        fc.record({
          x: fc.double({ min: -500000, max: 500000, noNaN: true, noDefaultInfinity: true }),
          y: fc.double({ min: -500000, max: 500000, noNaN: true, noDefaultInfinity: true }),
        })
      ),
      { minLength: 1, maxLength: 10 }
    ).map(entries => new Map(entries))

    await fc.assert(
      fc.asyncProperty(
        extremePositionsArb,
        async (positions) => {
          const fs = createInMemoryFileSystem()
          const projectPath = '/test-project'

          // Save positions (will be clamped)
          await saveCanvasLayout(projectPath, positions, undefined, fs)

          // Load positions
          const loaded = await loadCanvasLayout(projectPath, fs)

          expect(loaded).not.toBeNull()

          // All loaded positions should be within valid range
          for (const pos of Object.values(loaded!.positions)) {
            expect(pos.x).toBeGreaterThanOrEqual(-100000)
            expect(pos.x).toBeLessThanOrEqual(100000)
            expect(pos.y).toBeGreaterThanOrEqual(-100000)
            expect(pos.y).toBeLessThanOrEqual(100000)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('empty positions map saves and loads correctly', async () => {
    const fs = createInMemoryFileSystem()
    const projectPath = '/test-project'

    // Save empty positions
    await saveCanvasLayout(projectPath, new Map(), undefined, fs)

    // Load
    const loaded = await loadCanvasLayout(projectPath, fs)

    expect(loaded).not.toBeNull()
    expect(Object.keys(loaded!.positions).length).toBe(0)
  })

  it('loading non-existent config returns null', async () => {
    const fs = createInMemoryFileSystem()
    const projectPath = '/non-existent-project'

    const loaded = await loadCanvasLayout(projectPath, fs)

    expect(loaded).toBeNull()
  })
})
