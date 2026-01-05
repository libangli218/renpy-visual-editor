/**
 * BlockModeEditor Component
 * 积木模式编辑器主组件
 * 
 * Main editor component for block mode editing. Provides a three-column layout:
 * - Left: BlockPalette for selecting blocks
 * - Center: LabelContainer for editing blocks
 * - Right: PreviewPanel for real-time preview (placeholder for now)
 * 
 * Bottom toolbar includes:
 * - Back button to return to flow mode
 * - Playback controls
 * - Current label name display
 * 
 * Requirements: 1.1, 2.1, 9.5
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { Block, BlockType, ValidationContext } from './types'
import { BlockPalette } from './blocks/BlockPalette'
import { LabelContainer } from './LabelContainer'
import { DragDropProvider } from './DragDropContext'
import { SnapIndicator } from './SnapIndicator'
import { DragPreview } from './DragPreview'
import { Breadcrumb } from './Breadcrumb'
import { useBlockEditorStore } from './stores/blockEditorStore'
import { BlockOperationHandler as BlockOperationHandlerType, createBlockOperationHandler } from './BlockOperationHandler'
import { BlockTreeBuilder as BlockTreeBuilderType, createBlockTreeBuilder } from './BlockTreeBuilder'
import { BlockValidator as BlockValidatorType, createBlockValidator } from './BlockValidator'
import { BaseBlock } from './blocks/BaseBlock'
import { RenpyScript, LabelNode } from '../../types/ast'
import './BlockModeEditor.css'

/**
 * Props for BlockModeEditor component
 */
export interface BlockModeEditorProps {
  /** The label name to edit */
  labelName: string
  /** The AST containing the label */
  ast: RenpyScript
  /** Callback when returning to flow mode */
  onBack?: () => void
  /** Callback when AST is modified */
  onAstChange?: (ast: RenpyScript) => void
  /** Available labels for jump/call targets */
  availableLabels?: string[]
  /** Available characters */
  availableCharacters?: string[]
  /** Available image resources */
  availableImages?: string[]
  /** Available audio resources */
  availableAudio?: string[]
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Custom class name */
  className?: string
}

/**
 * BlockModeEditor - Main block mode editor component
 * 
 * Implements Requirements:
 * - 1.1: Display block palette with all available block types
 * - 2.1: Display Label container when editing a Label
 * - 9.5: Display current label name and breadcrumb navigation
 */
