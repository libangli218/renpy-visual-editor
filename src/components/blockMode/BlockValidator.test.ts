/**
 * BlockValidator Unit Tests
 * 积木验证器单元测试
 * 
 * Tests for block validation functionality.
 * 
 * Implements Requirements:
 * - 10.1: 必填属性槽为空时以视觉方式标记该槽位
 * - 10.2: Jump/Call 目标 Label 不存在时显示警告标记
 * - 10.3: 资源文件不存在时显示缺失资源警告
 * - 10.5: 在积木面板旁显示当前错误数量汇总
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BlockValidator, createBlockValidator } from './BlockValidator'
import { Block, ValidationContext, BlockSlot } from './types'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a test block with specified properties
 */
function createTestBlock(
  type: Block['type'],
  slots: BlockSlot[],
  options?: Partial<Block>
): Block {
  return {
    id: `test_block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    category: 'flow',
    astNodeId: `ast_${Date.now()}`,
    slots,
    collapsed: false,
    selected: false,
    hasError: false,
    ...options,
  }
}

/**
 * Create a default validation context
 */
function createTestContext(overrides?: Partial<ValidationContext>): ValidationContext {
  return {
    availableLabels: ['start', 'chapter1', 'ending'],
    availableCharacters: ['alice', 'bob', 'narrator'],
    availableImages: ['bg_room', 'bg_forest', 'alice_happy', 'alice_sad'],
    availableAudio: ['bgm_theme.ogg', 'sfx_click.ogg', 'voice_hello.ogg'],
    ...overrides,
  }
}

// ============================================================================
// Unit Tests
// ============================================================================

describe('BlockValidator', () => {
  let validator: BlockValidator
  let context: ValidationContext

  beforeEach(() => {
    validator = new BlockValidator()
    context = createTestContext()
  })

  describe('validateBlock', () => {
    it('should return valid result for block with all required slots filled', () => {
      const block = createTestBlock('dialogue', [
        { name: 'speaker', type: 'character', value: 'alice', required: false },
        { name: 'text', type: 'multiline', value: 'Hello!', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return invalid result for block with empty required slot', () => {
      const block = createTestBlock('dialogue', [
        { name: 'speaker', type: 'character', value: null, required: false },
        { name: 'text', type: 'multiline', value: '', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('required')
      expect(result.errors[0].slotName).toBe('text')
    })
  })

  describe('Required Slot Validation (Requirement 10.1)', () => {
    it('should detect empty required text slot', () => {
      const block = createTestBlock('dialogue', [
        { name: 'text', type: 'multiline', value: '', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('required')
      expect(result.errors[0].blockId).toBe(block.id)
      expect(result.errors[0].slotName).toBe('text')
    })

    it('should detect null required slot', () => {
      const block = createTestBlock('scene', [
        { name: 'image', type: 'image', value: null, required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('required')
    })

    it('should detect whitespace-only required slot', () => {
      const block = createTestBlock('dialogue', [
        { name: 'text', type: 'multiline', value: '   ', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('required')
    })

    it('should not flag optional empty slots', () => {
      const block = createTestBlock('dialogue', [
        { name: 'speaker', type: 'character', value: null, required: false },
        { name: 'text', type: 'multiline', value: 'Hello', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect multiple empty required slots', () => {
      const block = createTestBlock('show', [
        { name: 'character', type: 'character', value: '', required: true },
        { name: 'position', type: 'position', value: '', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors).toHaveLength(2)
      expect(result.errors.every(e => e.type === 'required')).toBe(true)
    })
  })

  describe('Target Reference Validation (Requirement 10.2)', () => {
    it('should detect invalid jump target', () => {
      const block = createTestBlock('jump', [
        { name: 'target', type: 'label', value: 'nonexistent_label', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.some(e => e.type === 'invalid-target')).toBe(true)
      const targetError = result.errors.find(e => e.type === 'invalid-target')
      expect(targetError?.message).toContain('nonexistent_label')
    })

    it('should detect invalid call target', () => {
      const block = createTestBlock('call', [
        { name: 'target', type: 'label', value: 'missing_subroutine', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.some(e => e.type === 'invalid-target')).toBe(true)
    })

    it('should accept valid jump target', () => {
      const block = createTestBlock('jump', [
        { name: 'target', type: 'label', value: 'chapter1', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.filter(e => e.type === 'invalid-target')).toHaveLength(0)
    })

    it('should accept valid call target', () => {
      const block = createTestBlock('call', [
        { name: 'target', type: 'label', value: 'start', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.filter(e => e.type === 'invalid-target')).toHaveLength(0)
    })

    it('should not validate target for non-jump/call blocks', () => {
      const block = createTestBlock('dialogue', [
        { name: 'target', type: 'label', value: 'nonexistent', required: false },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.filter(e => e.type === 'invalid-target')).toHaveLength(0)
    })

    it('should not flag empty target (handled by required validation)', () => {
      const block = createTestBlock('jump', [
        { name: 'target', type: 'label', value: '', required: true },
      ])

      const result = validator.validateBlock(block, context)

      // Should have required error but not invalid-target
      expect(result.errors.some(e => e.type === 'required')).toBe(true)
      expect(result.errors.filter(e => e.type === 'invalid-target')).toHaveLength(0)
    })
  })

  describe('Resource Reference Validation (Requirement 10.3)', () => {
    it('should detect missing image resource', () => {
      const block = createTestBlock('scene', [
        { name: 'image', type: 'image', value: 'nonexistent_bg', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.some(e => e.type === 'missing-resource')).toBe(true)
      const resourceError = result.errors.find(e => e.type === 'missing-resource')
      expect(resourceError?.message).toContain('nonexistent_bg')
    })

    it('should detect missing audio resource', () => {
      const block = createTestBlock('play-music', [
        { name: 'file', type: 'audio', value: 'missing_music.ogg', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.some(e => e.type === 'missing-resource')).toBe(true)
    })

    it('should not validate character in show block (uses image tags)', () => {
      // Show blocks use image tags (e.g., "sylvie") not script-defined characters (e.g., "s")
      // So character validation is skipped for show/hide blocks
      const block = createTestBlock('show', [
        { name: 'character', type: 'character', value: 'unknown_char', required: true },
      ])

      const result = validator.validateBlock(block, context)

      // Should NOT have missing-resource error because show blocks skip character validation
      expect(result.errors.some(e => e.type === 'missing-resource')).toBe(false)
    })

    it('should accept valid image resource', () => {
      const block = createTestBlock('scene', [
        { name: 'image', type: 'image', value: 'bg_room', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.filter(e => e.type === 'missing-resource')).toHaveLength(0)
    })

    it('should accept valid audio resource', () => {
      const block = createTestBlock('play-music', [
        { name: 'file', type: 'audio', value: 'bgm_theme.ogg', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.filter(e => e.type === 'missing-resource')).toHaveLength(0)
    })

    it('should not validate empty resource slots', () => {
      const block = createTestBlock('scene', [
        { name: 'image', type: 'image', value: '', required: true },
      ])

      const result = validator.validateBlock(block, context)

      // Should have required error but not missing-resource
      expect(result.errors.some(e => e.type === 'required')).toBe(true)
      expect(result.errors.filter(e => e.type === 'missing-resource')).toHaveLength(0)
    })

    it('should not validate character in dialogue blocks', () => {
      // Dialogue blocks can have any speaker (including undefined characters)
      const block = createTestBlock('dialogue', [
        { name: 'speaker', type: 'character', value: 'mystery_person', required: false },
        { name: 'text', type: 'multiline', value: 'Hello', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.filter(e => e.type === 'missing-resource')).toHaveLength(0)
    })
  })

  describe('Expression Validation', () => {
    it('should detect unbalanced parentheses', () => {
      const block = createTestBlock('if', [
        { name: 'condition', type: 'expression', value: '(score > 10', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.some(e => e.type === 'syntax')).toBe(true)
    })

    it('should detect unbalanced brackets', () => {
      const block = createTestBlock('if', [
        { name: 'condition', type: 'expression', value: 'items[0', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.some(e => e.type === 'syntax')).toBe(true)
    })

    it('should detect unbalanced quotes', () => {
      const block = createTestBlock('if', [
        { name: 'condition', type: 'expression', value: 'name == "alice', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.some(e => e.type === 'syntax')).toBe(true)
    })

    it('should accept valid expression', () => {
      const block = createTestBlock('if', [
        { name: 'condition', type: 'expression', value: 'score > 10 and has_key', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.filter(e => e.type === 'syntax')).toHaveLength(0)
    })

    it('should accept complex valid expression', () => {
      const block = createTestBlock('if', [
        { name: 'condition', type: 'expression', value: '(score > 10) and (name == "alice" or items[0] == "key")', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.filter(e => e.type === 'syntax')).toHaveLength(0)
    })

    it('should validate python block code', () => {
      const block = createTestBlock('python', [
        { name: 'code', type: 'multiline', value: 'score += (10', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.some(e => e.type === 'syntax')).toBe(true)
    })

    it('should detect dangling operators', () => {
      const block = createTestBlock('if', [
        { name: 'condition', type: 'expression', value: 'score +', required: true },
      ])

      const result = validator.validateBlock(block, context)

      expect(result.errors.some(e => e.type === 'syntax')).toBe(true)
    })
  })

  describe('validateTree', () => {
    it('should validate all blocks in tree', () => {
      const root = createTestBlock('label', [
        { name: 'name', type: 'text', value: 'start', required: true },
      ], {
        children: [
          createTestBlock('dialogue', [
            { name: 'text', type: 'multiline', value: '', required: true }, // Error
          ]),
          createTestBlock('jump', [
            { name: 'target', type: 'label', value: 'nonexistent', required: true }, // Error
          ]),
        ],
      })

      const errors = validator.validateTree(root, context)

      expect(errors.length).toBeGreaterThanOrEqual(2)
    })

    it('should validate nested children', () => {
      const root = createTestBlock('label', [
        { name: 'name', type: 'text', value: 'start', required: true },
      ], {
        children: [
          createTestBlock('menu', [], {
            children: [
              createTestBlock('choice', [
                { name: 'text', type: 'text', value: '', required: true }, // Error
              ]),
            ],
          }),
        ],
      })

      const errors = validator.validateTree(root, context)

      expect(errors.some(e => e.type === 'required')).toBe(true)
    })

    it('should return empty array for valid tree', () => {
      const root = createTestBlock('label', [
        { name: 'name', type: 'text', value: 'start', required: true },
      ], {
        children: [
          createTestBlock('dialogue', [
            { name: 'speaker', type: 'character', value: 'alice', required: false },
            { name: 'text', type: 'multiline', value: 'Hello!', required: true },
          ]),
          createTestBlock('jump', [
            { name: 'target', type: 'label', value: 'chapter1', required: true },
          ]),
        ],
      })

      const errors = validator.validateTree(root, context)

      expect(errors).toHaveLength(0)
    })
  })

  describe('getErrorSummary (Requirement 10.5)', () => {
    it('should count errors by type', () => {
      const errors = [
        { blockId: '1', slotName: 'text', type: 'required' as const, message: 'Required' },
        { blockId: '2', slotName: 'text', type: 'required' as const, message: 'Required' },
        { blockId: '3', slotName: 'target', type: 'invalid-target' as const, message: 'Invalid' },
        { blockId: '4', slotName: 'image', type: 'missing-resource' as const, message: 'Missing' },
      ]

      const summary = validator.getErrorSummary(errors)

      expect(summary.total).toBe(4)
      expect(summary.byType.required).toBe(2)
      expect(summary.byType['invalid-target']).toBe(1)
      expect(summary.byType['missing-resource']).toBe(1)
      expect(summary.byType.syntax).toBe(0)
    })

    it('should return zero counts for empty errors', () => {
      const summary = validator.getErrorSummary([])

      expect(summary.total).toBe(0)
      expect(summary.byType.required).toBe(0)
      expect(summary.byType['invalid-target']).toBe(0)
      expect(summary.byType['missing-resource']).toBe(0)
      expect(summary.byType.syntax).toBe(0)
    })
  })

  describe('Factory Functions', () => {
    it('createBlockValidator should return a BlockValidator instance', () => {
      const validator = createBlockValidator()
      expect(validator).toBeInstanceOf(BlockValidator)
    })
  })
})
