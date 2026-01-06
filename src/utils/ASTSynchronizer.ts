/**
 * ASTSynchronizer - AST 同步器
 * 
 * Provides utilities for manipulating Ren'Py AST structures.
 * Used for inserting dialogues, menus, labels, and flow control statements.
 */

import {
  RenpyScript,
  ASTNode,
  LabelNode,
  JumpNode as ASTJumpNode,
  CallNode as ASTCallNode,
  DialogueNode as ASTDialogueNode,
  MenuNode as ASTMenuNode,
  ReturnNode as ASTReturnNode,
  IfNode as ASTIfNode,
  MenuChoice,
} from '../types/ast'

/**
 * Dialogue data for insertion
 */
export interface DialogueData {
  speaker: string | null
  text: string
  attributes?: string[]
}

/**
 * Menu data for insertion
 */
export interface MenuData {
  prompt?: string
  choices: Array<{
    text: string
    condition?: string
    body: ASTNode[]
  }>
}

/**
 * Synchronization error
 */
export interface SyncError {
  type: 'invalid_target' | 'missing_label' | 'duplicate_label' | 'sync_failed'
  message: string
  nodeId?: string
}

/**
 * Result of addLabel operation
 */
export interface AddLabelResult {
  /** Whether the label was successfully added */
  success: boolean
  /** The ID of the created label node (if successful) */
  labelId?: string
  /** Error information (if failed) */
  error?: {
    type: 'duplicate_label' | 'invalid_name' | 'sync_failed'
    message: string
    existingLabelId?: string
  }
}

/**
 * Options for creating new statements
 */
export interface CreateStatementOptions {
  /** Line number hint for insertion */
  line?: number
  /** Whether this is an expression jump/call */
  expression?: boolean
  /** Arguments for call statements */
  arguments?: string[]
}

/**
 * Generate a unique ID for AST nodes
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * ASTSynchronizer class
 * 
 * Provides methods for manipulating AST structures.
 */
export class ASTSynchronizer {
  /**
   * Create a new jump statement AST node
   */
  createJumpStatement(targetLabel: string, options: CreateStatementOptions = {}): ASTJumpNode {
    return {
      id: generateId('jump'),
      type: 'jump',
      target: targetLabel,
      expression: options.expression,
      line: options.line,
    }
  }

  /**
   * Create a new call statement AST node
   */
  createCallStatement(targetLabel: string, options: CreateStatementOptions = {}): ASTCallNode {
    return {
      id: generateId('call'),
      type: 'call',
      target: targetLabel,
      expression: options.expression,
      arguments: options.arguments,
      line: options.line,
    }
  }

  /**
   * Create a new label AST node
   */
  createLabel(name: string, body: ASTNode[] = []): LabelNode {
    return {
      id: generateId('label'),
      type: 'label',
      name,
      body: body.length > 0 ? body : [],
    }
  }

  /**
   * Create a new dialogue AST node
   */
  createDialogue(text: string, speaker: string | null = null): ASTDialogueNode {
    return {
      id: generateId('dialogue'),
      type: 'dialogue',
      speaker,
      text,
    }
  }

  /**
   * Create a new menu AST node
   */
  createMenu(choices: MenuChoice[], prompt?: string): ASTMenuNode {
    return {
      id: generateId('menu'),
      type: 'menu',
      prompt,
      choices,
    }
  }

  /**
   * Create a new return AST node
   */
  createReturn(value?: string): ASTReturnNode {
    return {
      id: generateId('return'),
      type: 'return',
      value,
    }
  }

  /**
   * Build a map of label names to their AST nodes
   */
  private buildLabelMap(ast: RenpyScript): Map<string, LabelNode> {
    const map = new Map<string, LabelNode>()
    
    for (const statement of ast.statements) {
      if (statement.type === 'label') {
        const label = statement as LabelNode
        map.set(label.name, label)
      }
    }
    
    return map
  }

  /**
   * Find an AST node by ID
   */
  private findNodeById(ast: RenpyScript, id: string): ASTNode | null {
    for (const statement of ast.statements) {
      const found = this.findNodeInTree(statement, id)
      if (found) return found
    }
    return null
  }

