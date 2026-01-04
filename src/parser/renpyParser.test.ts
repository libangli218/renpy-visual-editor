import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parse } from './renpyParser'
import {
  ASTNode,
  LabelNode,
  DialogueNode,
  MenuNode,
  SceneNode,
  ShowNode,
  HideNode,
  WithNode,
  JumpNode,
  CallNode,
  IfNode,
  PlayNode,
  StopNode,
  PauseNode,
  NVLNode,
  DefineNode,
  DefaultNode,
  RawNode,
} from '../types/ast'

// Helper to check if a node is of a specific type
function isNodeType<T extends ASTNode>(node: ASTNode, type: string): node is T {
  return node.type === type
}

// Arbitrary generators for valid Ren'Py identifiers
const arbitraryIdentifier = fc.stringMatching(/^[a-z_][a-z0-9_]{0,19}$/)

// Arbitrary generator for simple text (no special characters that would break parsing)
const arbitrarySimpleText = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-'),
  { minLength: 1, maxLength: 50 }
)

describe('RenpyParser', () => {
  describe('Basic parsing', () => {
    it('should parse empty script', () => {
      const result = parse('')
      expect(result.ast.type).toBe('script')
      expect(result.ast.statements).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should parse simple label', () => {
      const result = parse('label start:\n    "Hello"')
      expect(result.ast.statements).toHaveLength(1)
      const label = result.ast.statements[0] as LabelNode
      expect(label.type).toBe('label')
      expect(label.name).toBe('start')
    })

    it('should parse dialogue with speaker', () => {
      const result = parse('s "Hello world"')
      expect(result.ast.statements).toHaveLength(1)
      const dialogue = result.ast.statements[0] as DialogueNode
      expect(dialogue.type).toBe('dialogue')
      expect(dialogue.speaker).toBe('s')
      expect(dialogue.text).toBe('Hello world')
    })

    it('should parse narration', () => {
      const result = parse('"This is narration"')
      expect(result.ast.statements).toHaveLength(1)
      const dialogue = result.ast.statements[0] as DialogueNode
      expect(dialogue.type).toBe('dialogue')
      expect(dialogue.speaker).toBeNull()
      expect(dialogue.text).toBe('This is narration')
    })
  })


  /**
   * Feature: renpy-visual-editor, Property 6: Parser Completeness
   * 
   * For any supported Ren'Py syntax construct, the parser should produce 
   * the correct AST node type.
   * 
   * Validates: Requirements 14.1, 14.2, 14.4, 14.5
   */
  describe('Property 6: Parser Completeness', () => {
    it('parses label statements correctly', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          (labelName) => {
            const source = `label ${labelName}:\n    pass`
            const result = parse(source)
            
            // Should have at least one statement
            expect(result.ast.statements.length).toBeGreaterThanOrEqual(1)
            
            // First statement should be a label
            const firstNode = result.ast.statements[0]
            expect(firstNode.type).toBe('label')
            
            if (isNodeType<LabelNode>(firstNode, 'label')) {
              expect(firstNode.name).toBe(labelName)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses jump statements correctly', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          (target) => {
            const source = `jump ${target}`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('jump')
            
            if (isNodeType<JumpNode>(node, 'jump')) {
              expect(node.target).toBe(target)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses call statements correctly', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          (target) => {
            const source = `call ${target}`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('call')
            
            if (isNodeType<CallNode>(node, 'call')) {
              expect(node.target).toBe(target)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses return statements correctly', () => {
      const source = 'return'
      const result = parse(source)
      
      expect(result.ast.statements).toHaveLength(1)
      expect(result.ast.statements[0].type).toBe('return')
    })

    it('parses dialogue with various speakers', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          arbitrarySimpleText,
          (speaker, text) => {
            const source = `${speaker} "${text}"`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('dialogue')
            
            if (isNodeType<DialogueNode>(node, 'dialogue')) {
              expect(node.speaker).toBe(speaker)
              expect(node.text).toBe(text)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses scene statements correctly', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          (imageName) => {
            const source = `scene ${imageName}`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('scene')
            
            if (isNodeType<SceneNode>(node, 'scene')) {
              expect(node.image).toBe(imageName)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses show statements correctly', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          (imageName) => {
            const source = `show ${imageName}`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('show')
            
            if (isNodeType<ShowNode>(node, 'show')) {
              expect(node.image).toBe(imageName)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses hide statements correctly', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          (imageName) => {
            const source = `hide ${imageName}`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('hide')
            
            if (isNodeType<HideNode>(node, 'hide')) {
              expect(node.image).toBe(imageName)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses with statements correctly', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          (transition) => {
            const source = `with ${transition}`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('with')
            
            if (isNodeType<WithNode>(node, 'with')) {
              expect(node.transition).toBe(transition)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses play music statements correctly', () => {
      fc.assert(
        fc.property(
          arbitrarySimpleText.filter(t => !t.includes('"')),
          (filename) => {
            const source = `play music "${filename}"`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('play')
            
            if (isNodeType<PlayNode>(node, 'play')) {
              expect(node.channel).toBe('music')
              expect(node.file).toBe(filename)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses stop statements correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('music', 'sound', 'voice'),
          (channel) => {
            const source = `stop ${channel}`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('stop')
            
            if (isNodeType<StopNode>(node, 'stop')) {
              expect(node.channel).toBe(channel)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses pause statements correctly', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
          (duration) => {
            const source = `pause ${duration.toFixed(1)}`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('pause')
            
            if (isNodeType<PauseNode>(node, 'pause')) {
              expect(node.duration).toBeCloseTo(duration, 1)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses nvl statements correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('show', 'hide', 'clear'),
          (action) => {
            const source = `nvl ${action}`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('nvl')
            
            if (isNodeType<NVLNode>(node, 'nvl')) {
              expect(node.action).toBe(action)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses define statements correctly', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          arbitrarySimpleText.filter(t => !t.includes('"')),
          (name, value) => {
            const source = `define ${name} = "${value}"`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('define')
            
            if (isNodeType<DefineNode>(node, 'define')) {
              expect(node.name).toBe(name)
              expect(node.value).toBe(`"${value}"`)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses default statements correctly', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          fc.integer({ min: -1000, max: 1000 }),
          (name, value) => {
            const source = `default ${name} = ${value}`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('default')
            
            if (isNodeType<DefaultNode>(node, 'default')) {
              expect(node.name).toBe(name)
              expect(node.value).toBe(String(value))
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses if statements correctly', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          (varName) => {
            const source = `if ${varName}:\n    pass`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('if')
            
            if (isNodeType<IfNode>(node, 'if')) {
              expect(node.branches.length).toBeGreaterThanOrEqual(1)
              expect(node.branches[0].condition).toBe(varName)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parses menu statements correctly', () => {
      const source = `menu:\n    "Choice 1":\n        pass\n    "Choice 2":\n        pass`
      const result = parse(source)
      
      expect(result.ast.statements).toHaveLength(1)
      const node = result.ast.statements[0]
      expect(node.type).toBe('menu')
      
      if (isNodeType<MenuNode>(node, 'menu')) {
        expect(node.choices.length).toBe(2)
        expect(node.choices[0].text).toBe('Choice 1')
        expect(node.choices[1].text).toBe('Choice 2')
      }
    })

    it('parses python single-line statements correctly', () => {
      fc.assert(
        fc.property(
          arbitraryIdentifier,
          fc.integer({ min: 0, max: 100 }),
          (varName, value) => {
            const source = `$ ${varName} = ${value}`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            // Could be either python or set node
            expect(['python', 'set']).toContain(node.type)
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * Feature: renpy-visual-editor, Property 7: Unsupported Syntax Preservation
   * 
   * For any Ren'Py code containing unsupported syntax, parsing should preserve 
   * the unsupported parts as raw text nodes.
   * 
   * Validates: Requirements 14.3
   */
  describe('Property 7: Unsupported Syntax Preservation', () => {
    it('preserves unsupported single-line syntax as raw nodes', () => {
      fc.assert(
        fc.property(
          // Generate random unsupported syntax (not matching any known pattern)
          fc.stringOf(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'),
            { minLength: 5, maxLength: 20 }
          ).filter(s => {
            // Filter out strings that might match known keywords
            const keywords = ['label', 'jump', 'call', 'return', 'menu', 'if', 'elif', 'else',
              'scene', 'show', 'hide', 'with', 'play', 'stop', 'voice', 'pause', 'nvl',
              'python', 'define', 'default', 'queue', 'init', 'screen', 'transform']
            return !keywords.some(k => s.startsWith(k))
          }),
          (unsupportedSyntax) => {
            const source = unsupportedSyntax
            const result = parse(source)
            
            // Should have exactly one statement
            expect(result.ast.statements).toHaveLength(1)
            
            // Should be a raw node
            const node = result.ast.statements[0]
            expect(node.type).toBe('raw')
            
            if (isNodeType<RawNode>(node, 'raw')) {
              // Raw content should contain the original syntax
              expect(node.content).toContain(unsupportedSyntax)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('preserves unsupported block syntax with indentation', () => {
      // Test with screen definition (unsupported)
      const source = `screen test_screen():\n    text "Hello"\n    button "Click"`
      const result = parse(source)
      
      // Should have one raw node containing the entire block
      expect(result.ast.statements).toHaveLength(1)
      const node = result.ast.statements[0]
      expect(node.type).toBe('raw')
      
      if (isNodeType<RawNode>(node, 'raw')) {
        // Should preserve the entire block
        expect(node.content).toContain('screen test_screen()')
        expect(node.content).toContain('text "Hello"')
        expect(node.content).toContain('button "Click"')
      }
    })

    it('preserves transform definitions as raw nodes', () => {
      const source = `transform my_transform:\n    xalign 0.5\n    yalign 0.5`
      const result = parse(source)
      
      expect(result.ast.statements).toHaveLength(1)
      const node = result.ast.statements[0]
      expect(node.type).toBe('raw')
      
      if (isNodeType<RawNode>(node, 'raw')) {
        expect(node.content).toContain('transform my_transform')
        expect(node.content).toContain('xalign 0.5')
      }
    })

    it('preserves init blocks as raw nodes', () => {
      const source = `init:\n    $ some_var = 1\n    $ another_var = 2`
      const result = parse(source)
      
      expect(result.ast.statements).toHaveLength(1)
      const node = result.ast.statements[0]
      expect(node.type).toBe('raw')
      
      if (isNodeType<RawNode>(node, 'raw')) {
        expect(node.content).toContain('init:')
      }
    })

    it('preserves original indentation in raw nodes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 5 }),
          (indentLevel) => {
            const indent = '    '.repeat(indentLevel)
            const source = `${indent}unsupported_statement_xyz`
            const result = parse(source)
            
            expect(result.ast.statements).toHaveLength(1)
            const node = result.ast.statements[0]
            expect(node.type).toBe('raw')
            
            if (isNodeType<RawNode>(node, 'raw')) {
              // Raw content should preserve the original indentation
              expect(node.content).toBe(source)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('mixes supported and unsupported syntax correctly', () => {
      const source = `label start:\n    "Hello"\n    unsupported_xyz\n    "Goodbye"`
      const result = parse(source)
      
      // Should have one label node
      expect(result.ast.statements).toHaveLength(1)
      const label = result.ast.statements[0] as LabelNode
      expect(label.type).toBe('label')
      
      // Label body should have 3 statements
      expect(label.body).toHaveLength(3)
      
      // First should be dialogue
      expect(label.body[0].type).toBe('dialogue')
      
      // Second should be raw (unsupported)
      expect(label.body[1].type).toBe('raw')
      
      // Third should be dialogue
      expect(label.body[2].type).toBe('dialogue')
    })
  })
})
