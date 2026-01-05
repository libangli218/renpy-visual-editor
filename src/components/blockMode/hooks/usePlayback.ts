/**
 * usePlayback Hook
 * 播放控制 Hook
 * 
 * Manages playback state and auto-play logic for block sequence execution.
 * 
 * Features:
 * - Play/pause/stop controls
 * - Auto-advance through blocks
 * - Step forward/backward navigation
 * - Menu block pause handling
 * - Game state calculation during playback
 * 
 * Requirements: 12.2, 12.3, 12.5
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Block, GameState, BlockType } from '../types'
import { PreviewStateCalculator } from '../PreviewStateCalculator'

/**
 * Playback speed options (ms per block)
 */
export type PlaybackSpeed = 'slow' | 'normal' | 'fast'

const PLAYBACK_SPEEDS: Record<PlaybackSpeed, number> = {
  slow: 2000,
  normal: 1000,
  fast: 500,
}

/**
 * Options for usePlayback hook
 */
export interface UsePlaybackOptions {
  /** Block tree to play through */
  blockTree: Block | null
  /** Initial block ID to start from */
  initialBlockId?: string | null
  /** Playback speed */
  speed?: PlaybackSpeed
  /** Callback when playback state changes */
  onPlaybackChange?: (isPlaying: boolean) => void
  /** Callback when current block changes */
  onBlockChange?: (blockId: string | null) => void
  /** Callback when game state updates */
  onGameStateChange?: (state: GameState) => void
  /** Callback when menu block is encountered */
  onMenuEncountered?: (menuBlockId: string) => void
  /** Whether to auto-pause on menu blocks */
  pauseOnMenu?: boolean
}

/**
 * Return type for usePlayback hook
 */
export interface UsePlaybackReturn {
  /** Whether playback is currently active */
  isPlaying: boolean
  /** Whether playback is paused (vs stopped) */
  isPaused: boolean
  /** Current block ID being played */
  currentBlockId: string | null
  /** Current game state */
  gameState: GameState
  /** Current playback speed */
  speed: PlaybackSpeed
  /** Start or resume playback */
  play: () => void
  /** Pause playback */
  pause: () => void
  /** Stop playback and reset */
  stop: () => void
  /** Toggle play/pause */
  togglePlayPause: () => void
  /** Step to next block */
  stepForward: () => void
  /** Step to previous block */
  stepBackward: () => void
  /** Jump to specific block */
  jumpToBlock: (blockId: string) => void
  /** Set playback speed */
  setSpeed: (speed: PlaybackSpeed) => void
  /** Select a menu choice and continue */
  selectMenuChoice: (choiceIndex: number) => void
  /** Whether currently waiting for menu selection */
  isWaitingForMenu: boolean
  /** Current menu block if waiting */
  currentMenuBlock: Block | null
}

/**
 * Helper function to flatten blocks for linear traversal
 */
function flattenBlocks(blocks: Block[]): Block[] {
  const result: Block[] = []
  for (const block of blocks) {
    result.push(block)
    if (block.children && block.children.length > 0) {
      result.push(...flattenBlocks(block.children))
    }
  }
  return result
}

/**
 * Helper function to find a block by ID
 */
function findBlockById(blocks: Block[], blockId: string): Block | null {
  for (const block of blocks) {
    if (block.id === blockId) return block
    if (block.children) {
      const found = findBlockById(block.children, blockId)
      if (found) return found
    }
  }
  return null
}

/**
 * Block types that should pause playback
 */
const PAUSE_BLOCK_TYPES: BlockType[] = ['menu']

/**
 * usePlayback - Hook for managing block playback
 * 
 * Implements Requirements:
 * - 12.2: Start playback from selected block and execute sequentially
 * - 12.3: Highlight current executing block
 * - 12.5: Pause on menu blocks and wait for user selection
 */
