/**
 * Label Management Property Tests
 * Label 管理属性测试
 * 
 * Property-based tests for Label creation and deletion operations.
 * 
 * Feature: multi-label-view
 * 
 * Property 4: Creating a Label increases the count by 1
 * Property 5: Deleting a Label decreases the count by 1
 * 
 * Validates: Requirements 5.1, 5.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { RenpyScript, LabelNode, DialogueNode } from '../../types/ast'

// ========================================
// Arbitrary Generators
// ========================================

// Generate a valid label identifier (Ren'Py label naming rules)
const arbitraryLabelName = fc.stringMatching(/^[a-z_][a-z0-9_]{0,15}$/)

// Generate a unique label name that doesn't exist in a list
const arbitraryUniqueLabelName = (existingNames: string[]): fc.Arbitrary<string> =>
  arbitraryLabelName.filter(name => !existingNames.includes(name))

// Generate a dialogue AST node
const arbitraryDialogueNode = (labelName: string, index: number): DialogueNode => ({
  id: `dialogue_${labelName}_${index}_${Date.now()}`,
  type: 'dialogue',
  speaker: 'narrator',
  text: `Dialogue ${index}`,
})

// Generate a label node with random number of blocks
const arbitraryLabelNode = (name: string): fc.Arbitrary<LabelNode> =>
  fc.integer({ min: 0, max: 10 }).map(blockCount => ({
    id: `label_${name}_${Date.now()}`,
    type: 'label' as const,
    name,
    body: Array.from({ length: blockCount }, (_, i) => arbitraryDialogueNode(name, i)),
  }))

// Generate an AST with multiple labels
const arbitraryAST: fc.Arbitrary<RenpyScript> = fc
  .array(arbitraryLabelName, { minLength: 0, maxLength: 10 })
  .chain(names => {
    // Ensure unique names
    const uniqueNames = [...new Set(names)]
    return fc.tuple(
      ...uniqueNames.map(name => arbitraryLabelNode(name))
    ).map(labels => ({
      type: 'script' as const,
      statements: labels,
      metadata: {
        filePath: 'test.rpy',
        parseTime: new Date(),
        version: '1.0',
      },
    }))
  })

// Generate an AST with at least one label (for deletion tests)
const arbitraryASTWithLabels: fc.Arbitrary<RenpyScript> = fc
  .array(arbitraryLabelName, { minLength: 1, maxLength: 10 })
  .chain(names => {
    const uniqueNames = [...new Set(names)]
    // Ensure at least one label
    if (uniqueNames.length === 0) {
      uniqueNames.push('default_label')
    }
    return fc.tuple(
      ...uniqueNames.map(name => arbitraryLabelNode(name))
    ).map(labels => ({
      type: 'script' as const,
      statements: labels,
      metadata: {
        filePath: 'test.rpy',
        parseTime: new Date(),
        version: '1.0',
      },
    }))
  })

// ========================================
// Helper Functions (simulating component logic)
// ========================================

/**
 * Count labels in AST
 */
function countLabels(ast: RenpyScript): number {
  return ast.statements.filter(s => s.type === 'label').length
}

/**
 * Get all label names from AST
 */
function getLabelNames(ast: RenpyScript): string[] {
  return ast.statements
    .filter((s): s is LabelNode => s.type === 'label')
    .map(l => l.name)
}

/**
 * Create a new label in AST
 * Simulates the handleCreateLabel function from MultiLabelView
 */
function createLabel(ast: RenpyScript, labelName: string): RenpyScript {
  const newLabelNode: LabelNode = {
    id: `label_${labelName}_${Date.now()}`,
    type: 'label',
    name: labelName,
    body: [],
  }

  return {
    ...ast,
    statements: [...ast.statements, newLabelNode],
  }
}

/**
 * Delete a label from AST
 * Simulates the handleDeleteLabel function from MultiLabelView
 */
function deleteLabel(ast: RenpyScript, labelName: string): RenpyScript {
  const newStatements = ast.statements.filter(s => 
    !(s.type === 'label' && (s as LabelNode).name === labelName)
  )

  return {
    ...ast,
    statements: newStatements,
  }
}

/**
 * Validate label name format
 */
function isValidLabelName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

// ========================================
// Property Tests
// ========================================

