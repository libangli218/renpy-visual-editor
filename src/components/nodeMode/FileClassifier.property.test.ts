/**
 * Property-Based Tests for FileClassifier
 * 
 * Feature: node-editor-redesign, Property 1: File Classification Consistency
 * Validates: Requirements 1.1, 1.2, 1.3
 * 
 * For any Ren'Py project, classifying files and then checking each file
 * individually should produce the same classification result.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { FileClassifier } from './FileClassifier'
import { RenpyScript, LabelNode, DialogueNode, DefineNode, RawNode, ASTNode } from '../../types/ast'

/**
 * Helper to create a minimal RenpyScript
 */
function createScript(statements: ASTNode[], filePath: string = 'test.rpy'): RenpyScript {
  return {
    type: 'script',
    statements,
    metadata: {
      filePath,
      parseTime: new Date(),
      version: '1.0',
    },
  }
}

/**
 * Helper to create a label node with dialogue
 */
function createLabelWithDialogue(name: string, dialogueCount: number): LabelNode {
  const dialogues: DialogueNode[] = []
  for (let i = 0; i < dialogueCount; i++) {
    dialogues.push({
      id: `dialogue-${i}`,
      type: 'dialogue',
      speaker: 'character',
      text: `Dialogue line ${i}`,
    })
  }
  return {
    id: `label-${name}`,
    type: 'label',
    name,
    body: dialogues,
  }
}

/**
 * Helper to create a define node
 */
function createDefine(name: string, value: string): DefineNode {
  return {
    id: `define-${name}`,
    type: 'define',
    name,
    value,
  }
}

/**
 * Helper to create a raw node (for style/screen/transform)
 */
function createRaw(content: string): RawNode {
  return {
    id: `raw-${Math.random().toString(36).substring(7)}`,
    type: 'raw',
    content,
  }
}