export function usePlayback(options: UsePlaybackOptions): UsePlaybackReturn {
  const {
    blockTree,
    initialBlockId = null,
    speed: initialSpeed = 'normal',
    onPlaybackChange,
    onBlockChange,
    onGameStateChange,
    onMenuEncountered,
    pauseOnMenu = true,
  } = options

  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(initialBlockId)
  const [gameState, setGameState] = useState<GameState>({ characters: [] })
  const [speed, setSpeed] = useState<PlaybackSpeed>(initialSpeed)
  const [isWaitingForMenu, setIsWaitingForMenu] = useState(false)
  const [currentMenuBlock, setCurrentMenuBlock] = useState<Block | null>(null)

  // Refs for interval management
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stateCalculatorRef = useRef<PreviewStateCalculator>(new PreviewStateCalculator())

  // Get flattened blocks for navigation
  const flatBlocks = blockTree?.children ? flattenBlocks(blockTree.children) : []

  // Clear playback interval
  const clearPlaybackInterval = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
      playbackIntervalRef.current = null
    }
  }, [])

  // Calculate game state for current block
  const calculateGameState = useCallback((blockId: string | null) => {
    if (!blockTree?.children || !blockId) {
      return { characters: [] }
    }
    return stateCalculatorRef.current.calculateState(blockTree.children, blockId)
  }, [blockTree])

  // Update current block and game state
  const updateCurrentBlock = useCallback((blockId: string | null) => {
    setCurrentBlockId(blockId)
    onBlockChange?.(blockId)

    if (blockId) {
      const newState = calculateGameState(blockId)
      setGameState(newState)
      onGameStateChange?.(newState)
    }
  }, [calculateGameState, onBlockChange, onGameStateChange])

  // Get next block ID
  const getNextBlockId = useCallback((currentId: string | null): string | null => {
    if (!currentId || flatBlocks.length === 0) {
      return flatBlocks[0]?.id ?? null
    }

    const currentIndex = flatBlocks.findIndex(b => b.id === currentId)
    if (currentIndex === -1 || currentIndex >= flatBlocks.length - 1) {
      return null
    }

    return flatBlocks[currentIndex + 1].id
  }, [flatBlocks])

  // Get previous block ID
  const getPreviousBlockId = useCallback((currentId: string | null): string | null => {
    if (!currentId || flatBlocks.length === 0) {
      return null
    }

    const currentIndex = flatBlocks.findIndex(b => b.id === currentId)
    if (currentIndex <= 0) {
      return null
    }

    return flatBlocks[currentIndex - 1].id
  }, [flatBlocks])

  // Check if block should pause playback
  const shouldPauseOnBlock = useCallback((blockId: string): boolean => {
    if (!pauseOnMenu) return false
    
    const block = findBlockById(flatBlocks, blockId)
    if (!block) return false

    return PAUSE_BLOCK_TYPES.includes(block.type)
  }, [flatBlocks, pauseOnMenu])

  // Advance to next block
  const advanceToNextBlock = useCallback(() => {
    const nextId = getNextBlockId(currentBlockId)
    
    if (!nextId) {
      // End of sequence
      clearPlaybackInterval()
      setIsPlaying(false)
      setIsPaused(false)
      onPlaybackChange?.(false)
      return
    }

    // Check if we should pause on this block
    if (shouldPauseOnBlock(nextId)) {
      const menuBlock = findBlockById(flatBlocks, nextId)
      setCurrentMenuBlock(menuBlock)
      setIsWaitingForMenu(true)
      clearPlaybackInterval()
      setIsPlaying(false)
      setIsPaused(true)
      onMenuEncountered?.(nextId)
    }

    updateCurrentBlock(nextId)
  }, [currentBlockId, getNextBlockId, shouldPauseOnBlock, flatBlocks, clearPlaybackInterval, updateCurrentBlock, onPlaybackChange, onMenuEncountered])

  // Start playback
  const play = useCallback(() => {
    if (flatBlocks.length === 0) return

    // If waiting for menu, don't start
    if (isWaitingForMenu) return

    // If no current block, start from beginning
    if (!currentBlockId) {
      updateCurrentBlock(flatBlocks[0].id)
    }

    setIsPlaying(true)
    setIsPaused(false)
    onPlaybackChange?.(true)

    // Start auto-advance interval
    clearPlaybackInterval()
    playbackIntervalRef.current = setInterval(() => {
      advanceToNextBlock()
    }, PLAYBACK_SPEEDS[speed])
  }, [flatBlocks, currentBlockId, isWaitingForMenu, speed, clearPlaybackInterval, updateCurrentBlock, advanceToNextBlock, onPlaybackChange])

  // Pause playback
  const pause = useCallback(() => {
    clearPlaybackInterval()
    setIsPlaying(false)
    setIsPaused(true)
    onPlaybackChange?.(false)
  }, [clearPlaybackInterval, onPlaybackChange])

  // Stop playback
  const stop = useCallback(() => {
    clearPlaybackInterval()
    setIsPlaying(false)
    setIsPaused(false)
    setIsWaitingForMenu(false)
    setCurrentMenuBlock(null)
    setCurrentBlockId(null)
    setGameState({ characters: [] })
    onPlaybackChange?.(false)
    onBlockChange?.(null)
  }, [clearPlaybackInterval, onPlaybackChange, onBlockChange])

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  // Step forward
  const stepForward = useCallback(() => {
    // Clear auto-play if active
    clearPlaybackInterval()
    setIsPlaying(false)
    
    const nextId = getNextBlockId(currentBlockId)
    if (nextId) {
      // Check for menu block
      if (shouldPauseOnBlock(nextId)) {
        const menuBlock = findBlockById(flatBlocks, nextId)
        setCurrentMenuBlock(menuBlock)
        setIsWaitingForMenu(true)
        onMenuEncountered?.(nextId)
      }
      updateCurrentBlock(nextId)
    }
  }, [currentBlockId, getNextBlockId, shouldPauseOnBlock, flatBlocks, clearPlaybackInterval, updateCurrentBlock, onMenuEncountered])

  // Step backward
  const stepBackward = useCallback(() => {
    // Clear auto-play if active
    clearPlaybackInterval()
    setIsPlaying(false)
    setIsWaitingForMenu(false)
    setCurrentMenuBlock(null)
    
    const prevId = getPreviousBlockId(currentBlockId)
    if (prevId) {
      updateCurrentBlock(prevId)
    }
  }, [currentBlockId, getPreviousBlockId, clearPlaybackInterval, updateCurrentBlock])

  // Jump to specific block
  const jumpToBlock = useCallback((blockId: string) => {
    clearPlaybackInterval()
    setIsPlaying(false)
    setIsWaitingForMenu(false)
    setCurrentMenuBlock(null)
    updateCurrentBlock(blockId)
  }, [clearPlaybackInterval, updateCurrentBlock])

  // Select menu choice
  const selectMenuChoice = useCallback((choiceIndex: number) => {
    if (!isWaitingForMenu || !currentMenuBlock) return

    // Get the choice block
    const choices = currentMenuBlock.children?.filter(c => c.type === 'choice') ?? []
    const selectedChoice = choices[choiceIndex]

    if (selectedChoice) {
      setIsWaitingForMenu(false)
      setCurrentMenuBlock(null)
      
      // If choice has children, navigate to first child
      if (selectedChoice.children && selectedChoice.children.length > 0) {
        updateCurrentBlock(selectedChoice.children[0].id)
      } else {
        // Otherwise, continue to next block after menu
        const nextId = getNextBlockId(currentMenuBlock.id)
        if (nextId) {
          updateCurrentBlock(nextId)
        }
      }
    }
  }, [isWaitingForMenu, currentMenuBlock, getNextBlockId, updateCurrentBlock])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPlaybackInterval()
    }
  }, [clearPlaybackInterval])

  // Update game state when block tree changes
  useEffect(() => {
    if (currentBlockId && blockTree) {
      const newState = calculateGameState(currentBlockId)
      setGameState(newState)
    }
  }, [blockTree, currentBlockId, calculateGameState])

  // Reset when block tree changes significantly
  useEffect(() => {
    if (!blockTree) {
      stop()
    }
  }, [blockTree, stop])

  return {
    isPlaying,
    isPaused,
    currentBlockId,
    gameState,
    speed,
    play,
    pause,
    stop,
    togglePlayPause,
    stepForward,
    stepBackward,
    jumpToBlock,
    setSpeed,
    selectMenuChoice,
    isWaitingForMenu,
    currentMenuBlock,
  }
}

export default usePlayback
