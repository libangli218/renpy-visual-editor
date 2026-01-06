/**
 * FreeCanvas Property Tests
 * 自由画布属性测试
 * 
 * Property-based tests for canvas transform operations.
 * 
 * Requirements: 2.1, 3.1, 3.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { 
  screenToCanvas, 
  canvasToScreen, 
  zoomAtPoint,
  clamp,
} from '../../store/canvasUtils'
import { 
  useCanvasLayoutStore,
  CanvasTransform, 
  MIN_SCALE, 
  MAX_SCALE,
} from '../../store/canvasLayoutStore'

/**
 * Arbitrary for valid canvas transform
 */
const canvasTransformArb = fc.record({
  offsetX: fc.double({ min: -10000, max: 10000, noNaN: true }),
  offsetY: fc.double({ min: -10000, max: 10000, noNaN: true }),
  scale: fc.double({ min: MIN_SCALE, max: MAX_SCALE, noNaN: true }),
})

/**
 * Arbitrary for screen coordinates
 */
const screenCoordsArb = fc.record({
  x: fc.double({ min: 0, max: 2000, noNaN: true }),
  y: fc.double({ min: 0, max: 2000, noNaN: true }),
})

/**
 * Arbitrary for pan delta
 */
const panDeltaArb = fc.record({
  deltaX: fc.double({ min: -1000, max: 1000, noNaN: true }),
  deltaY: fc.double({ min: -1000, max: 1000, noNaN: true }),
})

/**
 * Arbitrary for scale value (including out of range)
 */
const scaleArb = fc.double({ min: 0.001, max: 10, noNaN: true })

/**
 * Feature: free-canvas-layout, Property 1: 画布变换的可逆性
 * 
 * For any canvas transform operation (pan or zoom), executing the inverse 
 * operation should restore the canvas to its original state.
 * 
 * **Validates: Requirements 2.1, 3.1**
 */
