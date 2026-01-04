import React from 'react'
import { ShowBlock as ShowBlockType, HideBlock as HideBlockType } from '../types'
import { BlockIcon } from './BlockIcon'

interface ShowBlockProps {
  block: ShowBlockType
  selected: boolean
  onClick: () => void
}

export const ShowBlockComponent: React.FC<ShowBlockProps> = ({
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
      <BlockIcon type="show" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Show</span>
        </div>
        <div className="block-meta">
          {block.image}
          {block.attributes && block.attributes.length > 0 && (
            <> {block.attributes.join(' ')}</>
          )}
          {block.position && <> at {block.position}</>}
        </div>
      </div>
    </div>
  )
}

interface HideBlockProps {
  block: HideBlockType
  selected: boolean
  onClick: () => void
}

export const HideBlockComponent: React.FC<HideBlockProps> = ({
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
      <BlockIcon type="hide" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Hide</span>
        </div>
        <div className="block-meta">{block.image}</div>
      </div>
    </div>
  )
}
