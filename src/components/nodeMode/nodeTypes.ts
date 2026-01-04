import { NodeTypes } from '@xyflow/react'
import {
  LabelNode,
  DialogueNode,
  MenuNode,
  SceneNode,
  ShowNode,
  HideNode,
  WithNode,
  JumpNode,
  CallNode,
  ReturnNode,
  IfNode,
  SetNode,
  PythonNode,
  PlayNode,
  StopNode,
  PauseNode,
  NVLNode,
  DefineNode,
  DefaultNode,
  RawNode,
} from './nodes'

/**
 * Node types mapping for React Flow
 * Maps AST node types to their React components
 * 
 * Implements Requirements 5.1: Support all node types
 */
export const nodeTypes: NodeTypes = {
  // Flow control nodes
  label: LabelNode,
  jump: JumpNode,
  call: CallNode,
  return: ReturnNode,
  
  // Dialogue nodes
  dialogue: DialogueNode,
  menu: MenuNode,
  
  // Visual nodes
  scene: SceneNode,
  show: ShowNode,
  hide: HideNode,
  with: WithNode,
  
  // Audio nodes
  play: PlayNode,
  stop: StopNode,
  
  // Logic nodes
  if: IfNode,
  set: SetNode,
  python: PythonNode,
  
  // Variable definition nodes
  define: DefineNode,
  default: DefaultNode,
  
  // NVL mode nodes
  nvl: NVLNode,
  
  // Utility nodes
  pause: PauseNode,
  
  // Raw/unsupported code
  raw: RawNode,
}

/**
 * List of all supported node types
 * Used for validation and UI generation
 */
export const supportedNodeTypes = Object.keys(nodeTypes)

/**
 * Node type categories for organization
 */
export const nodeTypeCategories = {
  flowControl: ['label', 'jump', 'call', 'return'],
  dialogue: ['dialogue', 'menu'],
  visual: ['scene', 'show', 'hide', 'with'],
  audio: ['play', 'stop'],
  logic: ['if', 'set', 'python'],
  variables: ['define', 'default'],
  nvl: ['nvl'],
  utility: ['pause', 'raw'],
}

/**
 * Check if a node type is supported
 */
export function isNodeTypeSupported(type: string): boolean {
  return type in nodeTypes
}
