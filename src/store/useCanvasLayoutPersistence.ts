/**
 * Canvas Layout Persistence Hook
 * 画布布局持久化 Hook
 * 
 * Custom hook that integrates canvas layout persistence with the drag flow.
 * Uses debounce to avoid frequent writes during drag operations.
 * 
 * Requirements: 4.1
 */

import { useCallback, useEffect, useRef } from 'react'
import { useCanvasLayoutStore, Point, CanvasTransform } from './canvasLayoutStore'
import {
  loadCanvasLayout,
  saveCanvasLayout,
  positionsRecordToMap,
  CanvasLayoutFileSystem,
  electronCanvasLayoutFileSystem,
} from './canvasLayoutPersistence'

/**
 * Debounce delay in milliseconds
 * Prevents frequent writes during drag operations
 */
const SAVE_DEBOUNCE_MS = 500

/**
 * Options for the persistence hook
 */
export interface UseCanvasLayoutPersistenceOptions {
  /** Project path for loading/saving */
  projectPath: string | null
  /** File system interface (for testing) */
  fileSystem?: CanvasLayoutFileSystem
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number
  /** Whether to auto-save on position changes */
  autoSave?: boolean
  /** Whether to save transform state */
  saveTransform?: boolean
}

/**
 * Return type for the persistence hook
 */
export interface UseCanvasLayoutPersistenceReturn {
  /** Load positions from config file */
  load: () => Promise<void>
  /** Save positions to config file (debounced) */
  save: () => void
  /** Save positions immediately (no debounce) */
  saveImmediate: () => Promise<void>
  /** Whether currently loading */
  isLoading: boolean
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Last error message */
  error: string | null
}

/**
 * Simple debounce implementation
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): { call: (...args: Parameters<T>) => void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  return {
    call: (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        fn(...args)
        timeoutId = null
      }, delay)
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    },
  }
}

/**
 * Hook for managing canvas layout persistence
 * 
 * Provides load/save functionality with debouncing for drag operations.
 * Automatically saves when positions change if autoSave is enabled.
 * 
 * @param options - Configuration options
 * @returns Persistence control functions and state
 * 
 * Requirements: 4.1
 */
