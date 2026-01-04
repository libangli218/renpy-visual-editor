/**
 * CharacterList Component
 * 
 * Displays the list of defined characters in the left panel.
 * Implements Requirements 7.1: Display all defined characters
 */

import React from 'react'
import { Character } from './types'
import './CharacterList.css'

interface CharacterListProps {
  characters: Character[]
  selectedId: string | null
  onSelect: (character: Character) => void
  onAdd: () => void
  onDelete: (id: string) => void
}

export const CharacterList: React.FC<CharacterListProps> = ({
  characters,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
}) => {
  return (
    <div className="character-list">
      <div className="character-list-header">
        <button
          className="character-add-btn"
          onClick={onAdd}
          title="Add new character"
          aria-label="Add new character"
        >
          + Add Character
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="character-list-empty">
          <p>No characters defined</p>
          <p className="hint">Click "Add Character" to create one</p>
        </div>
      ) : (
        <ul className="character-items" role="listbox" aria-label="Characters">
          {characters.map((character) => (
            <li
              key={character.id}
              className={`character-item ${selectedId === character.id ? 'selected' : ''}`}
              onClick={() => onSelect(character)}
              role="option"
              aria-selected={selectedId === character.id}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelect(character)
                }
              }}
            >
              <div className="character-item-content">
                <span
                  className="character-color-indicator"
                  style={{ backgroundColor: character.color || '#ffffff' }}
                  aria-hidden="true"
                />
                <div className="character-info">
                  <span className="character-display-name">
                    {character.displayName || character.name}
                  </span>
                  <span className="character-var-name">{character.name}</span>
                </div>
              </div>
              <button
                className="character-delete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(character.id)
                }}
                title={`Delete ${character.displayName || character.name}`}
                aria-label={`Delete ${character.displayName || character.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
