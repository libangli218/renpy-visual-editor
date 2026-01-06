import { describe, it, expect } from 'vitest'
import {
  screenToCanvas,
  canvasToScreen,
  zoomAtPoint,
  screenRectToCanvas,
  canvasRectToScreen,
  isPointInRect,
  doRectsIntersect,
  getBoundingBox,
  getRectCenter,
  getDistance,
  clamp,
  calculateFitTransform,
} from './canvasUtils'
import { CanvasTransform, MIN_SCALE, MAX_SCALE } from './canvasLayoutStore'

describe('Canvas Utils', () => {
  describe('screenToCanvas', () => {
    it('should convert screen to canvas coordinates with no transform', () => {
      const transform: CanvasTransform = { offsetX: 0, offsetY: 0, scale: 1 }
      const result = screenToCanvas(100, 200, transform)
      expect(result).toEqual({ x: 100, y: 200 })
    })

    it('should account for offset', () => {
      const transform: CanvasTransform = { offsetX: 50, offsetY: 100, scale: 1 }
      const result = screenToCanvas(150, 300, transform)
      expect(result).toEqual({ x: 100, y: 200 })
    })

    it('should account for scale', () => {
      const transform: CanvasTransform = { offsetX: 0, offsetY: 0, scale: 2 }
      const result = screenToCanvas(200, 400, transform)
      expect(result).toEqual({ x: 100, y: 200 })
    })

    it('should account for both offset and scale', () => {
      const transform: CanvasTransform = { offsetX: 100, offsetY: 50, scale: 2 }
      const result = screenToCanvas(300, 250, transform)
      expect(result).toEqual({ x: 100, y: 100 })
    })
  })

  describe('canvasToScreen', () => {
    it('should convert canvas to screen coordinates with no transform', () => {
      const transform: CanvasTransform = { offsetX: 0, offsetY: 0, scale: 1 }
      const result = canvasToScreen(100, 200, transform)
      expect(result).toEqual({ x: 100, y: 200 })
    })

    it('should account for offset', () => {
      const transform: CanvasTransform = { offsetX: 50, offsetY: 100, scale: 1 }
      const result = canvasToScreen(100, 200, transform)
      expect(result).toEqual({ x: 150, y: 300 })
    })

    it('should account for scale', () => {
      const transform: CanvasTransform = { offsetX: 0, offsetY: 0, scale: 2 }
      const result = canvasToScreen(100, 200, transform)
      expect(result).toEqual({ x: 200, y: 400 })
    })

    it('should account for both offset and scale', () => {
      const transform: CanvasTransform = { offsetX: 100, offsetY: 50, scale: 2 }
      const result = canvasToScreen(100, 100, transform)
      expect(result).toEqual({ x: 300, y: 250 })
    })
  })

  describe('screenToCanvas and canvasToScreen are inverses', () => {
    it('should be inverse operations', () => {
      const transform: CanvasTransform = { offsetX: 123, offsetY: 456, scale: 1.5 }
      const screenX = 500
      const screenY = 600
      
      const canvas = screenToCanvas(screenX, screenY, transform)
      const screen = canvasToScreen(canvas.x, canvas.y, transform)
      
      expect(screen.x).toBeCloseTo(screenX, 10)
      expect(screen.y).toBeCloseTo(screenY, 10)
    })
  })

  describe('zoomAtPoint', () => {
    it('should keep point stationary when zooming', () => {
      const transform: CanvasTransform = { offsetX: 100, offsetY: 100, scale: 1 }
      const mouseX = 300
      const mouseY = 300
      
      // Calculate canvas position before zoom
      const canvasBefore = screenToCanvas(mouseX, mouseY, transform)
      
      // Zoom
      const newTransform = zoomAtPoint(transform, 2, mouseX, mouseY)
      
      // Calculate canvas position after zoom
      const canvasAfter = screenToCanvas(mouseX, mouseY, newTransform)
      
      expect(canvasAfter.x).toBeCloseTo(canvasBefore.x, 10)
      expect(canvasAfter.y).toBeCloseTo(canvasBefore.y, 10)
    })

    it('should clamp scale to minimum', () => {
      const transform: CanvasTransform = { offsetX: 0, offsetY: 0, scale: 1 }
      const result = zoomAtPoint(transform, 0.01, 0, 0)
      expect(result.scale).toBe(MIN_SCALE)
    })

    it('should clamp scale to maximum', () => {
      const transform: CanvasTransform = { offsetX: 0, offsetY: 0, scale: 1 }
      const result = zoomAtPoint(transform, 10, 0, 0)
      expect(result.scale).toBe(MAX_SCALE)
    })
  })

  describe('screenRectToCanvas', () => {
    it('should convert screen rect to canvas coordinates', () => {
      const transform: CanvasTransform = { offsetX: 100, offsetY: 50, scale: 2 }
      const screenRect = { x: 200, y: 150, width: 100, height: 80 }
      
      const result = screenRectToCanvas(screenRect, transform)
      
      expect(result.x).toBe(50)
      expect(result.y).toBe(50)
      expect(result.width).toBe(50)
      expect(result.height).toBe(40)
    })
  })

  describe('canvasRectToScreen', () => {
    it('should convert canvas rect to screen coordinates', () => {
      const transform: CanvasTransform = { offsetX: 100, offsetY: 50, scale: 2 }
      const canvasRect = { x: 50, y: 50, width: 50, height: 40 }
      
      const result = canvasRectToScreen(canvasRect, transform)
      
      expect(result.x).toBe(200)
      expect(result.y).toBe(150)
      expect(result.width).toBe(100)
      expect(result.height).toBe(80)
    })
  })

  describe('isPointInRect', () => {
    const rect = { x: 100, y: 100, width: 200, height: 150 }

    it('should return true for point inside rect', () => {
      expect(isPointInRect({ x: 150, y: 150 }, rect)).toBe(true)
    })

    it('should return true for point on edge', () => {
      expect(isPointInRect({ x: 100, y: 100 }, rect)).toBe(true)
      expect(isPointInRect({ x: 300, y: 250 }, rect)).toBe(true)
    })

    it('should return false for point outside rect', () => {
      expect(isPointInRect({ x: 50, y: 150 }, rect)).toBe(false)
      expect(isPointInRect({ x: 350, y: 150 }, rect)).toBe(false)
      expect(isPointInRect({ x: 150, y: 50 }, rect)).toBe(false)
      expect(isPointInRect({ x: 150, y: 300 }, rect)).toBe(false)
    })
  })

  describe('doRectsIntersect', () => {
    it('should return true for overlapping rects', () => {
      const rect1 = { x: 0, y: 0, width: 100, height: 100 }
      const rect2 = { x: 50, y: 50, width: 100, height: 100 }
      expect(doRectsIntersect(rect1, rect2)).toBe(true)
    })

    it('should return true for touching rects', () => {
      const rect1 = { x: 0, y: 0, width: 100, height: 100 }
      const rect2 = { x: 100, y: 0, width: 100, height: 100 }
      expect(doRectsIntersect(rect1, rect2)).toBe(true)
    })

    it('should return false for non-overlapping rects', () => {
      const rect1 = { x: 0, y: 0, width: 100, height: 100 }
      const rect2 = { x: 200, y: 200, width: 100, height: 100 }
      expect(doRectsIntersect(rect1, rect2)).toBe(false)
    })

    it('should return true for contained rect', () => {
      const rect1 = { x: 0, y: 0, width: 200, height: 200 }
      const rect2 = { x: 50, y: 50, width: 50, height: 50 }
      expect(doRectsIntersect(rect1, rect2)).toBe(true)
    })
  })

  describe('getBoundingBox', () => {
    it('should return null for empty array', () => {
      expect(getBoundingBox([])).toBeNull()
    })

    it('should return same rect for single rect', () => {
      const rect = { x: 100, y: 100, width: 200, height: 150 }
      expect(getBoundingBox([rect])).toEqual(rect)
    })

    it('should calculate bounding box for multiple rects', () => {
      const rects = [
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 200, y: 150, width: 100, height: 100 },
      ]
      const result = getBoundingBox(rects)
      expect(result).toEqual({ x: 0, y: 0, width: 300, height: 250 })
    })
  })

  describe('getRectCenter', () => {
    it('should calculate center of rect', () => {
      const rect = { x: 100, y: 100, width: 200, height: 100 }
      expect(getRectCenter(rect)).toEqual({ x: 200, y: 150 })
    })
  })

  describe('getDistance', () => {
    it('should calculate distance between points', () => {
      expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
      expect(getDistance({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0)
    })
  })

  describe('clamp', () => {
    it('should clamp value to range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
    })
  })

  describe('calculateFitTransform', () => {
    it('should calculate transform to fit content', () => {
      const contentBounds = { x: 0, y: 0, width: 1000, height: 800 }
      const result = calculateFitTransform(contentBounds, 1200, 900, 50)
      
      // Scale should fit content with padding
      expect(result.scale).toBeGreaterThan(0)
      expect(result.scale).toBeLessThanOrEqual(MAX_SCALE)
    })

    it('should clamp scale to valid range', () => {
      // Very large content should result in minimum scale
      const largeContent = { x: 0, y: 0, width: 100000, height: 100000 }
      const result = calculateFitTransform(largeContent, 800, 600, 50)
      expect(result.scale).toBeGreaterThanOrEqual(MIN_SCALE)
    })
  })
})
