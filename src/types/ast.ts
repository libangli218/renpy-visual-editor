/**
 * AST Node Types for Ren'Py Script Representation
 */

// Script metadata
export interface ScriptMetadata {
  filePath: string
  parseTime: Date
  version: string
}

// Root node
export interface RenpyScript {
  type: 'script'
  statements: ASTNode[]
  metadata: ScriptMetadata
}

// Base node interface
export interface BaseNode {
  id: string
  type: string
  line?: number
  raw?: string
}

// Label node
export interface LabelNode extends BaseNode {
  type: 'label'
  name: string
  parameters?: string[]
  body: ASTNode[]
}

// Dialogue node
export interface DialogueNode extends BaseNode {
  type: 'dialogue'
  speaker: string | null
  text: string
  attributes?: string[]
}

// Menu node
export interface MenuNode extends BaseNode {
  type: 'menu'
  prompt?: string
  choices: MenuChoice[]
}

export interface MenuChoice {
  text: string
  condition?: string
  body: ASTNode[]
}

// Scene node
export interface SceneNode extends BaseNode {
  type: 'scene'
  image: string
  layer?: string
  atl?: ATLBlock
}

// Show node
export interface ShowNode extends BaseNode {
  type: 'show'
  image: string
  attributes?: string[]
  atPosition?: string
  atl?: ATLBlock
}

// Hide node
export interface HideNode extends BaseNode {
  type: 'hide'
  image: string
}

// With node
export interface WithNode extends BaseNode {
  type: 'with'
  transition: string
}

// Jump node
export interface JumpNode extends BaseNode {
  type: 'jump'
  target: string
  expression?: boolean
}

// Call node
export interface CallNode extends BaseNode {
  type: 'call'
  target: string
  arguments?: string[]
  expression?: boolean
}

// Return node
export interface ReturnNode extends BaseNode {
  type: 'return'
  value?: string
}

// If node
export interface IfNode extends BaseNode {
  type: 'if'
  branches: IfBranch[]
}

export interface IfBranch {
  condition: string | null
  body: ASTNode[]
}

// Set node
export interface SetNode extends BaseNode {
  type: 'set'
  variable: string
  operator: '=' | '+=' | '-=' | '*=' | '/='
  value: string
}

// Python node
export interface PythonNode extends BaseNode {
  type: 'python'
  code: string
  early?: boolean
  hide?: boolean
}

// Define node
export interface DefineNode extends BaseNode {
  type: 'define'
  name: string
  value: string
  store?: string
}

// Default node
export interface DefaultNode extends BaseNode {
  type: 'default'
  name: string
  value: string
}

// Play node
export interface PlayNode extends BaseNode {
  type: 'play'
  channel: 'music' | 'sound' | 'voice'
  file: string
  fadeIn?: number
  loop?: boolean
  volume?: number
  queue?: boolean  // For queue music syntax
}

// Stop node
export interface StopNode extends BaseNode {
  type: 'stop'
  channel: 'music' | 'sound' | 'voice'
  fadeOut?: number
}

// Pause node
export interface PauseNode extends BaseNode {
  type: 'pause'
  duration?: number
}

// NVL node
export interface NVLNode extends BaseNode {
  type: 'nvl'
  action: 'show' | 'hide' | 'clear'
}

// Raw node (unsupported syntax)
export interface RawNode extends BaseNode {
  type: 'raw'
  content: string
}

// ATL block (Animation and Transformation Language)
export interface ATLBlock {
  statements: string[]
}

// Union type for all AST nodes
export type ASTNode =
  | LabelNode
  | DialogueNode
  | MenuNode
  | SceneNode
  | ShowNode
  | HideNode
  | WithNode
  | JumpNode
  | CallNode
  | ReturnNode
  | IfNode
  | SetNode
  | PythonNode
  | DefineNode
  | DefaultNode
  | PlayNode
  | StopNode
  | PauseNode
  | NVLNode
  | RawNode
