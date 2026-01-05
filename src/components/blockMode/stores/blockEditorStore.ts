/**
 * Block Editor Store
 * 积木编辑器状态管理
 * 
 * Manages the state for the block mode editor including:
 * - Current label being edited
 * - Block tree structure
 * - Selection state
 * - Clipboard for copy/paste
 * - Validation errors
 * - Playback state
 * - Collapsed blocks state
 * 
 * Requirements: 8.6, 12.1-12.6
 */

import { create } from 'zustand'
import {
  Block,
  BlockClipboard,
  ValidationError,
  PlaybackState,
  GameState,
} from '../types'

/**
 * Initial game state for playback
 */
const initialGameState: GameState = {
  background: undefined,
  characters: [],
  dialogue: undefined,
  music: undefined,
  transition: undefined,
}

/**
 * Initial playback state
 */
const initialPlaybackState: PlaybackState = {
  isPlaying: false,
  currentBlockId: null,
  gameState: initialGameState,
}

/**
 * Block Editor State Interface
 */
export interface BlockEditorState {
  /** Current label being edited */
  currentLabel: string | null
  /** Block tree root */
  blockTree: Block | null
  /** Currently selected block ID */
  selectedBlockId: string | null
  /** Clipboard for copy/paste operations */
  clipboard: BlockClipboard | null
  /** Validation errors */
  validationErrors: ValidationError[]
  /** Playback state */
  playback: PlaybackState
  /** Set of collapsed block IDs */
  collapsedBlocks: Set<string>
  /** Whether the editor is in read-only mode */
  readOnly: boolean
}

/**
 * Block Editor Actions Interface
 */
export interface BlockEditorActions {
  // Label management
  /** Set the current label being edited */
  setCurrentLabel: (label: string | null) => void
  /** Clear the current label and reset state */
  clearCurrentLabel: () => void

  // Block tree management
  /** Set the block tree */
  setBlockTree: (tree: Block | null) => void
  /** Update a specific block in the tree */
  updateBlock: (blockId: string, updates: Partial<Block>) => void

  // Selection management
  /** Set the selected block ID */
  setSelectedBlockId: (blockId: string | null) => void
  /** Clear selection */
  clearSelection: () => void

  // Clipboard management
  /** Set clipboard content */
  setClipboard: (clipboard: BlockClipboard | null) => void
  /** Clear clipboard */
  clearClipboard: () => void

  // Validation management
  /** Set validation errors */
  setValidationErrors: (errors: ValidationError[]) => void
  /** Clear validation errors */
  clearValidationErrors: () => void
  /** Add a validation error */
  addValidationError: (error: ValidationError) => void
  /** Remove validation errors for a specific block */
  removeBlockErrors: (blockId: string) => void

  // Playback management
  /** Start playback */
  startPlayback: (startBlockId?: string) => void
  /** Stop playback */
  stopPlayback: () => void
  /** Pause playback */
  pausePlayback: () => void
  /** Resume playback */
  resumePlayback: () => void
  /** Set current playback block */
  setPlaybackBlock: (blockId: string | null) => void
  /** Update game state during playback */
  updateGameState: (state: Partial<GameState>) => void
  /** Step to next block */
  stepNext: () => void
  /** Step to previous block */
  stepPrevious: () => void

  // Collapse management
  /** Toggle block collapsed state */
  toggleBlockCollapsed: (blockId: string) => void
  /** Set block collapsed state */
  setBlockCollapsed: (blockId: string, collapsed: boolean) => void
  /** Collapse all blocks */
  collapseAll: () => void
  /** Expand all blocks */
  expandAll: () => void
  /** Check if a block is collapsed */
  isBlockCollapsed: (blockId: string) => boolean

  // Read-only mode
  /** Set read-only mode */
  setReadOnly: (readOnly: boolean) => void

  // Reset
  /** Reset the entire store to initial state */
  reset: () => void
}

/**
 * Combined store type
 */
export type BlockEditorStore = BlockEditorState & BlockEditorActions

/**
 * Initial state
 */
const initialState: BlockEditorState = {
  currentLabel: null,
  blockTree: null,
  selectedBlockId: null,
  clipboard: null,
  validationErrors: [],
  playback: initialPlaybackState,
  collapsedBlocks: new Set<string>(),
  readOnly: false,
}

