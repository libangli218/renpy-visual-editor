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
 * Requirements: 1.1, 2.1, 9.5, 12.1-12.6
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Block, BlockType, ValidationContext, SlotOption } from './types'
import { BlockPalette } from './blocks/BlockPalette'
import { LabelContainer } from './LabelContainer'
import { DragDropProvider } from './DragDropContext'
import { SnapIndicator } from './SnapIndicator'
import { DragPreview } from './DragPreview'
import { Breadcrumb } from './Breadcrumb'
import { PreviewPanel } from './PreviewPanel'
import { PlaybackControls } from './PlaybackControls'
import { MenuChoiceOverlay } from './MenuChoiceOverlay'
import { useBlockEditorStore } from './stores/blockEditorStore'
import { usePlayback } from './hooks/usePlayback'
import { createBlockOperationHandler } from './BlockOperationHandler'
import { createBlockTreeBuilder } from './BlockTreeBuilder'
import { createBlockValidator } from './BlockValidator'
import { BaseBlock } from './blocks/BaseBlock'
import { DialogueBlock } from './blocks/DialogueBlock'
import { SceneBlock } from './blocks/SceneBlock'
import { MenuBlock } from './blocks/MenuBlock'
import { FlowBlock } from './blocks/FlowBlock'
import { AudioBlock } from './blocks/AudioBlock'
import { RenpyScript, LabelNode } from '../../types/ast'
import { ImageTag } from '../../resource/ResourceManager'
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
  /** Image tags for Show block (character images) */
  imageTags?: ImageTag[]
  /** Background tags for Scene block */
  backgroundTags?: ImageTag[]
  /** Project path for resolving resource URLs */
  projectPath?: string | null
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
 * - 12.1-12.6: Playback controls and menu pause functionality
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
  imageTags = [],
  backgroundTags = [],
  projectPath = null,
  readOnly = false,
  className = '',
}) => {
  // Store state and actions
  const {
    blockTree,
    selectedBlockId,
    validationErrors,
    setCurrentLabel,
    setBlockTree,
    setSelectedBlockId,
    setValidationErrors,
    setReadOnly,
    updateGameState,
    setPlaybackBlock,
  } = useBlockEditorStore()

  // State for preview panel width
  const [previewWidth, setPreviewWidth] = useState(300)

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

  // Use playback hook for managing playback state
  // Requirements: 12.2, 12.3, 12.5
  const playback = usePlayback({
    blockTree,
    initialBlockId: selectedBlockId,
    pauseOnMenu: true,
    onBlockChange: (blockId) => {
      setPlaybackBlock(blockId)
    },
    onGameStateChange: (state) => {
      updateGameState(state)
    },
  })

  // Get current label from store to check if we need to reinitialize
  const currentLabel = useBlockEditorStore((state) => state.currentLabel)

  // Initialize editor when label changes
  useEffect(() => {
    // Guard: Only initialize if the label has actually changed
    // This prevents infinite loops from store updates triggering re-renders
    if (currentLabel === labelName && blockTree !== null) {
      return
    }

    // Find the label in AST and build block tree
    const labelNode = ast.statements.find(
      s => s.type === 'label' && (s as LabelNode).name === labelName
    ) as LabelNode | undefined

    if (labelNode) {
      const tree = blockTreeBuilder.buildFromLabel(labelNode)
      setBlockTree(tree)
      setCurrentLabel(labelName)
      setReadOnly(readOnly)

      // Validate the tree
      const errors = blockValidator.validateTree(tree, validationContext)
      setValidationErrors(errors)
    } else {
      console.warn('[BlockModeEditor] Label not found in AST:', labelName)
      // Create an empty label container if label not found
      const emptyTree: Block = {
        id: `label_${labelName}`,
        type: 'label',
        category: 'flow',
        astNodeId: '',
        slots: [],
        children: [],
      }
      setBlockTree(emptyTree)
      setCurrentLabel(labelName)
      setReadOnly(readOnly)
      setValidationErrors([])
    }
  }, [labelName, ast, readOnly, currentLabel, blockTree, blockTreeBuilder, blockValidator, validationContext, setCurrentLabel, setBlockTree, setValidationErrors, setReadOnly])

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

  // Handle slot value change
  const handleSlotChange = useCallback((blockId: string, slotName: string, value: unknown) => {
    if (readOnly || !blockTree) return

    const result = blockOperationHandler.updateSlot(blockId, slotName, value, {
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

  // Build character options for dialogue blocks
  // Build character options for dialogue blocks (from script definitions)
  const characterOptions: SlotOption[] = useMemo(() => {
    return availableCharacters.map(char => ({
      value: char,
      label: char,
    }))
  }, [availableCharacters])

  // Build image tag options for Show blocks (character images from files)
  const imageTagOptions: SlotOption[] = useMemo(() => {
    return imageTags.map(tag => ({
      value: tag.tag,
      label: tag.tag,
      // Include attributes info for display
      description: tag.attributes.length > 0 
        ? `${tag.attributes.length} 个变体` 
        : undefined,
    }))
  }, [imageTags])

  // Build image options for scene blocks (backgrounds)
  const imageOptions: SlotOption[] = useMemo(() => {
    // Use background tags if available, otherwise fall back to availableImages
    if (backgroundTags.length > 0) {
      const options: SlotOption[] = []
      for (const tag of backgroundTags) {
        for (const attrs of tag.attributes) {
          const fullName = `${tag.tag} ${attrs.join(' ')}`
          options.push({
            value: fullName,
            label: fullName,
          })
        }
        // If no attributes, just use the tag
        if (tag.attributes.length === 0) {
          options.push({
            value: tag.tag,
            label: tag.tag,
          })
        }
      }
      return options
    }
    return availableImages.map(img => ({
      value: img,
      label: img.split('/').pop() || img,
    }))
  }, [backgroundTags, availableImages])

  // Build label options for flow blocks
  const labelOptions: SlotOption[] = useMemo(() => {
    return availableLabels.map(label => ({
      value: label,
      label: label,
    }))
  }, [availableLabels])

  // Build audio options for audio blocks
  const audioOptions: SlotOption[] = useMemo(() => {
    return availableAudio.map(audio => ({
      value: audio,
      label: audio.split('/').pop() || audio,
    }))
  }, [availableAudio])

  // Handle back button click
  const handleBack = useCallback(() => {
    playback.stop()
    onBack?.()
  }, [playback, onBack])

  // Handle play/pause button click
  const handlePlayPause = useCallback(() => {
    playback.togglePlayPause()
  }, [playback])

  // Handle stop button click
  const handleStop = useCallback(() => {
    playback.stop()
  }, [playback])

  // Handle step forward
  const handleStepForward = useCallback(() => {
    playback.stepForward()
  }, [playback])

  // Handle step backward
  const handleStepBackward = useCallback(() => {
    playback.stepBackward()
  }, [playback])

  // Handle menu choice selection (Requirement 12.5)
  const handleMenuChoiceSelect = useCallback((choiceIndex: number) => {
    playback.selectMenuChoice(choiceIndex)
  }, [playback])

  // Handle menu dismiss (skip)
  const handleMenuDismiss = useCallback(() => {
    playback.stepForward()
  }, [playback])

  // Get slot errors for a block
  const getSlotErrors = useCallback((blockId: string): Record<string, string> => {
    const errors: Record<string, string> = {}
    for (const error of validationErrors) {
      if (error.blockId === blockId && error.slotName) {
        errors[error.slotName] = error.message
      }
    }
    return errors
  }, [validationErrors])

  // Render a block with its children
  const renderBlock = useCallback((block: Block, _index: number): React.ReactNode => {
    const isSelected = block.id === selectedBlockId
    const isPlaybackCurrent = block.id === playback.currentBlockId
    const isPlaybackWaiting = playback.isWaitingForMenu && block.id === playback.currentMenuBlock?.id
    const blockErrors = validationErrors.filter(e => e.blockId === block.id)
    const hasError = blockErrors.length > 0
    const errorMessage = blockErrors.map(e => e.message).join('; ')
    const slotErrors = getSlotErrors(block.id)

    // Common props for all block types (key is passed separately)
    const commonProps = {
      block,
      selected: isSelected,
      hasError,
      errorMessage,
      isPlaybackCurrent,
      isPlaybackWaiting,
      onClick: () => handleBlockClick(block.id),
      onDoubleClick: () => handleBlockDoubleClick(block.id),
      draggable: !readOnly,
      slotErrors,
      onSlotChange: handleSlotChange,
    }

    // Render children for container blocks (used by BaseBlock)
    const renderChildren = () => (
      block.children?.map((childBlock: Block, childIndex: number) => 
        renderBlock(childBlock, childIndex)
      )
    )

    // Render child block function for nested containers (MenuBlock, FlowBlock)
    const renderChildBlock = (childBlock: Block, depth: number) => 
      renderBlock(childBlock, depth)

    // Render based on block type
    switch (block.type) {
      case 'dialogue':
        return (
          <DialogueBlock
            key={block.id}
            {...commonProps}
            availableCharacters={characterOptions}
          />
        )
      
      case 'scene':
        return (
          <SceneBlock
            key={block.id}
            {...commonProps}
            availableImages={imageOptions}
            availableCharacters={characterOptions}
          />
        )
      
      case 'show':
      case 'hide':
        return (
          <SceneBlock
            key={block.id}
            {...commonProps}
            availableImages={imageTagOptions}
            availableCharacters={imageTagOptions}
            imageTags={imageTags}
          />
        )
      
      case 'with':
        return (
          <SceneBlock
            key={block.id}
            {...commonProps}
            availableImages={imageOptions}
            availableCharacters={characterOptions}
          />
        )
      
      case 'menu':
      case 'choice':
        return (
          <MenuBlock
            key={block.id}
            {...commonProps}
            renderChildBlock={renderChildBlock}
          />
        )
      
      case 'jump':
      case 'call':
      case 'return':
      case 'if':
      case 'elif':
      case 'else':
        return (
          <FlowBlock
            key={block.id}
            {...commonProps}
            availableLabels={labelOptions}
            renderChildBlock={renderChildBlock}
          />
        )
      
      case 'play-music':
      case 'stop-music':
      case 'play-sound':
        return (
          <AudioBlock
            key={block.id}
            {...commonProps}
            availableMusic={audioOptions}
            availableSounds={audioOptions}
          />
        )
      
      default:
        return (
          <BaseBlock
            key={block.id}
            {...commonProps}
          >
            {renderChildren()}
          </BaseBlock>
        )
    }
  }, [selectedBlockId, playback.currentBlockId, playback.isWaitingForMenu, playback.currentMenuBlock, validationErrors, readOnly, handleBlockClick, handleBlockDoubleClick, getSlotErrors, handleSlotChange, characterOptions, imageOptions, labelOptions, audioOptions])

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
                onBlockDrop={(blockType, index) => handlePaletteDrop(blockType as BlockType, blockTree.id, index)}
                onBlockMove={(blockId, index) => handleBlockMove(blockId, blockTree.id, index)}
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

          {/* Right Panel: Preview */}
          <div className="block-mode-editor-preview" style={{ width: previewWidth }}>
            <PreviewPanel
              blockTree={blockTree}
              selectedBlockId={playback.currentBlockId || selectedBlockId}
              gameState={playback.isPlaying || playback.isPaused ? playback.gameState : undefined}
              useCalculatedState={!playback.isPlaying && !playback.isPaused}
              projectPath={projectPath}
              onResize={setPreviewWidth}
              initialWidth={previewWidth}
              minWidth={200}
              maxWidth={500}
            />
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
            <PlaybackControls
              isPlaying={playback.isPlaying}
              currentBlockId={playback.currentBlockId}
              blockTree={blockTree}
              onPlayPause={handlePlayPause}
              onStop={handleStop}
              onStepForward={handleStepForward}
              onStepBackward={handleStepBackward}
              compact={true}
            />
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

        {/* Menu Choice Overlay - Requirement 12.5 */}
        {playback.isWaitingForMenu && playback.currentMenuBlock && (
          <MenuChoiceOverlay
            menuBlock={playback.currentMenuBlock}
            visible={true}
            onSelectChoice={handleMenuChoiceSelect}
            onDismiss={handleMenuDismiss}
          />
        )}
      </div>
    </DragDropProvider>
  )
}

export default BlockModeEditor
