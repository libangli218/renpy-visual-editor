import React from 'react'
import { NVLBlock as NVLBlockType, NVLClearBlock as NVLClearBlockType } from '../types'
import { BlockIcon } from './BlockIcon'

interface NVLBlockProps {
  block: NVLBlockType
  selected: boolean
  onClick: () => void
}

export const NVLBlockComponent: React.FC<NVLBlockProps> = ({
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
      <BlockIcon type="nvl" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">NVL Mode</span>
        </div>
        <div className="block-meta">{block.action}</div>
      </div>
    </div>
  )
}

interface NVLClearBlockProps {
  block: NVLClearBlockType
  selected: boolean
  onClick: () => void
}

export const NVLClearBlockComponent: React.FC<NVLClearBlockProps> = ({
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
      <BlockIcon type="nvl_clear" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">NVL Clear</span>
        </div>
        <div className="block-meta">Clear NVL text</div>
      </div>
    </div>
  )
}
