/**
 * Parser Unit Tests for Advanced Properties
 * 
 * Tests parsing of various advanced property combinations for:
 * - Show statements (as, behind, onlayer, zorder, with)
 * - Scene statements (onlayer, with)
 * - Hide statements (onlayer, with)
 * - Play statements (fadein, fadeout, volume, loop, if_changed)
 * - Menu statements (set, screen)
 * - Dialogue statements (with)
 * 
 * Requirements: 14.1-14.5
 */

import { describe, it, expect } from 'vitest'
import { RenpyParser } from './renpyParser'
import { ShowNode, SceneNode, HideNode, PlayNode, MenuNode, DialogueNode } from '../types/ast'

describe('RenpyParser Advanced Properties', () => {
  const parser = new RenpyParser()

  // ============================================
  // Show Statement Tests (Requirement 14.1)
  // ============================================
  describe('parseShow - Advanced Properties', () => {
    it('parses show with as tag', () => {
      const result = parser.parse('show eileen happy as e')
      const node = result.ast.statements[0] as ShowNode
      
      expect(node.type).toBe('show')
      expect(node.image).toBe('eileen')
      expect(node.attributes).toEqual(['happy'])
      expect(node.asTag).toBe('e')
    })

    it('parses show with behind tag', () => {
      const result = parser.parse('show eileen happy behind lucy')
      const node = result.ast.statements[0] as ShowNode
      
      expect(node.type).toBe('show')
      expect(node.image).toBe('eileen')
      expect(node.behindTag).toBe('lucy')
    })

    it('parses show with onlayer', () => {
      const result = parser.parse('show eileen happy onlayer master')
      const node = result.ast.statements[0] as ShowNode
      
      expect(node.type).toBe('show')
      expect(node.image).toBe('eileen')
      expect(node.onLayer).toBe('master')
    })

    it('parses show with zorder', () => {
      const result = parser.parse('show eileen happy zorder 10')
      const node = result.ast.statements[0] as ShowNode
      
      expect(node.type).toBe('show')
      expect(node.image).toBe('eileen')
      expect(node.zorder).toBe(10)
    })

    it('parses show with negative zorder', () => {
      const result = parser.parse('show eileen happy zorder -5')
      const node = result.ast.statements[0] as ShowNode
      
      expect(node.type).toBe('show')
      expect(node.zorder).toBe(-5)
    })

    it('parses show with transition', () => {
      const result = parser.parse('show eileen happy with dissolve')
      const node = result.ast.statements[0] as ShowNode
      
      expect(node.type).toBe('show')
      expect(node.image).toBe('eileen')
      expect(node.withTransition).toBe('dissolve')
    })

    it('parses show with at position', () => {
      const result = parser.parse('show eileen happy at left')
      const node = result.ast.statements[0] as ShowNode
      
      expect(node.type).toBe('show')
      expect(node.image).toBe('eileen')
      expect(node.atPosition).toBe('left')
    })

    it('parses show with multiple advanced properties', () => {
      const result = parser.parse('show eileen happy as e at center behind lucy onlayer master zorder 5 with dissolve')
      const node = result.ast.statements[0] as ShowNode
      
      expect(node.type).toBe('show')
      expect(node.image).toBe('eileen')
      expect(node.attributes).toEqual(['happy'])
      expect(node.asTag).toBe('e')
      expect(node.atPosition).toBe('center')
      expect(node.behindTag).toBe('lucy')
      expect(node.onLayer).toBe('master')
      expect(node.zorder).toBe(5)
      expect(node.withTransition).toBe('dissolve')
    })

    it('parses show with only image name', () => {
      const result = parser.parse('show bg room')
      const node = result.ast.statements[0] as ShowNode
      
      expect(node.type).toBe('show')
      expect(node.image).toBe('bg')
      expect(node.attributes).toEqual(['room'])
      expect(node.asTag).toBeUndefined()
      expect(node.behindTag).toBeUndefined()
      expect(node.onLayer).toBeUndefined()
      expect(node.zorder).toBeUndefined()
      expect(node.withTransition).toBeUndefined()
    })
  })

  // ============================================
  // Scene Statement Tests (Requirement 14.2)
  // ============================================
  describe('parseScene - Advanced Properties', () => {
    it('parses scene with onlayer', () => {
      const result = parser.parse('scene bg room onlayer master')
      const node = result.ast.statements[0] as SceneNode
      
      expect(node.type).toBe('scene')
      expect(node.image).toBe('bg room')
      expect(node.onLayer).toBe('master')
    })

    it('parses scene with transition', () => {
      const result = parser.parse('scene bg room with fade')
      const node = result.ast.statements[0] as SceneNode
      
      expect(node.type).toBe('scene')
      expect(node.image).toBe('bg room')
      expect(node.withTransition).toBe('fade')
    })

    it('parses scene with onlayer and transition', () => {
      const result = parser.parse('scene bg room onlayer master with dissolve')
      const node = result.ast.statements[0] as SceneNode
      
      expect(node.type).toBe('scene')
      expect(node.image).toBe('bg room')
      expect(node.onLayer).toBe('master')
      expect(node.withTransition).toBe('dissolve')
    })

    it('parses scene with only image', () => {
      const result = parser.parse('scene bg room')
      const node = result.ast.statements[0] as SceneNode
      
      expect(node.type).toBe('scene')
      expect(node.image).toBe('bg room')
      expect(node.onLayer).toBeUndefined()
      expect(node.withTransition).toBeUndefined()
    })
  })

  // ============================================
  // Hide Statement Tests (Requirement 14.3)
  // ============================================
  describe('parseHide - Advanced Properties', () => {
    it('parses hide with onlayer', () => {
      const result = parser.parse('hide eileen onlayer master')
      const node = result.ast.statements[0] as HideNode
      
      expect(node.type).toBe('hide')
      expect(node.image).toBe('eileen')
      expect(node.onLayer).toBe('master')
    })

    it('parses hide with transition', () => {
      const result = parser.parse('hide eileen with dissolve')
      const node = result.ast.statements[0] as HideNode
      
      expect(node.type).toBe('hide')
      expect(node.image).toBe('eileen')
      expect(node.withTransition).toBe('dissolve')
    })

    it('parses hide with onlayer and transition', () => {
      const result = parser.parse('hide eileen onlayer master with fade')
      const node = result.ast.statements[0] as HideNode
      
      expect(node.type).toBe('hide')
      expect(node.image).toBe('eileen')
      expect(node.onLayer).toBe('master')
      expect(node.withTransition).toBe('fade')
    })

    it('parses hide with only image', () => {
      const result = parser.parse('hide eileen')
      const node = result.ast.statements[0] as HideNode
      
      expect(node.type).toBe('hide')
      expect(node.image).toBe('eileen')
      expect(node.onLayer).toBeUndefined()
      expect(node.withTransition).toBeUndefined()
    })
  })

  // ============================================
  // Play Statement Tests (Requirement 14.4)
  // ============================================
  describe('parsePlay - Advanced Properties', () => {
    it('parses play music with fadein', () => {
      const result = parser.parse('play music "bgm.ogg" fadein 1.0')
      const node = result.ast.statements[0] as PlayNode
      
      expect(node.type).toBe('play')
      expect(node.channel).toBe('music')
      expect(node.file).toBe('bgm.ogg')
      expect(node.fadeIn).toBe(1.0)
    })

    it('parses play music with fadeout', () => {
      const result = parser.parse('play music "bgm.ogg" fadeout 2.0')
      const node = result.ast.statements[0] as PlayNode
      
      expect(node.type).toBe('play')
      expect(node.channel).toBe('music')
      expect(node.fadeOut).toBe(2.0)
    })

    it('parses play music with volume', () => {
      const result = parser.parse('play music "bgm.ogg" volume 0.5')
      const node = result.ast.statements[0] as PlayNode
      
      expect(node.type).toBe('play')
      expect(node.channel).toBe('music')
      expect(node.volume).toBe(0.5)
    })

    it('parses play music with loop', () => {
      const result = parser.parse('play music "bgm.ogg" loop')
      const node = result.ast.statements[0] as PlayNode
      
      expect(node.type).toBe('play')
      expect(node.channel).toBe('music')
      expect(node.loop).toBe(true)
    })

    it('parses play music with noloop', () => {
      const result = parser.parse('play music "bgm.ogg" noloop')
      const node = result.ast.statements[0] as PlayNode
      
      expect(node.type).toBe('play')
      expect(node.channel).toBe('music')
      expect(node.loop).toBe(false)
    })

    it('parses play music with if_changed', () => {
      const result = parser.parse('play music "bgm.ogg" if_changed')
      const node = result.ast.statements[0] as PlayNode
      
      expect(node.type).toBe('play')
      expect(node.channel).toBe('music')
      expect(node.ifChanged).toBe(true)
    })

    it('parses play music with multiple options', () => {
      const result = parser.parse('play music "bgm.ogg" fadein 1.0 fadeout 2.0 volume 0.8 loop if_changed')
      const node = result.ast.statements[0] as PlayNode
      
      expect(node.type).toBe('play')
      expect(node.channel).toBe('music')
      expect(node.file).toBe('bgm.ogg')
      expect(node.fadeIn).toBe(1.0)
      expect(node.fadeOut).toBe(2.0)
      expect(node.volume).toBe(0.8)
      expect(node.loop).toBe(true)
      expect(node.ifChanged).toBe(true)
    })

    it('parses play sound with fadein', () => {
      const result = parser.parse('play sound "effect.ogg" fadein 0.5')
      const node = result.ast.statements[0] as PlayNode
      
      expect(node.type).toBe('play')
      expect(node.channel).toBe('sound')
      expect(node.fadeIn).toBe(0.5)
    })

    it('parses play sound with loop', () => {
      const result = parser.parse('play sound "effect.ogg" loop')
      const node = result.ast.statements[0] as PlayNode
      
      expect(node.type).toBe('play')
      expect(node.channel).toBe('sound')
      expect(node.loop).toBe(true)
    })

    it('parses queue music with options', () => {
      const result = parser.parse('queue music "next.ogg" fadein 1.0')
      const node = result.ast.statements[0] as PlayNode
      
      expect(node.type).toBe('play')
      expect(node.channel).toBe('music')
      expect(node.file).toBe('next.ogg')
      expect(node.queue).toBe(true)
      expect(node.fadeIn).toBe(1.0)
    })
  })

  // ============================================
  // Menu Statement Tests (Requirement 14.5)
  // ============================================
  describe('parseMenu - Advanced Properties', () => {
    it('parses menu with set clause', () => {
      const result = parser.parse(`menu (set choices_made):
    "Option 1":
        jump opt1`)
      const node = result.ast.statements[0] as MenuNode
      
      expect(node.type).toBe('menu')
      expect(node.setVar).toBe('choices_made')
    })

    it('parses menu with screen clause', () => {
      const result = parser.parse(`menu (screen custom_menu):
    "Option 1":
        jump opt1`)
      const node = result.ast.statements[0] as MenuNode
      
      expect(node.type).toBe('menu')
      expect(node.screen).toBe('custom_menu')
    })

    it('parses menu with both set and screen clauses (legacy format)', () => {
      const result = parser.parse(`menu (set choices) (screen my_menu):
    "Option 1":
        jump opt1`)
      const node = result.ast.statements[0] as MenuNode
      
      expect(node.type).toBe('menu')
      expect(node.setVar).toBe('choices')
      expect(node.screen).toBe('my_menu')
    })

    it('parses menu with screen argument and set inside block (new format)', () => {
      const result = parser.parse(`menu (screen=my_menu):
    set choices
    "Option 1":
        jump opt1`)
      const node = result.ast.statements[0] as MenuNode
      
      expect(node.type).toBe('menu')
      expect(node.setVar).toBe('choices')
      expect(node.screen).toBe('my_menu')
    })

    it('parses menu with name and set clause', () => {
      const result = parser.parse(`menu main_choice (set visited):
    "Option 1":
        jump opt1`)
      const node = result.ast.statements[0] as MenuNode
      
      expect(node.type).toBe('menu')
      expect(node.prompt).toBe('main_choice')
      expect(node.setVar).toBe('visited')
    })

    it('parses basic menu without advanced properties', () => {
      const result = parser.parse(`menu:
    "Option 1":
        jump opt1`)
      const node = result.ast.statements[0] as MenuNode
      
      expect(node.type).toBe('menu')
      expect(node.setVar).toBeUndefined()
      expect(node.screen).toBeUndefined()
    })
  })

  // ============================================
  // Dialogue Statement Tests (Requirement 11.3)
  // ============================================
  describe('parseDialogue - Advanced Properties', () => {
    it('parses dialogue with transition', () => {
      const result = parser.parse('e "Hello!" with vpunch')
      const node = result.ast.statements[0] as DialogueNode
      
      expect(node.type).toBe('dialogue')
      expect(node.speaker).toBe('e')
      expect(node.text).toBe('Hello!')
      expect(node.withTransition).toBe('vpunch')
    })

    it('parses narration with transition', () => {
      const result = parser.parse('"The screen shakes." with hpunch')
      const node = result.ast.statements[0] as DialogueNode
      
      expect(node.type).toBe('dialogue')
      expect(node.speaker).toBeNull()
      expect(node.text).toBe('The screen shakes.')
      expect(node.withTransition).toBe('hpunch')
    })

    it('parses dialogue with attributes and transition', () => {
      const result = parser.parse('e happy "Hello!" with dissolve')
      const node = result.ast.statements[0] as DialogueNode
      
      expect(node.type).toBe('dialogue')
      expect(node.speaker).toBe('e')
      expect(node.attributes).toEqual(['happy'])
      expect(node.text).toBe('Hello!')
      expect(node.withTransition).toBe('dissolve')
    })

    it('parses dialogue without transition', () => {
      const result = parser.parse('e "Hello!"')
      const node = result.ast.statements[0] as DialogueNode
      
      expect(node.type).toBe('dialogue')
      expect(node.speaker).toBe('e')
      expect(node.text).toBe('Hello!')
      expect(node.withTransition).toBeUndefined()
    })
  })
})
