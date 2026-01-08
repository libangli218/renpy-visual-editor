/**
 * Node Factory Functions for creating AST nodes
 * Each factory generates a unique ID and sets default values
 */

import {
  ASTNode,
  LabelNode,
  DialogueNode,
  MenuNode,
  MenuChoice,
  SceneNode,
  ShowNode,
  HideNode,
  WithNode,
  JumpNode,
  CallNode,
  ReturnNode,
  IfNode,
  IfBranch,
  SetNode,
  PythonNode,
  DefineNode,
  DefaultNode,
  PlayNode,
  StopNode,
  PauseNode,
  NVLNode,
  RawNode,
  RenpyScript,
  ScriptMetadata,
} from '../types/ast'

// Counter for generating unique IDs
let nodeIdCounter = 0

/**
 * Generate a unique node ID
 */
export function generateNodeId(): string {
  return `node_${++nodeIdCounter}_${Date.now()}`
}

/**
 * Reset the node ID counter (useful for testing)
 */
export function resetNodeIdCounter(): void {
  nodeIdCounter = 0
}

/**
 * Create a Label node
 */
export function createLabelNode(
  name: string,
  body: ASTNode[] = [],
  options: { parameters?: string[]; line?: number } = {}
): LabelNode {
  return {
    id: generateNodeId(),
    type: 'label',
    name,
    body,
    parameters: options.parameters,
    line: options.line,
  }
}

/**
 * Create a Dialogue node
 */
export function createDialogueNode(
  text: string,
  speaker: string | null = null,
  options: {
    attributes?: string[]
    line?: number
    extend?: boolean
    withTransition?: string
  } = {}
): DialogueNode {
  return {
    id: generateNodeId(),
    type: 'dialogue',
    speaker,
    text,
    attributes: options.attributes,
    extend: options.extend,
    withTransition: options.withTransition,
    line: options.line,
  }
}


/**
 * Create a Menu node
 */
export function createMenuNode(
  choices: MenuChoice[] = [],
  options: {
    prompt?: string
    line?: number
    setVar?: string
    screen?: string
  } = {}
): MenuNode {
  return {
    id: generateNodeId(),
    type: 'menu',
    choices,
    prompt: options.prompt,
    setVar: options.setVar,
    screen: options.screen,
    line: options.line,
  }
}

/**
 * Create a Menu Choice
 */
export function createMenuChoice(
  text: string,
  body: ASTNode[] = [],
  condition?: string
): MenuChoice {
  return {
    text,
    body,
    condition,
  }
}

/**
 * Create a Scene node
 */
export function createSceneNode(
  image: string,
  options: {
    layer?: string
    line?: number
    onLayer?: string
    withTransition?: string
  } = {}
): SceneNode {
  return {
    id: generateNodeId(),
    type: 'scene',
    image,
    layer: options.layer,
    onLayer: options.onLayer,
    withTransition: options.withTransition,
    line: options.line,
  }
}

/**
 * Create a Show node
 */
export function createShowNode(
  image: string,
  options: {
    attributes?: string[]
    atPosition?: string
    line?: number
    asTag?: string
    behindTag?: string
    onLayer?: string
    zorder?: number
    withTransition?: string
  } = {}
): ShowNode {
  return {
    id: generateNodeId(),
    type: 'show',
    image,
    attributes: options.attributes,
    atPosition: options.atPosition,
    asTag: options.asTag,
    behindTag: options.behindTag,
    onLayer: options.onLayer,
    zorder: options.zorder,
    withTransition: options.withTransition,
    line: options.line,
  }
}

/**
 * Create a Hide node
 */
export function createHideNode(
  image: string,
  options: {
    line?: number
    onLayer?: string
    withTransition?: string
  } = {}
): HideNode {
  return {
    id: generateNodeId(),
    type: 'hide',
    image,
    onLayer: options.onLayer,
    withTransition: options.withTransition,
    line: options.line,
  }
}

/**
 * Create a With node
 */
export function createWithNode(
  transition: string,
  options: { line?: number } = {}
): WithNode {
  return {
    id: generateNodeId(),
    type: 'with',
    transition,
    line: options.line,
  }
}

/**
 * Create a Jump node
 */
export function createJumpNode(
  target: string,
  options: { expression?: boolean; line?: number } = {}
): JumpNode {
  return {
    id: generateNodeId(),
    type: 'jump',
    target,
    expression: options.expression,
    line: options.line,
  }
}

