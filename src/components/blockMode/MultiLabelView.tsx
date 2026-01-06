/**
 * MultiLabelView Component
 * 多 Label 视图主组件
 * 
 * Main view component that displays all labels in a grid/list layout.
 * Replaces the flow chart mode with a unified multi-label editing interface.
 * 
 * Requirements: 1.1, 1.2, 1.4, 6.1, 6.3, 6.4
 */

import React, { useCallback, useMemo } from 'react'
import { LabelCard } from './LabelCard'
import { MultiLabelToolbar } from './MultiLabelToolbar'
import { BlockPalette } from './blocks/BlockPalette'
import { DragPreview } from './DragPreview'
import { useMultiLabelViewStore } from './stores/multiLabelViewStore'
import { useBlockEditorStore } from './stores/blockEditorStore'
import { createBlockOperationHandler } from './BlockOperationHandler'
import { createBlockTreeBuilder } from './BlockTreeBuilder'
import { BaseBlock } from './blocks/BaseBlock'
import { DialogueBlock } from './blocks/DialogueBlock'
import { SceneBlock } from './blocks/SceneBlock'
import { MenuBlock } from './blocks/MenuBlock'
import { FlowBlock } from './blocks/FlowBlock'
import { AudioBlock } from './blocks/AudioBlock'
import { RenpyScript, LabelNode } from '../../types/ast'
import { Block, BlockType, SlotOption } from './types'
import { ImageTag } from '../../resource/ResourceManager'
import './MultiLabelView.css'

/**
 * Props for MultiLabelView component
 */
