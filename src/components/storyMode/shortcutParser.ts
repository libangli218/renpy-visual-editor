/**
 * Shortcut Input Parser
 * Implements Requirements 6.3, 6.7: Quick input shortcuts and extend syntax
 * 
 * Supported shortcuts:
 * - `s:text` - Character dialogue (s is the character name)
 * - `>text` - Narration
 * - `+text` - Extend previous dialogue
 * - `[show character]` - Show character command
 * - `[hide character]` - Hide character command
 * - `[scene background]` - Scene change command
 */

import { ASTNode } from '../../types/ast'
import {
  createDialogueNode,
  createShowNode,
  createHideNode,
  createSceneNode,
} from '../../parser/nodeFactory'

/**
 * Result of parsing a shortcut input
 */
export interface ShortcutParseResult {
  type: 'dialogue' | 'narration' | 'extend' | 'show' | 'hide' | 'scene' | 'none'
  node: ASTNode | null
  speaker?: string
  text?: string
  image?: string
}

/**
 * Parse shortcut input and return the appropriate AST node
 * 
 * @param input - The raw input string
 * @returns ShortcutParseResult with the parsed node or null if not a shortcut
 */
export function parseShortcutInput(input: string): ShortcutParseResult {
  const trimmed = input.trim()
  
  // Check for extend shortcut: +text
  if (trimmed.startsWith('+')) {
    const text = trimmed.slice(1).trim()
    return {
      type: 'extend',
      node: createDialogueNode(text, null, { extend: true }),
      text,
    }
  }
  
  // Check for narration shortcut: >text
  if (trimmed.startsWith('>')) {
    const text = trimmed.slice(1).trim()
    return {
      type: 'narration',
      node: createDialogueNode(text, null),
      text,
    }
  }
  
  // Check for show command: [show character attributes]
  const showMatch = trimmed.match(/^\[show\s+(.+)\]$/i)
  if (showMatch) {
    const parts = showMatch[1].trim().split(/\s+/)
    const image = parts[0]
    const attributes = parts.slice(1)
    return {
      type: 'show',
      node: createShowNode(image, { attributes }),
      image,
    }
  }
  
  // Check for hide command: [hide character]
  const hideMatch = trimmed.match(/^\[hide\s+(.+)\]$/i)
  if (hideMatch) {
    const image = hideMatch[1].trim()
    return {
      type: 'hide',
      node: createHideNode(image),
      image,
    }
  }
  
  // Check for scene command: [scene background]
  const sceneMatch = trimmed.match(/^\[scene\s+(.+)\]$/i)
  if (sceneMatch) {
    const image = sceneMatch[1].trim()
    return {
      type: 'scene',
      node: createSceneNode(image),
      image,
    }
  }
  
  // Check for character dialogue shortcut: name:text
  // The name can be any alphanumeric string (character variable name)
  const dialogueMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*):(.*)$/)
  if (dialogueMatch) {
    const speaker = dialogueMatch[1]
    const text = dialogueMatch[2].trim()
    return {
      type: 'dialogue',
      node: createDialogueNode(text, speaker),
      speaker,
      text,
    }
  }
  
  // Not a shortcut
  return {
    type: 'none',
    node: null,
  }
}

/**
 * Check if input is a shortcut pattern
 */
export function isShortcutInput(input: string): boolean {
  const trimmed = input.trim()
  
  // Extend shortcut
  if (trimmed.startsWith('+')) return true
  
  // Narration shortcut
  if (trimmed.startsWith('>')) return true
  
  // Command shortcuts
  if (/^\[(show|hide|scene)\s+.+\]$/i.test(trimmed)) return true
  
  // Character dialogue shortcut
  if (/^[a-zA-Z_][a-zA-Z0-9_]*:/.test(trimmed)) return true
  
  return false
}

/**
 * Get shortcut type from input (for UI hints)
 */
export function getShortcutType(input: string): string | null {
  const trimmed = input.trim()
  
  if (trimmed.startsWith('+')) return 'extend'
  if (trimmed.startsWith('>')) return 'narration'
  if (/^\[show\s/i.test(trimmed)) return 'show'
  if (/^\[hide\s/i.test(trimmed)) return 'hide'
  if (/^\[scene\s/i.test(trimmed)) return 'scene'
  if (/^[a-zA-Z_][a-zA-Z0-9_]*:/.test(trimmed)) return 'dialogue'
  
  return null
}

/**
 * Get available shortcuts for autocomplete
 */
export function getAvailableShortcuts(): Array<{ pattern: string; description: string }> {
  return [
    { pattern: 's:', description: 'Character dialogue (replace s with character name)' },
    { pattern: '>', description: 'Narration' },
    { pattern: '+', description: 'Extend previous dialogue' },
    { pattern: '[show character]', description: 'Show character' },
    { pattern: '[hide character]', description: 'Hide character' },
    { pattern: '[scene background]', description: 'Change scene' },
  ]
}
