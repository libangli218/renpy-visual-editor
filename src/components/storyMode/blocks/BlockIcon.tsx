import React from 'react'
import { BlockType } from '../types'

/**
 * Block icons for each block type
 */
const BLOCK_ICONS: Record<BlockType, string> = {
  scene: '🎬',
  dialogue: '💬',
  narration: '📝',
  show: '👤',
  hide: '👻',
  menu: '📋',
  nvl: '📖',
  nvl_clear: '🧹',
  with: '✨',
  call: '📞',
  jump: '➡️',
  return: '↩️',
  pause: '⏸️',
  play_music: '🎵',
  play_sound: '🔊',
  voice: '🎤',
  stop_audio: '🔇',
  python: '🐍',
  if: '❓',
  set: '📌',
  label: '🏷️',
  raw: '📄',
}

interface BlockIconProps {
  type: BlockType
}

export const BlockIcon: React.FC<BlockIconProps> = ({ type }) => {
  return (
    <div className={`block-icon ${type}`} aria-hidden="true">
      {BLOCK_ICONS[type]}
    </div>
  )
}