export interface MultiLabelViewProps {
  /** AST containing all labels */
  ast: RenpyScript
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
  /** Image tags for Show block */
  imageTags?: ImageTag[]
  /** Background tags for Scene block */
  backgroundTags?: ImageTag[]
  /** Project path */
  projectPath?: string | null
  /** Whether read-only */
  readOnly?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Label data with block tree
 */
interface LabelData {
  name: string
  node: LabelNode
  blockTree: Block
}

/**
 * MultiLabelView - Main multi-label view component
 * 
 * Implements Requirements:
 * - 1.1: Display all labels from AST
 * - 1.2: Grid layout for label cards
 * - 1.4: Reuse LabelContainer component
 * - 6.1: Search and filter labels
 * - 6.3: Show "no results" message
 * - 6.4: Show all labels when search is cleared
 */
export const MultiLabelView: React.FC<MultiLabelViewProps> = ({
  ast,
  onAstChange,
  availableLabels = [],
  availableCharacters = [],
  availableImages = [],
  availableAudio = [],
  imageTags = [],
  backgroundTags = [],
  readOnly = false,
  className = '',
}) => {
  // Multi-label view store
  const {
    collapsedLabels,
    searchQuery,
    layoutMode,
    selectedLabel,
    toggleLabelCollapsed,
    setSearchQuery,
    setLayoutMode,
    collapseAll,
    expandAll,
    setSelectedLabel,
  } = useMultiLabelViewStore()

  // Block editor store for validation
  const { validationErrors } = useBlockEditorStore()

  // Create handlers
  const blockTreeBuilder = useMemo(() => createBlockTreeBuilder(), [])
  const blockOperationHandler = useMemo(() => createBlockOperationHandler(), [])

  // Extract all labels from AST and build block trees
  const labelDataList: LabelData[] = useMemo(() => {
    if (!ast?.statements) return []

    return ast.statements
      .filter((s): s is LabelNode => s.type === 'label')
      .map(labelNode => ({
        name: labelNode.name,
        node: labelNode,
        blockTree: blockTreeBuilder.buildFromLabel(labelNode),
      }))
  }, [ast, blockTreeBuilder])

  // Filter labels based on search query
  const filteredLabels = useMemo(() => {
    if (!searchQuery.trim()) {
      return labelDataList
    }

    const query = searchQuery.toLowerCase().trim()
    return labelDataList.filter(label => 
      label.name.toLowerCase().includes(query)
    )
  }, [labelDataList, searchQuery])

  // Get all label names for collapse all
  const allLabelNames = useMemo(() => 
    labelDataList.map(l => l.name),
    [labelDataList]
  )

  // Handle collapse all
  const handleCollapseAll = useCallback(() => {
    collapseAll(allLabelNames)
  }, [collapseAll, allLabelNames])

  // Handle expand all
  const handleExpandAll = useCallback(() => {
    expandAll()
  }, [expandAll])

  // Handle create new label
  const handleCreateLabel = useCallback(() => {
    // The toolbar will handle showing the dialog
    // This callback is called when the user confirms creation
    // For now, we'll create a default label name
    if (!ast || readOnly) return

    // Generate a unique label name
    let labelName = 'new_label'
    let counter = 1
    while (labelDataList.some(l => l.name === labelName)) {
      labelName = `new_label_${counter}`
      counter++
    }

    // Create new label node
    const newLabelNode: LabelNode = {
      id: `label_${labelName}_${Date.now()}`,
      type: 'label',
      name: labelName,
      body: [],
    }

    // Add to AST
    const newAst: RenpyScript = {
      ...ast,
      statements: [...ast.statements, newLabelNode],
    }

    onAstChange?.(newAst)
  }, [ast, readOnly, labelDataList, onAstChange])

  // Handle delete label
  const handleDeleteLabel = useCallback((labelName: string) => {
    if (!ast || readOnly) return

    // Remove label from AST
    const newStatements = ast.statements.filter(s => 
      !(s.type === 'label' && (s as LabelNode).name === labelName)
    )

    const newAst: RenpyScript = {
      ...ast,
      statements: newStatements,
    }

    onAstChange?.(newAst)
  }, [ast, readOnly, onAstChange])

  // Handle label card click
  const handleLabelClick = useCallback((labelName: string) => {
    setSelectedLabel(labelName)
  }, [setSelectedLabel])

  // Handle block click within a label
  const handleBlockClick = useCallback((_blockId: string) => {
    // Could be used for selection
  }, [])

  // Handle block double click
  const handleBlockDoubleClick = useCallback((_blockId: string) => {
    // Could be used for editing
  }, [])

  // Handle slot change
  const handleSlotChange = useCallback((
    labelName: string,
    blockTree: Block,
    blockId: string,
    slotName: string,
    value: unknown
  ) => {
    if (readOnly || !ast) return

    const result = blockOperationHandler.updateSlot(blockId, slotName, value, {
      blockTree,
      ast,
      labelName,
    })

    if (result.success && result.ast) {
      onAstChange?.(result.ast)
    }
  }, [readOnly, ast, blockOperationHandler, onAstChange])

  // Handle block drop from palette
  const handleBlockDrop = useCallback((
    labelName: string,
    blockTree: Block,
    blockType: string,
    index: number
  ) => {
    if (readOnly || !ast) return

    const result = blockOperationHandler.addBlock(blockType as BlockType, blockTree.id, index, {
      blockTree,
      ast,
      labelName,
    })

    if (result.success && result.ast) {
      onAstChange?.(result.ast)
    }
  }, [readOnly, ast, blockOperationHandler, onAstChange])

  // Handle block reorder within a label
  const handleBlockReorder = useCallback((
    labelName: string,
    blockTree: Block,
    blockId: string,
    newIndex: number
  ) => {
    if (readOnly || !ast) return

    const result = blockOperationHandler.moveBlock(blockId, blockTree.id, newIndex, {
      blockTree,
      ast,
      labelName,
    })

    if (result.success && result.ast) {
      onAstChange?.(result.ast)
    }
  }, [readOnly, ast, blockOperationHandler, onAstChange])

  // Handle block move (from another container)
  const handleBlockMove = useCallback((
    labelName: string,
    blockTree: Block,
    blockId: string,
    index: number
  ) => {
    if (readOnly || !ast) return

    const result = blockOperationHandler.moveBlock(blockId, blockTree.id, index, {
      blockTree,
      ast,
      labelName,
    })

    if (result.success && result.ast) {
      onAstChange?.(result.ast)
    }
  }, [readOnly, ast, blockOperationHandler, onAstChange])

  // Handle delete block
  const handleDeleteBlock = useCallback((
    labelName: string,
    blockTree: Block,
    blockId: string
  ) => {
    if (readOnly || !ast) return

    const result = blockOperationHandler.deleteBlock(blockId, {
      blockTree,
      ast,
      labelName,
    })

    if (result.success && result.ast) {
      onAstChange?.(result.ast)
    }
  }, [readOnly, ast, blockOperationHandler, onAstChange])

  // Build character options
  const characterOptions: SlotOption[] = useMemo(() => {
    return availableCharacters.map(char => ({
      value: char,
      label: char,
    }))
  }, [availableCharacters])

  // Build image tag options
  const imageTagOptions: SlotOption[] = useMemo(() => {
    return imageTags.map(tag => ({
      value: tag.tag,
      label: tag.tag,
    }))
  }, [imageTags])

  // Build image options
  const imageOptions: SlotOption[] = useMemo(() => {
    if (backgroundTags.length > 0) {
      const options: SlotOption[] = []
      for (const tag of backgroundTags) {
        for (const attrs of tag.attributes) {
          const fullName = `${tag.tag} ${attrs.join(' ')}`
          options.push({ value: fullName, label: fullName })
        }
        if (tag.attributes.length === 0) {
          options.push({ value: tag.tag, label: tag.tag })
        }
      }
      return options
    }
    return availableImages.map(img => ({
      value: img,
      label: img.split('/').pop() || img,
    }))
  }, [backgroundTags, availableImages])

  // Build label options
  const labelOptions: SlotOption[] = useMemo(() => {
    return availableLabels.map(label => ({
      value: label,
      label: label,
    }))
  }, [availableLabels])

  // Build audio options
  const audioOptions: SlotOption[] = useMemo(() => {
    return availableAudio.map(audio => ({
      value: audio,
      label: audio.split('/').pop() || audio,
    }))
  }, [availableAudio])

  // Render block function for LabelContainer
  const createRenderBlock = useCallback((labelName: string, blockTree: Block) => {
    return (block: Block, _index: number): React.ReactNode => {
      const isSelected = false // Could track selection per label
      const blockErrors = validationErrors.filter(e => e.blockId === block.id)
      const hasError = blockErrors.length > 0
      const errorMessage = blockErrors.map(e => e.message).join('; ')
      const slotErrors: Record<string, string> = {}
      for (const error of blockErrors) {
        if (error.slotName) {
          slotErrors[error.slotName] = error.message
        }
      }

      const commonProps = {
        block,
        selected: isSelected,
        hasError,
        errorMessage,
        collapsed: false,
        onClick: () => handleBlockClick(block.id),
        onDoubleClick: () => handleBlockDoubleClick(block.id),
        onDelete: !readOnly ? () => handleDeleteBlock(labelName, blockTree, block.id) : undefined,
        draggable: !readOnly,
        slotErrors,
        onSlotChange: (blockId: string, slotName: string, value: unknown) => 
          handleSlotChange(labelName, blockTree, blockId, slotName, value),
      }

      const renderChildBlock = (childBlock: Block, depth: number) =>
        createRenderBlock(labelName, blockTree)(childBlock, depth)

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
            <BaseBlock key={block.id} {...commonProps} />
          )
      }
    }
  }, [
    validationErrors,
    readOnly,
    handleBlockClick,
    handleBlockDoubleClick,
    handleDeleteBlock,
    handleSlotChange,
    characterOptions,
    imageOptions,
    imageTagOptions,
    imageTags,
    labelOptions,
    audioOptions,
  ])

  // Build class names
  const viewClasses = useMemo(() => [
    'multi-label-view',
    `layout-${layoutMode}`,
    className,
  ].filter(Boolean).join(' '), [layoutMode, className])

  return (
    <div className={viewClasses}>
      {/* Toolbar */}
      <MultiLabelToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateLabel={handleCreateLabel}
        layoutMode={layoutMode}
        onLayoutChange={setLayoutMode}
        onCollapseAll={handleCollapseAll}
        onExpandAll={handleExpandAll}
        labelCount={labelDataList.length}
        filteredCount={filteredLabels.length}
        readOnly={readOnly}
      />

      {/* Main Content */}
      <div className="multi-label-view-content">
        {/* Left Panel: Block Palette */}
        <div className="multi-label-view-palette">
          <BlockPalette />
        </div>

        {/* Center Panel: Label Cards Grid */}
        <div className="multi-label-view-canvas">
          {filteredLabels.length === 0 ? (
            /* Empty State */
            <div className="multi-label-view-empty">
              {searchQuery.trim() ? (
                /* No Search Results */
                <>
                  <span className="empty-icon">🔍</span>
                  <p className="empty-text">没有找到匹配的 Label</p>
                  <p className="empty-hint">
                    尝试其他搜索词，或
                    <button 
                      className="empty-link"
                      onClick={() => setSearchQuery('')}
                    >
                      清除搜索
                    </button>
                  </p>
                </>
              ) : (
                /* No Labels */
                <>
                  <span className="empty-icon">📝</span>
                  <p className="empty-text">还没有 Label</p>
                  <p className="empty-hint">
                    点击上方的"新建 Label"按钮创建第一个场景
                  </p>
                </>
              )}
            </div>
          ) : (
            /* Label Cards Grid */
            <div className={`label-cards-grid ${layoutMode}`}>
              {filteredLabels.map(labelData => (
                <LabelCard
                  key={labelData.name}
                  labelName={labelData.name}
                  labelBlock={labelData.blockTree}
                  collapsed={collapsedLabels.has(labelData.name)}
                  onToggleCollapse={() => toggleLabelCollapsed(labelData.name)}
                  onDelete={!readOnly ? () => handleDeleteLabel(labelData.name) : undefined}
                  selected={selectedLabel === labelData.name}
                  onClick={() => handleLabelClick(labelData.name)}
                  containerProps={{
                    onBlockClick: handleBlockClick,
                    onBlockDoubleClick: handleBlockDoubleClick,
                    onBlockDrop: (blockType, index) => 
                      handleBlockDrop(labelData.name, labelData.blockTree, blockType, index),
                    onBlockReorder: (blockId, newIndex) =>
                      handleBlockReorder(labelData.name, labelData.blockTree, blockId, newIndex),
                    onBlockMove: (blockId, index) =>
                      handleBlockMove(labelData.name, labelData.blockTree, blockId, index),
                    renderBlock: createRenderBlock(labelData.name, labelData.blockTree),
                    readOnly,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drag Preview */}
      <DragPreview />
    </div>
  )
}

// Display name for debugging
MultiLabelView.displayName = 'MultiLabelView'

export default MultiLabelView
