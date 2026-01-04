import React from 'react'
import {
  PythonBlock as PythonBlockType,
  IfBlock as IfBlockType,
  SetBlock as SetBlockType,
  RawBlock as RawBlockType,
} from '../types'
import { BlockIcon } from './BlockIcon'

interface PythonBlockProps {
  block: PythonBlockType
  selected: boolean
  onClick: () => void
}

export const PythonBlockComponent: React.FC<PythonBlockProps> = ({
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
      <BlockIcon type="python" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Python</span>
        </div>
        <pre className="python-code">{block.code}</pre>
      </div>
    </div>
  )
}

interface IfBlockProps {
  block: IfBlockType
  selected: boolean
  onClick: () => void
}

export const IfBlockComponent: React.FC<IfBlockProps> = ({
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
      <BlockIcon type="if" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">If</span>
        </div>
        <div className="block-meta">{block.condition}</div>
      </div>
    </div>
  )
}

interface SetBlockProps {
  block: SetBlockType
  selected: boolean
  onClick: () => void
}

export const SetBlockComponent: React.FC<SetBlockProps> = ({
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
      <BlockIcon type="set" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Set Variable</span>
        </div>
        <div className="block-meta">
          {block.variable} = {block.value}
        </div>
      </div>
    </div>
  )
}

interface RawBlockProps {
  block: RawBlockType
  selected: boolean
  onClick: () => void
}

export const RawBlockComponent: React.FC<RawBlockProps> = ({
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
      <BlockIcon type="raw" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Raw Code</span>
        </div>
        <pre className="raw-content">{block.content}</pre>
      </div>
    </div>
  )
}
