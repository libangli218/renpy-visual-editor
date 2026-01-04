/**
 * Variable Store
 * 
 * Zustand store for managing variables in the editor.
 * Implements Requirements 8.1, 8.2, 8.3, 8.4, 8.6
 */

import { create } from 'zustand'
import {
  Variable,
  VariableFormData,
  VariableScope,
  generateVariableId,
  inferTypeFromValue,
} from './types'
import { DefineNode, DefaultNode, ASTNode, RenpyScript } from '../../types/ast'
import { createDefineNode, createDefaultNode } from '../../parser/nodeFactory'
import { markAsModified } from '../../store/editorStore'

export interface VariableStore {
  // State
  variables: Variable[]
  selectedVariableId: string | null
  dialogOpen: boolean
  editingVariable: Variable | null

  // Actions
  setVariables: (variables: Variable[]) => void
  addVariable: (data: VariableFormData) => Variable
  updateVariable: (id: string, data: VariableFormData) => void
  deleteVariable: (id: string) => void
  selectVariable: (id: string | null) => void
  openDialog: (variable?: Variable) => void
  closeDialog: () => void

  // Grouping helpers
  getVariablesByScope: (scope: VariableScope) => Variable[]
  getVariableByName: (name: string) => Variable | undefined

  // AST integration
  extractVariablesFromAST: (ast: RenpyScript) => void
  generateVariableNodes: () => ASTNode[]
}

export const useVariableStore = create<VariableStore>((set, get) => ({
  // Initial state
  variables: [],
  selectedVariableId: null,
  dialogOpen: false,
  editingVariable: null,

  // Actions
  setVariables: (variables) => {
    set({ variables })
  },

  addVariable: (data) => {
    const newVariable: Variable = {
      id: generateVariableId(),
      name: data.name,
      scope: data.scope,
      type: data.type,
      value: data.value,
      description: data.description || undefined,
    }

    set((state) => ({
      variables: [...state.variables, newVariable],
      dialogOpen: false,
      editingVariable: null,
    }))

    // Mark editor as modified (Requirement 1.4)
    markAsModified()

    return newVariable
  },

  updateVariable: (id, data) => {
    set((state) => ({
      variables: state.variables.map((v) =>
        v.id === id
          ? {
              ...v,
              name: data.name,
              scope: data.scope,
              type: data.type,
              value: data.value,
              description: data.description || undefined,
            }
          : v
      ),
      dialogOpen: false,
      editingVariable: null,
    }))

    // Mark editor as modified (Requirement 1.4)
    markAsModified()
  },

  deleteVariable: (id) => {
    set((state) => ({
      variables: state.variables.filter((v) => v.id !== id),
      selectedVariableId:
        state.selectedVariableId === id ? null : state.selectedVariableId,
    }))

    // Mark editor as modified (Requirement 1.4)
    markAsModified()
  },

  selectVariable: (id) => {
    set({ selectedVariableId: id })
  },

  openDialog: (variable) => {
    set({
      dialogOpen: true,
      editingVariable: variable || null,
    })
  },

  closeDialog: () => {
    set({
      dialogOpen: false,
      editingVariable: null,
    })
  },

  // Grouping helpers (Requirement 8.4)
  getVariablesByScope: (scope) => {
    return get().variables.filter((v) => v.scope === scope)
  },

  getVariableByName: (name) => {
    return get().variables.find((v) => v.name === name)
  },

  // Extract variables from AST (define and default statements)
  extractVariablesFromAST: (ast) => {
    const variables: Variable[] = []

    const processNode = (node: ASTNode) => {
      if (node.type === 'define') {
        const defineNode = node as DefineNode
        // Skip Character definitions (they start with Character()
        if (!defineNode.value.startsWith('Character(')) {
          variables.push({
            id: generateVariableId(),
            name: defineNode.name,
            scope: 'define',
            type: inferTypeFromValue(defineNode.value),
            value: defineNode.value,
          })
        }
      } else if (node.type === 'default') {
        const defaultNode = node as DefaultNode
        // Check if it's a persistent variable
        const isPersistent = defaultNode.name.startsWith('persistent.')
        const name = isPersistent 
          ? defaultNode.name.replace('persistent.', '')
          : defaultNode.name
        
        variables.push({
          id: generateVariableId(),
          name: name,
          scope: isPersistent ? 'persistent' : 'default',
          type: inferTypeFromValue(defaultNode.value),
          value: defaultNode.value,
        })
      }
    }

    // Process top-level statements
    for (const statement of ast.statements) {
      processNode(statement)
    }

    set({ variables })
  },

  // Generate AST nodes for all variables (Requirement 8.6)
  generateVariableNodes: () => {
    const { variables } = get()
    const nodes: ASTNode[] = []

    for (const variable of variables) {
      if (variable.scope === 'define') {
        nodes.push(createDefineNode(variable.name, variable.value))
      } else if (variable.scope === 'persistent') {
        // Persistent variables use default with persistent. prefix
        nodes.push(createDefaultNode(`persistent.${variable.name}`, variable.value))
      } else {
        // default scope
        nodes.push(createDefaultNode(variable.name, variable.value))
      }
    }

    return nodes
  },
}))

/**
 * Get variable by name (for autocomplete)
 */
export function getVariableByName(name: string): Variable | undefined {
  return useVariableStore.getState().variables.find((v) => v.name === name)
}

/**
 * Get all variable names for autocomplete (Requirement 8.5)
 */
export function getVariableNames(): string[] {
  return useVariableStore.getState().variables.map((v) => v.name)
}

/**
 * Get variables grouped by scope (Requirement 8.4)
 */
export function getVariablesGroupedByScope(): Record<VariableScope, Variable[]> {
  const variables = useVariableStore.getState().variables
  return {
    default: variables.filter((v) => v.scope === 'default'),
    define: variables.filter((v) => v.scope === 'define'),
    persistent: variables.filter((v) => v.scope === 'persistent'),
  }
}