describe('Property 1: Canvas Transform Reversibility', () => {
  beforeEach(() => {
    useCanvasLayoutStore.getState().reset()
  })

  it('screenToCanvas and canvasToScreen are inverse operations', () => {
    fc.assert(
      fc.property(
        canvasTransformArb,
        screenCoordsArb,
        (transform, screenCoords) => {
          // Convert screen -> canvas -> screen
          const canvasPos = screenToCanvas(screenCoords.x, screenCoords.y, transform)
          const screenPosBack = canvasToScreen(canvasPos.x, canvasPos.y, transform)
          
          // Should return to original screen position
          expect(screenPosBack.x).toBeCloseTo(screenCoords.x, 5)
          expect(screenPosBack.y).toBeCloseTo(screenCoords.y, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('canvasToScreen and screenToCanvas are inverse operations', () => {
    fc.assert(
      fc.property(
        canvasTransformArb,
        fc.record({
          x: fc.double({ min: -5000, max: 5000, noNaN: true }),
          y: fc.double({ min: -5000, max: 5000, noNaN: true }),
        }),
        (transform, canvasCoords) => {
          // Convert canvas -> screen -> canvas
          const screenPos = canvasToScreen(canvasCoords.x, canvasCoords.y, transform)
          const canvasPosBack = screenToCanvas(screenPos.x, screenPos.y, transform)
          
          // Should return to original canvas position
          expect(canvasPosBack.x).toBeCloseTo(canvasCoords.x, 5)
          expect(canvasPosBack.y).toBeCloseTo(canvasCoords.y, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('pan followed by inverse pan restores original transform', () => {
    fc.assert(
      fc.property(
        canvasTransformArb,
        panDeltaArb,
        (initialTransform, delta) => {
          // Apply pan
          const afterPan: CanvasTransform = {
            ...initialTransform,
            offsetX: initialTransform.offsetX + delta.deltaX,
            offsetY: initialTransform.offsetY + delta.deltaY,
          }
          
          // Apply inverse pan
          const afterInversePan: CanvasTransform = {
            ...afterPan,
            offsetX: afterPan.offsetX - delta.deltaX,
            offsetY: afterPan.offsetY - delta.deltaY,
          }
          
          // Should return to original
          expect(afterInversePan.offsetX).toBeCloseTo(initialTransform.offsetX, 5)
          expect(afterInversePan.offsetY).toBeCloseTo(initialTransform.offsetY, 5)
          expect(afterInversePan.scale).toBeCloseTo(initialTransform.scale, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('zoom at point keeps the point stationary', () => {
    fc.assert(
      fc.property(
        canvasTransformArb,
        screenCoordsArb,
        fc.double({ min: MIN_SCALE, max: MAX_SCALE, noNaN: true }),
        (transform, mousePos, newScale) => {
          // Calculate canvas position under mouse before zoom
          const canvasBefore = screenToCanvas(mousePos.x, mousePos.y, transform)
          
          // Apply zoom at mouse position
          const newTransform = zoomAtPoint(transform, newScale, mousePos.x, mousePos.y)
          
          // Calculate canvas position under mouse after zoom
          const canvasAfter = screenToCanvas(mousePos.x, mousePos.y, newTransform)
          
          // The canvas position under the mouse should remain the same
          expect(canvasAfter.x).toBeCloseTo(canvasBefore.x, 5)
          expect(canvasAfter.y).toBeCloseTo(canvasBefore.y, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('store pan operation is reversible', () => {
    fc.assert(
      fc.property(
        panDeltaArb,
        (delta) => {
          const store = useCanvasLayoutStore.getState()
          
          // Get initial state
          const initialTransform = { ...store.transform }
          
          // Pan forward
          store.pan(delta.deltaX, delta.deltaY)
          
          // Pan backward (inverse)
          store.pan(-delta.deltaX, -delta.deltaY)
          
          // Should return to original
          const finalTransform = useCanvasLayoutStore.getState().transform
          expect(finalTransform.offsetX).toBeCloseTo(initialTransform.offsetX, 5)
          expect(finalTransform.offsetY).toBeCloseTo(initialTransform.offsetY, 5)
          
          // Reset for next iteration
          store.reset()
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: free-canvas-layout, Property 5: 缩放范围的边界正确性
 * 
 * For any zoom operation, the resulting scale value should always be 
 * within the valid range of 10% (0.1) to 400% (4.0).
 * 
 * **Validates: Requirements 3.3**
 */
describe('Property 5: Zoom Range Boundary Correctness', () => {
  beforeEach(() => {
    useCanvasLayoutStore.getState().reset()
  })

  it('zoomAtPoint always produces scale within valid range', () => {
    fc.assert(
      fc.property(
        canvasTransformArb,
        scaleArb,
        screenCoordsArb,
        (transform, newScale, mousePos) => {
          const result = zoomAtPoint(transform, newScale, mousePos.x, mousePos.y)
          
          // Scale should always be within bounds
          expect(result.scale).toBeGreaterThanOrEqual(MIN_SCALE)
          expect(result.scale).toBeLessThanOrEqual(MAX_SCALE)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('store zoom always produces scale within valid range', () => {
    fc.assert(
      fc.property(
        scaleArb,
        screenCoordsArb,
        (newScale, mousePos) => {
          const store = useCanvasLayoutStore.getState()
          
          // Apply zoom with potentially out-of-range scale
          store.zoom(newScale, mousePos.x, mousePos.y)
          
          const { transform } = useCanvasLayoutStore.getState()
          
          // Scale should always be clamped to valid range
          expect(transform.scale).toBeGreaterThanOrEqual(MIN_SCALE)
          expect(transform.scale).toBeLessThanOrEqual(MAX_SCALE)
          
          // Reset for next iteration
          store.reset()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('setTransform always clamps scale to valid range', () => {
    fc.assert(
      fc.property(
        fc.record({
          offsetX: fc.double({ min: -10000, max: 10000, noNaN: true }),
          offsetY: fc.double({ min: -10000, max: 10000, noNaN: true }),
          scale: fc.double({ min: 0.001, max: 10, noNaN: true }),
        }),
        (transform) => {
          const store = useCanvasLayoutStore.getState()
          
          // Set transform with potentially out-of-range scale
          store.setTransform(transform)
          
          const { transform: resultTransform } = useCanvasLayoutStore.getState()
          
          // Scale should always be clamped to valid range
          expect(resultTransform.scale).toBeGreaterThanOrEqual(MIN_SCALE)
          expect(resultTransform.scale).toBeLessThanOrEqual(MAX_SCALE)
          
          // Offset should be preserved
          expect(resultTransform.offsetX).toBe(transform.offsetX)
          expect(resultTransform.offsetY).toBe(transform.offsetY)
          
          // Reset for next iteration
          store.reset()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('scale at minimum boundary is exactly MIN_SCALE', () => {
    fc.assert(
      fc.property(
        canvasTransformArb,
        screenCoordsArb,
        fc.double({ min: 0.001, max: MIN_SCALE - 0.001, noNaN: true }),
        (transform, mousePos, belowMinScale) => {
          const result = zoomAtPoint(transform, belowMinScale, mousePos.x, mousePos.y)
          
          // Scale should be clamped to exactly MIN_SCALE
          expect(result.scale).toBe(MIN_SCALE)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('scale at maximum boundary is exactly MAX_SCALE', () => {
    fc.assert(
      fc.property(
        canvasTransformArb,
        screenCoordsArb,
        fc.double({ min: MAX_SCALE + 0.001, max: 10, noNaN: true }),
        (transform, mousePos, aboveMaxScale) => {
          const result = zoomAtPoint(transform, aboveMaxScale, mousePos.x, mousePos.y)
          
          // Scale should be clamped to exactly MAX_SCALE
          expect(result.scale).toBe(MAX_SCALE)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('scale within valid range is preserved exactly', () => {
    fc.assert(
      fc.property(
        canvasTransformArb,
        screenCoordsArb,
        fc.double({ min: MIN_SCALE, max: MAX_SCALE, noNaN: true }),
        (transform, mousePos, validScale) => {
          const result = zoomAtPoint(transform, validScale, mousePos.x, mousePos.y)
          
          // Scale should be preserved exactly when within valid range
          expect(result.scale).toBeCloseTo(validScale, 10)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('clamp utility function works correctly for scale values', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10, max: 20, noNaN: true }),
        (value) => {
          const clamped = clamp(value, MIN_SCALE, MAX_SCALE)
          
          // Result should always be within bounds
          expect(clamped).toBeGreaterThanOrEqual(MIN_SCALE)
          expect(clamped).toBeLessThanOrEqual(MAX_SCALE)
          
          // If value was within bounds, it should be unchanged
          if (value >= MIN_SCALE && value <= MAX_SCALE) {
            expect(clamped).toBe(value)
          }
          
          // If value was below min, result should be min
          if (value < MIN_SCALE) {
            expect(clamped).toBe(MIN_SCALE)
          }
          
          // If value was above max, result should be max
          if (value > MAX_SCALE) {
            expect(clamped).toBe(MAX_SCALE)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
