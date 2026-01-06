/**
 * FlowGraph Types
 * 
 * Type definitions for flow graph structures used in caching.
 * These types were originally part of FlowGraphBuilder but are
 * extracted here for use by the cache system.
 */

import { ASTNode } from './ast'

/**
 * Flow node types for the visual editor
 */
export type FlowNodeType = 
  | 'scene' 
  | 'dialogue-block' 
  | 'menu' 
  | 'condition' 
  | 'jump' 
  | 'call' 
  | 'return'

/**
 * Visual command types (scene, show, hide, with)
 */
export interface VisualCommand {
  type: 'scene' | 'show' | 'hide' | 'with'
  target: string
  attributes?: string[]
  id: string
}

/**
 * Dialogue item within a dialogue block
 */
export interface DialogueItem {
  speaker: string | null
  text: string
  attributes?: string[]
  id: string
}

/**
 * Menu choice with port information
 */
export interface MenuChoice {
  text: string
  condition?: string
  targetLabel?: string
  portId: string
  body: ASTNode[]
}

/**
 * Condition branch for if statements
 */
export interface ConditionBranch {
  condition: string | null
  portId: string
  body: ASTNode[]
}

/**
 * Flow node data - varies by node type
 */
export interface FlowNodeData {
  /** Label name (for scene nodes) */
  label?: string
  /** Preview text */
  preview?: string
  /** Dialogues in a dialogue block */
  dialogues?: DialogueItem[]
  /** Visual commands in a dialogue block */
  visualCommands?: VisualCommand[]
  /** Menu choices */
  choices?: MenuChoice[]
  /** Menu prompt text */
  prompt?: string
  /** Condition expression (for condition nodes) */
  condition?: string
  /** Condition branches (for if nodes) */
  branches?: ConditionBranch[]
  /** Jump/call target label */
  target?: string
  /** Whether this is a call (vs jump) */
  isCall?: boolean
  /** Exit type for scene nodes */
  exitType?: 'return' | 'jump' | 'menu' | 'fall-through'
  /** Whether the node has incoming edges */
  hasIncoming?: boolean
  /** Original AST nodes for reference */
  astNodes?: ASTNode[]
  /** Whether dialogue block is expanded */
  expanded?: boolean
}

/**
 * Flow node structure
 */
export interface FlowNode {
  id: string
  type: FlowNodeType
  position: { x: number; y: number }
  data: FlowNodeData
}

/**
 * Edge types for flow connections
 */
export type FlowEdgeType = 'normal' | 'jump' | 'call' | 'return'

/**
 * Flow edge structure
 */
export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type: FlowEdgeType
  animated?: boolean
  /** Whether the target label exists */
  valid?: boolean
}

/**
 * Complete flow graph
 */
export interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
}