  /**
   * Recursively find a node in an AST subtree
   */
  private findNodeInTree(node: ASTNode, id: string): ASTNode | null {
    if (node.id === id) return node

    if (node.type === 'label') {
      const label = node as LabelNode
      for (const child of label.body) {
        const found = this.findNodeInTree(child, id)
        if (found) return found
      }
    } else if (node.type === 'menu') {
      const menu = node as ASTMenuNode
      for (const choice of menu.choices) {
        for (const child of choice.body) {
          const found = this.findNodeInTree(child, id)
          if (found) return found
        }
      }
    } else if (node.type === 'if') {
      const ifNode = node as ASTIfNode
      for (const branch of ifNode.branches) {
        for (const child of branch.body) {
          const found = this.findNodeInTree(child, id)
          if (found) return found
        }
      }
    }

    return null
  }

  /**
   * Find the index of a node in a body array by ID
   */
  private findNodeIndexInBody(body: ASTNode[], nodeId: string): number {
    return body.findIndex(node => node.id === nodeId)
  }

  /**
   * Insert a node after a specific node ID in a body array (including nested structures)
   */
  private insertAfterNodeInBody(body: ASTNode[], afterNodeId: string, newNode: ASTNode): boolean {
    for (let i = 0; i < body.length; i++) {
      const node = body[i]
      
      if (node.id === afterNodeId) {
        body.splice(i + 1, 0, newNode)
        return true
      }

      if (node.type === 'menu') {
        const menu = node as ASTMenuNode
        for (const choice of menu.choices) {
          if (this.insertAfterNodeInBody(choice.body, afterNodeId, newNode)) {
            return true
          }
        }
      } else if (node.type === 'if') {
        const ifNode = node as ASTIfNode
        for (const branch of ifNode.branches) {
          if (this.insertAfterNodeInBody(branch.body, afterNodeId, newNode)) {
            return true
          }
        }
      }
    }

    return false
  }

  /**
   * Insert a jump statement into a label body
   */
  insertJumpIntoLabel(
    labelName: string,
    targetLabel: string,
    ast: RenpyScript,
    position: 'end' | number = 'end'
  ): boolean {
    const labelMap = this.buildLabelMap(ast)
    const label = labelMap.get(labelName)
    
    if (!label) return false

    const jumpNode = this.createJumpStatement(targetLabel)
    
    if (position === 'end') {
      label.body.push(jumpNode)
    } else {
      label.body.splice(position, 0, jumpNode)
    }

    return true
  }

  /**
   * Insert a call statement into a label body
   */
  insertCallIntoLabel(
    labelName: string,
    targetLabel: string,
    ast: RenpyScript,
    position: 'end' | number = 'end'
  ): boolean {
    const labelMap = this.buildLabelMap(ast)
    const label = labelMap.get(labelName)
    
    if (!label) return false

    const callNode = this.createCallStatement(targetLabel)
    
    if (position === 'end') {
      label.body.push(callNode)
    } else {
      label.body.splice(position, 0, callNode)
    }

    return true
  }

  /**
   * Add a new label to the AST
   */
  addLabel(name: string, ast: RenpyScript, body: ASTNode[] = []): AddLabelResult {
    if (!name || name.trim() === '') {
      return {
        success: false,
        error: {
          type: 'invalid_name',
          message: 'Label name cannot be empty',
        },
      }
    }

    const validLabelPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/
    if (!validLabelPattern.test(name)) {
      return {
        success: false,
        error: {
          type: 'invalid_name',
          message: `Invalid label name "${name}". Label names must start with a letter or underscore and contain only letters, numbers, and underscores.`,
        },
      }
    }

    const labelMap = this.buildLabelMap(ast)
    const existingLabel = labelMap.get(name)
    if (existingLabel) {
      return {
        success: false,
        error: {
          type: 'duplicate_label',
          message: `Label "${name}" already exists in the script`,
          existingLabelId: existingLabel.id,
        },
      }
    }

    const label = this.createLabel(name, body)
    ast.statements.push(label)
    
    return {
      success: true,
      labelId: label.id,
    }
  }

  /**
   * Remove a label from the AST
   */
  removeLabel(name: string, ast: RenpyScript): boolean {
    const index = ast.statements.findIndex(
      s => s.type === 'label' && (s as LabelNode).name === name
    )

    if (index === -1) return false

    ast.statements.splice(index, 1)
    return true
  }

