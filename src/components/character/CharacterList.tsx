/**
 * CharacterList Component
 * 
 * Displays the list of defined characters in the left panel.
 * Figma-style design with colored indicators.
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
      <button
        className="character-add-btn"
        onClick={onAdd}
        title="添加角色"
        aria-label="添加角色"
      >
        + 添加角色
      </button>

      {characters.length === 0 ? (
        <div className="character-list-empty">
          <p>暂无角色</p>
        </div>
      ) : (
        <ul className="character-items" role="listbox" aria-label="角色列表">
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
                title={`删除 ${character.displayName || character.name}`}
                aria-label={`删除 ${character.displayName || character.name}`}
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
