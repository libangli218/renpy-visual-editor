/**
 * Block Utilities - Functions for manipulating blocks and AST
 * Implements Requirements 6.2, 6.4
 */

import { ASTNode, RenpyScript, DialogueNode } from '../../types/ast'
import { createDialogueNode } from '../../parser/nodeFactory'
import { StoryBlock } from './types'

/**
 * Update a dialogue node's text
 */
export function updateDialogueText(
  ast: RenpyScript,
  nodeId: string,
  newText: string
): RenpyScript {
  const updateNode = (node: ASTNode): ASTNode => {
    if (node.id === nodeId && node.type === 'dialogue') {
      return { ...node, text: newText } as DialogueNode
    }
    if (node.type === 'label') {
      return {
        ...node,
        body: node.body.map(updateNode),
      }
    }
    if (node.type === 'if') {
      return {
        ...node,
        branches: node.branches.map((branch) => ({
          ...branch,
          body: branch.body.map(updateNode),
        })),
      }
    }
    if (node.type === 'menu') {
      return {
        ...node,
        choices: node.choices.map((choice) => ({
          ...choice,
          body: choice.body.map(updateNode),
        })),
      }
    }
    return node
  }

  return {
    ...ast,
    statements: ast.statements.map(updateNode),
  }
}

/**
 * Insert a new node after a given node ID
 */
export function insertNodeAfter(
  ast: RenpyScript,
  afterNodeId: string,
  newNode: ASTNode
): RenpyScript {
  const insertAfter = (nodes: ASTNode[]): ASTNode[] => {
    const result: ASTNode[] = []
    for (const node of nodes) {
      result.push(node)
      if (node.id === afterNodeId) {
        result.push(newNode)
      }
      // Handle nested nodes
      if (node.type === 'label') {
        const updatedBody = insertAfter(node.body)
        if (updatedBody !== node.body) {
          result[result.length - 1] = { ...node, body: updatedBody }
        }
      }
    }
    return result
  }

  return {
    ...ast,
    statements: insertAfter(ast.statements),
  }
}

/**
 * Delete a node by ID
 */
export function deleteNode(ast: RenpyScript, nodeId: string): RenpyScript {
  const filterNodes = (nodes: ASTNode[]): ASTNode[] => {
    return nodes
      .filter((node) => node.id !== nodeId)
      .map((node) => {
        if (node.type === 'label') {
          return { ...node, body: filterNodes(node.body) }
        }
        if (node.type === 'if') {
          return {
            ...node,
            branches: node.branches.map((branch) => ({
              ...branch,
              body: filterNodes(branch.body),
            })),
          }
        }
        if (node.type === 'menu') {
          return {
            ...node,
            choices: node.choices.map((choice) => ({
              ...choice,
              body: filterNodes(choice.body),
            })),
          }
        }
        return node
      })
  }

  return {
    ...ast,
    statements: filterNodes(ast.statements),
  }
}

/**
 * Move a node to a new position
 */
export function moveNode(
  ast: RenpyScript,
  nodeId: string,
  targetIndex: number
): RenpyScript {
  // Find and remove the node
  let movedNode: ASTNode | null = null
  
  const removeNode = (nodes: ASTNode[]): ASTNode[] => {
    return nodes.filter((node) => {
      if (node.id === nodeId) {
        movedNode = node
        return false
      }
      return true
    })
  }

  const newStatements = removeNode(ast.statements)
  
  if (!movedNode) {
    return ast
  }

  // Insert at new position
  const result = [...newStatements]
  result.splice(targetIndex, 0, movedNode)

  return {
    ...ast,
    statements: result,
  }
}

/**
 * Create a new dialogue block after the current one
 */
export function createNewDialogueAfter(
  ast: RenpyScript,
  afterNodeId: string,
  speaker: string | null = null
): { ast: RenpyScript; newNodeId: string } {
  const newNode = createDialogueNode('', speaker)
  const newAst = insertNodeAfter(ast, afterNodeId, newNode)
  return { ast: newAst, newNodeId: newNode.id }
}

/**
 * Find a block by ID
 */
export function findBlockById(blocks: StoryBlock[], id: string): StoryBlock | undefined {
  return blocks.find((block) => block.id === id)
}

/**
 * Get the index of a block
 */
export function getBlockIndex(blocks: StoryBlock[], id: string): number {
  return blocks.findIndex((block) => block.id === id)
}