  /**
   * Insert a dialogue into a label at a specified position
   */
  insertDialogue(
    labelName: string,
    dialogue: DialogueData,
    ast: RenpyScript,
    afterNodeId?: string
  ): string | null {
    const labelMap = this.buildLabelMap(ast)
    const label = labelMap.get(labelName)
    
    if (!label) {
      return null
    }

    const dialogueNode = this.createDialogue(dialogue.text, dialogue.speaker)
    if (dialogue.attributes) {
      dialogueNode.attributes = dialogue.attributes
    }

    if (afterNodeId === undefined || afterNodeId === null) {
      label.body.unshift(dialogueNode)
    } else {
      const insertIndex = this.findNodeIndexInBody(label.body, afterNodeId)
      
      if (insertIndex === -1) {
        const inserted = this.insertAfterNodeInBody(label.body, afterNodeId, dialogueNode)
        if (!inserted) {
          const terminalIndex = label.body.findIndex(
            node => node.type === 'return' || node.type === 'jump'
          )
          if (terminalIndex !== -1) {
            label.body.splice(terminalIndex, 0, dialogueNode)
          } else {
            label.body.push(dialogueNode)
          }
        }
      } else {
        const afterNode = label.body[insertIndex]
        if (afterNode && (afterNode.type === 'return' || afterNode.type === 'jump')) {
          label.body.splice(insertIndex, 0, dialogueNode)
        } else {
          label.body.splice(insertIndex + 1, 0, dialogueNode)
        }
      }
    }

    return dialogueNode.id
  }

  /**
   * Insert a menu into a label at a specified position
   */
  insertMenu(
    labelName: string,
    menu: MenuData,
    ast: RenpyScript,
    afterNodeId?: string
  ): string | null {
    const labelMap = this.buildLabelMap(ast)
    const label = labelMap.get(labelName)
    
    if (!label) {
      return null
    }

    const choices: MenuChoice[] = menu.choices.map(choice => ({
      text: choice.text,
      condition: choice.condition,
      body: choice.body || [],
    }))

    const menuNode = this.createMenu(choices, menu.prompt)

    if (afterNodeId === undefined || afterNodeId === null) {
      label.body.unshift(menuNode)
    } else {
      const insertIndex = this.findNodeIndexInBody(label.body, afterNodeId)
      
      if (insertIndex === -1) {
        const inserted = this.insertAfterNodeInBody(label.body, afterNodeId, menuNode)
        if (!inserted) {
          const terminalIndex = label.body.findIndex(
            node => node.type === 'return' || node.type === 'jump'
          )
          if (terminalIndex !== -1) {
            label.body.splice(terminalIndex, 0, menuNode)
          } else {
            label.body.push(menuNode)
          }
        }
      } else {
        const afterNode = label.body[insertIndex]
        if (afterNode && (afterNode.type === 'return' || afterNode.type === 'jump')) {
          label.body.splice(insertIndex, 0, menuNode)
        } else {
          label.body.splice(insertIndex + 1, 0, menuNode)
        }
      }
    }

    return menuNode.id
  }

  /**
   * Insert a jump statement into a menu choice body
   */
  insertJumpIntoChoice(
    menuNodeId: string,
    choiceIndex: number,
    targetLabel: string,
    ast: RenpyScript
  ): boolean {
    const menuNode = this.findNodeById(ast, menuNodeId) as ASTMenuNode | null
    
    if (!menuNode || menuNode.type !== 'menu') {
      return false
    }

    if (choiceIndex < 0 || choiceIndex >= menuNode.choices.length) {
      return false
    }

    const jumpNode = this.createJumpStatement(targetLabel)
    const choice = menuNode.choices[choiceIndex]
    const existingJumpIndex = choice.body.findIndex(n => n.type === 'jump')
    
    if (existingJumpIndex !== -1) {
      choice.body[existingJumpIndex] = jumpNode
    } else {
      choice.body.push(jumpNode)
    }

    return true
  }

  /**
   * Update a dialogue's text in the AST
   */
  updateDialogueText(dialogueId: string, newText: string, ast: RenpyScript): boolean {
    const dialogue = this.findNodeById(ast, dialogueId) as ASTDialogueNode | null
    if (!dialogue || dialogue.type !== 'dialogue') return false

    dialogue.text = newText
    return true
  }

  /**
   * Update a dialogue's speaker in the AST
   */
  updateDialogueSpeaker(
    dialogueId: string,
    newSpeaker: string | null,
    ast: RenpyScript
  ): boolean {
    const dialogue = this.findNodeById(ast, dialogueId) as ASTDialogueNode | null
    if (!dialogue || dialogue.type !== 'dialogue') return false

    dialogue.speaker = newSpeaker
    return true
  }
}

// Export singleton instance
export const astSynchronizer = new ASTSynchronizer()