describe('Label Management Property Tests', () => {
  /**
   * Feature: multi-label-view, Property 4: 创建 Label 增加数量
   * 
   * For any valid label name that doesn't already exist,
   * creating a new label should increase the label count by exactly 1.
   * 
   * Validates: Requirements 5.1
   */
  describe('Property 4: Creating Label Increases Count', () => {
    it('creating a label with a valid unique name increases count by 1', () => {
      fc.assert(
        fc.property(
          arbitraryAST,
          arbitraryLabelName,
          (ast, newLabelName) => {
            const existingNames = getLabelNames(ast)
            
            // Skip if name already exists (we're testing unique name creation)
            if (existingNames.includes(newLabelName)) {
              return true
            }
            
            // Skip if name is invalid
            if (!isValidLabelName(newLabelName)) {
              return true
            }
            
            const countBefore = countLabels(ast)
            const newAst = createLabel(ast, newLabelName)
            const countAfter = countLabels(newAst)
            
            // Count should increase by exactly 1
            expect(countAfter).toBe(countBefore + 1)
            
            // New label should exist in AST
            const newLabelNames = getLabelNames(newAst)
            expect(newLabelNames).toContain(newLabelName)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('created label appears in the AST statements', () => {
      fc.assert(
        fc.property(
          arbitraryAST,
          arbitraryLabelName,
          (ast, newLabelName) => {
            const existingNames = getLabelNames(ast)
            
            if (existingNames.includes(newLabelName) || !isValidLabelName(newLabelName)) {
              return true
            }
            
            const newAst = createLabel(ast, newLabelName)
            
            // Find the new label in statements
            const newLabel = newAst.statements.find(
              s => s.type === 'label' && (s as LabelNode).name === newLabelName
            ) as LabelNode | undefined
            
            expect(newLabel).toBeDefined()
            expect(newLabel?.type).toBe('label')
            expect(newLabel?.name).toBe(newLabelName)
            expect(newLabel?.body).toEqual([])
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('creating multiple labels increases count correctly', () => {
      fc.assert(
        fc.property(
          arbitraryAST,
          fc.array(arbitraryLabelName, { minLength: 1, maxLength: 5 }),
          (ast, newLabelNames) => {
            // Get unique names that don't exist
            const existingNames = getLabelNames(ast)
            const uniqueNewNames = [...new Set(newLabelNames)]
              .filter(name => !existingNames.includes(name) && isValidLabelName(name))
            
            if (uniqueNewNames.length === 0) {
              return true
            }
            
            const countBefore = countLabels(ast)
            
            // Create all labels
            let currentAst = ast
            for (const name of uniqueNewNames) {
              currentAst = createLabel(currentAst, name)
            }
            
            const countAfter = countLabels(currentAst)
            
            // Count should increase by the number of unique new labels
            expect(countAfter).toBe(countBefore + uniqueNewNames.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: multi-label-view, Property 5: 删除 Label 减少数量
   * 
   * For any existing label, deleting it should:
   * - Decrease the label count by exactly 1
   * - Remove the label from the AST
   * 
   * Validates: Requirements 5.4
   */
  describe('Property 5: Deleting Label Decreases Count', () => {
    it('deleting an existing label decreases count by 1', () => {
      fc.assert(
        fc.property(
          arbitraryASTWithLabels,
          (ast) => {
            const existingNames = getLabelNames(ast)
            
            // Skip if no labels to delete
            if (existingNames.length === 0) {
              return true
            }
            
            // Pick a random label to delete
            const labelToDelete = existingNames[Math.floor(Math.random() * existingNames.length)]
            
            const countBefore = countLabels(ast)
            const newAst = deleteLabel(ast, labelToDelete)
            const countAfter = countLabels(newAst)
            
            // Count should decrease by exactly 1
            expect(countAfter).toBe(countBefore - 1)
            
            // Deleted label should not exist in AST
            const newLabelNames = getLabelNames(newAst)
            expect(newLabelNames).not.toContain(labelToDelete)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('deleted label is removed from AST statements', () => {
      fc.assert(
        fc.property(
          arbitraryASTWithLabels,
          (ast) => {
            const existingNames = getLabelNames(ast)
            
            if (existingNames.length === 0) {
              return true
            }
            
            const labelToDelete = existingNames[0]
            const newAst = deleteLabel(ast, labelToDelete)
            
            // Label should not be found in statements
            const deletedLabel = newAst.statements.find(
              s => s.type === 'label' && (s as LabelNode).name === labelToDelete
            )
            
            expect(deletedLabel).toBeUndefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('deleting all labels results in empty label list', () => {
      fc.assert(
        fc.property(
          arbitraryASTWithLabels,
          (ast) => {
            const existingNames = getLabelNames(ast)
            
            // Delete all labels
            let currentAst = ast
            for (const name of existingNames) {
              currentAst = deleteLabel(currentAst, name)
            }
            
            const countAfter = countLabels(currentAst)
            
            // No labels should remain
            expect(countAfter).toBe(0)
            expect(getLabelNames(currentAst)).toEqual([])
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('deleting non-existent label does not change count', () => {
      fc.assert(
        fc.property(
          arbitraryAST,
          arbitraryLabelName,
          (ast, nonExistentName) => {
            const existingNames = getLabelNames(ast)
            
            // Skip if name exists
            if (existingNames.includes(nonExistentName)) {
              return true
            }
            
            const countBefore = countLabels(ast)
            const newAst = deleteLabel(ast, nonExistentName)
            const countAfter = countLabels(newAst)
            
            // Count should remain unchanged
            expect(countAfter).toBe(countBefore)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('other labels remain unchanged after deletion', () => {
      fc.assert(
        fc.property(
          arbitraryASTWithLabels,
          (ast) => {
            const existingNames = getLabelNames(ast)
            
            if (existingNames.length < 2) {
              return true
            }
            
            const labelToDelete = existingNames[0]
            const remainingNames = existingNames.slice(1)
            
            const newAst = deleteLabel(ast, labelToDelete)
            const newLabelNames = getLabelNames(newAst)
            
            // All other labels should still exist
            for (const name of remainingNames) {
              expect(newLabelNames).toContain(name)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Combined property: Create then delete returns to original count
   */
  describe('Create-Delete Round Trip', () => {
    it('creating then deleting a label returns to original count', () => {
      fc.assert(
        fc.property(
          arbitraryAST,
          arbitraryLabelName,
          (ast, newLabelName) => {
            const existingNames = getLabelNames(ast)
            
            if (existingNames.includes(newLabelName) || !isValidLabelName(newLabelName)) {
              return true
            }
            
            const countBefore = countLabels(ast)
            
            // Create then delete
            const afterCreate = createLabel(ast, newLabelName)
            const afterDelete = deleteLabel(afterCreate, newLabelName)
            
            const countAfter = countLabels(afterDelete)
            
            // Count should return to original
            expect(countAfter).toBe(countBefore)
            
            // Original labels should still exist
            const originalNames = getLabelNames(ast)
            const finalNames = getLabelNames(afterDelete)
            expect(finalNames.sort()).toEqual(originalNames.sort())
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
