/**
 * Story Mode Block Types
 * Represents the visual blocks in Story Mode editor
 */

import { ASTNode } from '../../types/ast'

/**
 * Block types supported in Story Mode
 * Implements Requirements 6.1, 6.5
 */
export type BlockType =
  | 'scene'
  | 'dialogue'
  | 'narration'
  | 'show'
  | 'hide'
  | 'menu'
  | 'nvl'
  | 'nvl_clear'
  | 'with'
  | 'call'
  | 'jump'
  | 'return'
  | 'pause'
  | 'play_music'
  | 'play_sound'
  | 'voice'
  | 'stop_audio'
  | 'python'
  | 'if'
  | 'set'
  | 'label'
  | 'raw'

/**
 * Base block interface
 */
export interface BaseBlock {
  id: string
  type: BlockType
  astNode: ASTNode
}

/**
 * Scene block - background change
 */
export interface SceneBlock extends BaseBlock {
  type: 'scene'
  image: string
  transition?: string
}

/**
 * Dialogue block - character speaking
 */
export interface DialogueBlock extends BaseBlock {
  type: 'dialogue'
  speaker: string
  text: string
  attributes?: string[]
  extend?: boolean  // If true, this dialogue extends the previous one
}

/**
 * Narration block - no speaker
 */
export interface NarrationBlock extends BaseBlock {
  type: 'narration'
  text: string
  extend?: boolean  // If true, this narration extends the previous one
}

/**
 * Show block - display character
 */
export interface ShowBlock extends BaseBlock {
  type: 'show'
  image: string
  attributes?: string[]
  position?: string
}

/**
 * Hide block - hide character
 */
export interface HideBlock extends BaseBlock {
  type: 'hide'
  image: string
}

/**
 * Menu block - choice menu
 */
export interface MenuBlock extends BaseBlock {
  type: 'menu'
  prompt?: string
  choices: MenuChoiceBlock[]
}

export interface MenuChoiceBlock {
  id: string
  text: string
  condition?: string
}

/**
 * NVL block - NVL mode toggle
 */
export interface NVLBlock extends BaseBlock {
  type: 'nvl'
  action: 'show' | 'hide'
}

/**
 * NVL Clear block
 */
export interface NVLClearBlock extends BaseBlock {
  type: 'nvl_clear'
}

/**
 * With block - transition
 */
export interface WithBlock extends BaseBlock {
  type: 'with'
  transition: string
}

/**
 * Call block - call label
 */
export interface CallBlock extends BaseBlock {
  type: 'call'
  target: string
  arguments?: string[]
}

/**
 * Jump block - jump to label
 */
export interface JumpBlock extends BaseBlock {
  type: 'jump'
  target: string
}

/**
 * Return block
 */
export interface ReturnBlock extends BaseBlock {
  type: 'return'
  value?: string
}

/**
 * Pause block
 */
export interface PauseBlock extends BaseBlock {
  type: 'pause'
  duration?: number
}

/**
 * Play music block
 */
export interface PlayMusicBlock extends BaseBlock {
  type: 'play_music'
  file: string
  fadeIn?: number
  loop?: boolean
}

/**
 * Play sound block
 */
export interface PlaySoundBlock extends BaseBlock {
  type: 'play_sound'
  file: string
}

/**
 * Voice block
 */
export interface VoiceBlock extends BaseBlock {
  type: 'voice'
  file: string
}

/**
 * Stop audio block
 */
export interface StopAudioBlock extends BaseBlock {
  type: 'stop_audio'
  channel: 'music' | 'sound' | 'voice'
  fadeOut?: number
}

/**
 * Python block
 */
export interface PythonBlock extends BaseBlock {
  type: 'python'
  code: string
}

/**
 * If block - conditional
 */
export interface IfBlock extends BaseBlock {
  type: 'if'
  condition: string
}

/**
 * Set block - variable assignment
 */
export interface SetBlock extends BaseBlock {
  type: 'set'
  variable: string
  value: string
}

/**
 * Label block - scene/label marker
 */
export interface LabelBlock extends BaseBlock {
  type: 'label'
  name: string
}

/**
 * Raw block - unsupported syntax
 */
export interface RawBlock extends BaseBlock {
  type: 'raw'
  content: string
}

/**
 * Union type for all blocks
 */
export type StoryBlock =
  | SceneBlock
  | DialogueBlock
  | NarrationBlock
  | ShowBlock
  | HideBlock
  | MenuBlock
  | NVLBlock
  | NVLClearBlock
  | WithBlock
  | CallBlock
  | JumpBlock
  | ReturnBlock
  | PauseBlock
  | PlayMusicBlock
  | PlaySoundBlock
  | VoiceBlock
  | StopAudioBlock
  | PythonBlock
  | IfBlock
  | SetBlock
  | LabelBlock
  | RawBlock
