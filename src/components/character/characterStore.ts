/**
 * Character Store
 * 
 * Zustand store for managing characters in the editor.
 * Implements Requirements 7.1, 7.2, 7.3, 7.4
 */

import { create } from 'zustand'
import {
  Character,
  CharacterFormData,
  LayeredImageDef,
  LayerAttribute,
  generateCharacterId,
  generateCharacterValue,
  parseCharacterValue,
} from './types'
import { DefineNode, ASTNode, RenpyScript } from '../../types/ast'
import { createDefineNode } from '../../parser/nodeFactory'
import { markAsModified, useEditorStore } from '../../store/editorStore'

/**
 * Sync characters to AST
 * Updates the AST with current character definitions
 */
function syncCharactersToAST(characters: Character[]): void {
  const { ast, setAst } = useEditorStore.getState()
  if (!ast) return

  // Generate new define nodes for all characters
  const characterNodes = characters.map((char) => {
    const value = generateCharacterValue({
      name: char.name,
      displayName: char.displayName,
      color: char.color || '#ffffff',
      imagePrefix: char.imagePrefix || '',
      kind: char.kind || '',
    })
    return createDefineNode(char.name, value)
  })

  // Get character variable names for filtering
  const characterNames = new Set(characters.map(c => c.name))

  // Filter out old character define statements (Character() calls)
  const nonCharacterStatements = ast.statements.filter(stmt => {
    if (stmt.type !== 'define') return true
    const defineNode = stmt as DefineNode
    // Keep if it's not a Character() definition
    if (!defineNode.value.startsWith('Character(')) return true
    // Remove if it's a character we're managing
    return false
  })

  // Find where to insert character definitions (at the beginning, before labels)
  // Ren'Py convention: define statements come before labels
  const firstLabelIndex = nonCharacterStatements.findIndex(s => s.type === 'label')
  
  let newStatements: ASTNode[]
  if (firstLabelIndex === -1) {
    // No labels, put characters at the end
    newStatements = [...nonCharacterStatements, ...characterNodes]
  } else {
    // Insert characters before the first label
    newStatements = [
      ...nonCharacterStatements.slice(0, firstLabelIndex),
      ...characterNodes,
      ...nonCharacterStatements.slice(firstLabelIndex),
    ]
  }

  // Update AST
  const newAst: RenpyScript = {
    ...ast,
    statements: newStatements,
  }

  setAst(newAst)
}

export interface CharacterStore {
  // State
  characters: Character[]
  selectedCharacterId: string | null
  dialogOpen: boolean
  editingCharacter: Character | null

  // Actions
  setCharacters: (characters: Character[]) => void
  addCharacter: (data: CharacterFormData) => Character
  updateCharacter: (id: string, data: CharacterFormData) => void
  deleteCharacter: (id: string) => void
  selectCharacter: (id: string | null) => void
  openDialog: (character?: Character) => void
  closeDialog: () => void

  // Layered Image actions (Requirement 7.4)
  setCharacterLayers: (characterId: string, layers: LayeredImageDef | undefined) => void
  addLayerAttribute: (characterId: string, attribute: LayerAttribute) => void
  updateLayerAttribute: (characterId: string, index: number, attribute: LayerAttribute) => void
  removeLayerAttribute: (characterId: string, index: number) => void

  // AST integration
  extractCharactersFromAST: (ast: RenpyScript) => void
  generateCharacterNodes: () => DefineNode[]
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  // Initial state
  characters: [],
  selectedCharacterId: null,
  dialogOpen: false,
  editingCharacter: null,

  // Actions
  setCharacters: (characters) => {
    set({ characters })
  },

  addCharacter: (data) => {
    const newCharacter: Character = {
      id: generateCharacterId(),
      name: data.name,
      displayName: data.displayName,
      color: data.color || undefined,
      imagePrefix: data.imagePrefix || undefined,
      kind: data.kind || undefined,
    }

    const newCharacters = [...get().characters, newCharacter]
    
    set({
      characters: newCharacters,
      dialogOpen: false,
      editingCharacter: null,
    })

    // Sync to AST
    syncCharactersToAST(newCharacters)

    return newCharacter
  },

