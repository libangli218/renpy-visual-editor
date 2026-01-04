/**
 * SceneRenderer - Renders the background scene
 * Implements Requirements 4.1: Background image display
 */

import React from 'react'
import './PreviewComponents.css'

interface SceneRendererProps {
  scene: string | null
  projectPath?: string | null
}

/**
 * SceneRenderer component - Displays the background image
 */
export const SceneRenderer: React.FC<SceneRendererProps> = ({ scene, projectPath }) => {
  // Build the image path
  const getImagePath = (): string | null => {
    if (!scene) return null
    
    // If we have a project path, try to build the full path
    if (projectPath) {
      // Ren'Py images are typically in game/images/
      return `file://${projectPath}/game/images/${scene}.png`
    }
    
    // Return the scene name as-is for placeholder display
    return scene
  }
  
  const imagePath = getImagePath()
  
  if (!scene) {
    return (
      <div className="scene-renderer scene-empty">
        <div className="scene-placeholder">
          <span className="scene-placeholder-icon">🎬</span>
          <span className="scene-placeholder-text">No Scene</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="scene-renderer">
      {imagePath && projectPath ? (
        <img 
          src={imagePath}
          alt={`Scene: ${scene}`}
          className="scene-background-image"
          onError={(e) => {
            // If image fails to load, show placeholder
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      ) : null}
      
      {/* Always show scene name overlay for development */}
      <div className="scene-name-overlay">
        <span className="scene-name-label">scene</span>
        <span className="scene-name-value">{scene}</span>
      </div>
      
      {/* Gradient overlay for better text readability */}
      <div className="scene-gradient-overlay" />
    </div>
  )
}
