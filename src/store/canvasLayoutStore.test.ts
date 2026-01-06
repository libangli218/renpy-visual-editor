import { describe, it, expect, beforeEach } from 'vitest'
import {
  useCanvasLayoutStore,
  CanvasTransform,
  Point,
  MIN_SCALE,
  MAX_SCALE,
  DEFAULT_SCALE,
} from './canvasLayoutStore'

describe('CanvasLayoutStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCanvasLayoutStore.getState().reset()
  })

  describe('Initial State', () => {
    it('should have default transform values', () => {
      const { transform } = useCanvasLayoutStore.getState()
      expect(transform.offsetX).toBe(0)
      expect(transform.offsetY).toBe(0)
      expect(transform.scale).toBe(DEFAULT_SCALE)
    })

    it('should have empty label positions', () => {
      const { labelPositions } = useCanvasLayoutStore.getState()
      expect(labelPositions.size).toBe(0)
    })

    it('should have empty selection', () => {
      const { selectedLabels } = useCanvasLayoutStore.getState()
      expect(selectedLabels.size).toBe(0)
    })
  })

  describe('Pan Operations', () => {
    it('should update offset when panning', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.pan(100, 50)
      
      const { transform } = useCanvasLayoutStore.getState()
      expect(transform.offsetX).toBe(100)
      expect(transform.offsetY).toBe(50)
    })

    it('should accumulate pan operations', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.pan(100, 50)
      store.pan(-30, 20)
      
      const { transform } = useCanvasLayoutStore.getState()
      expect(transform.offsetX).toBe(70)
      expect(transform.offsetY).toBe(70)
    })

    it('should preserve scale when panning', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.zoom(2.0, 0, 0)
      const scaleBefore = useCanvasLayoutStore.getState().transform.scale
      
      store.pan(100, 50)
      
      const { transform } = useCanvasLayoutStore.getState()
      expect(transform.scale).toBe(scaleBefore)
    })
  })

  describe('Zoom Operations', () => {
    it('should update scale when zooming', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.zoom(2.0, 0, 0)
      
      const { transform } = useCanvasLayoutStore.getState()
      expect(transform.scale).toBe(2.0)
    })

    it('should clamp scale to minimum', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.zoom(0.01, 0, 0)
      
      const { transform } = useCanvasLayoutStore.getState()
      expect(transform.scale).toBe(MIN_SCALE)
    })

    it('should clamp scale to maximum', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.zoom(10.0, 0, 0)
      
      const { transform } = useCanvasLayoutStore.getState()
      expect(transform.scale).toBe(MAX_SCALE)
    })

    it('should zoom at mouse position (point stays stationary)', () => {
      const store = useCanvasLayoutStore.getState()
      
      // Set initial transform
      store.setTransform({ offsetX: 100, offsetY: 100, scale: 1.0 })
      
      // Zoom at point (200, 200) in screen coordinates
      const mouseX = 200
      const mouseY = 200
      
      // Before zoom, calculate canvas position under mouse
      const transformBefore = useCanvasLayoutStore.getState().transform
      const canvasXBefore = (mouseX - transformBefore.offsetX) / transformBefore.scale
      const canvasYBefore = (mouseY - transformBefore.offsetY) / transformBefore.scale
      
      // Zoom to 2x
      store.zoom(2.0, mouseX, mouseY)
      
      // After zoom, calculate canvas position under mouse
      const transformAfter = useCanvasLayoutStore.getState().transform
      const canvasXAfter = (mouseX - transformAfter.offsetX) / transformAfter.scale
      const canvasYAfter = (mouseY - transformAfter.offsetY) / transformAfter.scale
      
      // The canvas position under the mouse should be the same
      expect(canvasXAfter).toBeCloseTo(canvasXBefore, 5)
      expect(canvasYAfter).toBeCloseTo(canvasYBefore, 5)
    })
  })

  describe('Reset Zoom', () => {
    it('should reset to default values', () => {
      const store = useCanvasLayoutStore.getState()
      
      // Apply some transformations
      store.pan(100, 50)
      store.zoom(2.0, 0, 0)
      
      // Reset
      store.resetZoom()
      
      const { transform } = useCanvasLayoutStore.getState()
      expect(transform.offsetX).toBe(0)
      expect(transform.offsetY).toBe(0)
      expect(transform.scale).toBe(DEFAULT_SCALE)
    })
  })

  describe('Label Positions', () => {
    it('should set single label position', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.setLabelPosition('start', { x: 100, y: 200 })
      
      const { labelPositions } = useCanvasLayoutStore.getState()
      expect(labelPositions.get('start')).toEqual({ x: 100, y: 200 })
    })

    it('should update existing label position', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.setLabelPosition('start', { x: 100, y: 200 })
      store.setLabelPosition('start', { x: 300, y: 400 })
      
      const { labelPositions } = useCanvasLayoutStore.getState()
      expect(labelPositions.get('start')).toEqual({ x: 300, y: 400 })
    })

    it('should set multiple label positions', () => {
      const store = useCanvasLayoutStore.getState()
      
      const positions = new Map<string, Point>([
        ['start', { x: 0, y: 0 }],
        ['chapter1', { x: 400, y: 0 }],
        ['chapter2', { x: 0, y: 400 }],
      ])
      
      store.setLabelPositions(positions)
      
      const { labelPositions } = useCanvasLayoutStore.getState()
      expect(labelPositions.size).toBe(3)
      expect(labelPositions.get('start')).toEqual({ x: 0, y: 0 })
      expect(labelPositions.get('chapter1')).toEqual({ x: 400, y: 0 })
      expect(labelPositions.get('chapter2')).toEqual({ x: 0, y: 400 })
    })

    it('should replace all positions when setting multiple', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.setLabelPosition('old', { x: 100, y: 100 })
      
      const newPositions = new Map<string, Point>([
        ['new1', { x: 0, y: 0 }],
        ['new2', { x: 100, y: 100 }],
      ])
      
      store.setLabelPositions(newPositions)
      
      const { labelPositions } = useCanvasLayoutStore.getState()
      expect(labelPositions.has('old')).toBe(false)
      expect(labelPositions.size).toBe(2)
    })
  })

  describe('Selection', () => {
    it('should select a single label', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.selectLabel('start', false)
      
      const { selectedLabels } = useCanvasLayoutStore.getState()
      expect(selectedLabels.has('start')).toBe(true)
      expect(selectedLabels.size).toBe(1)
    })

    it('should replace selection when not additive', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.selectLabel('start', false)
      store.selectLabel('chapter1', false)
      
      const { selectedLabels } = useCanvasLayoutStore.getState()
      expect(selectedLabels.has('start')).toBe(false)
      expect(selectedLabels.has('chapter1')).toBe(true)
      expect(selectedLabels.size).toBe(1)
    })

    it('should add to selection when additive', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.selectLabel('start', false)
      store.selectLabel('chapter1', true)
      
      const { selectedLabels } = useCanvasLayoutStore.getState()
      expect(selectedLabels.has('start')).toBe(true)
      expect(selectedLabels.has('chapter1')).toBe(true)
      expect(selectedLabels.size).toBe(2)
    })

    it('should toggle off when additive and already selected', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.selectLabel('start', false)
      store.selectLabel('start', true)
      
      const { selectedLabels } = useCanvasLayoutStore.getState()
      expect(selectedLabels.has('start')).toBe(false)
      expect(selectedLabels.size).toBe(0)
    })

    it('should select multiple labels', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.selectLabels(['start', 'chapter1', 'chapter2'])
      
      const { selectedLabels } = useCanvasLayoutStore.getState()
      expect(selectedLabels.size).toBe(3)
      expect(selectedLabels.has('start')).toBe(true)
      expect(selectedLabels.has('chapter1')).toBe(true)
      expect(selectedLabels.has('chapter2')).toBe(true)
    })

    it('should clear selection', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.selectLabels(['start', 'chapter1'])
      store.clearSelection()
      
      const { selectedLabels } = useCanvasLayoutStore.getState()
      expect(selectedLabels.size).toBe(0)
    })

    it('should deselect specific label', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.selectLabels(['start', 'chapter1', 'chapter2'])
      store.deselectLabel('chapter1')
      
      const { selectedLabels } = useCanvasLayoutStore.getState()
      expect(selectedLabels.size).toBe(2)
      expect(selectedLabels.has('start')).toBe(true)
      expect(selectedLabels.has('chapter1')).toBe(false)
      expect(selectedLabels.has('chapter2')).toBe(true)
    })
  })

  describe('UI State', () => {
    it('should set panning state', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.setIsPanning(true)
      expect(useCanvasLayoutStore.getState().isPanning).toBe(true)
      
      store.setIsPanning(false)
      expect(useCanvasLayoutStore.getState().isPanning).toBe(false)
    })

    it('should set space pressed state', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.setIsSpacePressed(true)
      expect(useCanvasLayoutStore.getState().isSpacePressed).toBe(true)
      
      store.setIsSpacePressed(false)
      expect(useCanvasLayoutStore.getState().isSpacePressed).toBe(false)
    })

    it('should set snap guides', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.setSnapGuides({
        horizontal: [100, 200, 300],
        vertical: [50, 150],
      })
      
      const { snapGuides } = useCanvasLayoutStore.getState()
      expect(snapGuides.horizontal).toEqual([100, 200, 300])
      expect(snapGuides.vertical).toEqual([50, 150])
    })

    it('should set snap disabled state', () => {
      const store = useCanvasLayoutStore.getState()
      
      store.setSnapDisabled(true)
      expect(useCanvasLayoutStore.getState().snapDisabled).toBe(true)
      
      store.setSnapDisabled(false)
      expect(useCanvasLayoutStore.getState().snapDisabled).toBe(false)
    })
  })

  describe('Fit All', () => {
    it('should reset to default when no labels', () => {
      const store = useCanvasLayoutStore.getState()
      
      // Apply some transformations first
      store.pan(100, 50)
      store.zoom(2.0, 0, 0)
      
      // Fit all with empty labels
      store.fitAll([])
      
      const { transform } = useCanvasLayoutStore.getState()
      expect(transform.offsetX).toBe(0)
      expect(transform.offsetY).toBe(0)
      expect(transform.scale).toBe(DEFAULT_SCALE)
    })

    it('should calculate transform to fit labels', () => {
      const store = useCanvasLayoutStore.getState()
      
      const labels = [
        { name: 'start', x: 0, y: 0, width: 300, height: 400 },
        { name: 'chapter1', x: 400, y: 0, width: 300, height: 400 },
      ]
      
      store.fitAll(labels)
      
      const { transform } = useCanvasLayoutStore.getState()
      // Scale should be calculated to fit content
      expect(transform.scale).toBeGreaterThan(0)
      expect(transform.scale).toBeLessThanOrEqual(MAX_SCALE)
    })
  })
})
