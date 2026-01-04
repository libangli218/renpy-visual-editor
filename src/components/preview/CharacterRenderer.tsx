/**
 * CharacterRenderer - Renders character sprites
 * Implements Requirements 4.1: Character sprite display and positioning
 */

import React from 'react'
import { PreviewCharacter } from '../../preview/types'
import './PreviewComponents.css'

interface CharacterRendererProps {
  characters: Map<string, PreviewCharacter>
  projectPath?: string | null
  onCharacterClick?: (name: string) => void
}

/**
 * CharacterRenderer component - Displays all visible characters
 */
export const CharacterRenderer: React.FC<CharacterRendererProps> = ({
  characters,
  projectPath,
  onCharacterClick,
}) => {
  // Convert Map to array for rendering
  const characterList = Array.from(characters.values()).filter(c => c.visible)
  
  if (characterList.length === 0) {
    return null
  }
  
  return (
    <div className="character-renderer">
      {characterList.map((character) => (
        <CharacterSprite
          key={character.name}
          character={character}
          projectPath={projectPath}
          onClick={() => onCharacterClick?.(character.name)}
        />
      ))}
    </div>
  )
}

interface CharacterSpriteProps {
  character: PreviewCharacter
  projectPath?: string | null
  onClick?: () => void
}

/**
 * CharacterSprite - Individual character display
 */
const CharacterSprite: React.FC<CharacterSpriteProps> = ({
  character,
  projectPath,
  onClick,
}) => {
  const { name, attributes, position } = character
  
  // Build the image path
  const getImagePath = (): string | null => {
    if (!projectPath) return null
    
    // Build image name from character name and attributes
    // e.g., "sylvie happy casual" -> "sylvie_happy_casual.png"
    const imageName = [name, ...attributes].join('_')
    return `file://${projectPath}/game/images/${imageName}.png`
  }
  
  const imagePath = getImagePath()
  
  // Calculate position style
  const positionStyle: React.CSSProperties = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: 'translate(-50%, -100%)', // Anchor at bottom center
  }
  
  return (
    <div 
      className="character-sprite"
      style={positionStyle}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Character: ${name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.()
        }
      }}
    >
      {imagePath ? (
        <img
          src={imagePath}
          alt={`${name} ${attributes.join(' ')}`}
          className="character-image"
          onError={(e) => {
            // If image fails to load, hide it
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      ) : null}
      
      {/* Character info overlay */}
      <div className="character-info">
        <span className="character-name">{name}</span>
        {attributes.length > 0 && (
          <span className="character-attributes">
            {attributes.join(' ')}
          </span>
        )}
      </div>
      
      {/* Position indicator */}
      <div className="character-position-indicator">
        <span className="position-dot" />
      </div>
    </div>
  )
}