export const BlockModeEditor: React.FC<BlockModeEditorProps> = ({
  labelName,
  ast,
  onBack,
  onAstChange,
  availableLabels = [],
  availableCharacters = [],
  availableImages = [],
  availableAudio = [],
  readOnly = false,
  className = '',
}) => {
  // Store state and actions
  const {
    blockTree,
    selectedBlockId,
    validationErrors,
    playback,
    setCurrentLabel,
    setBlockTree,
    setSelectedBlockId,
    setValidationErrors,
    startPlayback,
    stopPlayback,
    pausePlayback,
    stepNext,
    stepPrevious,
    setReadOnly,
  } = useBlockEditorStore()

  // Create handlers
  const blockTreeBuilder = useMemo(() => createBlockTreeBuilder(), [])
  const blockOperationHandler = useMemo(() => createBlockOperationHandler(), [])
  const blockValidator = useMemo(() => createBlockValidator(), [])

  // Validation context
  const validationContext: ValidationContext = useMemo(() => ({
    availableLabels,
    availableCharacters,
    availableImages,
    availableAudio,
  }), [availableLabels, availableCharacters, availableImages, availableAudio])

  // Initialize editor when label changes
  useEffect(() => {
    setCurrentLabel(labelName)
    setReadOnly(readOnly)

    // Find the label in AST and build block tree
    const labelNode = ast.statements.find(
      s => s.type === 'label' && (s as LabelNode).name === labelName
    ) as LabelNode | undefined

    if (labelNode) {
      const tree = blockTreeBuilder.buildFromLabel(labelNode)
      setBlockTree(tree)

      // Validate the tree
      const errors = blockValidator.validateTree(tree, validationContext)
      setValidationErrors(errors)
    }
  }, [labelName, ast, readOnly, blockTreeBuilder, blockValidator, validationContext, setCurrentLabel, setBlockTree, setValidationErrors, setReadOnly])

  // Handle block click
  const handleBlockClick = useCallback((blockId: string) => {
    setSelectedBlockId(blockId)
  }, [setSelectedBlockId])

  // Handle block double-click (for editing)
  const handleBlockDoubleClick = useCallback((blockId: string) => {
    setSelectedBlockId(blockId)
    // Could open inline editor or property panel
  }, [setSelectedBlockId])

  // Handle adding a new block from palette
  const handlePaletteDrop = useCallback((blockType: BlockType, containerId: string, index: number) => {
    if (readOnly || !blockTree) return

    const result = blockOperationHandler.addBlock(blockType, containerId, index, {
      blockTree,
      ast,
      labelName,
    })

    if (result.success && result.blockTree) {
      setBlockTree(result.blockTree)
      if (result.blockId) {
        setSelectedBlockId(result.blockId)
      }
      
      // Notify parent of AST change
      if (result.ast && onAstChange) {
        onAstChange(result.ast)
      }

      // Re-validate
      const errors = blockValidator.validateTree(result.blockTree, validationContext)
      setValidationErrors(errors)
    }
  }, [readOnly, blockTree, ast, labelName, blockOperationHandler, blockValidator, validationContext, setBlockTree, setSelectedBlockId, setValidationErrors, onAstChange])

  // Handle moving an existing block
  const handleBlockMove = useCallback((blockId: string, newParentId: string, newIndex: number) => {
    if (readOnly || !blockTree) return

    const result = blockOperationHandler.moveBlock(blockId, newParentId, newIndex, {
      blockTree,
      ast,
      labelName,
    })

    if (result.success && result.blockTree) {
      setBlockTree(result.blockTree)
      
      // Notify parent of AST change
      if (result.ast && onAstChange) {
        onAstChange(result.ast)
      }

      // Re-validate
      const errors = blockValidator.validateTree(result.blockTree, validationContext)
      setValidationErrors(errors)
    }
  }, [readOnly, blockTree, ast, labelName, blockOperationHandler, blockValidator, validationContext, setBlockTree, setValidationErrors, onAstChange])

  // Handle invalid drop
  const handleInvalidDrop = useCallback((blockId: string) => {
    // Block returns to original position automatically via DragDropContext
    console.log('Invalid drop for block:', blockId)
  }, [])

  // Handle back button click
  const handleBack = useCallback(() => {
    stopPlayback()
    onBack?.()
  }, [stopPlayback, onBack])

  // Handle play button click
  const handlePlay = useCallback(() => {
    if (playback.isPlaying) {
      pausePlayback()
    } else {
      startPlayback()
    }
  }, [playback.isPlaying, startPlayback, pausePlayback])

  // Handle stop button click
  const handleStop = useCallback(() => {
    stopPlayback()
  }, [stopPlayback])

  // Render a block with its children
  const renderBlock = useCallback((block: Block, _index: number): React.ReactNode => {
    const isSelected = block.id === selectedBlockId
    const isPlaybackCurrent = block.id === playback.currentBlockId
    const blockErrors = validationErrors.filter(e => e.blockId === block.id)
    const hasError = blockErrors.length > 0
    const errorMessage = blockErrors.map(e => e.message).join('; ')

    return (
      <BaseBlock
        key={block.id}
        block={block}
        selected={isSelected || isPlaybackCurrent}
        hasError={hasError}
        errorMessage={errorMessage}
        onClick={() => handleBlockClick(block.id)}
        onDoubleClick={() => handleBlockDoubleClick(block.id)}
        draggable={!readOnly}
        className={isPlaybackCurrent ? 'playback-current' : ''}
      >
        {/* Render children recursively */}
        {block.children?.map((childBlock: Block, childIndex: number) => 
          renderBlock(childBlock, childIndex)
        )}
      </BaseBlock>
    )
  }, [selectedBlockId, playback.currentBlockId, validationErrors, readOnly, handleBlockClick, handleBlockDoubleClick])

  // Error count for display
  const errorCount = validationErrors.length

  return (
    <DragDropProvider
      onPaletteDrop={handlePaletteDrop}
      onBlockMove={handleBlockMove}
      onInvalidDrop={handleInvalidDrop}
      blockTree={blockTree}
    >
      <div className={`block-mode-editor ${className}`}>
        {/* Main Content Area */}
        <div className="block-mode-editor-content">
          {/* Left Panel: Block Palette */}
          <div className="block-mode-editor-palette">
            <BlockPalette
              onDragStart={() => {}}
              onDragEnd={() => {}}
            />
          </div>

          {/* Center Panel: Label Container */}
          <div className="block-mode-editor-canvas">
            {blockTree ? (
              <LabelContainer
                block={blockTree}
                labelName={labelName}
                onBlockClick={handleBlockClick}
                onBlockDoubleClick={handleBlockDoubleClick}
                renderBlock={renderBlock}
                readOnly={readOnly}
                selectedBlockId={selectedBlockId}
              />
            ) : (
              <div className="block-mode-editor-loading">
                <span className="loading-icon">⏳</span>
                <span className="loading-text">加载中...</span>
              </div>
            )}
            
            {/* Snap Indicator */}
            <SnapIndicator />
          </div>

          {/* Right Panel: Preview (Placeholder) */}
          <div className="block-mode-editor-preview">
            <div className="preview-panel-placeholder">
              <div className="preview-header">
                <span className="preview-icon">👁️</span>
                <span className="preview-title">预览</span>
              </div>
              <div className="preview-content">
                <p className="preview-placeholder-text">
                  选择一个积木查看预览效果
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Toolbar */}
        <div className="block-mode-editor-toolbar">
          {/* Left: Back Button */}
          <div className="toolbar-left">
            <button
              className="toolbar-button toolbar-back-button"
              onClick={handleBack}
              title="返回流程图模式"
            >
              <span className="button-icon">◀</span>
              <span className="button-text">返回</span>
            </button>
          </div>

          {/* Center: Playback Controls */}
          <div className="toolbar-center">
            <button
              className="toolbar-button toolbar-step-button"
              onClick={stepPrevious}
              disabled={!playback.currentBlockId}
              title="上一步"
            >
              <span className="button-icon">⏮</span>
            </button>
            
            <button
              className={`toolbar-button toolbar-play-button ${playback.isPlaying ? 'playing' : ''}`}
              onClick={handlePlay}
              title={playback.isPlaying ? '暂停' : '播放'}
            >
              <span className="button-icon">{playback.isPlaying ? '⏸' : '▶'}</span>
            </button>
            
            <button
              className="toolbar-button toolbar-stop-button"
              onClick={handleStop}
              disabled={!playback.isPlaying && !playback.currentBlockId}
              title="停止"
            >
              <span className="button-icon">⏹</span>
            </button>
            
            <button
              className="toolbar-button toolbar-step-button"
              onClick={stepNext}
              disabled={!playback.currentBlockId}
              title="下一步"
            >
              <span className="button-icon">⏭</span>
            </button>
          </div>

          {/* Right: Breadcrumb & Error Count */}
          <div className="toolbar-right">
            {errorCount > 0 && (
              <span className="toolbar-error-badge" title={`${errorCount} 个错误`}>
                <span className="error-icon">⚠️</span>
                <span className="error-count">{errorCount}</span>
              </span>
            )}
            <Breadcrumb
              labelName={labelName}
              onNavigateToFlow={handleBack}
              className="compact"
            />
          </div>
        </div>

        {/* Drag Preview */}
        <DragPreview />
      </div>
    </DragDropProvider>
  )
}

export default BlockModeEditor
