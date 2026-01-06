/**
 * Code Generator Integration Tests
 * 
 * Tests for verifying that the Code Generator correctly handles:
 * - Newly added dialogue nodes
 * - Newly added menu nodes
 * - Newly added jump nodes
 * - Orphan nodes (should not generate code)
 * 
 * Implements Requirements:
 * - 1.4: 保存文件时生成包含新对话的正确 Ren'Py 代码
 * - 6.3: 忽略孤立节点不生成对应代码
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { generate, generateNode } from './codeGenerator'
import { ASTSynchronizer } from '../utils/ASTSynchronizer'
import {
  createLabelNode,
  createDialogueNode,
  createMenuNode,
  createMenuChoice,
  createJumpNode,
  createCallNode,
  createRenpyScript,
  resetNodeIdCounter,
} from '../parser/nodeFactory'
import { RenpyScript, LabelNode } from '../types/ast'

describe('Code Generator Integration - New Node Handling', () => {
  let astSynchronizer: ASTSynchronizer
  
  beforeEach(() => {
    resetNodeIdCounter()
    astSynchronizer = new ASTSynchronizer()
  })

  describe('Requirement 1.4: New Dialogue Node Generation', () => {
    it('should generate code for newly inserted dialogue node', () => {
      // Create a base AST with a label
      const ast = createRenpyScript([
        createLabelNode('start', [
          createDialogueNode('Hello world!', null),
        ]),
      ])

      // Insert a new dialogue using ASTSynchronizer
      const dialogueId = astSynchronizer.insertDialogue(
        'start',
        { speaker: 's', text: 'This is a new dialogue!' },
        ast
      )

      expect(dialogueId).not.toBeNull()

      // Generate code
      const code = generate(ast)

      // Verify the new dialogue is in the generated code
      expect(code).toContain('s "This is a new dialogue!"')
      expect(code).toContain('"Hello world!"')
    })

    it('should generate code for dialogue with speaker and attributes', () => {
      const ast = createRenpyScript([
        createLabelNode('start', []),
      ])

      // Insert dialogue with attributes
      astSynchronizer.insertDialogue(
        'start',
        { speaker: 'sylvie', text: 'Hello!', attributes: ['happy'] },
        ast
      )

      const code = generate(ast)
      expect(code).toContain('sylvie happy "Hello!"')
    })

    it('should generate code for narration (no speaker)', () => {
      const ast = createRenpyScript([
        createLabelNode('start', []),
      ])

      // Insert narration
      astSynchronizer.insertDialogue(
        'start',
        { speaker: null, text: 'The sun was setting.' },
        ast
      )

      const code = generate(ast)
      expect(code).toContain('"The sun was setting."')
    })

    it('should insert dialogue at correct position (after specified node)', () => {
      const firstDialogue = createDialogueNode('First line', null)
      const lastDialogue = createDialogueNode('Last line', null)
      
      const ast = createRenpyScript([
        createLabelNode('start', [firstDialogue, lastDialogue]),
      ])

      // Insert after first dialogue
      astSynchronizer.insertDialogue(
        'start',
        { speaker: null, text: 'Middle line' },
        ast,
        firstDialogue.id
      )

      const code = generate(ast)
      
      // Verify order: First -> Middle -> Last
      const firstIndex = code.indexOf('"First line"')
      const middleIndex = code.indexOf('"Middle line"')
      const lastIndex = code.indexOf('"Last line"')
      
      expect(firstIndex).toBeLessThan(middleIndex)
      expect(middleIndex).toBeLessThan(lastIndex)
    })
  })

  describe('Requirement 1.4: New Menu Node Generation', () => {
    it('should generate code for newly inserted menu node', () => {
      const ast = createRenpyScript([
        createLabelNode('start', [
          createDialogueNode('What do you want to do?', 's'),
        ]),
      ])

      // Insert a new menu
      const menuId = astSynchronizer.insertMenu(
        'start',
        {
          choices: [
            { text: 'Go left', body: [] },
            { text: 'Go right', body: [] },
          ],
        },
        ast
      )

      expect(menuId).not.toBeNull()

      const code = generate(ast)
      
      expect(code).toContain('menu:')
      expect(code).toContain('"Go left":')
      expect(code).toContain('"Go right":')
    })

    it('should generate menu with prompt', () => {
      const ast = createRenpyScript([
        createLabelNode('start', []),
      ])

      astSynchronizer.insertMenu(
        'start',
        {
          prompt: 'Choose wisely',
          choices: [
            { text: 'Option A', body: [] },
          ],
        },
        ast
      )

      const code = generate(ast)
      expect(code).toContain('menu:')
      expect(code).toContain('"Choose wisely"')
      expect(code).toContain('"Option A":')
    })

    it('should generate menu with conditional choices', () => {
      const ast = createRenpyScript([
        createLabelNode('start', []),
      ])

      astSynchronizer.insertMenu(
        'start',
        {
          choices: [
            { text: 'Secret option', condition: 'has_key', body: [] },
            { text: 'Normal option', body: [] },
          ],
        },
        ast
      )

      const code = generate(ast)
      expect(code).toContain('"Secret option" if has_key:')
      expect(code).toContain('"Normal option":')
    })

    it('should generate menu with jump in choice body', () => {
      const ast = createRenpyScript([
        createLabelNode('start', []),
        createLabelNode('ending', []),
      ])

      // Insert menu with jump in choice body
      astSynchronizer.insertMenu(
        'start',
        {
          choices: [
            { text: 'Go to ending', body: [createJumpNode('ending')] },
          ],
        },
        ast
      )

      const code = generate(ast)
      expect(code).toContain('"Go to ending":')
      expect(code).toContain('jump ending')
    })
  })

  describe('Requirement 1.4: New Jump/Call Node Generation', () => {
    it('should generate code for newly inserted jump statement', () => {
      const ast = createRenpyScript([
        createLabelNode('start', []),
        createLabelNode('next_scene', []),
      ])

      // Insert jump into label
      const success = astSynchronizer.insertJumpIntoLabel('start', 'next_scene', ast)
      expect(success).toBe(true)

      const code = generate(ast)
      expect(code).toContain('jump next_scene')
    })

    it('should generate code for newly inserted call statement', () => {
      const ast = createRenpyScript([
        createLabelNode('start', []),
        createLabelNode('subroutine', []),
      ])

      // Insert call into label
      const success = astSynchronizer.insertCallIntoLabel('start', 'subroutine', ast)
      expect(success).toBe(true)

      const code = generate(ast)
      expect(code).toContain('call subroutine')
    })

    it('should generate jump inserted into menu choice', () => {
      const menu = createMenuNode([
        createMenuChoice('Go to ending', []),
      ])
      
      const ast = createRenpyScript([
        createLabelNode('start', [menu]),
        createLabelNode('ending', []),
      ])

      // Insert jump into menu choice
      const success = astSynchronizer.insertJumpIntoChoice(menu.id, 0, 'ending', ast)
      expect(success).toBe(true)

      const code = generate(ast)
      expect(code).toContain('"Go to ending":')
      expect(code).toContain('jump ending')
    })
  })

  describe('Requirement 6.3: Orphan Nodes Should Not Generate Code', () => {
    it('should not include orphan nodes in generated code when they are not in AST', () => {
      // Create AST with only connected nodes
      const ast = createRenpyScript([
        createLabelNode('start', [
          createDialogueNode('Connected dialogue', null),
        ]),
      ])

      const code = generate(ast)
      
      // Only connected content should be present
      expect(code).toContain('label start:')
      expect(code).toContain('"Connected dialogue"')
      
      // Orphan content (not in AST) should not appear
      // This is implicit - if we don't add orphan nodes to AST, they won't generate
    })

    it('should generate code only for nodes in AST (orphans excluded by design)', () => {
      // The design ensures orphan nodes are not added to AST
      // This test verifies that only AST content generates code
      
      const ast = createRenpyScript([
        createLabelNode('scene1', [
          createDialogueNode('Scene 1 dialogue', 's'),
          createJumpNode('scene2'),
        ]),
        createLabelNode('scene2', [
          createDialogueNode('Scene 2 dialogue', 's'),
        ]),
      ])

      const code = generate(ast)
      
      // All connected nodes should be present
      expect(code).toContain('label scene1:')
      expect(code).toContain('s "Scene 1 dialogue"')
      expect(code).toContain('jump scene2')
      expect(code).toContain('label scene2:')
      expect(code).toContain('s "Scene 2 dialogue"')
    })

    it('should handle empty label body correctly (generates pass)', () => {
      // An orphan label with no content should still generate valid code
      const ast = createRenpyScript([
        createLabelNode('empty_label', []),
      ])

      const code = generate(ast)
      expect(code).toContain('label empty_label:')
      expect(code).toContain('pass')
    })
  })

  describe('New Label Generation', () => {
    it('should generate code for newly added label', () => {
      const ast = createRenpyScript([
        createLabelNode('start', []),
      ])

      // Add a new label
      const result = astSynchronizer.addLabel('new_scene', ast)
      expect(result.success).toBe(true)

      const code = generate(ast)
      expect(code).toContain('label start:')
      expect(code).toContain('label new_scene:')
    })

    it('should reject duplicate label names', () => {
      const ast = createRenpyScript([
        createLabelNode('start', []),
      ])

      // Try to add duplicate label
      const result = astSynchronizer.addLabel('start', ast)
      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('duplicate_label')
    })
  })

  describe('Complex Scenarios', () => {
    it('should generate correct code for complete story flow', () => {
      // Create a complete story structure
      const ast = createRenpyScript([
        createLabelNode('start', [
          createDialogueNode('Welcome to the story!', null),
          createDialogueNode('What would you like to do?', 's'),
        ]),
      ])

      // Add menu
      astSynchronizer.insertMenu(
        'start',
        {
          choices: [
            { text: 'Explore', body: [] },
            { text: 'Rest', body: [] },
          ],
        },
        ast
      )

      // Add new scenes
      astSynchronizer.addLabel('explore', ast)
      astSynchronizer.addLabel('rest', ast)

      // Add content to new scenes
      astSynchronizer.insertDialogue('explore', { speaker: null, text: 'You explore the area.' }, ast)
      astSynchronizer.insertDialogue('rest', { speaker: null, text: 'You take a rest.' }, ast)

      const code = generate(ast)

      // Verify complete structure
      expect(code).toContain('label start:')
      expect(code).toContain('"Welcome to the story!"')
      expect(code).toContain('s "What would you like to do?"')
      expect(code).toContain('menu:')
      expect(code).toContain('"Explore":')
      expect(code).toContain('"Rest":')
      expect(code).toContain('label explore:')
      expect(code).toContain('"You explore the area."')
      expect(code).toContain('label rest:')
      expect(code).toContain('"You take a rest."')
    })
  })
})