/**
 * Create a Call node
 */
export function createCallNode(
  target: string,
  options: { arguments?: string[]; expression?: boolean; line?: number } = {}
): CallNode {
  return {
    id: generateNodeId(),
    type: 'call',
    target,
    arguments: options.arguments,
    expression: options.expression,
    line: options.line,
  }
}

/**
 * Create a Return node
 */
export function createReturnNode(
  options: { value?: string; line?: number } = {}
): ReturnNode {
  return {
    id: generateNodeId(),
    type: 'return',
    value: options.value,
    line: options.line,
  }
}


/**
 * Create an If node
 */
export function createIfNode(
  branches: IfBranch[] = [],
  options: { line?: number } = {}
): IfNode {
  return {
    id: generateNodeId(),
    type: 'if',
    branches,
    line: options.line,
  }
}

/**
 * Create an If Branch
 */
export function createIfBranch(
  condition: string | null,
  body: ASTNode[] = []
): IfBranch {
  return {
    condition,
    body,
  }
}

/**
 * Create a Set node
 */
export function createSetNode(
  variable: string,
  value: string,
  options: { operator?: '=' | '+=' | '-=' | '*=' | '/='; line?: number } = {}
): SetNode {
  return {
    id: generateNodeId(),
    type: 'set',
    variable,
    operator: options.operator || '=',
    value,
    line: options.line,
  }
}

/**
 * Create a Python node
 */
export function createPythonNode(
  code: string,
  options: { early?: boolean; hide?: boolean; line?: number } = {}
): PythonNode {
  return {
    id: generateNodeId(),
    type: 'python',
    code,
    early: options.early,
    hide: options.hide,
    line: options.line,
  }
}

/**
 * Create a Define node
 */
export function createDefineNode(
  name: string,
  value: string,
  options: { store?: string; line?: number } = {}
): DefineNode {
  return {
    id: generateNodeId(),
    type: 'define',
    name,
    value,
    store: options.store,
    line: options.line,
  }
}

/**
 * Create a Default node
 */
export function createDefaultNode(
  name: string,
  value: string,
  options: { line?: number } = {}
): DefaultNode {
  return {
    id: generateNodeId(),
    type: 'default',
    name,
    value,
    line: options.line,
  }
}

/**
 * Create a Play node
 */
export function createPlayNode(
  channel: 'music' | 'sound' | 'voice',
  file: string,
  options: {
    fadeIn?: number
    loop?: boolean
    volume?: number
    queue?: boolean
    line?: number
    fadeOut?: number
    ifChanged?: boolean
  } = {}
): PlayNode {
  return {
    id: generateNodeId(),
    type: 'play',
    channel,
    file,
    fadeIn: options.fadeIn,
    loop: options.loop,
    volume: options.volume,
    queue: options.queue,
    fadeOut: options.fadeOut,
    ifChanged: options.ifChanged,
    line: options.line,
  }
}

/**
 * Create a Stop node
 */
export function createStopNode(
  channel: 'music' | 'sound' | 'voice',
  options: { fadeOut?: number; line?: number } = {}
): StopNode {
  return {
    id: generateNodeId(),
    type: 'stop',
    channel,
    fadeOut: options.fadeOut,
    line: options.line,
  }
}

/**
 * Create a Pause node
 */
export function createPauseNode(
  options: { duration?: number; line?: number } = {}
): PauseNode {
  return {
    id: generateNodeId(),
    type: 'pause',
    duration: options.duration,
    line: options.line,
  }
}

/**
 * Create an NVL node
 */
export function createNVLNode(
  action: 'show' | 'hide' | 'clear',
  options: { line?: number } = {}
): NVLNode {
  return {
    id: generateNodeId(),
    type: 'nvl',
    action,
    line: options.line,
  }
}

/**
 * Create a Raw node (for unsupported syntax)
 */
export function createRawNode(
  content: string,
  options: { line?: number } = {}
): RawNode {
  return {
    id: generateNodeId(),
    type: 'raw',
    content,
    line: options.line,
  }
}

/**
 * Create a RenpyScript (root node)
 */
export function createRenpyScript(
  statements: ASTNode[] = [],
  metadata?: Partial<ScriptMetadata>
): RenpyScript {
  return {
    type: 'script',
    statements,
    metadata: {
      filePath: metadata?.filePath || '',
      parseTime: metadata?.parseTime || new Date(),
      version: metadata?.version || '1.0.0',
    },
  }
}
