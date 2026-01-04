/**
 * Flow Node Components Export
 * 
 * These are the redesigned node components for the flow graph editor.
 * They work with the FlowGraphBuilder data structures.
 */

export { FlowSceneNode } from './FlowSceneNode'
export { FlowDialogueBlockNode } from './FlowDialogueBlockNode'
export { FlowMenuNode } from './FlowMenuNode'
export { FlowJumpNode } from './FlowJumpNode'
export { FlowCallNode } from './FlowCallNode'
export { FlowConditionNode } from './FlowConditionNode'
export { FlowReturnNode } from './FlowReturnNode'

/**
 * Node types mapping for React Flow
 * Use this to register the flow node types with React Flow
 */
export const flowNodeTypes = {
  'scene': () => import('./FlowSceneNode').then(m => m.FlowSceneNode),
  'dialogue-block': () => import('./FlowDialogueBlockNode').then(m => m.FlowDialogueBlockNode),
  'menu': () => import('./FlowMenuNode').then(m => m.FlowMenuNode),
  'jump': () => import('./FlowJumpNode').then(m => m.FlowJumpNode),
  'call': () => import('./FlowCallNode').then(m => m.FlowCallNode),
  'condition': () => import('./FlowConditionNode').then(m => m.FlowConditionNode),
  'return': () => import('./FlowReturnNode').then(m => m.FlowReturnNode),
}

// Import components directly for synchronous usage
import { FlowSceneNode } from './FlowSceneNode'
import { FlowDialogueBlockNode } from './FlowDialogueBlockNode'
import { FlowMenuNode } from './FlowMenuNode'
import { FlowJumpNode } from './FlowJumpNode'
import { FlowCallNode } from './FlowCallNode'
import { FlowConditionNode } from './FlowConditionNode'
import { FlowReturnNode } from './FlowReturnNode'

/**
 * Synchronous node types mapping for React Flow
 */
export const flowNodeTypesSync = {
  'scene': FlowSceneNode,
  'dialogue-block': FlowDialogueBlockNode,
  'menu': FlowMenuNode,
  'jump': FlowJumpNode,
  'call': FlowCallNode,
  'condition': FlowConditionNode,
  'return': FlowReturnNode,
}