describe('Property 1: File Classification Consistency', () => {
  /**
   * Property 1: File Classification Consistency
   * For any Ren'Py project, classifying files and then checking each file
   * individually should produce the same classification result.
   * 
   * Feature: node-editor-redesign, Property 1: File Classification Consistency
   * Validates: Requirements 1.1, 1.2, 1.3
   */

  // Arbitrary for valid label names
  const arbitraryLabelName = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_0123456789'),
    { minLength: 1, maxLength: 20 }
  ).filter(s => /^[a-z_][a-z0-9_]*$/.test(s))

  // Arbitrary for valid variable names
  const arbitraryVarName = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_0123456789'),
    { minLength: 1, maxLength: 20 }
  ).filter(s => /^[a-z_][a-z0-9_]*$/.test(s))

  // Arbitrary for file paths
  const arbitraryFilePath = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_0123456789'),
    { minLength: 1, maxLength: 20 }
  ).map(name => `game/${name}.rpy`)

  // Arbitrary for story script (has labels with dialogue)
  const arbitraryStoryScript = fc.tuple(
    arbitraryFilePath,
    fc.array(arbitraryLabelName, { minLength: 1, maxLength: 5 }),
    fc.integer({ min: 1, max: 10 })
  ).map(([filePath, labelNames, dialogueCount]) => {
    const statements = labelNames.map(name => createLabelWithDialogue(name, dialogueCount))
    return { filePath, script: createScript(statements, filePath) }
  })

  // Arbitrary for config script (has defines, styles, screens)
  const arbitraryConfigScript = fc.tuple(
    arbitraryFilePath,
    fc.array(arbitraryVarName, { minLength: 1, maxLength: 10 })
  ).map(([filePath, varNames]) => {
    const statements: ASTNode[] = varNames.map(name => createDefine(name, '"value"'))
    // Add some style/screen raw nodes
    statements.push(createRaw('style button_text:\n    color "#fff"'))
    statements.push(createRaw('screen main_menu():\n    pass'))
    return { filePath, script: createScript(statements, filePath) }
  })

  it('should classify story scripts consistently', () => {
    fc.assert(
      fc.property(
        arbitraryStoryScript,
        ({ filePath, script }) => {
          const classifier = new FileClassifier()
          
          // Individual classification
          const individualResult = classifier.classifyFile(script, filePath)
          
          // Project classification
          const scripts = new Map<string, RenpyScript>()
          scripts.set(filePath, script)
          const projectResult = classifier.classifyProject(scripts)
          
          // Results should be consistent
          if (individualResult === 'story') {
            expect(projectResult.storyScripts).toContain(filePath)
            expect(projectResult.configFiles).not.toContain(filePath)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should classify config scripts consistently', () => {
    fc.assert(
      fc.property(
        arbitraryConfigScript,
        ({ filePath, script }) => {
          const classifier = new FileClassifier()
          
          // Individual classification
          const individualResult = classifier.classifyFile(script, filePath)
          
          // Project classification
          const scripts = new Map<string, RenpyScript>()
          scripts.set(filePath, script)
          const projectResult = classifier.classifyProject(scripts)
          
          // Results should be consistent
          if (individualResult === 'config') {
            expect(projectResult.configFiles).toContain(filePath)
            expect(projectResult.storyScripts).not.toContain(filePath)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should classify known config files by name', () => {
    const knownConfigFiles = ['options.rpy', 'gui.rpy', 'screens.rpy']
    
    fc.assert(
      fc.property(
        fc.constantFrom(...knownConfigFiles),
        fc.array(arbitraryVarName, { minLength: 0, maxLength: 5 }),
        (fileName, varNames) => {
          const classifier = new FileClassifier()
          const filePath = `game/${fileName}`
          
          // Even with some defines, known config files should be classified as config
          const statements: ASTNode[] = varNames.map(name => createDefine(name, '"value"'))
          const script = createScript(statements, filePath)
          
          const result = classifier.classifyFile(script, filePath)
          expect(result).toBe('config')
          
          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  it('should identify story scripts by label with dialogue', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        fc.integer({ min: 1, max: 10 }),
        (labelName, dialogueCount) => {
          const classifier = new FileClassifier()
          
          const label = createLabelWithDialogue(labelName, dialogueCount)
          const script = createScript([label])
          
          expect(classifier.isStoryScript(script)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not identify empty labels as story scripts', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        (labelName) => {
          const classifier = new FileClassifier()
          
          // Label with no dialogue
          const label: LabelNode = {
            id: `label-${labelName}`,
            type: 'label',
            name: labelName,
            body: [],
          }
          const script = createScript([label])
          
          expect(classifier.isStoryScript(script)).toBe(false)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should identify config files by define statements', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryVarName, { minLength: 3, maxLength: 10 }),
        (varNames) => {
          const classifier = new FileClassifier()
          
          const statements = varNames.map(name => createDefine(name, '"value"'))
          const script = createScript(statements)
          
          expect(classifier.isConfigFile(script)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle mixed content files correctly', () => {
    fc.assert(
      fc.property(
        arbitraryLabelName,
        fc.integer({ min: 1, max: 5 }),
        fc.array(arbitraryVarName, { minLength: 1, maxLength: 3 }),
        (labelName, dialogueCount, varNames) => {
          const classifier = new FileClassifier()
          
          // Create a file with both labels (with dialogue) and defines
          const statements: ASTNode[] = [
            createLabelWithDialogue(labelName, dialogueCount),
            ...varNames.map(name => createDefine(name, '"value"')),
          ]
          const script = createScript(statements)
          
          // Files with labels containing dialogue should be story scripts
          // even if they have some defines
          const isStory = classifier.isStoryScript(script)
          
          // A file with labels containing dialogue should be a story script
          expect(isStory).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty scripts as unknown', () => {
    fc.assert(
      fc.property(
        arbitraryFilePath.filter(p => !p.includes('options') && !p.includes('gui') && !p.includes('screens')),
        (filePath) => {
          const classifier = new FileClassifier()
          
          const script = createScript([], filePath)
          const result = classifier.classifyFile(script, filePath)
          
          expect(result).toBe('unknown')
          
          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  it('project classification should partition all files', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(arbitraryStoryScript, arbitraryConfigScript),
          { minLength: 1, maxLength: 10 }
        ),
        (fileSpecs) => {
          const classifier = new FileClassifier()
          
          // Create a project with multiple files
          const scripts = new Map<string, RenpyScript>()
          const allPaths: string[] = []
          
          for (const { filePath, script } of fileSpecs) {
            // Ensure unique paths
            const uniquePath = `${filePath}_${allPaths.length}`
            scripts.set(uniquePath, script)
            allPaths.push(uniquePath)
          }
          
          const result = classifier.classifyProject(scripts)
          
          // All files should be in exactly one category
          const allClassified = [
            ...result.storyScripts,
            ...result.configFiles,
            ...result.unknownFiles,
          ]
          
          expect(allClassified.length).toBe(allPaths.length)
          
          // No duplicates
          const uniqueClassified = new Set(allClassified)
          expect(uniqueClassified.size).toBe(allClassified.length)
          
          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})
