/**
 * BlockTreeBuilder Unit Tests
 * 积木树构建器单元测试
 * 
 * Tests for building block trees from AST nodes.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BlockTreeBuilder, resetBlockIdCounter } from './BlockTreeBuilder'
import {
  LabelNode,
  DialogueNode,
  SceneNode,
  ShowNode,
  HideNode,
  WithNode,
  MenuNode,
  JumpNode,
  CallNode,
  ReturnNode,
  IfNode,
  PythonNode,
  PlayNode,
  StopNode,
} from '../../types/ast'

// Helper to create a basic label node
function createLabelNode(name: string, body: any[] = []): LabelNode {
  return {
    id: `label_${name}`,
    type: 'label',
    name,
    body,
  }
}

// Helper to create a dialogue node
function createDialogueNode(speaker: string | null, text: string): DialogueNode {
  return {
    id: `dialogue_${Date.now()}_${Math.random()}`,
    type: 'dialogue',
    speaker,
    text,
  }
}

// Helper to create a scene node
function createSceneNode(image: string): SceneNode {
  return {
    id: `scene_${Date.now()}_${Math.random()}`,
    type: 'scene',
    image,
  }
}

// Helper to create a show node
function createShowNode(image: string, atPosition?: string, attributes?: string[]): ShowNode {
  return {
    id: `show_${Date.now()}_${Math.random()}`,
    type: 'show',
    image,
    atPosition,
    attributes,
  }
}

// Helper to create a hide node
function createHideNode(image: string): HideNode {
  return {
    id: `hide_${Date.now()}_${Math.random()}`,
    type: 'hide',
    image,
  }
}

// Helper to create a with node
function createWithNode(transition: string): WithNode {
  return {
    id: `with_${Date.now()}_${Math.random()}`,
    type: 'with',
    transition,
  }
}

// Helper to create a menu node
function createMenuNode(choices: { text: string; condition?: string; body: any[] }[]): MenuNode {
  return {
    id: `menu_${Date.now()}_${Math.random()}`,
    type: 'menu',
    choices,
  }
}

// Helper to create a jump node
function createJumpNode(target: string): JumpNode {
  return {
    id: `jump_${Date.now()}_${Math.random()}`,
    type: 'jump',
    target,
  }
}

// Helper to create a call node
function createCallNode(target: string): CallNode {
  return {
    id: `call_${Date.now()}_${Math.random()}`,
    type: 'call',
    target,
  }
}

// Helper to create a return node
function createReturnNode(): ReturnNode {
  return {
    id: `return_${Date.now()}_${Math.random()}`,
    type: 'return',
  }
}

// Helper to create an if node
function createIfNode(branches: { condition: string | null; body: any[] }[]): IfNode {
  return {
    id: `if_${Date.now()}_${Math.random()}`,
    type: 'if',
    branches,
  }
}

// Helper to create a python node
function createPythonNode(code: string): PythonNode {
  return {
    id: `python_${Date.now()}_${Math.random()}`,
    type: 'python',
    code,
  }
}

// Helper to create a play node
function createPlayNode(channel: 'music' | 'sound' | 'voice', file: string, fadeIn?: number, loop?: boolean): PlayNode {
  return {
    id: `play_${Date.now()}_${Math.random()}`,
    type: 'play',
    channel,
    file,
    fadeIn,
    loop,
  }
}

// Helper to create a stop node
function createStopNode(channel: 'music' | 'sound' | 'voice', fadeOut?: number): StopNode {
  return {
    id: `stop_${Date.now()}_${Math.random()}`,
    type: 'stop',
    channel,
    fadeOut,
  }
}

describe('BlockTreeBuilder', () => {
  let builder: BlockTreeBuilder

  beforeEach(() => {
    builder = new BlockTreeBuilder()
    resetBlockIdCounter()
  })

  describe('buildFromLabel', () => {
    it('should build a label block with correct properties', () => {
      const label = createLabelNode('start')
      const block = builder.buildFromLabel(label)

      expect(block.type).toBe('label')
      expect(block.category).toBe('flow')
      expect(block.astNodeId).toBe('label_start')
      expect(block.children).toEqual([])
      expect(block.collapsed).toBe(false)
      expect(block.selected).toBe(false)
      expect(block.hasError).toBe(false)
    })

    it('should set the label name in the slot', () => {
      const label = createLabelNode('my_scene')
      const block = builder.buildFromLabel(label)

      const nameSlot = block.slots.find(s => s.name === 'name')
      expect(nameSlot).toBeDefined()
      expect(nameSlot?.value).toBe('my_scene')
    })

    it('should build children from label body', () => {
      const label = createLabelNode('start', [
        createDialogueNode('alice', 'Hello!'),
        createDialogueNode(null, 'Narration'),
      ])
      const block = builder.buildFromLabel(label)

      expect(block.children).toHaveLength(2)
      expect(block.children![0].type).toBe('dialogue')
      expect(block.children![1].type).toBe('dialogue')
    })
  })

  describe('Dialogue node building', () => {
    it('should build dialogue block with speaker', () => {
      const dialogue = createDialogueNode('alice', 'Hello world!')
      const block = builder.buildBlock(dialogue)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('dialogue')
      expect(block!.category).toBe('dialogue')

      const speakerSlot = block!.slots.find(s => s.name === 'speaker')
      expect(speakerSlot?.value).toBe('alice')

      const textSlot = block!.slots.find(s => s.name === 'text')
      expect(textSlot?.value).toBe('Hello world!')
    })

    it('should build narration block (no speaker)', () => {
      const dialogue = createDialogueNode(null, 'This is narration')
      const block = builder.buildBlock(dialogue)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('dialogue')

      const speakerSlot = block!.slots.find(s => s.name === 'speaker')
      expect(speakerSlot?.value).toBeNull()

      const textSlot = block!.slots.find(s => s.name === 'text')
      expect(textSlot?.value).toBe('This is narration')
    })
  })

  describe('Scene node building', () => {
    it('should build scene block', () => {
      const scene = createSceneNode('bg_room')
      const block = builder.buildBlock(scene)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('scene')
      expect(block!.category).toBe('scene')

      const imageSlot = block!.slots.find(s => s.name === 'image')
      expect(imageSlot?.value).toBe('bg_room')
    })

    it('should build show block', () => {
      const show = createShowNode('alice', 'left', ['happy'])
      const block = builder.buildBlock(show)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('show')
      expect(block!.category).toBe('scene')

      const characterSlot = block!.slots.find(s => s.name === 'character')
      expect(characterSlot?.value).toBe('alice')

      const positionSlot = block!.slots.find(s => s.name === 'position')
      expect(positionSlot?.value).toBe('left')

      const expressionSlot = block!.slots.find(s => s.name === 'expression')
      expect(expressionSlot?.value).toBe('happy')
    })

    it('should build hide block', () => {
      const hide = createHideNode('alice')
      const block = builder.buildBlock(hide)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('hide')
      expect(block!.category).toBe('scene')

      const characterSlot = block!.slots.find(s => s.name === 'character')
      expect(characterSlot?.value).toBe('alice')
    })

    it('should build with block', () => {
      const withNode = createWithNode('dissolve')
      const block = builder.buildBlock(withNode)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('with')
      expect(block!.category).toBe('scene')

      const transitionSlot = block!.slots.find(s => s.name === 'transition')
      expect(transitionSlot?.value).toBe('dissolve')
    })
  })

  describe('Menu/Choice building', () => {
    it('should build menu block with choices', () => {
      const menu = createMenuNode([
        { text: 'Option A', body: [] },
        { text: 'Option B', body: [] },
      ])
      const block = builder.buildBlock(menu)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('menu')
      expect(block!.category).toBe('flow')
      expect(block!.children).toHaveLength(2)
    })

    it('should build choice blocks with text', () => {
      const menu = createMenuNode([
        { text: 'Go left', body: [] },
        { text: 'Go right', condition: 'has_key', body: [] },
      ])
      const block = builder.buildBlock(menu)

      expect(block!.children![0].type).toBe('choice')
      const textSlot0 = block!.children![0].slots.find(s => s.name === 'text')
      expect(textSlot0?.value).toBe('Go left')

      expect(block!.children![1].type).toBe('choice')
      const textSlot1 = block!.children![1].slots.find(s => s.name === 'text')
      expect(textSlot1?.value).toBe('Go right')

      const conditionSlot = block!.children![1].slots.find(s => s.name === 'condition')
      expect(conditionSlot?.value).toBe('has_key')
    })

    it('should build nested blocks inside choices', () => {
      const menu = createMenuNode([
        {
          text: 'Talk to Alice',
          body: [
            createDialogueNode('alice', 'Hello!'),
            createJumpNode('alice_route'),
          ],
        },
      ])
      const block = builder.buildBlock(menu)

      const choice = block!.children![0]
      expect(choice.children).toHaveLength(2)
      expect(choice.children![0].type).toBe('dialogue')
      expect(choice.children![1].type).toBe('jump')
    })
  })

  describe('If/Elif/Else building', () => {
    it('should build if block with condition', () => {
      const ifNode = createIfNode([
        { condition: 'has_key', body: [createDialogueNode(null, 'You have the key!')] },
      ])
      const block = builder.buildBlock(ifNode)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('if')
      expect(block!.category).toBe('flow')

      const conditionSlot = block!.slots.find(s => s.name === 'condition')
      expect(conditionSlot?.value).toBe('has_key')
    })

    it('should build if block with children from first branch', () => {
      const ifNode = createIfNode([
        {
          condition: 'score > 10',
          body: [
            createDialogueNode(null, 'You win!'),
            createJumpNode('victory'),
          ],
        },
      ])
      const block = builder.buildBlock(ifNode)

      // First branch children should be direct children of the if block
      expect(block!.children).toHaveLength(2)
      expect(block!.children![0].type).toBe('dialogue')
      expect(block!.children![1].type).toBe('jump')
    })

    it('should build if/elif/else structure', () => {
      const ifNode = createIfNode([
        { condition: 'score > 100', body: [createDialogueNode(null, 'Excellent!')] },
        { condition: 'score > 50', body: [createDialogueNode(null, 'Good!')] },
        { condition: null, body: [createDialogueNode(null, 'Try again!')] }, // else
      ])
      const block = builder.buildBlock(ifNode)

      expect(block!.type).toBe('if')
      
      // Children should include: first branch content + elif + else blocks
      // First branch has 1 dialogue, then elif block, then else block
      expect(block!.children!.length).toBeGreaterThanOrEqual(2)
      
      // Find elif and else blocks
      const elifBlock = block!.children!.find(c => c.type === 'elif')
      const elseBlock = block!.children!.find(c => c.type === 'else')
      
      expect(elifBlock).toBeDefined()
      expect(elseBlock).toBeDefined()
    })
  })

  describe('Flow control building', () => {
    it('should build jump block', () => {
      const jump = createJumpNode('next_scene')
      const block = builder.buildBlock(jump)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('jump')
      expect(block!.category).toBe('flow')

      const targetSlot = block!.slots.find(s => s.name === 'target')
      expect(targetSlot?.value).toBe('next_scene')
    })

    it('should build call block', () => {
      const call = createCallNode('subroutine')
      const block = builder.buildBlock(call)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('call')
      expect(block!.category).toBe('flow')

      const targetSlot = block!.slots.find(s => s.name === 'target')
      expect(targetSlot?.value).toBe('subroutine')
    })

    it('should build return block', () => {
      const returnNode = createReturnNode()
      const block = builder.buildBlock(returnNode)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('return')
      expect(block!.category).toBe('flow')
    })
  })

  describe('Audio building', () => {
    it('should build play music block', () => {
      const play = createPlayNode('music', 'bgm_theme.ogg', 2.0, true)
      const block = builder.buildBlock(play)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('play-music')
      expect(block!.category).toBe('audio')

      const fileSlot = block!.slots.find(s => s.name === 'file')
      expect(fileSlot?.value).toBe('bgm_theme.ogg')

      const fadeinSlot = block!.slots.find(s => s.name === 'fadein')
      expect(fadeinSlot?.value).toBe(2.0)

      const loopSlot = block!.slots.find(s => s.name === 'loop')
      expect(loopSlot?.value).toBe(true)
    })

    it('should build play sound block', () => {
      const play = createPlayNode('sound', 'sfx_click.ogg')
      const block = builder.buildBlock(play)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('play-sound')
      expect(block!.category).toBe('audio')

      const fileSlot = block!.slots.find(s => s.name === 'file')
      expect(fileSlot?.value).toBe('sfx_click.ogg')
    })

    it('should build stop music block', () => {
      const stop = createStopNode('music', 1.5)
      const block = builder.buildBlock(stop)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('stop-music')
      expect(block!.category).toBe('audio')

      const fadeoutSlot = block!.slots.find(s => s.name === 'fadeout')
      expect(fadeoutSlot?.value).toBe(1.5)
    })
  })

  describe('Python building', () => {
    it('should build python block', () => {
      const python = createPythonNode('score += 10')
      const block = builder.buildBlock(python)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('python')
      expect(block!.category).toBe('advanced')

      const codeSlot = block!.slots.find(s => s.name === 'code')
      expect(codeSlot?.value).toBe('score += 10')
    })
  })

  describe('Unsupported node handling', () => {
    it('should create comment block for unsupported nodes', () => {
      const unsupported = {
        id: 'unsupported_1',
        type: 'unknown_type',
        raw: 'some raw content',
      } as any
      const block = builder.buildBlock(unsupported)

      expect(block).not.toBeNull()
      expect(block!.type).toBe('comment')
      expect(block!.category).toBe('advanced')

      const textSlot = block!.slots.find(s => s.name === 'text')
      expect(textSlot?.value).toContain('[Unsupported: unknown_type]')
    })
  })

  describe('Block ID generation', () => {
    it('should generate unique IDs for each block', () => {
      const label = createLabelNode('start', [
        createDialogueNode('alice', 'Hello'),
        createDialogueNode('bob', 'Hi'),
      ])
      const block = builder.buildFromLabel(label)

      const ids = new Set<string>()
      ids.add(block.id)
      block.children!.forEach(child => ids.add(child.id))

      // All IDs should be unique
      expect(ids.size).toBe(3)
    })
  })

  describe('Complex nested structures', () => {
    it('should handle deeply nested menu with if inside choice', () => {
      const menu = createMenuNode([
        {
          text: 'Check inventory',
          body: [
            createIfNode([
              { condition: 'has_sword', body: [createDialogueNode(null, 'You have a sword!')] },
              { condition: null, body: [createDialogueNode(null, 'Your inventory is empty.')] },
            ]),
          ],
        },
      ])
      const block = builder.buildBlock(menu)

      expect(block!.type).toBe('menu')
      expect(block!.children).toHaveLength(1)
      
      const choice = block!.children![0]
      expect(choice.type).toBe('choice')
      expect(choice.children).toHaveLength(1)
      
      const ifBlock = choice.children![0]
      expect(ifBlock.type).toBe('if')
    })

    it('should handle label with mixed content', () => {
      const label = createLabelNode('complex_scene', [
        createSceneNode('bg_forest'),
        createShowNode('alice', 'left'),
        createDialogueNode('alice', 'Welcome to the forest!'),
        createPlayNode('music', 'forest_theme.ogg'),
        createMenuNode([
          { text: 'Explore', body: [createJumpNode('explore')] },
          { text: 'Leave', body: [createJumpNode('leave')] },
        ]),
      ])
      const block = builder.buildFromLabel(label)

      expect(block.children).toHaveLength(5)
      expect(block.children![0].type).toBe('scene')
      expect(block.children![1].type).toBe('show')
      expect(block.children![2].type).toBe('dialogue')
      expect(block.children![3].type).toBe('play-music')
      expect(block.children![4].type).toBe('menu')
    })
  })
})
