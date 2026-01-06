/**
 * Auto Layout Algorithm Tests
 * 自动布局算法测试
 * 
 * Unit tests for the auto layout functionality.
 * 
 * Requirements: 4.3
 */

import { describe, it, expect } from 'vitest'
import {
  autoLayoutLabels,
  calculateMissingPositions,
  mergeWithAutoLayout,
  calculateCenterPosition,
  findNonOverlappingPosition,
  DEFAULT_CARD_WIDTH,
  DEFAULT_CARD_HEIGHT,
  DEFAULT_GAP,
} from './autoLayout'
import { Point } from './canvasLayoutStore'

describe('autoLayoutLabels', () => {
  it('returns empty map for empty input', () => {
    const result = autoLayoutLabels([])
    expect(result.size).toBe(0)
  })

  it('places single label at origin', () => {
    const result = autoLayoutLabels(['start'])
    expect(result.get('start')).toEqual({ x: 0, y: 0 })
  })

  it('places labels in grid pattern', () => {
    const result = autoLayoutLabels(['a', 'b', 'c', 'd'])
    
    // Should be 2x2 grid (sqrt(4) = 2)
    const cellWidth = DEFAULT_CARD_WIDTH + DEFAULT_GAP
    const cellHeight = DEFAULT_CARD_HEIGHT + DEFAULT_GAP
    
    expect(result.get('a')).toEqual({ x: 0, y: 0 })
    expect(result.get('b')).toEqual({ x: cellWidth, y: 0 })
    expect(result.get('c')).toEqual({ x: 0, y: cellHeight })
    expect(result.get('d')).toEqual({ x: cellWidth, y: cellHeight })
  })

  it('respects custom options', () => {
    const result = autoLayoutLabels(['a', 'b'], {
      cardWidth: 100,
      cardHeight: 100,
      gap: 20,
      startX: 50,
      startY: 50,
    })
    
    expect(result.get('a')).toEqual({ x: 50, y: 50 })
    expect(result.get('b')).toEqual({ x: 170, y: 50 }) // 50 + (100 + 20)
  })

  it('respects maxColumns option', () => {
    const result = autoLayoutLabels(['a', 'b', 'c', 'd', 'e', 'f'], {
      maxColumns: 2,
    })
    
    const cellWidth = DEFAULT_CARD_WIDTH + DEFAULT_GAP
    const cellHeight = DEFAULT_CARD_HEIGHT + DEFAULT_GAP
    
    // Should be 2 columns, 3 rows
    expect(result.get('a')).toEqual({ x: 0, y: 0 })
    expect(result.get('b')).toEqual({ x: cellWidth, y: 0 })
    expect(result.get('c')).toEqual({ x: 0, y: cellHeight })
    expect(result.get('d')).toEqual({ x: cellWidth, y: cellHeight })
    expect(result.get('e')).toEqual({ x: 0, y: cellHeight * 2 })
    expect(result.get('f')).toEqual({ x: cellWidth, y: cellHeight * 2 })
  })

  it('calculates optimal columns for various counts', () => {
    // 1 label -> 1 column
    expect(autoLayoutLabels(['a']).get('a')).toEqual({ x: 0, y: 0 })
    
    // 9 labels -> 3 columns (sqrt(9) = 3)
    const result9 = autoLayoutLabels(['1', '2', '3', '4', '5', '6', '7', '8', '9'])
    const cellWidth = DEFAULT_CARD_WIDTH + DEFAULT_GAP
    expect(result9.get('3')).toEqual({ x: cellWidth * 2, y: 0 }) // Third column
    expect(result9.get('4')).toEqual({ x: 0, y: DEFAULT_CARD_HEIGHT + DEFAULT_GAP }) // Second row
  })
})

describe('calculateMissingPositions', () => {
  it('returns empty map when all labels have positions', () => {
    const existing = new Map<string, Point>([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 100, y: 0 }],
    ])
    
    const result = calculateMissingPositions(existing, ['a', 'b'])
    expect(result.size).toBe(0)
  })

  it('uses auto layout when no existing positions', () => {
    const result = calculateMissingPositions(new Map(), ['a', 'b'])
    
    expect(result.size).toBe(2)
    expect(result.has('a')).toBe(true)
    expect(result.has('b')).toBe(true)
  })

  it('places missing labels in available grid slots', () => {
    const cellWidth = DEFAULT_CARD_WIDTH + DEFAULT_GAP
    const existing = new Map<string, Point>([
      ['a', { x: 0, y: 0 }],
      ['b', { x: cellWidth, y: 0 }],
    ])
    
    const result = calculateMissingPositions(existing, ['a', 'b', 'c'])
    
    expect(result.size).toBe(1)
    expect(result.has('c')).toBe(true)
    // 'c' should be placed in an available slot
    const cPos = result.get('c')!
    expect(cPos.x).toBeGreaterThanOrEqual(0)
    expect(cPos.y).toBeGreaterThanOrEqual(0)
  })

  it('handles labels with non-grid-aligned positions', () => {
    const existing = new Map<string, Point>([
      ['a', { x: 123, y: 456 }],
    ])
    
    const result = calculateMissingPositions(existing, ['a', 'b'])
    
    expect(result.size).toBe(1)
    expect(result.has('b')).toBe(true)
  })
})

