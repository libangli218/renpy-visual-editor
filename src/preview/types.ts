/**
 * Preview Engine Types
 * Implements Requirements 4.1, 4.2, 4.3, 4.7
 */

// Character position on screen
export interface CharacterPosition {
  x: number  // 0-100 percentage from left
  y: number  // 0-100 percentage from top
}

// Character state in preview
export interface PreviewCharacter {
  name: string           // Character image name (e.g., 'sylvie')
  attributes: string[]   // Attributes like 'happy', 'casual'
  position: CharacterPosition
  visible: boolean
}

// Dialogue state in preview
export interface PreviewDialogue {
  speaker: string | null  // null for narration
  speakerColor?: string   // Speaker name color
  text: string
  mode: 'adv' | 'nvl'
}

// NVL history entry
export interface NVLHistoryEntry {
  speaker: string | null
  speakerColor?: string
  text: string
}

// Complete preview state
export interface PreviewState {
  // Current position in the script
  currentIndex: number
  totalSteps: number
  
  // Playback state
  isPlaying: boolean
  playbackSpeed: number  // milliseconds between steps
  
  // Scene state
  scene: string | null   // Current background image
  
  // Characters on screen
  characters: Map<string, PreviewCharacter>
  
  // Current dialogue
  dialogue: PreviewDialogue | null
  
  // NVL mode state
  nvlMode: boolean
  nvlHistory: NVLHistoryEntry[]
  
  // Audio state (for display purposes)
  currentMusic: string | null
  currentSound: string | null
}

// Preview step - represents a single previewable moment
export interface PreviewStep {
  index: number
  nodeId: string
  type: 'scene' | 'show' | 'hide' | 'dialogue' | 'menu' | 'nvl' | 'with' | 'pause' | 'audio' | 'other'
  
  // State changes this step causes
  sceneChange?: string
  characterChanges?: CharacterChange[]
  dialogue?: PreviewDialogue
  nvlAction?: 'show' | 'hide' | 'clear'
  musicChange?: string | null
  soundChange?: string | null
}

// Character change in a step
export interface CharacterChange {
  action: 'show' | 'hide' | 'update'
  name: string
  attributes?: string[]
  position?: CharacterPosition
}

// Standard Ren'Py positions
export const STANDARD_POSITIONS: Record<string, CharacterPosition> = {
  'left': { x: 20, y: 50 },
  'center': { x: 50, y: 50 },
  'right': { x: 80, y: 50 },
  'truecenter': { x: 50, y: 50 },
  'topleft': { x: 20, y: 20 },
  'topright': { x: 80, y: 20 },
  'offscreenleft': { x: -20, y: 50 },
  'offscreenright': { x: 120, y: 50 },
}

// Default preview state
export function createDefaultPreviewState(): PreviewState {
  return {
    currentIndex: 0,
    totalSteps: 0,
    isPlaying: false,
    playbackSpeed: 2000,
    scene: null,
    characters: new Map(),
    dialogue: null,
    nvlMode: false,
    nvlHistory: [],
    currentMusic: null,
    currentSound: null,
  }
}
