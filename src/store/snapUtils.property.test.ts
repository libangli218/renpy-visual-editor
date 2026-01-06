/**
 * Snap Utils Property Tests
 * 吸附对齐属性测试
 * 
 * Property-based tests for snap alignment calculations.
 * 
 * Requirements: 7.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  calculateSnapPosition, 
  SNAP_THRESHOLD,
  isWithinSnapThreshold,
} from './snapUtils'
import { Rect } from './canvasLayoutStore'

/**
 * Arbitrary for valid rectangle with integer-like values to avoid floating point issues
 */
const rectArb = fc.record({
  x: fc.integer({ min: -5000, max: 5000 }),
  y: fc.integer({ min: -5000, max: 5000 }),
  width: fc.integer({ min: 50, max: 500 }),
  height: fc.integer({ min: 50, max: 500 }),
})

/**
 * Feature: free-canvas-layout, Property 4: 吸附对齐的阈值正确性
 * 
 * For any drag operation, when a Label edge is within the snap threshold (8px)
 * of an alignment line, it should snap to that line. When outside the threshold,
 * no snapping should occur.
 * 
 * **Validates: Requirements 7.2**
 */
describe('Property 4: Snap Alignment Threshold Correctness', () => {
  
  it('snapping occurs when dragging rect edge is within threshold of target edge', () => {
    fc.assert(
      fc.property(
        rectArb,
        fc.integer({ min: 50, max: 500 }), // width for dragging rect
        fc.integer({ min: 50, max: 500 }), // height for dragging rect
        fc.integer({ min: 1, max: SNAP_THRESHOLD - 1 }), // offset within threshold
        (targetRect, dragWidth, dragHeight, offset) => {
          // Position dragging rect so its left edge is within threshold of target's left edge
          const draggingRect: Rect = {
            x: targetRect.x + offset,
            y: targetRect.y + 100, // Far enough in Y to not trigger Y snapping
            width: dragWidth,
            height: dragHeight,
          }
          
          const result = calculateSnapPosition(draggingRect, [targetRect], false)
          
          // Should snap - position should change
          expect(result.snapped).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('no snapping occurs when dragging rect is far from all edges', () => {
    fc.assert(
      fc.property(
        rectArb,
        fc.integer({ min: 50, max: 500 }),
        fc.integer({ min: 50, max: 500 }),
        fc.integer({ min: SNAP_THRESHOLD + 50, max: 200 }), // offset well outside threshold
        (targetRect, dragWidth, dragHeight, offset) => {
          // Position dragging rect far from all edges of target
          const draggingRect: Rect = {
            x: targetRect.x + targetRect.width + offset, // Far right of target
            y: targetRect.y + targetRect.height + offset, // Far below target
            width: dragWidth,
            height: dragHeight,
          }
          
          const result = calculateSnapPosition(draggingRect, [targetRect], false)
          
          // Position should remain unchanged (no snap)
          expect(result.position.x).toBe(draggingRect.x)
          expect(result.position.y).toBe(draggingRect.y)
          expect(result.snapped).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('snapping is disabled when snapDisabled is true', () => {
    fc.assert(
      fc.property(
        rectArb,
        rectArb,
        (targetRect, baseRect) => {
          // Position dragging rect exactly at target position (would normally snap)
          const draggingRect: Rect = {
            ...baseRect,
            x: targetRect.x + 1, // Within threshold
            y: targetRect.y + 1, // Within threshold
          }
          
          const result = calculateSnapPosition(draggingRect, [targetRect], true) // snapDisabled = true
          
          // Position should remain unchanged (snapping disabled)
          expect(result.position.x).toBe(draggingRect.x)
          expect(result.position.y).toBe(draggingRect.y)
          expect(result.snapped).toBe(false)
          expect(result.guides.horizontal).toHaveLength(0)
          expect(result.guides.vertical).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('snap guides are generated when snapping occurs', () => {
    fc.assert(
      fc.property(
        rectArb,
        rectArb,
        (targetRect, baseRect) => {
          // Position dragging rect so it snaps to target
          const draggingRect: Rect = {
            ...baseRect,
            x: targetRect.x + 2, // Within threshold of left edge
            y: targetRect.y + 2, // Within threshold of top edge
          }
          
          const result = calculateSnapPosition(draggingRect, [targetRect], false)
          
          // If snapping occurred, guides should be generated
          if (result.snapped) {
            const hasGuides = result.guides.horizontal.length > 0 || result.guides.vertical.length > 0
            expect(hasGuides).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('isWithinSnapThreshold correctly identifies values within threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: 0, max: SNAP_THRESHOLD }),
        (target, offset) => {
          const value = target + offset
          
          // Should be within threshold
          expect(isWithinSnapThreshold(value, target)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('isWithinSnapThreshold correctly identifies values outside threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: SNAP_THRESHOLD + 1, max: 100 }),
        (target, offset) => {
          const value = target + offset
          
          // Should be outside threshold
          expect(isWithinSnapThreshold(value, target)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('snapping to right edge works correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }), // target x
        fc.integer({ min: 50, max: 200 }), // target width
        fc.integer({ min: 50, max: 200 }), // drag width
        fc.integer({ min: 50, max: 200 }), // drag height
        fc.integer({ min: 1, max: SNAP_THRESHOLD - 1 }),
        (targetX, targetWidth, dragWidth, dragHeight, offset) => {
          const targetRect: Rect = {
            x: targetX,
            y: 0,
            width: targetWidth,
            height: 100,
          }
          
          // Position dragging rect so its right edge is within threshold of target's right edge
          const targetRightEdge = targetX + targetWidth
          const draggingRect: Rect = {
            x: targetRightEdge - dragWidth + offset, // Right edge within threshold
            y: 500, // Far in Y to avoid Y snapping
            width: dragWidth,
            height: dragHeight,
          }
          
          const result = calculateSnapPosition(draggingRect, [targetRect], false)
          
          // Should snap - check that snapping occurred
          expect(result.snapped).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('snapping to center alignment works correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }), // target x
        fc.integer({ min: 100, max: 200 }), // target width (even for clean center)
        fc.integer({ min: 100, max: 200 }), // drag width (even for clean center)
        fc.integer({ min: 50, max: 200 }), // drag height
        fc.integer({ min: 1, max: SNAP_THRESHOLD - 1 }),
        (targetX, targetWidth, dragWidth, dragHeight, offset) => {
          // Use even widths to avoid fractional centers
          const evenTargetWidth = targetWidth * 2
          const evenDragWidth = dragWidth * 2
          
          const targetRect: Rect = {
            x: targetX,
            y: 0,
            width: evenTargetWidth,
            height: 100,
          }
          
          // Position dragging rect so its center is within threshold of target's center
          const targetCenterX = targetX + evenTargetWidth / 2
          const draggingRect: Rect = {
            x: targetCenterX - evenDragWidth / 2 + offset, // Center within threshold
            y: 500, // Far in Y to avoid Y snapping
            width: evenDragWidth,
            height: dragHeight,
          }
          
          const result = calculateSnapPosition(draggingRect, [targetRect], false)
          
          // Should snap
          expect(result.snapped).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('empty other rects results in no snapping', () => {
    fc.assert(
      fc.property(
        rectArb,
        (draggingRect) => {
          const result = calculateSnapPosition(draggingRect, [], false)
          
          // Position should remain unchanged
          expect(result.position.x).toBe(draggingRect.x)
          expect(result.position.y).toBe(draggingRect.y)
          expect(result.snapped).toBe(false)
          expect(result.guides.horizontal).toHaveLength(0)
          expect(result.guides.vertical).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('snapping chooses closest alignment when multiple targets exist', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }), // base x
        fc.integer({ min: 50, max: 200 }), // width
        fc.integer({ min: 50, max: 200 }), // height
        fc.integer({ min: 2, max: SNAP_THRESHOLD - 1 }), // closer offset
        (baseX, width, height, closerOffset) => {
          // Create a dragging rect
          const draggingRect: Rect = {
            x: baseX,
            y: 0,
            width: width,
            height: height,
          }
          
          // Create closer target (left edge aligned)
          const closerTarget: Rect = {
            x: baseX - closerOffset, // Closer to dragging rect's left edge
            y: 500, // Far in Y
            width: 100,
            height: 100,
          }
          
          // Create farther target - far enough that it won't interfere
          const fartherTarget: Rect = {
            x: baseX + 1000, // Far away
            y: 500,
            width: 100,
            height: 100,
          }
          
          const result = calculateSnapPosition(draggingRect, [closerTarget, fartherTarget], false)
          
          // Should snap to the closer target (not the farther one)
          expect(result.snapped).toBe(true)
          // The snapped position should be different from original
          // and should be closer to closerTarget than to fartherTarget
          const distToCloser = Math.abs(result.position.x - closerTarget.x)
          const distToFarther = Math.abs(result.position.x - fartherTarget.x)
          expect(distToCloser).toBeLessThan(distToFarther)
        }
      ),
      { numRuns: 100 }
    )
  })
})
