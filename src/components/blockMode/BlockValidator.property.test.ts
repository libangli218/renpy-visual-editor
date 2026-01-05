/**
 * BlockValidator Property Tests
 * 积木验证器属性测试
 * 
 * Property-based tests for block validation.
 * 
 * **Property 3: 积木验证正确性**
 * *For any* 积木配置，验证器应该正确识别所有错误类型
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.5**
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { BlockValidator } from './BlockValidator'
import { Block, BlockSlot, ValidationContext, ValidationError, SlotType, BlockType, BlockCategory } from './types'

// ============================================================================
// Arbitrary Generators
// ============================================================================

/**
 * Generate a valid identifier
 */
const arbitraryIdentifier = fc.stringMatching(/^[a-z_][a-z0-9_]{0,19}$/)

/**
 * Generate simple text
 */
const arbitrarySimpleText = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-'),
  { minLength: 1, maxLength: 50 }
)

/**
 * Generate a unique block ID
 */
let blockIdCounter = 0
const generateBlockId = () => `test_block_${++blockIdCounter}_${Date.now()}`

/**
 * Generate slot type
 */
const arbitrarySlotType: fc.Arbitrary<SlotType> = fc.constantFrom(
  'text', 'multiline', 'select', 'character', 'image', 'audio', 
  'label', 'expression', 'number', 'transition', 'position'
)

/**
 * Generate a slot value based on type
 */
const arbitrarySlotValue = (type: SlotType, isEmpty: boolean): fc.Arbitrary<unknown> => {
  if (isEmpty) {
    return fc.constantFrom(null, '', '   ')
  }
  
  switch (type) {
    case 'text':
    case 'multiline':
      return arbitrarySimpleText
    case 'number':
      return fc.float({ min: 0, max: 100, noNaN: true })
    case 'character':
    case 'image':
    case 'audio':
    case 'label':
      return arbitraryIdentifier
    case 'expression':
      return fc.oneof(
        arbitraryIdentifier,
        fc.constant('score > 10'),
        fc.constant('has_key and score >= 5'),
        fc.constant('name == "alice"')
      )
    case 'transition':
      return fc.constantFrom('dissolve', 'fade', 'pixellate')
    case 'position':
      return fc.constantFrom('left', 'center', 'right')
    case 'select':
      return arbitraryIdentifier
    default:
      return arbitrarySimpleText
  }
}

/**
 * Generate a block slot
 */
const arbitraryBlockSlot = (forceEmpty: boolean = false, forceRequired: boolean = false): fc.Arbitrary<BlockSlot> => {
  return arbitrarySlotType.chain(type => {
    const isEmpty = forceEmpty ? fc.constant(true) : fc.boolean()
    const required = forceRequired ? fc.constant(true) : fc.boolean()
    
    return fc.record({
      name: arbitraryIdentifier,
      type: fc.constant(type),
      value: isEmpty.chain(empty => arbitrarySlotValue(type, empty)),
      required: required,
    })
  })
}

/**
 * Generate block type
 */
const arbitraryBlockType: fc.Arbitrary<BlockType> = fc.constantFrom(
  'dialogue', 'scene', 'show', 'hide', 'with',
  'menu', 'choice', 'jump', 'call', 'return',
  'if', 'elif', 'else', 'play-music', 'stop-music', 'play-sound',
  'python', 'comment', 'label'
)

/**
 * Generate block category
 */
const arbitraryBlockCategory: fc.Arbitrary<BlockCategory> = fc.constantFrom(
  'scene', 'dialogue', 'flow', 'audio', 'advanced'
)

/**
 * Generate a block with specific slot configuration
 */
const arbitraryBlock = (slots: fc.Arbitrary<BlockSlot[]>): fc.Arbitrary<Block> => {
  return fc.record({
    id: fc.constant('').map(() => generateBlockId()),
    type: arbitraryBlockType,
    category: arbitraryBlockCategory,
    astNodeId: fc.constant('').map(() => `ast_${Date.now()}`),
    slots: slots,
    collapsed: fc.constant(false),
    selected: fc.constant(false),
    hasError: fc.constant(false),
  })
}

/**
 * Generate a validation context
 */
const arbitraryValidationContext = (
  labels: string[] = [],
  characters: string[] = [],
  images: string[] = [],
  audio: string[] = []
): fc.Arbitrary<ValidationContext> => {
  return fc.record({
    availableLabels: fc.constant(labels),
    availableCharacters: fc.constant(characters),
    availableImages: fc.constant(images),
    availableAudio: fc.constant(audio),
  })
}

// ============================================================================
// Property Tests
// ============================================================================

