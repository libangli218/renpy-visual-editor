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
import { markAsModified } from '../../store/editorStore'

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

    set((state) => ({
      characters: [...state.characters, newCharacter],
      dialogOpen: false,
      editingCharacter: null,
    }))

    // Mark editor as modified (Requirement 1.4)
    markAsModified()

    return newCharacter
  },

  updateCharacter: (id, data) => {
    set((state) => ({
      characters: state.characters.map((char) =>
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
      ),
      dialogOpen: false,
      editingCharacter: null,
    }))

    // Mark editor as modified (Requirement 1.4)
    markAsModified()
  },

  deleteCharacter: (id) => {
    set((state) => ({
      characters: state.characters.filter((char) => char.id !== id),
      selectedCharacterId:
        state.selectedCharacterId === id ? null : state.selectedCharacterId,
    }))

    // Mark editor as modified (Requirement 1.4)
    markAsModified()
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
