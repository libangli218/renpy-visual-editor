/**
 * Selection Utils Property Tests
 * 选择工具属性测试
 * 
 * Property-based tests for multi-select operations.
 * 
 * Feature: free-canvas-layout, Property 3: 多选操作的集合正确性
 * 
 * Requirements: 8.1, 8.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  rectsIntersect, 
  rectContains,
  getLabelsInSelection,
  calculateRelativePositions,
  applyRelativePositions,
} from './selectionUtils'
import { Rect, Point } from './canvasLayoutStore'

/**
 * Arbitrary for a valid rectangle
 */
const rectArb = fc.record({
  x: fc.double({ min: -5000, max: 5000, noNaN: true }),
  y: fc.double({ min: -5000, max: 5000, noNaN: true }),
  width: fc.double({ min: 1, max: 1000, noNaN: true }),
  height: fc.double({ min: 1, max: 1000, noNaN: true }),
})

/**
 * Arbitrary for a label bounds
 */
const labelBoundsArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  x: fc.double({ min: -5000, max: 5000, noNaN: true }),
  y: fc.double({ min: -5000, max: 5000, noNaN: true }),
  width: fc.double({ min: 50, max: 500, noNaN: true }),
  height: fc.double({ min: 50, max: 500, noNaN: true }),
})

/**
 * Arbitrary for a point
 */
const pointArb = fc.record({
  x: fc.double({ min: -5000, max: 5000, noNaN: true }),
  y: fc.double({ min: -5000, max: 5000, noNaN: true }),
})

/**
 * Generate unique label names
 */
const uniqueLabelBoundsArb = fc.array(labelBoundsArb, { minLength: 0, maxLength: 20 })
  .map(labels => {
    // Ensure unique names
    const seen = new Set<string>()
    return labels.filter(label => {
      if (seen.has(label.name)) return false
      seen.add(label.name)
      return true
    })
  })

/**
 * Feature: free-canvas-layout, Property 3: 多选操作的集合正确性
 * 
 * For any box selection operation, the selected labels set should precisely
 * equal all labels whose bounds intersect with the selection box.
 * 
 * **Validates: Requirements 8.1, 8.2**
 */
