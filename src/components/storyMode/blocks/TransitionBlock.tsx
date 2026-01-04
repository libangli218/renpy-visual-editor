import React from 'react'
import { WithBlock as WithBlockType } from '../types'
import { BlockIcon } from './BlockIcon'

interface WithBlockProps {
  block: WithBlockType
  selected: boolean
  onClick: () => void
}

export const WithBlockComponent: React.FC<WithBlockProps> = ({
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
      <BlockIcon type="with" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Transition</span>
        </div>
        <div className="block-meta">{block.transition}</div>
      </div>
    </div>
  )
}
