/**
 * useResourceImport Hook
 * 
 * Hook for handling resource import with UI dialogs.
 * Implements Requirements:
 * - 3.1, 3.2: Import buttons for Backgrounds and Sprites sections
 * - 3.3, 3.4, 3.10: Import dialog with file picker
 * - 3.5, 3.6, 3.7: File copy and conflict handling
 * - 3.8, 3.9: File name validation
 */

import { useState, useCallback } from 'react'
import {
  importService,
  ImportBatchResult,
  ConflictResolution,
  validateFileName,
} from '../resource/ImportService'
import { useResourceStore } from '../store/resourceStore'

// ============================================================================
// Types
// ============================================================================

/**
 * Import state for UI
 */
export interface ImportState {
  /** Whether import is in progress */
  isImporting: boolean
  /** Current progress (0-100) */
  progress: number
  /** Current file being imported */
  currentFile: string
  /** Total files to import */
  totalFiles: number
  /** Current file index */
  currentIndex: number
  /** Whether conflict dialog is open */
  conflictDialogOpen: boolean
  /** File name for conflict dialog */
  conflictFileName: string
  /** Target path for conflict dialog */
  conflictTargetPath: string
  /** Whether validation warning dialog is open */
  validationDialogOpen: boolean
  /** File name for validation dialog */
  validationFileName: string
  /** Validation warnings */
  validationWarnings: string[]
  /** Suggested file name */
  validationSuggestedName?: string
  /** Whether result dialog is open */
  resultDialogOpen: boolean
  /** Import result */
  result: ImportBatchResult | null
}

/**
 * Import hook return type
 */
export interface UseResourceImportReturn {
  /** Current import state */
  state: ImportState
  /** Start import for backgrounds */
  importBackgrounds: () => Promise<ImportBatchResult | null>
  /** Start import for sprites */
  importSprites: () => Promise<ImportBatchResult | null>
  /** Resolve conflict dialog */
  resolveConflict: (resolution: ConflictResolution) => void
  /** Resolve validation warning dialog */
  resolveValidation: (proceed: boolean) => void
  /** Close result dialog */
  closeResultDialog: () => void
  /** Reset state */
  reset: () => void
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ImportState = {
  isImporting: false,
  progress: 0,
  currentFile: '',
  totalFiles: 0,
  currentIndex: 0,
  conflictDialogOpen: false,
  conflictFileName: '',
  conflictTargetPath: '',
  validationDialogOpen: false,
  validationFileName: '',
  validationWarnings: [],
  validationSuggestedName: undefined,
  resultDialogOpen: false,
  result: null,
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * useResourceImport - Hook for handling resource import
 * 
 * @param projectPath - Current project path
 * @param onImportComplete - Callback when import completes (for refreshing resources)
 */
export function useResourceImport(
  projectPath: string | null,
  onImportComplete?: () => void
): UseResourceImportReturn {
  const [state, setState] = useState<ImportState>(initialState)
  
  // Conflict resolution promise resolver
  const [conflictResolver, setConflictResolver] = useState<{
    resolve: (resolution: ConflictResolution) => void
  } | null>(null)
  
  // Validation resolution promise resolver
  const [validationResolver, setValidationResolver] = useState<{
    resolve: (proceed: boolean) => void
  } | null>(null)
  
  /**
   * Handle conflict resolution
   */
  const handleConflict = useCallback(
    (fileName: string, targetPath: string): Promise<ConflictResolution> => {
      return new Promise((resolve) => {
        setState((prev) => ({
          ...prev,
          conflictDialogOpen: true,
          conflictFileName: fileName,
          conflictTargetPath: targetPath,
        }))
        setConflictResolver({ resolve })
      })
    },
    []
  )
  
  /**
   * Handle validation warning
   */
  const handleValidationWarning = useCallback(
    (fileName: string, warnings: string[]): Promise<boolean> => {
      const validation = validateFileName(fileName)
      
      return new Promise((resolve) => {
        setState((prev) => ({
          ...prev,
          validationDialogOpen: true,
          validationFileName: fileName,
          validationWarnings: warnings,
          validationSuggestedName: validation.suggestedName,
        }))
        setValidationResolver({ resolve })
      })
    },
    []
  )
  
  /**
   * Resolve conflict dialog
   */
  const resolveConflict = useCallback((resolution: ConflictResolution) => {
    if (conflictResolver) {
      conflictResolver.resolve(resolution)
      setConflictResolver(null)
      setState((prev) => ({
        ...prev,
        conflictDialogOpen: false,
        conflictFileName: '',
        conflictTargetPath: '',
      }))
    }
  }, [conflictResolver])
  
  /**
   * Resolve validation warning dialog
   */
  const resolveValidation = useCallback((proceed: boolean) => {
    if (validationResolver) {
      validationResolver.resolve(proceed)
      setValidationResolver(null)
      setState((prev) => ({
        ...prev,
        validationDialogOpen: false,
        validationFileName: '',
        validationWarnings: [],
        validationSuggestedName: undefined,
      }))
    }
  }, [validationResolver])
  
  /**
   * Close result dialog
   */
  const closeResultDialog = useCallback(() => {
    setState((prev) => ({
      ...prev,
      resultDialogOpen: false,
    }))
  }, [])
  
  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState(initialState)
    setConflictResolver(null)
    setValidationResolver(null)
  }, [])
  
  /**
   * Perform import
   */
  const performImport = useCallback(
    async (type: 'backgrounds' | 'sprites'): Promise<ImportBatchResult | null> => {
      if (!projectPath) {
        console.warn('No project path set')
        return null
      }
      
      // Set project path on import service
      importService.setProjectPath(projectPath)
      
      // Open file picker
      const title = type === 'backgrounds' ? '选择背景图像' : '选择立绘图像'
      const files = await importService.selectImages(title)
      
      if (!files || files.length === 0) {
        return null
      }
      
      // Start import
      setState((prev) => ({
        ...prev,
        isImporting: true,
        totalFiles: files.length,
        currentIndex: 0,
        progress: 0,
      }))
      
      // Import files
      const importMethod = type === 'backgrounds'
        ? importService.importBackgrounds.bind(importService)
        : importService.importSprites.bind(importService)
      
      const result = await importMethod(
        files,
        handleConflict,
        handleValidationWarning
      )
      
      // Show result
      setState((prev) => ({
        ...prev,
        isImporting: false,
        progress: 100,
        resultDialogOpen: true,
        result,
      }))
      
      // Trigger global resource refresh (for EditorArea to update block dropdowns)
      useResourceStore.getState().triggerResourceRefresh()
      
      // Trigger refresh callback (for LeftPanel to update resource list)
      if (onImportComplete) {
        onImportComplete()
      }
      
      return result
    },
    [projectPath, handleConflict, handleValidationWarning, onImportComplete]
  )
  
  /**
   * Import backgrounds
   */
  const importBackgrounds = useCallback(
    () => performImport('backgrounds'),
    [performImport]
  )
  
  /**
   * Import sprites
   */
  const importSprites = useCallback(
    () => performImport('sprites'),
    [performImport]
  )
  
  return {
    state,
    importBackgrounds,
    importSprites,
    resolveConflict,
    resolveValidation,
    closeResultDialog,
    reset,
  }
}

export default useResourceImport