  updateCharacter: (id, data) => {
    const newCharacters = get().characters.map((char) =>
      char.id === id
        ? {
            ...char,
            name: data.name,
            displayName: data.displayName,
            color: data.color || undefined,
            imagePrefix: data.imagePrefix || undefined,
            kind: data.kind || undefined,
          }
        : char
    )
    
    set({
      characters: newCharacters,
      dialogOpen: false,
      editingCharacter: null,
    })

    // Sync to AST
    syncCharactersToAST(newCharacters)
  },

  deleteCharacter: (id) => {
    const newCharacters = get().characters.filter((char) => char.id !== id)
    
    set({
      characters: newCharacters,
      selectedCharacterId:
        get().selectedCharacterId === id ? null : get().selectedCharacterId,
    })

    // Sync to AST
    syncCharactersToAST(newCharacters)
  },

  selectCharacter: (id) => {
    set({ selectedCharacterId: id })
  },

  openDialog: (character) => {
    set({
      dialogOpen: true,
      editingCharacter: character || null,
    })
  },

  closeDialog: () => {
    set({
      dialogOpen: false,
      editingCharacter: null,
    })
  },

  // Layered Image actions (Requirement 7.4)
  setCharacterLayers: (characterId, layers) => {
    set((state) => ({
      characters: state.characters.map((char) =>
        char.id === characterId
          ? { ...char, layers }
          : char
      ),
    }))

    // Mark editor as modified (Requirement 1.4)
    markAsModified()
  },

  addLayerAttribute: (characterId, attribute) => {
    set((state) => ({
      characters: state.characters.map((char) => {
        if (char.id !== characterId) return char
        
        const currentLayers = char.layers || {
          name: char.imagePrefix || char.name,
          attributes: [],
        }
        
        return {
          ...char,
          layers: {
            ...currentLayers,
            attributes: [...currentLayers.attributes, attribute],
          },
        }
      }),
    }))

    // Mark editor as modified (Requirement 1.4)
    markAsModified()
  },

  updateLayerAttribute: (characterId, index, attribute) => {
    set((state) => ({
      characters: state.characters.map((char) => {
        if (char.id !== characterId || !char.layers) return char
        
        const newAttributes = [...char.layers.attributes]
        newAttributes[index] = attribute
        
        return {
          ...char,
          layers: {
            ...char.layers,
            attributes: newAttributes,
          },
        }
      }),
    }))

    // Mark editor as modified (Requirement 1.4)
    markAsModified()
  },

  removeLayerAttribute: (characterId, index) => {
    set((state) => ({
      characters: state.characters.map((char) => {
        if (char.id !== characterId || !char.layers) return char
        
        const newAttributes = char.layers.attributes.filter((_, i) => i !== index)
        
        // If no attributes left, remove layers entirely
        if (newAttributes.length === 0) {
          return { ...char, layers: undefined }
        }
        
        return {
          ...char,
          layers: {
            ...char.layers,
            attributes: newAttributes,
          },
        }
      }),
    }))

    // Mark editor as modified (Requirement 1.4)
    markAsModified()
  },

  // Extract characters from AST (define statements with Character())
  extractCharactersFromAST: (ast) => {
    const characters: Character[] = []

    const processNode = (node: ASTNode) => {
      if (node.type === 'define') {
        const defineNode = node as DefineNode
        // Check if value looks like a Character() call
        if (defineNode.value.startsWith('Character(')) {
          const parsed = parseCharacterValue(defineNode.value)
          if (parsed) {
            characters.push({
              id: generateCharacterId(),
              name: defineNode.name,
              displayName: parsed.displayName || defineNode.name,
              color: parsed.color,
              imagePrefix: parsed.imagePrefix,
              kind: parsed.kind,
            })
          }
        }
      }
    }

    // Process top-level statements
    for (const statement of ast.statements) {
      processNode(statement)
    }

    set({ characters })
  },

  // Generate DefineNode array for all characters
  generateCharacterNodes: () => {
    const { characters } = get()
    return characters.map((char) => {
      const value = generateCharacterValue({
        name: char.name,
        displayName: char.displayName,
        color: char.color || '#ffffff',
        imagePrefix: char.imagePrefix || '',
        kind: char.kind || '',
      })
      return createDefineNode(char.name, value)
    })
  },
}))

/**
 * Get character by name (variable name)
 */
export function getCharacterByName(name: string): Character | undefined {
  return useCharacterStore.getState().characters.find((c) => c.name === name)
}

/**
 * Get all character names for autocomplete
 */
export function getCharacterNames(): string[] {
  return useCharacterStore.getState().characters.map((c) => c.name)
}
