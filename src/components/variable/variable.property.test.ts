/**
 * Property-Based Tests for Variable System
 * 
 * Feature: renpy-visual-editor, Property 12: Variable Scope Support
 * Validates: Requirements 8.1, 8.6
 * 
 * For any variable, it should have one of the three valid scopes,
 * and code generation should produce the correct statement.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import {
  Variable,
  VariableScope,
  VariableType,
  isValidVariableName,
  getDefaultValueForType,
  inferTypeFromValue,
  generateVariableId,
} from './types'
import { useVariableStore } from './variableStore'
import { generateNode } from '../../generator/codeGenerator'
import { createDefineNode, createDefaultNode } from '../../parser/nodeFactory'

// ============================================================================
// Arbitrary Generators
// ============================================================================

// Generate valid Python identifiers for variable names
const arbValidVariableName = fc.stringMatching(/^[a-z_][a-z0-9_]{0,15}$/)
  .filter(name => {
    // Filter out Python keywords
    const pythonKeywords = [
      'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
      'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
      'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
      'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
      'while', 'with', 'yield',
    ]
    return !pythonKeywords.includes(name)
  })

// Generate variable scopes
const arbVariableScope: fc.Arbitrary<VariableScope> = fc.constantFrom('default', 'define', 'persistent')

// Generate variable types
const arbVariableType: fc.Arbitrary<VariableType> = fc.constantFrom('bool', 'int', 'str', 'list', 'dict', 'any')

// Generate values based on type
const arbValueForType = (type: VariableType): fc.Arbitrary<string> => {
  switch (type) {
    case 'bool':
      return fc.constantFrom('True', 'False')
    case 'int':
      return fc.integer({ min: -1000, max: 1000 }).map(String)
    case 'str':
      return fc.string({ minLength: 0, maxLength: 20 })
        .filter(s => !s.includes('"') && !s.includes('\n'))
        .map(s => `"${s}"`)
    case 'list':
      return fc.oneof(
        fc.constant('[]'),
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 5 })
          .map(arr => `[${arr.join(', ')}]`),
        fc.array(fc.constantFrom('"a"', '"b"', '"c"'), { minLength: 1, maxLength: 3 })
          .map(arr => `[${arr.join(', ')}]`)
      )
    case 'dict':
      return fc.oneof(
        fc.constant('{}'),
        fc.constant('{"key": "value"}'),
        fc.constant('{"count": 0}')
      )
    case 'any':
    default:
      return fc.oneof(
        fc.constant('None'),
        fc.integer().map(String),
        fc.constantFrom('True', 'False'),
        fc.string({ minLength: 1, maxLength: 10 })
          .filter(s => !s.includes('"') && !s.includes('\n'))
          .map(s => `"${s}"`)
      )
  }
}

// Generate a complete variable
const arbVariable: fc.Arbitrary<Variable> = fc.record({
  id: fc.constant('').map(() => generateVariableId()),
  name: arbValidVariableName,
  scope: arbVariableScope,
  type: arbVariableType,
}).chain(partial => 
  arbValueForType(partial.type).map(value => ({
    ...partial,
    value,
    description: undefined,
  }))
)

// Generate a variable with specific scope
const arbVariableWithScope = (scope: VariableScope): fc.Arbitrary<Variable> =>
  fc.record({
    id: fc.constant('').map(() => generateVariableId()),
    name: arbValidVariableName,
    scope: fc.constant(scope),
    type: arbVariableType,
  }).chain(partial =>
    arbValueForType(partial.type).map(value => ({
      ...partial,
      value,
      description: undefined,
    }))
  )

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 12: Variable Scope Support', () => {
  beforeEach(() => {
    // Reset the store before each test
    useVariableStore.setState({ variables: [], selectedVariableId: null })
  })

  /**
   * Feature: renpy-visual-editor, Property 12: Variable Scope Support
   * Validates: Requirements 8.1, 8.6
   * 
   * For any variable, it should have one of the three valid scopes.
   */
  describe('Scope Validity', () => {
    it('all variables should have a valid scope', () => {
      fc.assert(
        fc.property(arbVariable, (variable) => {
          const validScopes: VariableScope[] = ['default', 'define', 'persistent']
          expect(validScopes).toContain(variable.scope)
        }),
        { numRuns: 100 }
      )
    })

    it('scope should be preserved when adding and retrieving variables', () => {
      fc.assert(
        fc.property(arbVariable, (variable) => {
          const store = useVariableStore.getState()
          
          // Add the variable
          const added = store.addVariable({
            name: variable.name,
            scope: variable.scope,
            type: variable.type,
            value: variable.value,
            description: '',
          })
          
          // Retrieve and verify scope
          const retrieved = useVariableStore.getState().variables.find(v => v.id === added.id)
          expect(retrieved).toBeDefined()
          expect(retrieved!.scope).toBe(variable.scope)
          
          // Clean up
          useVariableStore.getState().deleteVariable(added.id)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Code generation should produce the correct statement based on scope.
   */
  describe('Code Generation by Scope', () => {
    it('define scope should generate "define name = value"', () => {
      fc.assert(
        fc.property(arbVariableWithScope('define'), (variable) => {
          const node = createDefineNode(variable.name, variable.value)
          const code = generateNode(node, 0)
          
          expect(code.trim()).toMatch(/^define\s+/)
          expect(code).toContain(variable.name)
          expect(code).toContain('=')
          expect(code).toContain(variable.value)
        }),
        { numRuns: 100 }
      )
    })

    it('default scope should generate "default name = value"', () => {
      fc.assert(
        fc.property(arbVariableWithScope('default'), (variable) => {
          const node = createDefaultNode(variable.name, variable.value)
          const code = generateNode(node, 0)
          
          expect(code.trim()).toMatch(/^default\s+/)
          expect(code).toContain(variable.name)
          expect(code).toContain('=')
          expect(code).toContain(variable.value)
        }),
        { numRuns: 100 }
      )
    })

    it('persistent scope should generate "default persistent.name = value"', () => {
      fc.assert(
        fc.property(arbVariableWithScope('persistent'), (variable) => {
          // Persistent variables use default with persistent. prefix
          const node = createDefaultNode(`persistent.${variable.name}`, variable.value)
          const code = generateNode(node, 0)
          
          expect(code.trim()).toMatch(/^default\s+persistent\./)
          expect(code).toContain(`persistent.${variable.name}`)
          expect(code).toContain('=')
          expect(code).toContain(variable.value)
        }),
        { numRuns: 100 }
      )
    })

    it('generateVariableNodes should produce correct nodes for all scopes', () => {
      fc.assert(
        fc.property(
          fc.array(arbVariable, { minLength: 1, maxLength: 10 }),
          (variables) => {
            // Set up store with variables
            useVariableStore.setState({ variables })
            
            // Generate nodes
            const nodes = useVariableStore.getState().generateVariableNodes()
            
            // Should have same number of nodes as variables
            expect(nodes.length).toBe(variables.length)
            
            // Each node should have correct type based on scope
            for (let i = 0; i < variables.length; i++) {
              const variable = variables[i]
              const node = nodes[i]
              
              if (variable.scope === 'define') {
                expect(node.type).toBe('define')
              } else {
                // Both 'default' and 'persistent' generate DefaultNode
                expect(node.type).toBe('default')
              }
            }
            
            // Clean up
            useVariableStore.setState({ variables: [] })
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Variable name validation
   */
  describe('Variable Name Validation', () => {
    it('valid Python identifiers should be accepted', () => {
      fc.assert(
        fc.property(arbValidVariableName, (name) => {
          expect(isValidVariableName(name)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('names starting with numbers should be rejected', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 9 }).map(String),
          fc.string({ minLength: 0, maxLength: 10 }),
          (digit, rest) => {
            const name = digit + rest.replace(/[^a-zA-Z0-9_]/g, '')
            expect(isValidVariableName(name)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('empty names should be rejected', () => {
      expect(isValidVariableName('')).toBe(false)
    })

    it('Python keywords should be rejected', () => {
      const keywords = ['if', 'else', 'for', 'while', 'True', 'False', 'None', 'return', 'def', 'class']
      for (const keyword of keywords) {
        expect(isValidVariableName(keyword)).toBe(false)
      }
    })
  })

  /**
   * Type inference from values
   */
  describe('Type Inference', () => {
    it('should infer bool type from True/False', () => {
      expect(inferTypeFromValue('True')).toBe('bool')
      expect(inferTypeFromValue('False')).toBe('bool')
    })

    it('should infer int type from integers', () => {
      fc.assert(
        fc.property(fc.integer(), (n) => {
          expect(inferTypeFromValue(String(n))).toBe('int')
        }),
        { numRuns: 100 }
      )
    })

    it('should infer str type from quoted strings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 20 }).filter(s => !s.includes('"')),
          (s) => {
            expect(inferTypeFromValue(`"${s}"`)).toBe('str')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should infer list type from array syntax', () => {
      expect(inferTypeFromValue('[]')).toBe('list')
      expect(inferTypeFromValue('[1, 2, 3]')).toBe('list')
      expect(inferTypeFromValue('["a", "b"]')).toBe('list')
    })

    it('should infer dict type from object syntax', () => {
      expect(inferTypeFromValue('{}')).toBe('dict')
      expect(inferTypeFromValue('{"key": "value"}')).toBe('dict')
    })
  })

  /**
   * Default values for types
   */
  describe('Default Values', () => {
    it('should provide appropriate default values for each type', () => {
      const types: VariableType[] = ['bool', 'int', 'str', 'list', 'dict', 'any']
      
      for (const type of types) {
        const defaultValue = getDefaultValueForType(type)
        expect(defaultValue).toBeDefined()
        expect(defaultValue.length).toBeGreaterThan(0)
        
        // The inferred type should match (or be 'any' for complex cases)
        const inferred = inferTypeFromValue(defaultValue)
        if (type !== 'any') {
          expect(inferred).toBe(type)
        }
      }
    })
  })

  /**
   * Store operations preserve data integrity
   */
  describe('Store Data Integrity', () => {
    it('adding and deleting variables should maintain consistency', () => {
      fc.assert(
        fc.property(
          fc.array(arbVariable, { minLength: 1, maxLength: 5 }),
          (variables) => {
            const store = useVariableStore.getState()
            const addedIds: string[] = []
            
            // Add all variables
            for (const v of variables) {
              const added = store.addVariable({
                name: v.name,
                scope: v.scope,
                type: v.type,
                value: v.value,
                description: '',
              })
              addedIds.push(added.id)
            }
            
            // Verify count
            expect(useVariableStore.getState().variables.length).toBe(variables.length)
            
            // Delete all
            for (const id of addedIds) {
              useVariableStore.getState().deleteVariable(id)
            }
            
            // Should be empty
            expect(useVariableStore.getState().variables.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('updating a variable should preserve its ID', () => {
      fc.assert(
        fc.property(arbVariable, arbVariable, (original, updated) => {
          const store = useVariableStore.getState()
          
          // Add original
          const added = store.addVariable({
            name: original.name,
            scope: original.scope,
            type: original.type,
            value: original.value,
            description: '',
          })
          
          const originalId = added.id
          
          // Update with new data
          useVariableStore.getState().updateVariable(originalId, {
            name: updated.name,
            scope: updated.scope,
            type: updated.type,
            value: updated.value,
            description: '',
          })
          
          // Verify ID is preserved
          const found = useVariableStore.getState().variables.find(v => v.id === originalId)
          expect(found).toBeDefined()
          expect(found!.name).toBe(updated.name)
          expect(found!.scope).toBe(updated.scope)
          
          // Clean up
          useVariableStore.getState().deleteVariable(originalId)
        }),
        { numRuns: 100 }
      )
    })

    it('getVariablesByScope should return only variables of that scope', () => {
      fc.assert(
        fc.property(
          fc.array(arbVariable, { minLength: 1, maxLength: 10 }),
          arbVariableScope,
          (variables, targetScope) => {
            // Set up store
            useVariableStore.setState({ variables })
            
            // Get by scope
            const filtered = useVariableStore.getState().getVariablesByScope(targetScope)
            
            // All returned should have the target scope
            for (const v of filtered) {
              expect(v.scope).toBe(targetScope)
            }
            
            // Count should match
            const expectedCount = variables.filter(v => v.scope === targetScope).length
            expect(filtered.length).toBe(expectedCount)
            
            // Clean up
            useVariableStore.setState({ variables: [] })
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
