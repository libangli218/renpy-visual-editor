import React from 'react'
import {
  CallBlock as CallBlockType,
  JumpBlock as JumpBlockType,
  ReturnBlock as ReturnBlockType,
  PauseBlock as PauseBlockType,
  LabelBlock as LabelBlockType,
} from '../types'
import { BlockIcon } from './BlockIcon'

interface CallBlockProps {
  block: CallBlockType
  selected: boolean
  onClick: () => void
}

export const CallBlockComponent: React.FC<CallBlockProps> = ({
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
      <BlockIcon type="call" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Call</span>
        </div>
        <div className="block-meta">
          {block.target}
          {block.arguments && block.arguments.length > 0 && (
            <>({block.arguments.join(', ')})</>
          )}
        </div>
      </div>
    </div>
  )
}

interface JumpBlockProps {
  block: JumpBlockType
  selected: boolean
  onClick: () => void
}

export const JumpBlockComponent: React.FC<JumpBlockProps> = ({
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
      <BlockIcon type="jump" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Jump</span>
        </div>
        <div className="block-meta">{block.target}</div>
      </div>
    </div>
  )
}

interface ReturnBlockProps {
  block: ReturnBlockType
  selected: boolean
  onClick: () => void
}

export const ReturnBlockComponent: React.FC<ReturnBlockProps> = ({
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
      <BlockIcon type="return" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Return</span>
        </div>
        {block.value && <div className="block-meta">{block.value}</div>}
      </div>
    </div>
  )
}

interface PauseBlockProps {
  block: PauseBlockType
  selected: boolean
  onClick: () => void
}

export const PauseBlockComponent: React.FC<PauseBlockProps> = ({
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
      <BlockIcon type="pause" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Pause</span>
        </div>
        <div className="block-meta">
          {block.duration !== undefined ? `${block.duration}s` : 'Wait for click'}
        </div>
      </div>
    </div>
  )
}

interface LabelBlockProps {
  block: LabelBlockType
  selected: boolean
  onClick: () => void
}

export const LabelBlockComponent: React.FC<LabelBlockProps> = ({
  block,
  selected,
  onClick,
}) => {
  return (
    <div
      className={`story-block label-block ${selected ? 'selected' : ''}`}
      onClick={onClick}
      data-testid={`block-${block.id}`}
      role="button"
      tabIndex={0}
      aria-selected={selected}
    >
      <BlockIcon type="label" />
      <div className="block-content">
        <div className="label-name">{block.name}</div>
      </div>
    </div>
  )
}
