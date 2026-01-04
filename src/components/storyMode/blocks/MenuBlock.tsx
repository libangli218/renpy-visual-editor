import React from 'react'
import { MenuBlock as MenuBlockType } from '../types'
import { BlockIcon } from './BlockIcon'

interface MenuBlockProps {
  block: MenuBlockType
  selected: boolean
  onClick: () => void
}

export const MenuBlockComponent: React.FC<MenuBlockProps> = ({
  block,
  selected,
  onClick,
}) => {
  return (
    <div
      className={`story-block ${selected ? 'selected' : ''}`}
      onClick={onClick}
      data-testid={`block-${block.id}`}
      role="button"
      tabIndex={0}
      aria-selected={selected}
    >
      <BlockIcon type="menu" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Menu</span>
        </div>
        {block.prompt && <div className="block-text">"{block.prompt}"</div>}
        <div className="menu-choices">
          {block.choices.map((choice) => (
            <div key={choice.id} className="menu-choice">
              <span className="menu-choice-bullet">•</span>
              <span>"{choice.text}"</span>
              {choice.condition && (
                <span className="menu-choice-condition">if {choice.condition}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