/**
 * Helper function to find a block by ID in the tree
 */
function findBlockById(root: Block | null, blockId: string): Block | null {
  if (!root) return null
  if (root.id === blockId) return root
  
  if (root.children) {
    for (const child of root.children) {
      const found = findBlockById(child, blockId)
      if (found) return found
    }
  }
  
  return null
}

/**
 * Helper function to update a block in the tree (immutably)
 */
function updateBlockInTree(root: Block, blockId: string, updates: Partial<Block>): Block {
  if (root.id === blockId) {
    return { ...root, ...updates }
  }
  
  if (root.children) {
    return {
      ...root,
      children: root.children.map(child => updateBlockInTree(child, blockId, updates)),
    }
  }
  
  return root
}

/**
 * Helper function to collect all block IDs in a tree
 */
function collectAllBlockIds(root: Block | null): string[] {
  if (!root) return []
  
  const ids: string[] = [root.id]
  
  if (root.children) {
    for (const child of root.children) {
      ids.push(...collectAllBlockIds(child))
    }
  }
  
  return ids
}

/**
 * Create the block editor store
 */
export const useBlockEditorStore = create<BlockEditorStore>((set, get) => ({
  // Initial state
  ...initialState,

  // Label management
  setCurrentLabel: (label) => {
    set({ currentLabel: label })
  },

  clearCurrentLabel: () => {
    set({
      currentLabel: null,
      blockTree: null,
      selectedBlockId: null,
      validationErrors: [],
      playback: initialPlaybackState,
    })
  },

  // Block tree management
  setBlockTree: (tree) => {
    set({ blockTree: tree })
  },

  updateBlock: (blockId, updates) => {
    const { blockTree } = get()
    if (!blockTree) return

    const updatedTree = updateBlockInTree(blockTree, blockId, updates)
    set({ blockTree: updatedTree })
  },

  // Selection management
  setSelectedBlockId: (blockId) => {
    set({ selectedBlockId: blockId })
  },

  clearSelection: () => {
    set({ selectedBlockId: null })
  },

  // Clipboard management
  setClipboard: (clipboard) => {
    set({ clipboard })
  },

  clearClipboard: () => {
    set({ clipboard: null })
  },

  // Validation management
  setValidationErrors: (errors) => {
    set({ validationErrors: errors })
  },

  clearValidationErrors: () => {
    set({ validationErrors: [] })
  },

  addValidationError: (error) => {
    set((state) => ({
      validationErrors: [...state.validationErrors, error],
    }))
  },

  removeBlockErrors: (blockId) => {
    set((state) => ({
      validationErrors: state.validationErrors.filter(e => e.blockId !== blockId),
    }))
  },

  // Playback management
  startPlayback: (startBlockId) => {
    const { blockTree, selectedBlockId } = get()
    const startId = startBlockId || selectedBlockId || (blockTree?.children?.[0]?.id ?? null)
    
    set({
      playback: {
        isPlaying: true,
        currentBlockId: startId,
        gameState: initialGameState,
      },
    })
  },

  stopPlayback: () => {
    set({
      playback: initialPlaybackState,
    })
  },

  pausePlayback: () => {
    set((state) => ({
      playback: {
        ...state.playback,
        isPlaying: false,
      },
    }))
  },

  resumePlayback: () => {
    set((state) => ({
      playback: {
        ...state.playback,
        isPlaying: true,
      },
    }))
  },

  setPlaybackBlock: (blockId) => {
    set((state) => ({
      playback: {
        ...state.playback,
        currentBlockId: blockId,
      },
    }))
  },

  updateGameState: (stateUpdates) => {
    set((state) => ({
      playback: {
        ...state.playback,
        gameState: {
          ...state.playback.gameState,
          ...stateUpdates,
        },
      },
    }))
  },

  stepNext: () => {
    const { blockTree, playback } = get()
    if (!blockTree || !playback.currentBlockId) return

    // Find current block and get next sibling or parent's next
    const currentBlock = findBlockById(blockTree, playback.currentBlockId)
    if (!currentBlock) return

    // Simple implementation: find next block in flattened order
    const allIds = collectAllBlockIds(blockTree)
    const currentIndex = allIds.indexOf(playback.currentBlockId)
    
    if (currentIndex >= 0 && currentIndex < allIds.length - 1) {
      set((state) => ({
        playback: {
          ...state.playback,
          currentBlockId: allIds[currentIndex + 1],
        },
      }))
    }
  },

  stepPrevious: () => {
    const { blockTree, playback } = get()
    if (!blockTree || !playback.currentBlockId) return

    const allIds = collectAllBlockIds(blockTree)
    const currentIndex = allIds.indexOf(playback.currentBlockId)
    
    if (currentIndex > 0) {
      set((state) => ({
        playback: {
          ...state.playback,
          currentBlockId: allIds[currentIndex - 1],
        },
      }))
    }
  },

  // Collapse management
  toggleBlockCollapsed: (blockId) => {
    set((state) => {
      const newCollapsed = new Set(state.collapsedBlocks)
      if (newCollapsed.has(blockId)) {
        newCollapsed.delete(blockId)
      } else {
        newCollapsed.add(blockId)
      }
      return { collapsedBlocks: newCollapsed }
    })
  },

  setBlockCollapsed: (blockId, collapsed) => {
    set((state) => {
      const newCollapsed = new Set(state.collapsedBlocks)
      if (collapsed) {
        newCollapsed.add(blockId)
      } else {
        newCollapsed.delete(blockId)
      }
      return { collapsedBlocks: newCollapsed }
    })
  },

  collapseAll: () => {
    const { blockTree } = get()
    if (!blockTree) return

    const allIds = collectAllBlockIds(blockTree)
    set({ collapsedBlocks: new Set(allIds) })
  },

  expandAll: () => {
    set({ collapsedBlocks: new Set() })
  },

  isBlockCollapsed: (blockId) => {
    return get().collapsedBlocks.has(blockId)
  },

  // Read-only mode
  setReadOnly: (readOnly) => {
    set({ readOnly })
  },

  // Reset
  reset: () => {
    set(initialState)
  },
}))

