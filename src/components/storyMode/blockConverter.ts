/**
 * Block Converter - Converts AST nodes to Story Mode blocks
 * Implements Requirements 6.1, 6.5
 */

import {
  ASTNode,
  RenpyScript,
  DialogueNode,
  SceneNode,
  ShowNode,
  HideNode,
  MenuNode,
  WithNode,
  CallNode,
  JumpNode,
  ReturnNode,
  PauseNode,
  PlayNode,
  StopNode,
  PythonNode,
  IfNode,
  SetNode,
  LabelNode,
  NVLNode,
  RawNode,
} from '../../types/ast'
import {
  StoryBlock,
  DialogueBlock,
  NarrationBlock,
  SceneBlock,
  ShowBlock,
  HideBlock,
  MenuBlock,
  MenuChoiceBlock,
  NVLBlock,
  NVLClearBlock,
  WithBlock,
  CallBlock,
  JumpBlock,
  ReturnBlock,
  PauseBlock,
  PlayMusicBlock,
  PlaySoundBlock,
  VoiceBlock,
  StopAudioBlock,
  PythonBlock,
  IfBlock,
  SetBlock,
  LabelBlock,
  RawBlock,
} from './types'

/**
 * Convert AST to Story Mode blocks
 */
export function astToBlocks(ast: RenpyScript): StoryBlock[] {
  const blocks: StoryBlock[] = []
  
  for (const node of ast.statements) {
    const converted = convertNode(node)
    if (converted) {
      if (Array.isArray(converted)) {
        blocks.push(...converted)
      } else {
        blocks.push(converted)
      }
    }
  }
  
  return blocks
}

/**
 * Convert a single AST node to a Story Block
 */
function convertNode(node: ASTNode): StoryBlock | StoryBlock[] | null {
  switch (node.type) {
    case 'dialogue':
      return convertDialogue(node)
    case 'scene':
      return convertScene(node)
    case 'show':
      return convertShow(node)
    case 'hide':
      return convertHide(node)
    case 'menu':
      return convertMenu(node)
    case 'with':
      return convertWith(node)
    case 'call':
      return convertCall(node)
    case 'jump':
      return convertJump(node)
    case 'return':
      return convertReturn(node)
    case 'pause':
      return convertPause(node)
    case 'play':
      return convertPlay(node)
    case 'stop':
      return convertStop(node)
    case 'python':
      return convertPython(node)
    case 'if':
      return convertIf(node)
    case 'set':
      return convertSet(node)
    case 'label':
      return convertLabel(node)
    case 'nvl':
      return convertNVL(node)
    case 'raw':
      return convertRaw(node)
    default:
      return null
  }
}

function convertDialogue(node: DialogueNode): DialogueBlock | NarrationBlock {
  if (node.speaker === null) {
    return {
      id: node.id,
      type: 'narration',
      text: node.text,
      extend: node.extend,
      astNode: node,
    }
  }
  return {
    id: node.id,
    type: 'dialogue',
    speaker: node.speaker,
    text: node.text,
    attributes: node.attributes,
    extend: node.extend,
    astNode: node,
  }
}

function convertScene(node: SceneNode): SceneBlock {
  return {
    id: node.id,
    type: 'scene',
    image: node.image,
    astNode: node,
  }
}

function convertShow(node: ShowNode): ShowBlock {
  return {
    id: node.id,
    type: 'show',
    image: node.image,
    attributes: node.attributes,
    position: node.atPosition,
    astNode: node,
  }
}

function convertHide(node: HideNode): HideBlock {
  return {
    id: node.id,
    type: 'hide',
    image: node.image,
    astNode: node,
  }
}

function convertMenu(node: MenuNode): MenuBlock {
  const choices: MenuChoiceBlock[] = node.choices.map((choice, index) => ({
    id: `${node.id}-choice-${index}`,
    text: choice.text,
    condition: choice.condition,
  }))
  
  return {
    id: node.id,
    type: 'menu',
    prompt: node.prompt,
    choices,
    astNode: node,
  }
}

function convertWith(node: WithNode): WithBlock {
  return {
    id: node.id,
    type: 'with',
    transition: node.transition,
    astNode: node,
  }
}

function convertCall(node: CallNode): CallBlock {
  return {
    id: node.id,
    type: 'call',
    target: node.target,
    arguments: node.arguments,
    astNode: node,
  }
}

function convertJump(node: JumpNode): JumpBlock {
  return {
    id: node.id,
    type: 'jump',
    target: node.target,
    astNode: node,
  }
}

function convertReturn(node: ReturnNode): ReturnBlock {
  return {
    id: node.id,
    type: 'return',
    value: node.value,
    astNode: node,
  }
}

function convertPause(node: PauseNode): PauseBlock {
  return {
    id: node.id,
    type: 'pause',
    duration: node.duration,
    astNode: node,
  }
}

function convertPlay(node: PlayNode): PlayMusicBlock | PlaySoundBlock | VoiceBlock {
  if (node.channel === 'music') {
    return {
      id: node.id,
      type: 'play_music',
      file: node.file,
      fadeIn: node.fadeIn,
      loop: node.loop,
      astNode: node,
    }
  } else if (node.channel === 'sound') {
    return {
      id: node.id,
      type: 'play_sound',
      file: node.file,
      astNode: node,
    }
  } else {
    return {
      id: node.id,
      type: 'voice',
      file: node.file,
      astNode: node,
    }
  }
}

function convertStop(node: StopNode): StopAudioBlock {
  return {
    id: node.id,
    type: 'stop_audio',
    channel: node.channel,
    fadeOut: node.fadeOut,
    astNode: node,
  }
}

function convertPython(node: PythonNode): PythonBlock {
  return {
    id: node.id,
    type: 'python',
    code: node.code,
    astNode: node,
  }
}

function convertIf(node: IfNode): IfBlock {
  const firstBranch = node.branches[0]
  return {
    id: node.id,
    type: 'if',
    condition: firstBranch?.condition || 'True',
    astNode: node,
  }
}

function convertSet(node: SetNode): SetBlock {
  return {
    id: node.id,
    type: 'set',
    variable: node.variable,
    value: node.value,
    astNode: node,
  }
}

function convertLabel(node: LabelNode): StoryBlock[] {
  const blocks: StoryBlock[] = []
  
  // Add label marker
  const labelBlock: LabelBlock = {
    id: node.id,
    type: 'label',
    name: node.name,
    astNode: node,
  }
  blocks.push(labelBlock)
  
  // Convert label body
  for (const bodyNode of node.body) {
    const converted = convertNode(bodyNode)
    if (converted) {
      if (Array.isArray(converted)) {
        blocks.push(...converted)
      } else {
        blocks.push(converted)
      }
    }
  }
  
  return blocks
}

function convertNVL(node: NVLNode): NVLBlock | NVLClearBlock {
  if (node.action === 'clear') {
    return {
      id: node.id,
      type: 'nvl_clear',
      astNode: node,
    }
  }
  return {
    id: node.id,
    type: 'nvl',
    action: node.action,
    astNode: node,
  }
}

function convertRaw(node: RawNode): RawBlock {
  return {
    id: node.id,
    type: 'raw',
    content: node.content,
    astNode: node,
  }
}

/**
 * Convert Story Blocks back to AST
 */
export function blocksToAst(blocks: StoryBlock[], originalAst: RenpyScript): RenpyScript {
  // For now, we'll update the AST nodes directly from blocks
  // This maintains the original structure while allowing edits
  const statements: ASTNode[] = blocks.map(block => block.astNode)
  
  return {
    ...originalAst,
    statements,
  }
}
