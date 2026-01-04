import { RenpyScript } from './ast'

// Editor mode types
export type EditorMode = 'story' | 'node'
export type ComplexityLevel = 'simple' | 'preview' | 'advanced'

// Editor state interface (for history snapshots)
export interface EditorState {
  mode: EditorMode
  complexity: ComplexityLevel
  projectPath: string | null
  currentFile: string | null
  modified: boolean
  selectedNodeId: string | null
  selectedBlockId: string | null
  // AST data - shared between modes
  ast: RenpyScript | null
}

// Preview state
export interface PreviewState {
  currentIndex: number
  isPlaying: boolean
  scene: string | null
  characters: CharacterState[]
  dialogue: DialogueState | null
}

export interface CharacterState {
  name: string
  image: string
  position: Position
  attributes: string[]
}

export interface DialogueState {
  speaker: string | null
  text: string
  mode: 'adv' | 'nvl'
}

export interface Position {
  x: number
  y: number
}

// UI state
export interface UIState {
  leftPanelWidth: number
  rightPanelWidth: number
  showMinimap: boolean
  showResourceBrowser: boolean
  showAudioTracks: boolean
  showTransitionPreview: boolean
}
