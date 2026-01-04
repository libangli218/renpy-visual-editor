import React from 'react'
import {
  PlayMusicBlock as PlayMusicBlockType,
  PlaySoundBlock as PlaySoundBlockType,
  VoiceBlock as VoiceBlockType,
  StopAudioBlock as StopAudioBlockType,
} from '../types'
import { BlockIcon } from './BlockIcon'

interface PlayMusicBlockProps {
  block: PlayMusicBlockType
  selected: boolean
  onClick: () => void
}

export const PlayMusicBlockComponent: React.FC<PlayMusicBlockProps> = ({
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
      <BlockIcon type="play_music" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Play Music</span>
        </div>
        <div className="block-meta">
          {block.file}
          {block.fadeIn && <> (fade in: {block.fadeIn}s)</>}
          {block.loop && <> [loop]</>}
        </div>
      </div>
    </div>
  )
}

interface PlaySoundBlockProps {
  block: PlaySoundBlockType
  selected: boolean
  onClick: () => void
}

export const PlaySoundBlockComponent: React.FC<PlaySoundBlockProps> = ({
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
      <BlockIcon type="play_sound" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Play Sound</span>
        </div>
        <div className="block-meta">{block.file}</div>
      </div>
    </div>
  )
}

interface VoiceBlockProps {
  block: VoiceBlockType
  selected: boolean
  onClick: () => void
}

export const VoiceBlockComponent: React.FC<VoiceBlockProps> = ({
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
      <BlockIcon type="voice" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Voice</span>
        </div>
        <div className="block-meta">{block.file}</div>
      </div>
    </div>
  )
}

interface StopAudioBlockProps {
  block: StopAudioBlockType
  selected: boolean
  onClick: () => void
}

export const StopAudioBlockComponent: React.FC<StopAudioBlockProps> = ({
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
      <BlockIcon type="stop_audio" />
      <div className="block-content">
        <div className="block-header">
          <span className="block-type-label">Stop {block.channel}</span>
        </div>
        {block.fadeOut && <div className="block-meta">fade out: {block.fadeOut}s</div>}
      </div>
    </div>
  )
}
