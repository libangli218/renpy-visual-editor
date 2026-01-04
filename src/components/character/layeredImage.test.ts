/**
 * Layered Image Tests
 * 
 * Tests for layered image functionality.
 * Implements Requirements 7.4: Layered Image support
 */

import { describe, it, expect } from 'vitest'
import {
  LayeredImageDef,
  generateLayeredImageCode,
  parseLayeredImageCode,
  isValidLayerName,
  createEmptyLayerAttribute,
  createDefaultLayeredImageDef,
} from './types'

describe('Layered Image', () => {
  describe('isValidLayerName', () => {
    it('should accept valid Python identifiers', () => {
      expect(isValidLayerName('outfit')).toBe(true)
      expect(isValidLayerName('expression')).toBe(true)
      expect(isValidLayerName('accessory')).toBe(true)
      expect(isValidLayerName('layer_1')).toBe(true)
      expect(isValidLayerName('_private')).toBe(true)
    })

    it('should reject invalid identifiers', () => {
      expect(isValidLayerName('')).toBe(false)
      expect(isValidLayerName('123')).toBe(false)
      expect(isValidLayerName('my-layer')).toBe(false)
      expect(isValidLayerName('my layer')).toBe(false)
      expect(isValidLayerName('1layer')).toBe(false)
    })
  })

  describe('createEmptyLayerAttribute', () => {
    it('should create an empty layer attribute', () => {
      const attr = createEmptyLayerAttribute()
      expect(attr.name).toBe('')
      expect(attr.options).toEqual([])
      expect(attr.default).toBeUndefined()
    })
  })

  describe('createDefaultLayeredImageDef', () => {
    it('should create a default layered image definition', () => {
      const def = createDefaultLayeredImageDef('sylvie')
      expect(def.name).toBe('sylvie')
      expect(def.attributes).toEqual([])
    })
  })

  describe('generateLayeredImageCode', () => {
    it('should generate empty string for empty layers', () => {
      const layers: LayeredImageDef = {
        name: 'sylvie',
        attributes: [],
      }
      expect(generateLayeredImageCode(layers)).toBe('')
    })

    it('should generate empty string for layers without name', () => {
      const layers: LayeredImageDef = {
        name: '',
        attributes: [{ name: 'outfit', options: ['casual'], default: 'casual' }],
      }
      expect(generateLayeredImageCode(layers)).toBe('')
    })

    it('should generate simple layered image code', () => {
      const layers: LayeredImageDef = {
        name: 'sylvie',
        attributes: [
          { name: 'outfit', options: ['casual', 'dress'], default: 'casual' },
        ],
      }
      const code = generateLayeredImageCode(layers)
      expect(code).toContain('layeredimage sylvie:')
      expect(code).toContain('group outfit:')
      expect(code).toContain('attribute casual default')
      expect(code).toContain('attribute dress')
    })

    it('should generate layered image with multiple groups', () => {
      const layers: LayeredImageDef = {
        name: 'sylvie',
        attributes: [
          { name: 'outfit', options: ['casual', 'dress'], default: 'casual' },
          { name: 'expression', options: ['happy', 'sad'], default: 'happy' },
        ],
      }
      const code = generateLayeredImageCode(layers)
      expect(code).toContain('layeredimage sylvie:')
      expect(code).toContain('group outfit:')
      expect(code).toContain('group expression:')
      expect(code).toContain('attribute casual default')
      expect(code).toContain('attribute happy default')
    })

    it('should skip groups without options', () => {
      const layers: LayeredImageDef = {
        name: 'sylvie',
        attributes: [
          { name: 'outfit', options: [], default: undefined },
          { name: 'expression', options: ['happy'], default: 'happy' },
        ],
      }
      const code = generateLayeredImageCode(layers)
      expect(code).not.toContain('group outfit:')
      expect(code).toContain('group expression:')
    })

    it('should handle no default option', () => {
      const layers: LayeredImageDef = {
        name: 'sylvie',
        attributes: [
          { name: 'outfit', options: ['casual', 'dress'], default: undefined },
        ],
      }
      const code = generateLayeredImageCode(layers)
      expect(code).toContain('attribute casual')
      expect(code).toContain('attribute dress')
      expect(code).not.toContain('default')
    })
  })

  describe('parseLayeredImageCode', () => {
    it('should return null for invalid code', () => {
      expect(parseLayeredImageCode('')).toBeNull()
      expect(parseLayeredImageCode('define x = 1')).toBeNull()
      expect(parseLayeredImageCode('label start:')).toBeNull()
    })

    it('should parse simple layered image', () => {
      const code = `layeredimage sylvie:
    group outfit:
        attribute casual default
        attribute dress`
      
      const result = parseLayeredImageCode(code)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('sylvie')
      expect(result!.attributes).toHaveLength(1)
      expect(result!.attributes[0].name).toBe('outfit')
      expect(result!.attributes[0].options).toEqual(['casual', 'dress'])
      expect(result!.attributes[0].default).toBe('casual')
    })

    it('should parse layered image with multiple groups', () => {
      const code = `layeredimage sylvie:
    group outfit:
        attribute casual default
        attribute dress
    group expression:
        attribute happy default
        attribute sad`
      
      const result = parseLayeredImageCode(code)
      expect(result).not.toBeNull()
      expect(result!.name).toBe('sylvie')
      expect(result!.attributes).toHaveLength(2)
      expect(result!.attributes[0].name).toBe('outfit')
      expect(result!.attributes[1].name).toBe('expression')
    })

    it('should handle no default attribute', () => {
      const code = `layeredimage sylvie:
    group outfit:
        attribute casual
        attribute dress`
      
      const result = parseLayeredImageCode(code)
      expect(result).not.toBeNull()
      expect(result!.attributes[0].default).toBeUndefined()
    })
  })

  describe('Round-trip: generate then parse', () => {
    it('should preserve data through generate and parse', () => {
      const original: LayeredImageDef = {
        name: 'sylvie',
        attributes: [
          { name: 'outfit', options: ['casual', 'dress'], default: 'casual' },
          { name: 'expression', options: ['happy', 'sad', 'surprised'], default: 'happy' },
        ],
      }
      
      const code = generateLayeredImageCode(original)
      const parsed = parseLayeredImageCode(code)
      
      expect(parsed).not.toBeNull()
      expect(parsed!.name).toBe(original.name)
      expect(parsed!.attributes).toHaveLength(original.attributes.length)
      
      for (let i = 0; i < original.attributes.length; i++) {
        expect(parsed!.attributes[i].name).toBe(original.attributes[i].name)
        expect(parsed!.attributes[i].options).toEqual(original.attributes[i].options)
        expect(parsed!.attributes[i].default).toBe(original.attributes[i].default)
      }
    })
  })
})
