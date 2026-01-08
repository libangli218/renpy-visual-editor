/**
 * Variable Store
 * 
 * Zustand store for managing variables (default/define statements).
 */

import { create } from 'zustand'
import {
  Variable,
  VariableFormData,
  VariableScope,
  generateVariableId,
} from './types'
import { DefineNode, DefaultNode, ASTNode, RenpyScript } from '../../types/ast'
import { createDefineNode, createDefaultNode } from '../../parser/nodeFactory'
import { useEditorStore } from '../../store/editorStore'

/**
 * Sync variables to AST
 * 
 * This function replaces ALL non-Character define/default statements with the current variables.
 * This ensures deleted variables are removed from AST.
 */
function syncVariablesToAST(variables: Variable[]): void {
  const { ast, setAst } = useEditorStore.getState()
  if (!ast) return

  // Filter out ALL non-Character define statements and ALL default statements
  // We will re-add only the variables we're managing
  const nonVariableStatements = ast.statements.filter(stmt => {
    if (stmt.type === 'define') {
      const defineNode = stmt as DefineNode
      // Keep ONLY Character() definitions
      return defineNode.value.startsWith('Character(')
    }
    if (stmt.type === 'default') {
      // Remove ALL default statements - we'll re-add the ones we're managing
      return false
    }
    return true
  })

  // Generate new nodes for all variables
  const variableNodes: ASTNode[] = variables.map((v) => {
    if (v.scope === 'define') {
      return createDefineNode(v.name, v.value)
    } else if (v.scope === 'persistent') {
      // Persistent variables use default with persistent. prefix
      return createDefaultNode(`persistent.${v.name}`, v.value)
    } else {
      // default scope
      return createDefaultNode(v.name, v.value)
    }
  })

  // Find where to insert variables (after Character definitions, before labels)
  const firstLabelIndex = nonVariableStatements.findIndex(s => s.type === 'label')
  
  // Find last Character definition
  let lastCharDefIndex = -1
  for (let i = 0; i < nonVariableStatements.length; i++) {
    const stmt = nonVariableStatements[i]
    if (stmt.type === 'define') {
      const defineNode = stmt as DefineNode
      if (defineNode.value.startsWith('Character(')) {
        lastCharDefIndex = i
      }
    }
  }

  let newStatements: ASTNode[]
  const insertIndex = lastCharDefIndex >= 0 ? lastCharDefIndex + 1 : 
                      firstLabelIndex >= 0 ? firstLabelIndex : 
                      nonVariableStatements.length

  newStatements = [
    ...nonVariableStatements.slice(0, insertIndex),
    ...variableNodes,
    ...nonVariableStatements.slice(insertIndex),
  ]

  // Update AST
  const newAst: RenpyScript = {
    ...ast,
    statements: newStatements,
  }

  setAst(newAst)
}

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

  // Query methods
  getVariablesByScope: (scope: VariableScope) => Variable[]
  generateVariableNodes: () => ASTNode[]

  // AST integration
  extractVariablesFromAST: (ast: RenpyScript) => void
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
      value: data.value,
      scope: data.scope,
      type: data.type,
      description: data.description || undefined,
    }

    const newVariables = [...get().variables, newVariable]
    
    set({
      variables: newVariables,
      dialogOpen: false,
      editingVariable: null,
    })

    // Sync to AST
    syncVariablesToAST(newVariables)

    return newVariable
  },

  updateVariable: (id, data) => {
    const newVariables = get().variables.map((v) =>
      v.id === id
        ? { 
            ...v, 
            name: data.name, 
            value: data.value, 
            scope: data.scope,
            type: data.type,
            description: data.description || undefined,
          }
        : v
    )
    
    set({
      variables: newVariables,
      dialogOpen: false,
      editingVariable: null,
    })

    // Sync to AST
    syncVariablesToAST(newVariables)
  },

  deleteVariable: (id) => {
    const newVariables = get().variables.filter((v) => v.id !== id)
    
    set({ 
      variables: newVariables,
      selectedVariableId: get().selectedVariableId === id ? null : get().selectedVariableId,
    })

    // Sync to AST
    syncVariablesToAST(newVariables)
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

  // Query methods
  getVariablesByScope: (scope) => {
    return get().variables.filter(v => v.scope === scope)
  },

  generateVariableNodes: () => {
    const { variables } = get()
    return variables.map((v) => {
      if (v.scope === 'define') {
        return createDefineNode(v.name, v.value)
      } else if (v.scope === 'persistent') {
        return createDefaultNode(`persistent.${v.name}`, v.value)
      } else {
        return createDefaultNode(v.name, v.value)
      }
    })
  },

  // Extract variables from AST
  extractVariablesFromAST: (ast) => {
    const existingVariables = get().variables
    const variables: Variable[] = []

    for (const statement of ast.statements) {
      if (statement.type === 'default') {
        const node = statement as DefaultNode
        // Check if it's a persistent variable
        if (node.name.startsWith('persistent.')) {
          const name = node.name.substring('persistent.'.length)
          const existing = existingVariables.find(v => v.name === name && v.scope === 'persistent')
          variables.push({
            id: existing?.id || generateVariableId(),
            name: name,
            value: node.value,
            scope: 'persistent',
            type: existing?.type || 'any',
            description: existing?.description,
          })
        } else {
          const existing = existingVariables.find(v => v.name === node.name && v.scope === 'default')
          variables.push({
            id: existing?.id || generateVariableId(),
            name: node.name,
            value: node.value,
            scope: 'default',
            type: existing?.type || 'any',
            description: existing?.description,
          })
        }
      } else if (statement.type === 'define') {
        const node = statement as DefineNode
        // Skip Character() definitions
        if (node.value.startsWith('Character(')) continue
        const existing = existingVariables.find(v => v.name === node.name && v.scope === 'define')
        variables.push({
          id: existing?.id || generateVariableId(),
          name: node.name,
          value: node.value,
          scope: 'define',
          type: existing?.type || 'any',
          description: existing?.description,
        })
      }
    }

    set({ variables })
  },
}))