describe('mergeWithAutoLayout', () => {
  it('preserves existing positions', () => {
    const existing = new Map<string, Point>([
      ['a', { x: 100, y: 200 }],
    ])
    
    const result = mergeWithAutoLayout(existing, ['a', 'b'])
    
    expect(result.get('a')).toEqual({ x: 100, y: 200 })
  })

  it('adds positions for missing labels', () => {
    const existing = new Map<string, Point>([
      ['a', { x: 100, y: 200 }],
    ])
    
    const result = mergeWithAutoLayout(existing, ['a', 'b'])
    
    expect(result.size).toBe(2)
    expect(result.has('b')).toBe(true)
  })

  it('returns complete map for all labels', () => {
    const result = mergeWithAutoLayout(new Map(), ['a', 'b', 'c'])
    
    expect(result.size).toBe(3)
    expect(result.has('a')).toBe(true)
    expect(result.has('b')).toBe(true)
    expect(result.has('c')).toBe(true)
  })
})

describe('calculateCenterPosition', () => {
  it('centers in viewport when no existing positions', () => {
    const result = calculateCenterPosition(new Map(), 1200, 800)
    
    // Should be centered
    expect(result.x).toBe((1200 - DEFAULT_CARD_WIDTH) / 2)
    expect(result.y).toBe((800 - DEFAULT_CARD_HEIGHT) / 2)
  })

  it('calculates center of existing labels', () => {
    const existing = new Map<string, Point>([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 200, y: 200 }],
    ])
    
    const result = calculateCenterPosition(existing)
    
    // Center should be around (100, 100) plus offset
    expect(result.x).toBeGreaterThan(100)
    expect(result.y).toBeGreaterThan(100)
  })

  it('respects custom card dimensions', () => {
    const result = calculateCenterPosition(new Map(), 1000, 600, 200, 150)
    
    expect(result.x).toBe((1000 - 200) / 2)
    expect(result.y).toBe((600 - 150) / 2)
  })
})

describe('findNonOverlappingPosition', () => {
  it('returns target position when no overlap', () => {
    const target: Point = { x: 500, y: 500 }
    const existing = new Map<string, Point>([
      ['a', { x: 0, y: 0 }],
    ])
    
    const result = findNonOverlappingPosition(target, existing)
    
    expect(result).toEqual(target)
  })

  it('finds non-overlapping position when target overlaps', () => {
    const target: Point = { x: 0, y: 0 }
    const existing = new Map<string, Point>([
      ['a', { x: 0, y: 0 }],
    ])
    
    const result = findNonOverlappingPosition(target, existing)
    
    // Should be different from target
    expect(result.x !== 0 || result.y !== 0).toBe(true)
  })

  it('handles multiple overlapping positions', () => {
    const cellWidth = DEFAULT_CARD_WIDTH + DEFAULT_GAP
    const cellHeight = DEFAULT_CARD_HEIGHT + DEFAULT_GAP
    
    const existing = new Map<string, Point>([
      ['a', { x: 0, y: 0 }],
      ['b', { x: cellWidth, y: 0 }],
      ['c', { x: 0, y: cellHeight }],
    ])
    
    const result = findNonOverlappingPosition({ x: 0, y: 0 }, existing)
    
    // Should find a non-overlapping position
    let overlaps = false
    for (const pos of existing.values()) {
      const dx = Math.abs(result.x - pos.x)
      const dy = Math.abs(result.y - pos.y)
      if (dx < DEFAULT_CARD_WIDTH + DEFAULT_GAP && dy < DEFAULT_CARD_HEIGHT + DEFAULT_GAP) {
        overlaps = true
        break
      }
    }
    expect(overlaps).toBe(false)
  })

  it('respects custom dimensions', () => {
    const target: Point = { x: 0, y: 0 }
    const existing = new Map<string, Point>([
      ['a', { x: 0, y: 0 }],
    ])
    
    const result = findNonOverlappingPosition(target, existing, 100, 100, 10)
    
    // Should be at least 110 pixels away in one direction
    const dx = Math.abs(result.x - 0)
    const dy = Math.abs(result.y - 0)
    expect(dx >= 110 || dy >= 110).toBe(true)
  })
})
