/**
 * Code Generator Tests
 * 
 * Tests for the Ren'Py code generator.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { generate, generateNode, CodeGenerator } from './codeGenerator'
import {
  createLabelNode,
  createDialogueNode,
  createMenuNode,
  createMenuChoice,
  createSceneNode,
  createShowNode,
  createHideNode,
  createWithNode,
  createJumpNode,
  createCallNode,
  createReturnNode,
  createIfNode,
  createIfBranch,
  createSetNode,
  createPythonNode,
  createDefineNode,
  createDefaultNode,
  createPlayNode,
  createStopNode,
  createPauseNode,
  createNVLNode,
  createRawNode,
  createRenpyScript,
  resetNodeIdCounter,
} from '../parser/nodeFactory'

describe('CodeGenerator', () => {
  beforeEach(() => {
    resetNodeIdCounter()
  })

  describe('Basic Statements', () => {
    it('should generate label with body', () => {
      const label = createLabelNode('start', [
        createDialogueNode('Hello world!', null),
      ])
      const code = generateNode(label, 0)
      expect(code).toBe('label start:\n    "Hello world!"')
    })

    it('should generate label with parameters', () => {
      const label = createLabelNode('greet', [
        createDialogueNode('Hello!', null),
      ], { parameters: ['name', 'age'] })
      const code = generateNode(label, 0)
      expect(code).toBe('label greet(name, age):\n    "Hello!"')
    })

    it('should generate empty label with pass', () => {
      const label = createLabelNode('empty', [])
      const code = generateNode(label, 0)
      expect(code).toBe('label empty:\n    pass')
    })

    it('should generate narration', () => {
      const dialogue = createDialogueNode('This is narration.', null)
      const code = generateNode(dialogue, 0)
      expect(code).toBe('"This is narration."')
    })

    it('should generate dialogue with speaker', () => {
      const dialogue = createDialogueNode('Hello!', 's')
      const code = generateNode(dialogue, 0)
      expect(code).toBe('s "Hello!"')
    })

    it('should generate dialogue with speaker and attributes', () => {
      const dialogue = createDialogueNode('Hello!', 's', { attributes: ['happy', 'at left'] })
      const code = generateNode(dialogue, 0)
      expect(code).toBe('s happy at left "Hello!"')
    })

    it('should escape special characters in dialogue', () => {
      const dialogue = createDialogueNode('He said "Hello"\nNew line', null)
      const code = generateNode(dialogue, 0)
      expect(code).toBe('"He said \\"Hello\\"\\nNew line"')
    })

    it('should generate jump statement', () => {
      const jump = createJumpNode('next_scene')
      const code = generateNode(jump, 0)
      expect(code).toBe('jump next_scene')
    })

    it('should generate jump expression', () => {
      const jump = createJumpNode('target_label', { expression: true })
      const code = generateNode(jump, 0)
      expect(code).toBe('jump expression target_label')
    })

    it('should generate call statement', () => {
      const call = createCallNode('subroutine')
      const code = generateNode(call, 0)
      expect(code).toBe('call subroutine')
    })

    it('should generate call with arguments', () => {
      const call = createCallNode('greet', { arguments: ['name', '42'] })
      const code = generateNode(call, 0)
      expect(code).toBe('call greet(name, 42)')
    })

    it('should generate return statement', () => {
      const ret = createReturnNode()
      const code = generateNode(ret, 0)
      expect(code).toBe('return')
    })

    it('should generate return with value', () => {
      const ret = createReturnNode({ value: 'True' })
      const code = generateNode(ret, 0)
      expect(code).toBe('return True')
    })
  })

  describe('Menu Generation', () => {
    it('should generate simple menu', () => {
      const menu = createMenuNode([
        createMenuChoice('Option 1', [createJumpNode('opt1')]),
        createMenuChoice('Option 2', [createJumpNode('opt2')]),
      ])
      const code = generateNode(menu, 0)
      expect(code).toBe(
        'menu:\n' +
        '    "Option 1":\n' +
        '        jump opt1\n' +
        '    "Option 2":\n' +
        '        jump opt2'
      )
    })

    it('should generate menu with conditions', () => {
      const menu = createMenuNode([
        createMenuChoice('Secret option', [createJumpNode('secret')], 'has_key'),
      ])
      const code = generateNode(menu, 0)
      expect(code).toBe(
        'menu:\n' +
        '    "Secret option" if has_key:\n' +
        '        jump secret'
      )
    })

    it('should generate menu with prompt', () => {
      const menu = createMenuNode([
        createMenuChoice('Yes', [createJumpNode('yes')]),
      ], { prompt: 'choice_menu' })
      const code = generateNode(menu, 0)
      expect(code).toBe(
        'menu choice_menu:\n' +
        '    "Yes":\n' +
        '        jump yes'
      )
    })
  })

  describe('If/Elif/Else Generation', () => {
    it('should generate simple if statement', () => {
      const ifNode = createIfNode([
        createIfBranch('score > 10', [createDialogueNode('You win!', null)]),
      ])
      const code = generateNode(ifNode, 0)
      expect(code).toBe(
        'if score > 10:\n' +
        '    "You win!"'
      )
    })

    it('should generate if/else statement', () => {
      const ifNode = createIfNode([
        createIfBranch('score > 10', [createDialogueNode('You win!', null)]),
        createIfBranch(null, [createDialogueNode('You lose!', null)]),
      ])
      const code = generateNode(ifNode, 0)
      expect(code).toBe(
        'if score > 10:\n' +
        '    "You win!"\n' +
        'else:\n' +
        '    "You lose!"'
      )
    })

    it('should generate if/elif/else statement', () => {
      const ifNode = createIfNode([
        createIfBranch('score > 100', [createDialogueNode('Perfect!', null)]),
        createIfBranch('score > 50', [createDialogueNode('Good!', null)]),
        createIfBranch(null, [createDialogueNode('Try again!', null)]),
      ])
      const code = generateNode(ifNode, 0)
      expect(code).toBe(
        'if score > 100:\n' +
        '    "Perfect!"\n' +
        'elif score > 50:\n' +
        '    "Good!"\n' +
        'else:\n' +
        '    "Try again!"'
      )
    })

    it('should generate nested if with correct indentation', () => {
      const innerIf = createIfNode([
        createIfBranch('has_key', [createDialogueNode('Door opens!', null)]),
      ])
      const outerIf = createIfNode([
        createIfBranch('at_door', [innerIf]),
      ])
      const code = generateNode(outerIf, 0)
      expect(code).toBe(
        'if at_door:\n' +
        '    if has_key:\n' +
        '        "Door opens!"'
      )
    })
  })

  describe('Scene/Show/Hide/With Generation', () => {
    it('should generate scene statement', () => {
      const scene = createSceneNode('bg classroom')
      const code = generateNode(scene, 0)
      expect(code).toBe('scene bg classroom')
    })

    it('should generate show statement', () => {
      const show = createShowNode('sylvie')
      const code = generateNode(show, 0)
      expect(code).toBe('show sylvie')
    })

    it('should generate show with attributes', () => {
      const show = createShowNode('sylvie', { attributes: ['happy', 'casual'] })
      const code = generateNode(show, 0)
      expect(code).toBe('show sylvie happy casual')
    })

    it('should generate show with position', () => {
      const show = createShowNode('sylvie', { atPosition: 'left' })
      const code = generateNode(show, 0)
      expect(code).toBe('show sylvie at left')
    })

    it('should generate show with attributes and position', () => {
      const show = createShowNode('sylvie', { attributes: ['happy'], atPosition: 'right' })
      const code = generateNode(show, 0)
      expect(code).toBe('show sylvie happy at right')
    })

    it('should generate hide statement', () => {
      const hide = createHideNode('sylvie')
      const code = generateNode(hide, 0)
      expect(code).toBe('hide sylvie')
    })

    it('should generate with statement', () => {
      const withNode = createWithNode('dissolve')
      const code = generateNode(withNode, 0)
      expect(code).toBe('with dissolve')
    })

    it('should generate with custom transition', () => {
      const withNode = createWithNode('Dissolve(0.5)')
      const code = generateNode(withNode, 0)
      expect(code).toBe('with Dissolve(0.5)')
    })
  })

  describe('Audio Generation', () => {
    it('should generate play music', () => {
      const play = createPlayNode('music', 'audio/bgm.ogg')
      const code = generateNode(play, 0)
      expect(code).toBe('play music "audio/bgm.ogg"')
    })

    it('should generate play music with options', () => {
      const play = createPlayNode('music', 'audio/bgm.ogg', { fadeIn: 1.0, loop: true })
      const code = generateNode(play, 0)
      expect(code).toBe('play music "audio/bgm.ogg" fadein 1 loop')
    })

    it('should generate play sound', () => {
      const play = createPlayNode('sound', 'audio/click.ogg')
      const code = generateNode(play, 0)
      expect(code).toBe('play sound "audio/click.ogg"')
    })

    it('should generate voice', () => {
      const play = createPlayNode('voice', 'audio/v001.ogg')
      const code = generateNode(play, 0)
      expect(code).toBe('voice "audio/v001.ogg"')
    })

    it('should generate queue music', () => {
      const play = createPlayNode('music', 'audio/next.ogg', { queue: true })
      const code = generateNode(play, 0)
      expect(code).toBe('queue music "audio/next.ogg"')
    })

    it('should generate stop music', () => {
      const stop = createStopNode('music')
      const code = generateNode(stop, 0)
      expect(code).toBe('stop music')
    })

    it('should generate stop music with fadeout', () => {
      const stop = createStopNode('music', { fadeOut: 2.0 })
      const code = generateNode(stop, 0)
      expect(code).toBe('stop music fadeout 2')
    })
  })

  describe('Python Generation', () => {
    it('should generate single line python', () => {
      const python = createPythonNode('score += 10')
      const code = generateNode(python, 0)
      expect(code).toBe('$ score += 10')
    })

    it('should generate python block', () => {
      const python = createPythonNode('x = 1\ny = 2\nz = x + y')
      const code = generateNode(python, 0)
      expect(code).toBe(
        'python:\n' +
        '    x = 1\n' +
        '    y = 2\n' +
        '    z = x + y'
      )
    })

    it('should generate init python early', () => {
      const python = createPythonNode('import renpy', { early: true })
      const code = generateNode(python, 0)
      expect(code).toBe(
        'init python early:\n' +
        '    import renpy'
      )
    })

    it('should generate python hide', () => {
      const python = createPythonNode('secret = True', { hide: true })
      const code = generateNode(python, 0)
      expect(code).toBe(
        'python hide:\n' +
        '    secret = True'
      )
    })
  })

  describe('Variable Definition Generation', () => {
    it('should generate define statement', () => {
      const define = createDefineNode('s', 'Character("Sylvie")')
      const code = generateNode(define, 0)
      expect(code).toBe('define s = Character("Sylvie")')
    })

    it('should generate define with store', () => {
      const define = createDefineNode('config', 'True', { store: 'mystore' })
      const code = generateNode(define, 0)
      expect(code).toBe('define mystore.config = True')
    })

    it('should generate default statement', () => {
      const defaultNode = createDefaultNode('score', '0')
      const code = generateNode(defaultNode, 0)
      expect(code).toBe('default score = 0')
    })
  })

  describe('Other Statements', () => {
    it('should generate pause', () => {
      const pause = createPauseNode()
      const code = generateNode(pause, 0)
      expect(code).toBe('pause')
    })

    it('should generate pause with duration', () => {
      const pause = createPauseNode({ duration: 2.5 })
      const code = generateNode(pause, 0)
      expect(code).toBe('pause 2.5')
    })

    it('should generate nvl show', () => {
      const nvl = createNVLNode('show')
      const code = generateNode(nvl, 0)
      expect(code).toBe('nvl show')
    })

    it('should generate nvl clear', () => {
      const nvl = createNVLNode('clear')
      const code = generateNode(nvl, 0)
      expect(code).toBe('nvl clear')
    })

    it('should generate set statement', () => {
      const set = createSetNode('score', '100', { operator: '=' })
      const code = generateNode(set, 0)
      expect(code).toBe('$ score = 100')
    })

    it('should generate set with compound operator', () => {
      const set = createSetNode('score', '10', { operator: '+=' })
      const code = generateNode(set, 0)
      expect(code).toBe('$ score += 10')
    })

    it('should generate raw node', () => {
      const raw = createRawNode('screen my_screen:\n    text "Hello"')
      const code = generateNode(raw, 0)
      expect(code).toBe('screen my_screen:\n    text "Hello"')
    })
  })

  describe('Full Script Generation', () => {
    it('should generate complete script', () => {
      const script = createRenpyScript([
        createDefineNode('s', 'Character("Sylvie")'),
        createDefaultNode('score', '0'),
        createLabelNode('start', [
          createSceneNode('bg classroom'),
          createShowNode('sylvie', { attributes: ['happy'] }),
          createWithNode('dissolve'),
          createDialogueNode('Hello!', 's'),
          createMenuNode([
            createMenuChoice('Hi!', [createSetNode('score', '10', { operator: '+=' })]),
            createMenuChoice('Bye!', [createJumpNode('ending')]),
          ]),
        ]),
      ])
      
      const code = generate(script)
      expect(code).toContain('define s = Character("Sylvie")')
      expect(code).toContain('default score = 0')
      expect(code).toContain('label start:')
      expect(code).toContain('scene bg classroom')
      expect(code).toContain('show sylvie happy')
      expect(code).toContain('with dissolve')
      expect(code).toContain('s "Hello!"')
      expect(code).toContain('menu:')
      expect(code).toContain('"Hi!":')
      expect(code).toContain('$ score += 10')
    })
  })

  describe('Code Formatting', () => {
    it('should add blank line after labels', () => {
      const script = createRenpyScript([
        createLabelNode('start', [createDialogueNode('Hello', null)]),
        createLabelNode('end', [createDialogueNode('Bye', null)]),
      ])
      const code = generate(script)
      expect(code).toContain('    "Hello"\n\nlabel end:')
    })

    it('should add blank line after define/default block', () => {
      const script = createRenpyScript([
        createDefineNode('s', 'Character("Sylvie")'),
        createDefaultNode('score', '0'),
        createLabelNode('start', [createDialogueNode('Hello', null)]),
      ])
      const code = generate(script)
      expect(code).toContain('default score = 0\n\nlabel start:')
    })

    it('should not add blank line between define statements', () => {
      const script = createRenpyScript([
        createDefineNode('s', 'Character("Sylvie")'),
        createDefineNode('m', 'Character("Me")'),
      ])
      const code = generate(script)
      expect(code).toBe('define s = Character("Sylvie")\ndefine m = Character("Me")')
    })

    it('should add blank line around multi-line raw blocks', () => {
      const script = createRenpyScript([
        createDefineNode('s', 'Character("Sylvie")'),
        createRawNode('screen my_screen:\n    text "Hello"'),
        createLabelNode('start', [createDialogueNode('Hello', null)]),
      ])
      const code = generate(script)
      expect(code).toContain('define s = Character("Sylvie")\n\nscreen my_screen:')
      expect(code).toContain('    text "Hello"\n\nlabel start:')
    })

    it('should preserve raw node content exactly', () => {
      const raw = createRawNode('# This is a comment\nscreen complex:\n    vbox:\n        text "Hello"')
      const code = generateNode(raw, 0)
      expect(code).toBe('# This is a comment\nscreen complex:\n    vbox:\n        text "Hello"')
    })

    it('should disable blank lines when option is false', () => {
      const script = createRenpyScript([
        createLabelNode('start', [createDialogueNode('Hello', null)]),
        createLabelNode('end', [createDialogueNode('Bye', null)]),
      ])
      const code = generate(script, { insertBlankLines: false })
      expect(code).not.toContain('\n\n')
    })
  })

  describe('Indentation', () => {
    it('should use 4 spaces for indentation by default', () => {
      const label = createLabelNode('test', [
        createDialogueNode('Hello', null),
      ])
      const code = generateNode(label, 0)
      expect(code).toContain('    "Hello"')
    })

    it('should respect custom indent size', () => {
      const generator = new CodeGenerator({ indentSize: 2 })
      const label = createLabelNode('test', [
        createDialogueNode('Hello', null),
      ])
      const code = generator.generateNode(label, 0)
      expect(code).toContain('  "Hello"')
    })

    it('should handle nested indentation correctly', () => {
      const label = createLabelNode('test', [
        createIfNode([
          createIfBranch('True', [
            createDialogueNode('Nested', null),
          ]),
        ]),
      ])
      const code = generateNode(label, 0)
      expect(code).toContain('        "Nested"') // 8 spaces (2 levels)
    })
  })
})