/**
 * Selector hooks for common state access patterns
 */

/** Get current label */
export const useCurrentLabel = () => useBlockEditorStore((state) => state.currentLabel)

/** Get block tree */
export const useBlockTree = () => useBlockEditorStore((state) => state.blockTree)

/** Get selected block ID */
export const useSelectedBlockId = () => useBlockEditorStore((state) => state.selectedBlockId)

/** Get selected block */
export const useSelectedBlock = () => {
  const blockTree = useBlockEditorStore((state) => state.blockTree)
  const selectedBlockId = useBlockEditorStore((state) => state.selectedBlockId)
  
  if (!blockTree || !selectedBlockId) return null
  return findBlockById(blockTree, selectedBlockId)
}

/** Get clipboard */
export const useClipboard = () => useBlockEditorStore((state) => state.clipboard)

/** Get validation errors */
export const useValidationErrors = () => useBlockEditorStore((state) => state.validationErrors)

/** Get validation errors for a specific block */
export const useBlockErrors = (blockId: string) => {
  const errors = useBlockEditorStore((state) => state.validationErrors)
  return errors.filter(e => e.blockId === blockId)
}

/** Get playback state */
export const usePlaybackState = () => useBlockEditorStore((state) => state.playback)

/** Check if playing */
export const useIsPlaying = () => useBlockEditorStore((state) => state.playback.isPlaying)

/** Get current playback block ID */
export const useCurrentPlaybackBlockId = () => useBlockEditorStore((state) => state.playback.currentBlockId)

/** Get game state */
export const useGameState = () => useBlockEditorStore((state) => state.playback.gameState)

/** Check if a block is collapsed */
export const useIsBlockCollapsed = (blockId: string) => {
  return useBlockEditorStore((state) => state.collapsedBlocks.has(blockId))
}

/** Get read-only state */
export const useIsReadOnly = () => useBlockEditorStore((state) => state.readOnly)

/** Get error count */
export const useErrorCount = () => useBlockEditorStore((state) => state.validationErrors.length)

/** Get error count by type */
export const useErrorCountByType = () => {
  const errors = useBlockEditorStore((state) => state.validationErrors)
  
  return errors.reduce((acc, error) => {
    acc[error.type] = (acc[error.type] || 0) + 1
    return acc
  }, {} as Record<ValidationError['type'], number>)
}

export default useBlockEditorStore
