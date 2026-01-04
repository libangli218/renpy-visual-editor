/**
 * PreviewPanel component - Scene preview area
 * Implements Requirements 4.1, 4.2, 4.3, 4.7: Real-time scene preview
 * 
 * Features:
 * - Background image display (4.1)
 * - Character sprites with positioning (4.1)
 * - Dialogue box ADV/NVL mode (4.3)
 * - Preview sync with selection (4.2)
 * - Step controls previous/next/play (4.7)
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { usePreviewStore } from '../../preview/previewStore'
import { SceneRenderer } from '../preview/SceneRenderer'
import { CharacterRenderer } from '../preview/CharacterRenderer'
import { DialogueRenderer } from '../preview/DialogueRenderer'

export const PreviewPanel: React.FC = () => {
  const { ast, selectedNodeId, selectedBlockId, projectPath } = useEditorStore()
  const {
    scene,
    characters,
    dialogue,
    nvlMode,
    nvlHistory,
    currentIndex,
    totalSteps,
    isPlaying,
    playbackSpeed,
    currentMusic,
    currentSound,
    buildFromAST,
    goToNode,
    stepForward,
    stepBackward,
    play,
    pause,
  } = usePreviewStore()
  
  // Auto-play interval ref
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Build preview steps when AST changes
  useEffect(() => {
    buildFromAST(ast)
  }, [ast, buildFromAST])
  
  // Sync preview with selected node/block
  useEffect(() => {
    const nodeId = selectedNodeId || selectedBlockId
    if (nodeId) {
      goToNode(nodeId)
    }
  }, [selectedNodeId, selectedBlockId, goToNode])
  
  // Handle auto-play
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        stepForward()
      }, playbackSpeed)
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [isPlaying, playbackSpeed, stepForward])
  
  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])
  
  // Handle character click (for future expression switcher)
  const handleCharacterClick = useCallback((name: string) => {
    // TODO: Implement quick expression switcher (Requirement 4.4)
    console.log('Character clicked:', name)
  }, [])
  
  return (
    <div className="preview-panel" aria-label="Scene preview">
      <div className="preview-viewport">
        {/* Scene background */}
        <SceneRenderer 
          scene={scene} 
          projectPath={projectPath}
        />
        
        {/* Character layer */}
        <CharacterRenderer
          characters={characters}
          projectPath={projectPath}
          onCharacterClick={handleCharacterClick}
        />
        
        {/* Dialogue box */}
        <DialogueRenderer
          dialogue={dialogue}
          nvlMode={nvlMode}
          nvlHistory={nvlHistory}
        />
        
        {/* Audio indicator */}
        {(currentMusic || currentSound) && (
          <div className="audio-indicator">
            {currentMusic && (
              <div className="audio-item">
                <span className="audio-icon">🎵</span>
                <span className="audio-name">{currentMusic}</span>
              </div>
            )}
            {currentSound && (
              <div className="audio-item">
                <span className="audio-icon">🔊</span>
                <span className="audio-name">{currentSound}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Preview controls */}
      <div className="preview-controls">
        <button 
          className="preview-control-btn" 
          title="Previous step (←)"
          aria-label="Previous step"
          onClick={stepBackward}
          disabled={currentIndex <= 0}
        >
          ⏮️
        </button>
        
        <button 
          className="preview-control-btn" 
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          aria-label={isPlaying ? "Pause preview" : "Play preview"}
          onClick={handlePlayPause}
          disabled={totalSteps === 0}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <button 
          className="preview-control-btn" 
          title="Next step (→)"
          aria-label="Next step"
          onClick={stepForward}
          disabled={currentIndex >= totalSteps - 1}
        >
          ⏭️
        </button>
        
        {/* Step indicator */}
        <div className="preview-step-indicator">
          <span className="step-current">{currentIndex + 1}</span>
          <span className="step-separator">/</span>
          <span className="step-total">{totalSteps}</span>
        </div>
      </div>
    </div>
  )
}