export function useCanvasLayoutPersistence(
  options: UseCanvasLayoutPersistenceOptions
): UseCanvasLayoutPersistenceReturn {
  const {
    projectPath,
    fileSystem = electronCanvasLayoutFileSystem,
    debounceMs = SAVE_DEBOUNCE_MS,
    autoSave = true,
    saveTransform = true,
  } = options

  // State refs
  const isLoadingRef = useRef(false)
  const hasUnsavedChangesRef = useRef(false)
  const errorRef = useRef<string | null>(null)
  const lastSavedPositionsRef = useRef<string>('')

  // Store state
  const labelPositions = useCanvasLayoutStore((state) => state.labelPositions)
  const transform = useCanvasLayoutStore((state) => state.transform)
  const setLabelPositions = useCanvasLayoutStore((state) => state.setLabelPositions)
  const setTransform = useCanvasLayoutStore((state) => state.setTransform)

  /**
   * Save positions immediately (no debounce)
   */
  const saveImmediate = useCallback(async () => {
    if (!projectPath) {
      return
    }

    try {
      errorRef.current = null
      await saveCanvasLayout(
        projectPath,
        labelPositions,
        saveTransform ? transform : undefined,
        fileSystem
      )
      hasUnsavedChangesRef.current = false
      lastSavedPositionsRef.current = JSON.stringify(Array.from(labelPositions.entries()))
    } catch (error) {
      errorRef.current = error instanceof Error ? error.message : String(error)
      console.error('Failed to save canvas layout:', error)
    }
  }, [projectPath, labelPositions, transform, saveTransform, fileSystem])

  /**
   * Create debounced save function
   */
  const debouncedSaveRef = useRef(debounce(saveImmediate, debounceMs))

  // Update debounced function when dependencies change
  useEffect(() => {
    debouncedSaveRef.current = debounce(saveImmediate, debounceMs)
    return () => {
      debouncedSaveRef.current.cancel()
    }
  }, [saveImmediate, debounceMs])

  /**
   * Save positions with debounce
   */
  const save = useCallback(() => {
    if (!projectPath) {
      return
    }
    hasUnsavedChangesRef.current = true
    debouncedSaveRef.current.call()
  }, [projectPath])

  /**
   * Load positions from config file
   */
  const load = useCallback(async () => {
    if (!projectPath) {
      return
    }

    isLoadingRef.current = true
    errorRef.current = null

    try {
      const config = await loadCanvasLayout(projectPath, fileSystem)
      
      if (config) {
        // Load positions
        const positions = positionsRecordToMap(config.positions)
        setLabelPositions(positions)
        lastSavedPositionsRef.current = JSON.stringify(Array.from(positions.entries()))

        // Load transform if available
        if (config.lastTransform) {
          setTransform(config.lastTransform)
        }
      }
      
      hasUnsavedChangesRef.current = false
    } catch (error) {
      errorRef.current = error instanceof Error ? error.message : String(error)
      console.error('Failed to load canvas layout:', error)
    } finally {
      isLoadingRef.current = false
    }
  }, [projectPath, fileSystem, setLabelPositions, setTransform])

  /**
   * Auto-save when positions change
   */
  useEffect(() => {
    if (!autoSave || !projectPath) {
      return
    }

    // Check if positions actually changed
    const currentPositions = JSON.stringify(Array.from(labelPositions.entries()))
    if (currentPositions !== lastSavedPositionsRef.current) {
      save()
    }
  }, [labelPositions, autoSave, projectPath, save])

  /**
   * Save on unmount if there are unsaved changes
   */
  useEffect(() => {
    return () => {
      if (hasUnsavedChangesRef.current && projectPath) {
        // Cancel debounced save and save immediately
        debouncedSaveRef.current.cancel()
        // Note: This is a best-effort save on unmount
        // In a real app, you might want to handle this differently
        saveCanvasLayout(
          projectPath,
          labelPositions,
          saveTransform ? transform : undefined,
          fileSystem
        ).catch(console.error)
      }
    }
  }, [projectPath, labelPositions, transform, saveTransform, fileSystem])

  return {
    load,
    save,
    saveImmediate,
    isLoading: isLoadingRef.current,
    hasUnsavedChanges: hasUnsavedChangesRef.current,
    error: errorRef.current,
  }
}

/**
 * Standalone function to trigger save after drag end
 * Can be used without the hook for simpler integration
 * 
 * @param projectPath - Project path
 * @param positions - Current label positions
 * @param transform - Optional transform state
 * @param fs - File system interface
 */
export async function saveOnDragEnd(
  projectPath: string,
  positions: Map<string, Point>,
  transform?: CanvasTransform,
  fs: CanvasLayoutFileSystem = electronCanvasLayoutFileSystem
): Promise<void> {
  try {
    await saveCanvasLayout(projectPath, positions, transform, fs)
  } catch (error) {
    console.error('Failed to save canvas layout on drag end:', error)
  }
}

/**
 * Create a debounced save function for use outside React
 * 
 * @param projectPath - Project path
 * @param fs - File system interface
 * @param debounceMs - Debounce delay
 * @returns Debounced save function
 */
export function createDebouncedSave(
  projectPath: string,
  fs: CanvasLayoutFileSystem = electronCanvasLayoutFileSystem,
  debounceMs: number = SAVE_DEBOUNCE_MS
): {
  save: (positions: Map<string, Point>, transform?: CanvasTransform) => void
  saveImmediate: (positions: Map<string, Point>, transform?: CanvasTransform) => Promise<void>
  cancel: () => void
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let pendingPositions: Map<string, Point> | null = null
  let pendingTransform: CanvasTransform | undefined

  const saveImmediate = async (
    positions: Map<string, Point>,
    transform?: CanvasTransform
  ) => {
    await saveCanvasLayout(projectPath, positions, transform, fs)
  }

  const save = (positions: Map<string, Point>, transform?: CanvasTransform) => {
    pendingPositions = positions
    pendingTransform = transform

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(async () => {
      if (pendingPositions) {
        try {
          await saveCanvasLayout(projectPath, pendingPositions, pendingTransform, fs)
        } catch (error) {
          console.error('Failed to save canvas layout:', error)
        }
      }
      timeoutId = null
      pendingPositions = null
      pendingTransform = undefined
    }, debounceMs)
  }

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    pendingPositions = null
    pendingTransform = undefined
  }

  return { save, saveImmediate, cancel }
}
