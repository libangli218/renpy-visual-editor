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

    it('should generate call with from clause', () => {
      const call = createCallNode('subroutine', { from: 'return_point' })
      const code = generateNode(call, 0)
      expect(code).toBe('call subroutine from return_point')
    })

    it('should generate call with arguments and from clause', () => {
      const call = createCallNode('greet', { arguments: ['name', '42'], from: 'after_greet' })
      const code = generateNode(call, 0)
      expect(code).toBe('call greet(name, 42) from after_greet')
    })

    it('should generate call expression', () => {
      const call = createCallNode('"sub" + "routine"', { expression: true })
      const code = generateNode(call, 0)
      expect(code).toBe('call expression "sub" + "routine"')
    })

    it('should generate call expression with arguments using pass keyword', () => {
      const call = createCallNode('"sub" + "routine"', { expression: true, arguments: ['count=3'] })
      const code = generateNode(call, 0)
      expect(code).toBe('call expression "sub" + "routine" pass (count=3)')
    })

    it('should generate call expression with arguments and from clause', () => {
      const call = createCallNode('target_var', { expression: true, arguments: ['1', '2'], from: 'return_here' })
      const code = generateNode(call, 0)
      expect(code).toBe('call expression target_var pass (1, 2) from return_here')
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
      ], { prompt: 'What do you want to do?' })
      const code = generateNode(menu, 0)
      expect(code).toBe(
        'menu:\n' +
        '    "What do you want to do?"\n' +
        '\n' +
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

    it('should generate play music with volume', () => {
      const play = createPlayNode('music', 'audio/bgm.ogg', { volume: 0.5 })
      const code = generateNode(play, 0)
      expect(code).toBe('play music "audio/bgm.ogg" volume 0.5')
    })

    it('should generate play music with all options', () => {
      const play = createPlayNode('music', 'audio/bgm.ogg', { fadeIn: 2.0, loop: true, volume: 0.8 })
      const code = generateNode(play, 0)
      expect(code).toBe('play music "audio/bgm.ogg" fadein 2 loop volume 0.8')
    })

    it('should generate play music with noloop', () => {
      const play = createPlayNode('music', 'audio/bgm.ogg', { loop: false })
      const code = generateNode(play, 0)
      expect(code).toBe('play music "audio/bgm.ogg" noloop')
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

    it('should generate queue music with options', () => {
      const play = createPlayNode('music', 'audio/next.ogg', { queue: true, fadeIn: 1.5, loop: true })
      const code = generateNode(play, 0)
      expect(code).toBe('queue music "audio/next.ogg" fadein 1.5 loop')
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

    it('should generate stop sound', () => {
      const stop = createStopNode('sound')
      const code = generateNode(stop, 0)
      expect(code).toBe('stop sound')
    })

    it('should generate stop voice', () => {
      const stop = createStopNode('voice')
      const code = generateNode(stop, 0)
      expect(code).toBe('stop voice')
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

  describe('Advanced Properties Generation', () => {
    describe('Show Advanced Properties', () => {
      it('should generate show with as tag', () => {
        const show = createShowNode('sylvie', { asTag: 'sylvie_left' })
        const code = generateNode(show, 0)
        expect(code).toBe('show sylvie as sylvie_left')
      })

      it('should generate show with behind tag', () => {
        const show = createShowNode('sylvie', { behindTag: 'eileen' })
        const code = generateNode(show, 0)
        expect(code).toBe('show sylvie behind eileen')
      })

      it('should generate show with onlayer', () => {
        const show = createShowNode('sylvie', { onLayer: 'master' })
        const code = generateNode(show, 0)
        expect(code).toBe('show sylvie onlayer master')
      })

      it('should generate show with zorder', () => {
        const show = createShowNode('sylvie', { zorder: 10 })
        const code = generateNode(show, 0)
        expect(code).toBe('show sylvie zorder 10')
      })

      it('should generate show with negative zorder', () => {
        const show = createShowNode('sylvie', { zorder: -5 })
        const code = generateNode(show, 0)
        expect(code).toBe('show sylvie zorder -5')
      })

      it('should generate show with withTransition', () => {
        const show = createShowNode('sylvie', { withTransition: 'dissolve' })
        const code = generateNode(show, 0)
        expect(code).toBe('show sylvie with dissolve')
      })

      it('should generate show with all advanced properties in correct order', () => {
        const show = createShowNode('sylvie', {
          attributes: ['happy'],
          asTag: 'sylvie_left',
          atPosition: 'left',
          behindTag: 'eileen',
          onLayer: 'master',
          zorder: 10,
          withTransition: 'dissolve',
        })
        const code = generateNode(show, 0)
        expect(code).toBe('show sylvie happy as sylvie_left at left behind eileen onlayer master zorder 10 with dissolve')
      })

      it('should generate show with partial advanced properties', () => {
        const show = createShowNode('sylvie', {
          atPosition: 'center',
          onLayer: 'transient',
          withTransition: 'fade',
        })
        const code = generateNode(show, 0)
        expect(code).toBe('show sylvie at center onlayer transient with fade')
      })
    })

    describe('Scene Advanced Properties', () => {
      it('should generate scene with onlayer', () => {
        const scene = createSceneNode('bg classroom', { onLayer: 'master' })
        const code = generateNode(scene, 0)
        expect(code).toBe('scene bg classroom onlayer master')
      })

      it('should generate scene with withTransition', () => {
        const scene = createSceneNode('bg classroom', { withTransition: 'dissolve' })
        const code = generateNode(scene, 0)
        expect(code).toBe('scene bg classroom with dissolve')
      })

      it('should generate scene with all advanced properties', () => {
        const scene = createSceneNode('bg classroom', {
          onLayer: 'master',
          withTransition: 'fade',
        })
        const code = generateNode(scene, 0)
        expect(code).toBe('scene bg classroom onlayer master with fade')
      })
    })

    describe('Hide Advanced Properties', () => {
      it('should generate hide with onlayer', () => {
        const hide = createHideNode('sylvie', { onLayer: 'master' })
        const code = generateNode(hide, 0)
        expect(code).toBe('hide sylvie onlayer master')
      })

      it('should generate hide with withTransition', () => {
        const hide = createHideNode('sylvie', { withTransition: 'dissolve' })
        const code = generateNode(hide, 0)
        expect(code).toBe('hide sylvie with dissolve')
      })

      it('should generate hide with all advanced properties', () => {
        const hide = createHideNode('sylvie', {
          onLayer: 'transient',
          withTransition: 'fade',
        })
        const code = generateNode(hide, 0)
        expect(code).toBe('hide sylvie onlayer transient with fade')
      })
    })

    describe('Play Advanced Properties', () => {
      it('should generate play music with fadeout', () => {
        const play = createPlayNode('music', 'audio/bgm.ogg', { fadeOut: 2.0 })
        const code = generateNode(play, 0)
        expect(code).toBe('play music "audio/bgm.ogg" fadeout 2')
      })

      it('should generate play music with if_changed', () => {
        const play = createPlayNode('music', 'audio/bgm.ogg', { ifChanged: true })
        const code = generateNode(play, 0)
        expect(code).toBe('play music "audio/bgm.ogg" if_changed')
      })

      it('should generate play music with all advanced options', () => {
        const play = createPlayNode('music', 'audio/bgm.ogg', {
          fadeIn: 1.0,
          fadeOut: 2.0,
          loop: true,
          volume: 0.8,
          ifChanged: true,
        })
        const code = generateNode(play, 0)
        expect(code).toBe('play music "audio/bgm.ogg" fadein 1 fadeout 2 loop volume 0.8 if_changed')
      })

      it('should generate queue music with advanced options', () => {
        const play = createPlayNode('music', 'audio/next.ogg', {
          queue: true,
          fadeIn: 1.5,
          fadeOut: 1.0,
          ifChanged: true,
        })
        const code = generateNode(play, 0)
        expect(code).toBe('queue music "audio/next.ogg" fadein 1.5 fadeout 1 if_changed')
      })
    })

    describe('Menu Advanced Properties', () => {
      it('should generate menu with set clause', () => {
        const menu = createMenuNode([
          createMenuChoice('Option 1', [createJumpNode('opt1')]),
        ], { setVar: 'chosen_options' })
        const code = generateNode(menu, 0)
        // New format: set is inside menu block, not on menu line
        expect(code).toContain('menu:')
        expect(code).toContain('set chosen_options')
      })

      it('should generate menu with screen clause', () => {
        const menu = createMenuNode([
          createMenuChoice('Option 1', [createJumpNode('opt1')]),
        ], { screen: 'custom_menu' })
        const code = generateNode(menu, 0)
        expect(code).toContain('menu (screen=custom_menu):')
      })

      it('should generate menu with both set and screen clauses', () => {
        const menu = createMenuNode([
          createMenuChoice('Option 1', [createJumpNode('opt1')]),
        ], { setVar: 'chosen', screen: 'my_menu' })
        const code = generateNode(menu, 0)
        // New format: screen on menu line, set inside menu block
        expect(code).toContain('menu (screen=my_menu):')
        expect(code).toContain('set chosen')
      })
    })

    describe('Dialogue Advanced Properties', () => {
      it('should generate narration with withTransition', () => {
        const dialogue = createDialogueNode('The screen shakes.', null, { withTransition: 'vpunch' })
        const code = generateNode(dialogue, 0)
        expect(code).toBe('"The screen shakes." with vpunch')
      })

      it('should generate dialogue with withTransition', () => {
        const dialogue = createDialogueNode('Hello!', 's', { withTransition: 'dissolve' })
        const code = generateNode(dialogue, 0)
        expect(code).toBe('s "Hello!" with dissolve')
      })

      it('should generate dialogue with attributes and withTransition', () => {
        const dialogue = createDialogueNode('Hello!', 's', {
          attributes: ['happy'],
          withTransition: 'fade',
        })
        const code = generateNode(dialogue, 0)
        expect(code).toBe('s happy "Hello!" with fade')
      })
    })
  })
})