/**
 * Feature: block-editor-mode, Property 3: 积木验证正确性
 * 
 * For any block configuration, the validator should correctly identify
 * all error types.
 * 
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.5**
 */
describe('Property 3: 积木验证正确性 (Block Validation Correctness)', () => {
  let validator: BlockValidator

  beforeEach(() => {
    validator = new BlockValidator()
    blockIdCounter = 0
  })

  /**
   * Property 3.1: Empty required slots always produce required errors
   * Validates: Requirement 10.1
   */
  it('empty required slots always produce required errors', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitrarySlotType,
        arbitraryBlockType,
        (slotName, slotType, blockType) => {
          // Create a block with an empty required slot
          const block: Block = {
            id: generateBlockId(),
            type: blockType,
            category: 'flow',
            astNodeId: `ast_${Date.now()}`,
            slots: [{
              name: slotName,
              type: slotType,
              value: '', // Empty value
              required: true,
            }],
            collapsed: false,
            selected: false,
            hasError: false,
          }

          const context: ValidationContext = {
            availableLabels: [],
            availableCharacters: [],
            availableImages: [],
            availableAudio: [],
          }

          const result = validator.validateBlock(block, context)

          // Should have at least one required error
          expect(result.errors.some(e => e.type === 'required')).toBe(true)
          
          // The error should reference the correct slot
          const requiredError = result.errors.find(e => e.type === 'required')
          expect(requiredError?.slotName).toBe(slotName)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.2: Non-empty required slots don't produce required errors
   * Validates: Requirement 10.1
   */
  it('non-empty required slots do not produce required errors', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitrarySimpleText,
        arbitraryBlockType,
        (slotName, slotValue, blockType) => {
          // Create a block with a non-empty required slot
          const block: Block = {
            id: generateBlockId(),
            type: blockType,
            category: 'flow',
            astNodeId: `ast_${Date.now()}`,
            slots: [{
              name: slotName,
              type: 'text',
              value: slotValue, // Non-empty value
              required: true,
            }],
            collapsed: false,
            selected: false,
            hasError: false,
          }

          const context: ValidationContext = {
            availableLabels: [],
            availableCharacters: [],
            availableImages: [],
            availableAudio: [],
          }

          const result = validator.validateBlock(block, context)

          // Should not have required errors for this slot
          const requiredErrors = result.errors.filter(
            e => e.type === 'required' && e.slotName === slotName
          )
          expect(requiredErrors).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.3: Jump/call to non-existent labels produce invalid-target errors
   * Validates: Requirement 10.2
   */
  it('jump/call to non-existent labels produce invalid-target errors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('jump', 'call') as fc.Arbitrary<'jump' | 'call'>,
        arbitraryIdentifier,
        fc.array(arbitraryIdentifier, { minLength: 0, maxLength: 5 }),
        (blockType, targetLabel, availableLabels) => {
          // Ensure target is NOT in available labels
          const filteredLabels = availableLabels.filter(l => l !== targetLabel)
          
          const block: Block = {
            id: generateBlockId(),
            type: blockType,
            category: 'flow',
            astNodeId: `ast_${Date.now()}`,
            slots: [{
              name: 'target',
              type: 'label',
              value: targetLabel,
              required: true,
            }],
            collapsed: false,
            selected: false,
            hasError: false,
          }

          const context: ValidationContext = {
            availableLabels: filteredLabels,
            availableCharacters: [],
            availableImages: [],
            availableAudio: [],
          }

          const result = validator.validateBlock(block, context)

          // Should have invalid-target error
          expect(result.errors.some(e => e.type === 'invalid-target')).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.4: Jump/call to existing labels don't produce invalid-target errors
   * Validates: Requirement 10.2
   */
  it('jump/call to existing labels do not produce invalid-target errors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('jump', 'call') as fc.Arbitrary<'jump' | 'call'>,
        arbitraryIdentifier,
        (blockType, targetLabel) => {
          const block: Block = {
            id: generateBlockId(),
            type: blockType,
            category: 'flow',
            astNodeId: `ast_${Date.now()}`,
            slots: [{
              name: 'target',
              type: 'label',
              value: targetLabel,
              required: true,
            }],
            collapsed: false,
            selected: false,
            hasError: false,
          }

          // Include target in available labels
          const context: ValidationContext = {
            availableLabels: [targetLabel, 'other_label'],
            availableCharacters: [],
            availableImages: [],
            availableAudio: [],
          }

          const result = validator.validateBlock(block, context)

          // Should not have invalid-target error
          expect(result.errors.filter(e => e.type === 'invalid-target')).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.5: Missing image resources produce missing-resource errors
   * Validates: Requirement 10.3
   */
  it('missing image resources produce missing-resource errors', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        fc.array(arbitraryIdentifier, { minLength: 0, maxLength: 5 }),
        (imageName, availableImages) => {
          // Ensure image is NOT in available images
          const filteredImages = availableImages.filter(i => i !== imageName)
          
          const block: Block = {
            id: generateBlockId(),
            type: 'scene',
            category: 'scene',
            astNodeId: `ast_${Date.now()}`,
            slots: [{
              name: 'image',
              type: 'image',
              value: imageName,
              required: true,
            }],
            collapsed: false,
            selected: false,
            hasError: false,
          }

          const context: ValidationContext = {
            availableLabels: [],
            availableCharacters: [],
            availableImages: filteredImages,
            availableAudio: [],
          }

          const result = validator.validateBlock(block, context)

          // Should have missing-resource error
          expect(result.errors.some(e => e.type === 'missing-resource')).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.6: Missing audio resources produce missing-resource errors
   * Validates: Requirement 10.3
   */
  it('missing audio resources produce missing-resource errors', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier.map(s => s + '.ogg'),
        fc.array(arbitraryIdentifier.map(s => s + '.ogg'), { minLength: 0, maxLength: 5 }),
        (audioFile, availableAudio) => {
          // Ensure audio is NOT in available audio
          const filteredAudio = availableAudio.filter(a => a !== audioFile)
          
          const block: Block = {
            id: generateBlockId(),
            type: 'play-music',
            category: 'audio',
            astNodeId: `ast_${Date.now()}`,
            slots: [{
              name: 'file',
              type: 'audio',
              value: audioFile,
              required: true,
            }],
            collapsed: false,
            selected: false,
            hasError: false,
          }

          const context: ValidationContext = {
            availableLabels: [],
            availableCharacters: [],
            availableImages: [],
            availableAudio: filteredAudio,
          }

          const result = validator.validateBlock(block, context)

          // Should have missing-resource error
          expect(result.errors.some(e => e.type === 'missing-resource')).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.7: Existing resources don't produce missing-resource errors
   * Validates: Requirement 10.3
   */
  it('existing resources do not produce missing-resource errors', () => {
    fc.assert(
      fc.property(
        arbitraryIdentifier,
        arbitraryIdentifier.map(s => s + '.ogg'),
        (imageName, audioFile) => {
          const block: Block = {
            id: generateBlockId(),
            type: 'scene',
            category: 'scene',
            astNodeId: `ast_${Date.now()}`,
            slots: [
              { name: 'image', type: 'image', value: imageName, required: true },
            ],
            collapsed: false,
            selected: false,
            hasError: false,
          }

          // Include resources in available lists
          const context: ValidationContext = {
            availableLabels: [],
            availableCharacters: [],
            availableImages: [imageName],
            availableAudio: [audioFile],
          }

          const result = validator.validateBlock(block, context)

          // Should not have missing-resource error
          expect(result.errors.filter(e => e.type === 'missing-resource')).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.8: Error summary total equals sum of all error types
   * Validates: Requirement 10.5
   */
  it('error summary total equals sum of all error types', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            blockId: arbitraryIdentifier,
            slotName: fc.option(arbitraryIdentifier),
            type: fc.constantFrom('required', 'invalid-target', 'missing-resource', 'syntax') as fc.Arbitrary<ValidationError['type']>,
            message: arbitrarySimpleText,
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (errors) => {
          const summary = validator.getErrorSummary(errors)

          // Total should equal sum of all types
          const sumOfTypes = 
            summary.byType.required +
            summary.byType['invalid-target'] +
            summary.byType['missing-resource'] +
            summary.byType.syntax

          expect(summary.total).toBe(sumOfTypes)
          expect(summary.total).toBe(errors.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.9: Error summary correctly counts each error type
   * Validates: Requirement 10.5
   */
  it('error summary correctly counts each error type', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            blockId: arbitraryIdentifier,
            slotName: fc.option(arbitraryIdentifier),
            type: fc.constantFrom('required', 'invalid-target', 'missing-resource', 'syntax') as fc.Arbitrary<ValidationError['type']>,
            message: arbitrarySimpleText,
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (errors) => {
          const summary = validator.getErrorSummary(errors)

          // Count each type manually
          const expectedCounts = {
            required: errors.filter(e => e.type === 'required').length,
            'invalid-target': errors.filter(e => e.type === 'invalid-target').length,
            'missing-resource': errors.filter(e => e.type === 'missing-resource').length,
            syntax: errors.filter(e => e.type === 'syntax').length,
          }

          expect(summary.byType.required).toBe(expectedCounts.required)
          expect(summary.byType['invalid-target']).toBe(expectedCounts['invalid-target'])
          expect(summary.byType['missing-resource']).toBe(expectedCounts['missing-resource'])
          expect(summary.byType.syntax).toBe(expectedCounts.syntax)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.10: Tree validation finds all errors in nested blocks
   * Validates: Requirements 10.1, 10.2, 10.3
   */
  it('tree validation finds all errors in nested blocks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (numChildren) => {
          // Create a tree with multiple blocks, each having an empty required slot
          const children: Block[] = []
          for (let i = 0; i < numChildren; i++) {
            children.push({
              id: generateBlockId(),
              type: 'dialogue',
              category: 'dialogue',
              astNodeId: `ast_child_${i}`,
              slots: [{
                name: 'text',
                type: 'multiline',
                value: '', // Empty required slot
                required: true,
              }],
              collapsed: false,
              selected: false,
              hasError: false,
            })
          }

          const root: Block = {
            id: generateBlockId(),
            type: 'label',
            category: 'flow',
            astNodeId: 'ast_root',
            slots: [{
              name: 'name',
              type: 'text',
              value: 'test_label',
              required: true,
            }],
            children,
            collapsed: false,
            selected: false,
            hasError: false,
          }

          const context: ValidationContext = {
            availableLabels: [],
            availableCharacters: [],
            availableImages: [],
            availableAudio: [],
          }

          const errors = validator.validateTree(root, context)

          // Should find at least numChildren errors (one per child)
          expect(errors.length).toBeGreaterThanOrEqual(numChildren)
          
          // All children should have errors
          const childBlockIds = children.map(c => c.id)
          const errorsForChildren = errors.filter(e => childBlockIds.includes(e.blockId))
          expect(errorsForChildren.length).toBe(numChildren)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.11: Validation result valid flag is consistent with errors
   */
  it('validation result valid flag is consistent with errors', () => {
    fc.assert(
      fc.property(
        arbitraryBlockType,
        fc.boolean(),
        (blockType, hasEmptyRequired) => {
          const block: Block = {
            id: generateBlockId(),
            type: blockType,
            category: 'flow',
            astNodeId: `ast_${Date.now()}`,
            slots: [{
              name: 'test_slot',
              type: 'text',
              value: hasEmptyRequired ? '' : 'valid_value',
              required: true,
            }],
            collapsed: false,
            selected: false,
            hasError: false,
          }

          const context: ValidationContext = {
            availableLabels: [],
            availableCharacters: [],
            availableImages: [],
            availableAudio: [],
          }

          const result = validator.validateBlock(block, context)

          // valid should be true if and only if there are no errors
          expect(result.valid).toBe(result.errors.length === 0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.12: Unbalanced parentheses in expressions produce syntax errors
   */
  it('unbalanced parentheses in expressions produce syntax errors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '(score > 10',
          'score > 10)',
          '((a + b)',
          '(a + (b + c)',
          'func(x'
        ),
        (invalidExpr) => {
          const block: Block = {
            id: generateBlockId(),
            type: 'if',
            category: 'flow',
            astNodeId: `ast_${Date.now()}`,
            slots: [{
              name: 'condition',
              type: 'expression',
              value: invalidExpr,
              required: true,
            }],
            collapsed: false,
            selected: false,
            hasError: false,
          }

          const context: ValidationContext = {
            availableLabels: [],
            availableCharacters: [],
            availableImages: [],
            availableAudio: [],
          }

          const result = validator.validateBlock(block, context)

          // Should have syntax error
          expect(result.errors.some(e => e.type === 'syntax')).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.13: Valid expressions don't produce syntax errors
   */
  it('valid expressions do not produce syntax errors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'score > 10',
          '(score > 10)',
          'a and b',
          'items[0] == "key"',
          '(a + b) * c',
          'func(x, y)',
          'name == "alice"',
          '{"key": "value"}',
          '[1, 2, 3]'
        ),
        (validExpr) => {
          const block: Block = {
            id: generateBlockId(),
            type: 'if',
            category: 'flow',
            astNodeId: `ast_${Date.now()}`,
            slots: [{
              name: 'condition',
              type: 'expression',
              value: validExpr,
              required: true,
            }],
            collapsed: false,
            selected: false,
            hasError: false,
          }

          const context: ValidationContext = {
            availableLabels: [],
            availableCharacters: [],
            availableImages: [],
            availableAudio: [],
          }

          const result = validator.validateBlock(block, context)

          // Should not have syntax error
          expect(result.errors.filter(e => e.type === 'syntax')).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
