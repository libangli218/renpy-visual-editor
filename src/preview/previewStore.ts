/**
 * Preview Store - Zustand store for preview state management
 * Implements Requirements 4.2, 4.7
 */

import { create } from 'zustand'
import { PreviewState, createDefaultPreviewState } from './types'
import { PreviewEngine, getPreviewEngine } from './PreviewEngine'
import { RenpyScript } from '../types/ast'

export interface PreviewStore extends PreviewState {
  // Engine reference
  engine: PreviewEngine
  
  // Actions
  buildFromAST: (ast: RenpyScript | null) => void
  goToStep: (index: number) => void
  stepForward: () => void
  stepBackward: () => void
  goToNode: (nodeId: string) => void
  play: () => void
  pause: () => void
  setPlaybackSpeed: (speed: number) => void
  reset: () => void
}

export const usePreviewStore = create<PreviewStore>((set, get) => {
  const engine = getPreviewEngine()
  
  return {
    // Initial state
    ...createDefaultPreviewState(),
    engine,
    
    // Build preview steps from AST
    buildFromAST: (ast: RenpyScript | null) => {
      const steps = engine.buildSteps(ast)
      const state = steps.length > 0 
        ? engine.computeStateAtStep(0)
        : createDefaultPreviewState()
      
      set({
        ...state,
        totalSteps: steps.length,
        currentIndex: 0,
        isPlaying: false,
      })
    },
    
    // Go to a specific step
    goToStep: (index: number) => {
      const { totalSteps } = get()
      if (index < 0 || index >= totalSteps) return
      
      const state = engine.computeStateAtStep(index)
      set({
        ...state,
        isPlaying: get().isPlaying,
        playbackSpeed: get().playbackSpeed,
      })
    },
    
    // Step forward
    stepForward: () => {
      const { currentIndex, totalSteps } = get()
      if (currentIndex < totalSteps - 1) {
        get().goToStep(currentIndex + 1)
      } else {
        // Stop playing at end
        set({ isPlaying: false })
      }
    },
    
    // Step backward
    stepBackward: () => {
      const { currentIndex } = get()
      if (currentIndex > 0) {
        get().goToStep(currentIndex - 1)
      }
    },
    
    // Go to a specific node
    goToNode: (nodeId: string) => {
      const stepIndex = engine.findStepForNode(nodeId)
      if (stepIndex !== -1) {
        get().goToStep(stepIndex)
      }
    },
    
    // Start auto-play
    play: () => {
      set({ isPlaying: true })
    },
    
    // Pause auto-play
    pause: () => {
      set({ isPlaying: false })
    },
    
    // Set playback speed
    setPlaybackSpeed: (speed: number) => {
      set({ playbackSpeed: speed })
    },
    
    // Reset to initial state
    reset: () => {
      set(createDefaultPreviewState())
    },
  }
})
