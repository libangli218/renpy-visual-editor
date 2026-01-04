import React from 'react'
import { SceneBlock as SceneBlockType } from '../types'
import { BlockIcon } from './BlockIcon'

interface SceneBlockProps {
  block: SceneBlockType
  selected: boolean
  onClick: () => void
}

export const SceneBlockComponent: React.FC<SceneBlockProps> = ({
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
      <BlockIcon type="scene" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Scene</span>
        </div>
        <div className="block-meta">{block.image}</div>
      </div>
    </div>
  )
}