describe('Property 3: Multi-Select Set Correctness', () => {
  
  it('rectsIntersect is symmetric', () => {
    fc.assert(
      fc.property(
        rectArb,
        rectArb,
        (rect1, rect2) => {
          // Intersection should be symmetric
          expect(rectsIntersect(rect1, rect2)).toBe(rectsIntersect(rect2, rect1))
        }
      ),
      { numRuns: 100 }
    )
  })

  it('a rectangle always intersects with itself', () => {
    fc.assert(
      fc.property(
        rectArb,
        (rect) => {
          expect(rectsIntersect(rect, rect)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('non-overlapping rectangles do not intersect', () => {
    fc.assert(
      fc.property(
        rectArb,
        fc.double({ min: 100, max: 1000, noNaN: true }),
        (rect, gap) => {
          // Create a rectangle that is clearly to the right of the first
          const nonOverlapping: Rect = {
            x: rect.x + rect.width + gap,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }
          
          expect(rectsIntersect(rect, nonOverlapping)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('getLabelsInSelection returns exactly the labels that intersect with selection', () => {
    fc.assert(
      fc.property(
        rectArb,
        uniqueLabelBoundsArb,
        (selectionRect, labels) => {
          const selectedNames = getLabelsInSelection(selectionRect, labels)
          
          // Verify each selected label actually intersects
          for (const name of selectedNames) {
            const label = labels.find(l => l.name === name)
            expect(label).toBeDefined()
            if (label) {
              const labelRect: Rect = {
                x: label.x,
                y: label.y,
                width: label.width,
                height: label.height,
              }
              expect(rectsIntersect(selectionRect, labelRect)).toBe(true)
            }
          }
          
          // Verify no intersecting label was missed
          for (const label of labels) {
            const labelRect: Rect = {
              x: label.x,
              y: label.y,
              width: label.width,
              height: label.height,
            }
            if (rectsIntersect(selectionRect, labelRect)) {
              expect(selectedNames).toContain(label.name)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('empty selection box returns no labels', () => {
    fc.assert(
      fc.property(
        uniqueLabelBoundsArb,
        (labels) => {
          // Create a selection box with zero area far from any labels
          const emptySelection: Rect = {
            x: 100000,
            y: 100000,
            width: 0,
            height: 0,
          }
          
          const selectedNames = getLabelsInSelection(emptySelection, labels)
          expect(selectedNames.length).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('selection box containing all labels selects all labels', () => {
    fc.assert(
      fc.property(
        uniqueLabelBoundsArb.filter(labels => labels.length > 0),
        (labels) => {
          // Calculate bounding box of all labels
          let minX = Infinity
          let minY = Infinity
          let maxX = -Infinity
          let maxY = -Infinity
          
          for (const label of labels) {
            minX = Math.min(minX, label.x)
            minY = Math.min(minY, label.y)
            maxX = Math.max(maxX, label.x + label.width)
            maxY = Math.max(maxY, label.y + label.height)
          }
          
          // Create selection box that contains all labels with padding
          const selectionRect: Rect = {
            x: minX - 10,
            y: minY - 10,
            width: maxX - minX + 20,
            height: maxY - minY + 20,
          }
          
          const selectedNames = getLabelsInSelection(selectionRect, labels)
          
          // All labels should be selected
          expect(selectedNames.length).toBe(labels.length)
          for (const label of labels) {
            expect(selectedNames).toContain(label.name)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rectContains implies rectsIntersect', () => {
    fc.assert(
      fc.property(
        rectArb,
        fc.double({ min: 0.1, max: 0.9, noNaN: true }),
        fc.double({ min: 0.1, max: 0.9, noNaN: true }),
        (outer, xRatio, yRatio) => {
          // Create an inner rectangle that is contained within outer
          const inner: Rect = {
            x: outer.x + outer.width * xRatio * 0.1,
            y: outer.y + outer.height * yRatio * 0.1,
            width: outer.width * 0.5,
            height: outer.height * 0.5,
          }
          
          // If inner is contained in outer, they must intersect
          if (rectContains(outer, inner)) {
            expect(rectsIntersect(outer, inner)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Property tests for relative position calculations (multi-drag)
 * 
 * **Validates: Requirements 8.4**
 */
describe('Multi-Drag Relative Position Correctness', () => {
  
  it('calculateRelativePositions and applyRelativePositions are inverse operations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
        pointArb,
        pointArb,
        (labelNames, referencePoint, _newReferencePoint) => {
          // Create unique label names
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length === 0) return
          
          // Create positions for each label
          const labelPositions = new Map<string, Point>()
          for (let i = 0; i < uniqueNames.length; i++) {
            labelPositions.set(uniqueNames[i], {
              x: referencePoint.x + i * 100,
              y: referencePoint.y + i * 50,
            })
          }
          
          // Calculate relative positions
          const relativePositions = calculateRelativePositions(
            uniqueNames,
            labelPositions,
            referencePoint
          )
          
          // Apply relative positions with original reference point
          const restoredPositions = applyRelativePositions(relativePositions, referencePoint)
          
          // Positions should be restored
          for (const name of uniqueNames) {
            const original = labelPositions.get(name)
            const restored = restoredPositions.get(name)
            expect(original).toBeDefined()
            expect(restored).toBeDefined()
            if (original && restored) {
              expect(restored.x).toBeCloseTo(original.x, 5)
              expect(restored.y).toBeCloseTo(original.y, 5)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('relative positions preserve distances between labels', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 10 }),
        pointArb,
        pointArb,
        (labelNames, referencePoint, newReferencePoint) => {
          // Create unique label names
          const uniqueNames = [...new Set(labelNames)]
          if (uniqueNames.length < 2) return
          
          // Create positions for each label
          const labelPositions = new Map<string, Point>()
          for (let i = 0; i < uniqueNames.length; i++) {
            labelPositions.set(uniqueNames[i], {
              x: referencePoint.x + i * 100,
              y: referencePoint.y + i * 50,
            })
          }
          
          // Calculate original distances between first two labels
          const pos1 = labelPositions.get(uniqueNames[0])!
          const pos2 = labelPositions.get(uniqueNames[1])!
          const originalDistX = pos2.x - pos1.x
          const originalDistY = pos2.y - pos1.y
          
          // Calculate relative positions and apply with new reference
          const relativePositions = calculateRelativePositions(
            uniqueNames,
            labelPositions,
            referencePoint
          )
          const newPositions = applyRelativePositions(relativePositions, newReferencePoint)
          
          // Calculate new distances
          const newPos1 = newPositions.get(uniqueNames[0])!
          const newPos2 = newPositions.get(uniqueNames[1])!
          const newDistX = newPos2.x - newPos1.x
          const newDistY = newPos2.y - newPos1.y
          
          // Distances should be preserved
          expect(newDistX).toBeCloseTo(originalDistX, 5)
          expect(newDistY).toBeCloseTo(originalDistY, 5)
        }
      ),
      { numRuns: 100 }
    )
  })
})
