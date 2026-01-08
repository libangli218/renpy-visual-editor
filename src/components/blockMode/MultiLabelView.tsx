/**
 * MultiLabelView Component
 * 多 Label 视图主组件
 * 
 * Main view component that displays all labels on a free canvas layout.
 * Supports pan, zoom, drag-and-drop, multi-select, and snap alignment.
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 5.1, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { DraggableLabelCard } from './DraggableLabelCard'
import { FreeCanvas, FreeCanvasHandle } from './FreeCanvas'
import { MiniMap } from './MiniMap'
import { MultiLabelToolbar } from './MultiLabelToolbar'
import { BlockPalette } from './blocks/BlockPalette'
import { DragDropProvider } from './DragDropContext'
import { DragPreview } from './DragPreview'
import { useMultiLabelViewStore } from './stores/multiLabelViewStore'
import { useBlockEditorStore } from './stores/blockEditorStore'
import { useCanvasLayoutStore, Point, Rect, LabelBounds } from '../../store/canvasLayoutStore'
import { useCanvasLayoutPersistence } from '../../store/useCanvasLayoutPersistence'
import { mergeWithAutoLayout, findNonOverlappingPosition, DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT } from '../../store/autoLayout'
import { screenToCanvas } from '../../store/canvasUtils'
import { createBlockOperationHandler, CrossLabelOperationContext } from './BlockOperationHandler'
import { createBlockTreeBuilder } from './BlockTreeBuilder'
import { BaseBlock } from './blocks/BaseBlock'
import { DialogueBlock } from './blocks/DialogueBlock'
import { SceneBlock } from './blocks/SceneBlock'
import { MenuBlock } from './blocks/MenuBlock'
import { FlowBlock } from './blocks/FlowBlock'
import { AudioBlock } from './blocks/AudioBlock'
import { RenpyScript, LabelNode } from '../../types/ast'
import { Block, BlockType, SlotOption, BlockClipboard } from './types'
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
  /** Project path for persistence */
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
 * MultiLabelView - Main multi-label view component with free canvas layout
 * 
 * Implements Requirements:
 * - 1.1: Display all labels from AST on free canvas
 * - 1.2: Drag LabelCard to new position
 * - 1.4: Support infinite canvas
 * - 1.5: Double-click to create new Label
 * - 2.1-2.4: Canvas panning
 * - 3.1-3.5: Canvas zooming
 * - 4.1-4.3: Position persistence
 * - 5.1, 5.3, 5.4: Navigation and fit-all
 * - 6.1-6.5: MiniMap navigation
 * - 7.1-7.4: Snap alignment
 * - 8.1-8.5: Multi-select operations
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
  projectPath = null,
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

  // Canvas layout store
  const {
    transform,
    labelPositions,
    selectedLabels,
    isPanning,
    snapGuides,
    snapDisabled,
    setTransform,
    setLabelPosition,
    setLabelPositions,
    selectLabel,
    selectLabels,
    clearSelection,
    setIsPanning,
    setSnapGuides,
    setSnapDisabled,
    moveSelectedLabels,
  } = useCanvasLayoutStore()

  // Canvas layout persistence
  const { load: loadLayout, save: saveLayout, hasLoadedOnce } = useCanvasLayoutPersistence({
    projectPath,
    autoSave: true,
    saveTransform: true,
  })

  // Block editor store for validation and collapse
  const { 
    validationErrors, 
    collapsedBlocks, 
    toggleBlockCollapsed,
    selectedBlockId,
    setSelectedBlockId,
    clipboard,
    setClipboard,
  } = useBlockEditorStore()

  // Canvas ref for imperative navigation
  const canvasRef = useRef<FreeCanvasHandle>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Track the source label for cross-label drag operations
  const dragSourceLabelRef = useRef<string | null>(null)

  // Track multi-drag initial positions
  const multiDragInitialPositionsRef = useRef<Map<string, Point> | null>(null)

  // State for double-click create label dialog (Jef Raskin: UI consistency)
  const [showCanvasCreateDialog, setShowCanvasCreateDialog] = useState(false)
  const [canvasCreatePosition, setCanvasCreatePosition] = useState<Point | null>(null)
  const [canvasCreateName, setCanvasCreateName] = useState('')
  const [canvasCreateError, setCanvasCreateError] = useState('')

  // State for newly created labels that need inline editing (Don Norman: Progressive Disclosure)
  const [editingLabelName, setEditingLabelName] = useState<string | null>(null)

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

  // Get all label names
  const allLabelNames = useMemo(() => 
    labelDataList.map(l => l.name),
    [labelDataList]
  )

  // Initialize positions for labels that don't have saved positions
  // Only run after persistence has loaded (or if no project path)
  // Requirements: 4.3
  useEffect(() => {
    // Wait for persistence to load first (if project path is set)
    if (projectPath && !hasLoadedOnce) {
      return
    }
    if (labelDataList.length === 0) return

    const labelNames = labelDataList.map(l => l.name)
    const mergedPositions = mergeWithAutoLayout(labelPositions, labelNames)
    
    // Only update if there are new positions (missing labels)
    const missingCount = mergedPositions.size - labelPositions.size
    
    if (missingCount > 0) {
      setLabelPositions(mergedPositions)
    }
  }, [labelDataList, labelPositions, setLabelPositions, projectPath, hasLoadedOnce])

  // Load layout on mount and when project path changes
  useEffect(() => {
    if (projectPath) {
      loadLayout()
    }
  }, [projectPath, loadLayout])

  // Estimate card height based on block count
  // Each block is approximately 80-120px, header is ~50px
  const estimateCardHeight = useCallback((blockCount: number, isCollapsed: boolean): number => {
    if (isCollapsed) {
      return 80 // Collapsed height
    }
    // Header (~50px) + blocks (average ~100px each) + padding (~20px)
    const estimatedHeight = 70 + blockCount * 100
    // Minimum height for empty labels
    return Math.max(150, estimatedHeight)
  }, [])

  // Calculate label bounds for MiniMap and selection
  const labelBounds: LabelBounds[] = useMemo(() => {
    return filteredLabels.map(label => {
      const position = labelPositions.get(label.name) || { x: 0, y: 0 }
      const isCollapsed = collapsedLabels.has(label.name)
      const blockCount = label.blockTree.children?.length ?? 0
      return {
        name: label.name,
        x: position.x,
        y: position.y,
        width: DEFAULT_CARD_WIDTH,
        height: estimateCardHeight(blockCount, isCollapsed),
      }
    })
  }, [filteredLabels, labelPositions, collapsedLabels, estimateCardHeight])

  // Calculate viewport bounds for MiniMap
  const viewportBounds: Rect = useMemo(() => {
    const container = canvasContainerRef.current
    if (!container) {
      return { x: 0, y: 0, width: 1200, height: 800 }
    }
    const rect = container.getBoundingClientRect()
    // Convert viewport to canvas coordinates
    const topLeft = screenToCanvas(0, 0, transform)
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: rect.width / transform.scale,
      height: rect.height / transform.scale,
    }
  }, [transform])

  // Calculate other label rects for snap alignment (excluding the dragging label)
  const getOtherLabelRects = useCallback((excludeLabelName: string): Rect[] => {
    return labelBounds.filter(lb => lb.name !== excludeLabelName)
  }, [labelBounds])

  // Handle collapse all
  const handleCollapseAll = useCallback(() => {
    collapseAll(allLabelNames)
  }, [collapseAll, allLabelNames])

  // Handle expand all
  const handleExpandAll = useCallback(() => {
    expandAll()
  }, [expandAll])

  // Handle zoom reset
  // Requirements: 3.4, 3.5
  const handleResetZoom = useCallback(() => {
    setTransform({
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
      scale: 1.0,
    })
  }, [setTransform, transform])

  // Handle fit all
  // Requirements: 5.3, 5.4
  const handleFitAll = useCallback(() => {
    canvasRef.current?.fitAll()
  }, [])

  // Handle search result selection - navigate to label
  // Requirements: 5.1
  const handleSearchSelect = useCallback((labelName: string) => {
    setSelectedLabel(labelName)
    canvasRef.current?.navigateToLabel(labelName)
  }, [setSelectedLabel])

  // Handle MiniMap navigation
  // Requirements: 6.4, 6.5
  const handleMiniMapNavigate = useCallback((position: Point) => {
    const container = canvasContainerRef.current
    if (!container) return
    
    const rect = container.getBoundingClientRect()
    // Center the viewport on the clicked position
    setTransform({
      ...transform,
      offsetX: rect.width / 2 - position.x * transform.scale,
      offsetY: rect.height / 2 - position.y * transform.scale,
    })
  }, [transform, setTransform])

  // Handle label position change (from drag)
  // Requirements: 1.2, 4.1
  const handleLabelPositionChange = useCallback((labelName: string, position: Point) => {
    setLabelPosition(labelName, position)
  }, [setLabelPosition])

  // Handle label selection change
  // Requirements: 8.3
  const handleLabelSelectionChange = useCallback((labelName: string, selected: boolean, additive: boolean) => {
    if (selected) {
      selectLabel(labelName, additive)
    } else if (additive) {
      // Deselect in additive mode
      const newSelection = new Set(selectedLabels)
      newSelection.delete(labelName)
      selectLabels(Array.from(newSelection))
    }
  }, [selectLabel, selectLabels, selectedLabels])

  // Track pending RAF for multi-drag throttling (Dan Abramov style optimization)
  const multiDragRAFRef = useRef<number | null>(null)
  const pendingDeltaRef = useRef<Point | null>(null)

  // Handle multi-drag (drag all selected labels together)
  // Requirements: 8.4
  // Performance optimization inspired by Dan Abramov:
  // - Use requestAnimationFrame to throttle updates
  // - Batch position updates to reduce re-renders
  const handleMultiDrag = useCallback((deltaX: number, deltaY: number) => {
    if (selectedLabels.size <= 1) return
    
    // Initialize initial positions on first drag
    if (!multiDragInitialPositionsRef.current) {
      multiDragInitialPositionsRef.current = new Map()
      for (const labelName of selectedLabels) {
        const pos = labelPositions.get(labelName)
        if (pos) {
          multiDragInitialPositionsRef.current.set(labelName, { ...pos })
        }
      }
    }
    
    // Store pending delta for RAF callback
    pendingDeltaRef.current = { x: deltaX, y: deltaY }
    
    // Throttle updates using requestAnimationFrame
    if (multiDragRAFRef.current === null) {
      multiDragRAFRef.current = requestAnimationFrame(() => {
        multiDragRAFRef.current = null
        
        const delta = pendingDeltaRef.current
        const initialPositions = multiDragInitialPositionsRef.current
        if (!delta || !initialPositions) return
        
        // Calculate new positions based on initial positions + delta
        const newPositions = new Map(labelPositions)
        
        for (const labelName of selectedLabels) {
          const initialPos = initialPositions.get(labelName)
          if (initialPos) {
            newPositions.set(labelName, {
              x: initialPos.x + delta.x,
              y: initialPos.y + delta.y,
            })
          }
        }
        
        setLabelPositions(newPositions)
      })
    }
  }, [selectedLabels, labelPositions, setLabelPositions])

  // Handle drag end - clear multi-drag state and save
  const handleDragEnd = useCallback(() => {
    // Cancel any pending RAF
    if (multiDragRAFRef.current !== null) {
      cancelAnimationFrame(multiDragRAFRef.current)
      multiDragRAFRef.current = null
    }
    pendingDeltaRef.current = null
    multiDragInitialPositionsRef.current = null
    saveLayout()
  }, [saveLayout])

  // Handle selection box completion
  // Requirements: 8.1, 8.2
  const handleSelectionBox = useCallback((_rect: Rect, labelNames: string[]) => {
    selectLabels(labelNames)
  }, [selectLabels])

  // Handle clear selection
  // Requirements: 8.5
  const handleClearSelection = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  // Generate unique auto-name for new label (Don Norman: reduce cognitive load)
  const generateAutoLabelName = useCallback(() => {
    let counter = 1
    let name = `label_${counter}`
    while (allLabelNames.includes(name)) {
      counter++
      name = `label_${counter}`
    }
    return name
  }, [allLabelNames])

  // Handle double-click on canvas to create new label
  // Requirements: 1.5
  // Don Norman principle: Reduce Gulf of Execution - instant creation, inline editing
  // Direct manipulation: Label appears exactly where user clicked
  const handleDoubleClickCanvas = useCallback((position: Point) => {
    if (readOnly || !ast) return
    
    // Don Norman: Direct manipulation - use the exact click position
    // Don't use findNonOverlappingPosition here, as user expects label at click location
    // User can manually drag to adjust if needed
    const finalPosition = position
    
    // Generate auto name (Don Norman: reduce cognitive load)
    const autoName = generateAutoLabelName()
    
    // Create new label node immediately
    const newLabelNode: LabelNode = {
      id: `label_${autoName}_${Date.now()}`,
      type: 'label',
      name: autoName,
      body: [],
    }

    // Add to AST
    const newAst: RenpyScript = {
      ...ast,
      statements: [...ast.statements, newLabelNode],
    }

    // Set position for the new label
    setLabelPosition(autoName, finalPosition)
    
    // Mark this label for inline editing
    setEditingLabelName(autoName)

    onAstChange?.(newAst)
  }, [readOnly, ast, labelPositions, generateAutoLabelName, setLabelPosition, onAstChange])

  // Handle confirm create label from canvas dialog
  const handleConfirmCanvasCreate = useCallback(() => {
    if (!canvasCreatePosition || !ast) return
    
    const trimmedName = canvasCreateName.trim()
    
    // Validate label name
    if (!trimmedName) {
      setCanvasCreateError('Label 名称不能为空')
      return
    }
    
    // Check for valid identifier
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
      setCanvasCreateError('Label 名称只能包含字母、数字和下划线，且不能以数字开头')
      return
    }

    // Check for duplicate names
    if (allLabelNames.includes(trimmedName)) {
      setCanvasCreateError(`Label "${trimmedName}" 已存在，请使用其他名称`)
      return
    }

    // Create new label node
    const newLabelNode: LabelNode = {
      id: `label_${trimmedName}_${Date.now()}`,
      type: 'label',
      name: trimmedName,
      body: [],
    }

    // Add to AST
    const newAst: RenpyScript = {
      ...ast,
      statements: [...ast.statements, newLabelNode],
    }

    // Set position for the new label
    setLabelPosition(trimmedName, canvasCreatePosition)

    // Close dialog and reset state
    setShowCanvasCreateDialog(false)
    setCanvasCreatePosition(null)
    setCanvasCreateName('')
    setCanvasCreateError('')

    onAstChange?.(newAst)
  }, [canvasCreatePosition, canvasCreateName, ast, allLabelNames, setLabelPosition, onAstChange])

  // Handle cancel create label from canvas dialog
  const handleCancelCanvasCreate = useCallback(() => {
    setShowCanvasCreateDialog(false)
    setCanvasCreatePosition(null)
    setCanvasCreateName('')
    setCanvasCreateError('')
  }, [])

  // Handle create new label from toolbar
  // Requirements: 5.1, 5.2
  const handleCreateLabel = useCallback((labelName: string) => {
    if (!ast || readOnly) return

    // Calculate position for new label (center of viewport or auto-layout)
    const container = canvasContainerRef.current
    let position: Point = { x: 0, y: 0 }
    
    if (container) {
      const rect = container.getBoundingClientRect()
      const centerScreen = { x: rect.width / 2, y: rect.height / 2 }
      position = screenToCanvas(centerScreen.x, centerScreen.y, transform)
    }
    
    // Find non-overlapping position
    const finalPosition = findNonOverlappingPosition(position, labelPositions)

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

    // Set position for the new label
    setLabelPosition(labelName, finalPosition)

    onAstChange?.(newAst)
  }, [ast, readOnly, transform, labelPositions, onAstChange, setLabelPosition])

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

  // Handle rename label (Don Norman: inline editing for reduced cognitive load)
  const handleRenameLabel = useCallback((oldName: string, newName: string) => {
    if (!ast || readOnly) return
    if (oldName === newName) {
      // Clear editing state even if name didn't change
      setEditingLabelName(null)
      return
    }

    // Update label name in AST
    const newStatements = ast.statements.map(s => {
      if (s.type === 'label' && (s as LabelNode).name === oldName) {
        return {
          ...s,
          name: newName,
          id: `label_${newName}_${Date.now()}`,
        } as LabelNode
      }
      return s
    })

    const newAst: RenpyScript = {
      ...ast,
      statements: newStatements,
    }

    // Update position mapping
    const oldPosition = labelPositions.get(oldName)
    if (oldPosition) {
      const newPositions = new Map(labelPositions)
      newPositions.delete(oldName)
      newPositions.set(newName, oldPosition)
      setLabelPositions(newPositions)
    }

    // Clear editing state
    setEditingLabelName(null)

    onAstChange?.(newAst)
  }, [ast, readOnly, labelPositions, setLabelPositions, onAstChange])

  // Handle label card click
  const handleLabelClick = useCallback((labelName: string) => {
    setSelectedLabel(labelName)
  }, [setSelectedLabel])

  // Handle block click within a label - select the block
  const handleBlockClick = useCallback((blockId: string) => {
    setSelectedBlockId(blockId)
  }, [setSelectedBlockId])

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

  // Handle adding a choice to a menu block
  const handleAddChoice = useCallback((
    labelName: string,
    blockTree: Block,
    menuBlockId: string
  ) => {
    if (readOnly || !ast) return

    // Add a choice block to the menu
    const result = blockOperationHandler.addBlock('choice' as BlockType, menuBlockId, -1, {
      blockTree,
      ast,
      labelName,
    })

    if (result.success && result.ast) {
      onAstChange?.(result.ast)
    }
  }, [readOnly, ast, blockOperationHandler, onAstChange])

  // Handle deleting a choice from a menu block
  const handleDeleteChoice = useCallback((
    labelName: string,
    blockTree: Block,
    choiceBlockId: string
  ) => {
    if (readOnly || !ast) return

    const result = blockOperationHandler.deleteBlock(choiceBlockId, {
      blockTree,
      ast,
      labelName,
    })

    if (result.success && result.ast) {
      onAstChange?.(result.ast)
    }
  }, [readOnly, ast, blockOperationHandler, onAstChange])

  // Handle block drop into a choice (nested blocks)
  const handleBlockDropIntoChoice = useCallback((
    labelName: string,
    blockTree: Block,
    blockType: string,
    choiceBlockId: string,
    index: number
  ) => {
    if (readOnly || !ast) return

    const result = blockOperationHandler.addBlock(blockType as BlockType, choiceBlockId, index, {
      blockTree,
      ast,
      labelName,
    })

    if (result.success && result.ast) {
      onAstChange?.(result.ast)
    }
  }, [readOnly, ast, blockOperationHandler, onAstChange])

  // Handle moving an existing block into a choice
  const handleBlockMoveIntoChoice = useCallback((
    labelName: string,
    blockTree: Block,
    blockId: string,
    choiceBlockId: string,
    index: number
  ) => {
    if (readOnly || !ast) return

    const result = blockOperationHandler.moveBlock(blockId, choiceBlockId, index, {
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

  // Handle block move (from another container or cross-label)
  // Implements Requirement 3.4: 跨 Label 移动积木
  const handleBlockMove = useCallback((
    targetLabelName: string,
    targetBlockTree: Block,
    blockId: string,
    index: number
  ) => {
    if (readOnly || !ast) return

    const sourceLabelName = dragSourceLabelRef.current

    // Check if this is a cross-label move
    if (sourceLabelName && sourceLabelName !== targetLabelName) {
      // Find the source label's block tree
      const sourceLabelData = labelDataList.find(l => l.name === sourceLabelName)
      if (!sourceLabelData) {
        console.error(`Source label not found: ${sourceLabelName}`)
        return
      }

      // Perform cross-label move
      const context: CrossLabelOperationContext = {
        sourceBlockTree: sourceLabelData.blockTree,
        targetBlockTree,
        ast,
        sourceLabelName,
        targetLabelName,
      }

      const result = blockOperationHandler.moveBlockAcrossLabels(blockId, index, context)

      if (result.success && result.ast) {
        onAstChange?.(result.ast)
      }
    } else {
      // Same label move (reorder)
      const result = blockOperationHandler.moveBlock(blockId, targetBlockTree.id, index, {
        blockTree: targetBlockTree,
        ast,
        labelName: targetLabelName,
      })

      if (result.success && result.ast) {
        onAstChange?.(result.ast)
      }
    }

    // Clear the drag source
    dragSourceLabelRef.current = null
  }, [readOnly, ast, blockOperationHandler, onAstChange, labelDataList])

  // Handle block drag start - track source label for cross-label moves
  const handleBlockDragStart = useCallback((labelName: string, blockId: string, event: React.DragEvent) => {
    // Store the source label name for cross-label detection
    dragSourceLabelRef.current = labelName
    
    // Set the block ID in the drag data
    event.dataTransfer.setData('application/x-block-id', blockId)
    event.dataTransfer.setData('application/x-source-label', labelName)
    event.dataTransfer.effectAllowed = 'move'
  }, [])

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
      // Clear selection if deleted block was selected
      if (selectedBlockId === blockId) {
        setSelectedBlockId(null)
      }
      onAstChange?.(result.ast)
    }
  }, [readOnly, ast, blockOperationHandler, onAstChange, selectedBlockId, setSelectedBlockId])

  // Helper function to find block and its label
  const findBlockAndLabel = useCallback((blockId: string): { block: Block; labelData: LabelData } | null => {
    for (const labelData of labelDataList) {
      const findBlock = (block: Block): Block | null => {
        if (block.id === blockId) return block
        if (block.children) {
          for (const child of block.children) {
            const found = findBlock(child)
            if (found) return found
          }
        }
        return null
      }
      
      const block = findBlock(labelData.blockTree)
      if (block) {
        return { block, labelData }
      }
    }
    return null
  }, [labelDataList])

  // Helper function to find parent block and index
  const findParentAndIndex = useCallback((root: Block, blockId: string): { parent: Block; index: number } | null => {
    if (root.children) {
      for (let i = 0; i < root.children.length; i++) {
        if (root.children[i].id === blockId) {
          return { parent: root, index: i }
        }
        const found = findParentAndIndex(root.children[i], blockId)
        if (found) return found
      }
    }
    return null
  }, [])

  // Handle copy block (Ctrl+C)
  const handleCopyBlock = useCallback(() => {
    if (!selectedBlockId) return
    
    const result = findBlockAndLabel(selectedBlockId)
    if (!result) return
    
    const clipboardData: BlockClipboard = {
      blocks: [JSON.parse(JSON.stringify(result.block))],
      sourceLabel: result.labelData.name,
      timestamp: Date.now(),
    }
    
    setClipboard(clipboardData)
  }, [selectedBlockId, findBlockAndLabel, setClipboard])

  // Handle paste block (Ctrl+V)
  const handlePasteBlock = useCallback(() => {
    if (readOnly || !clipboard || !ast) return
    
    // Determine paste target - if a block is selected, paste after it
    // Otherwise paste at the end of the first label
    let targetLabelData: LabelData | null = null
    let parentId: string | null = null
    let index = 0
    
    if (selectedBlockId) {
      const result = findBlockAndLabel(selectedBlockId)
      if (result) {
        targetLabelData = result.labelData
        const parentResult = findParentAndIndex(result.labelData.blockTree, selectedBlockId)
        if (parentResult) {
          parentId = parentResult.parent.id
          index = parentResult.index + 1
        } else {
          // Selected block is at root level
          parentId = result.labelData.blockTree.id
          const rootChildren = result.labelData.blockTree.children || []
          const selectedIndex = rootChildren.findIndex(c => c.id === selectedBlockId)
          index = selectedIndex >= 0 ? selectedIndex + 1 : rootChildren.length
        }
      }
    }
    
    // If no selection, paste at the end of the first label
    if (!targetLabelData && labelDataList.length > 0) {
      targetLabelData = labelDataList[0]
      parentId = targetLabelData.blockTree.id
      index = targetLabelData.blockTree.children?.length ?? 0
    }
    
    if (!targetLabelData || !parentId) return
    
    const pasteResult = blockOperationHandler.pasteBlock(clipboard, parentId, index, {
      blockTree: targetLabelData.blockTree,
      ast,
      labelName: targetLabelData.name,
    })
    
    if (pasteResult.success && pasteResult.ast) {
      if (pasteResult.blockId) {
        setSelectedBlockId(pasteResult.blockId)
      }
      onAstChange?.(pasteResult.ast)
    }
  }, [readOnly, clipboard, ast, selectedBlockId, labelDataList, findBlockAndLabel, findParentAndIndex, blockOperationHandler, setSelectedBlockId, onAstChange])

  // Handle cut block (Ctrl+X)
  const handleCutBlock = useCallback(() => {
    if (readOnly || !selectedBlockId) return
    
    // First copy
    handleCopyBlock()
    
    // Then delete
    const result = findBlockAndLabel(selectedBlockId)
    if (result) {
      handleDeleteBlock(result.labelData.name, result.labelData.blockTree, selectedBlockId)
    }
  }, [readOnly, selectedBlockId, handleCopyBlock, findBlockAndLabel, handleDeleteBlock])

  // Handle keyboard events for delete, copy, paste
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Don't handle shortcuts when typing in input fields
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    // Ctrl+C to copy
    if ((event.ctrlKey || event.metaKey) && event.key === 'c' && selectedBlockId) {
      event.preventDefault()
      handleCopyBlock()
      return
    }
    
    // Ctrl+V to paste
    if ((event.ctrlKey || event.metaKey) && event.key === 'v' && clipboard) {
      event.preventDefault()
      handlePasteBlock()
      return
    }
    
    // Ctrl+X to cut
    if ((event.ctrlKey || event.metaKey) && event.key === 'x' && selectedBlockId && !readOnly) {
      event.preventDefault()
      handleCutBlock()
      return
    }

    // Delete or Backspace to delete selected block
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedBlockId && !readOnly) {
      event.preventDefault()
      
      // Find which label contains the selected block
      const result = findBlockAndLabel(selectedBlockId)
      if (result) {
        handleDeleteBlock(result.labelData.name, result.labelData.blockTree, selectedBlockId)
      }
    }
    
    // Escape to clear selection
    if (event.key === 'Escape') {
      setSelectedBlockId(null)
    }
  }, [selectedBlockId, readOnly, clipboard, findBlockAndLabel, handleDeleteBlock, setSelectedBlockId, handleCopyBlock, handlePasteBlock, handleCutBlock])

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
      const isSelected = selectedBlockId === block.id
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
        collapsed: collapsedBlocks.has(block.id),
        onClick: () => handleBlockClick(block.id),
        onDoubleClick: () => handleBlockDoubleClick(block.id),
        onDelete: !readOnly ? () => handleDeleteBlock(labelName, blockTree, block.id) : undefined,
        onToggleCollapse: () => toggleBlockCollapsed(block.id),
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
          return (
            <MenuBlock
              key={block.id}
              {...commonProps}
              renderChildBlock={renderChildBlock}
              canvasScale={transform.scale}
              onAddChoice={!readOnly ? () => handleAddChoice(labelName, blockTree, block.id) : undefined}
              onDeleteChoice={!readOnly ? (choiceId) => handleDeleteChoice(labelName, blockTree, choiceId) : undefined}
              onBlockDrop={!readOnly ? (blockType, _menuId, index) => handleBlockDropIntoChoice(labelName, blockTree, blockType, block.id, index) : undefined}
              onBlockMove={!readOnly ? (blockId, _menuId, index) => handleBlockMoveIntoChoice(labelName, blockTree, blockId, block.id, index) : undefined}
              onBlockDropIntoChoice={!readOnly ? (blockType, choiceId, index) => handleBlockDropIntoChoice(labelName, blockTree, blockType, choiceId, index) : undefined}
              onBlockMoveIntoChoice={!readOnly ? (blockId, choiceId, index) => handleBlockMoveIntoChoice(labelName, blockTree, blockId, choiceId, index) : undefined}
            />
          )
        case 'choice':
          return (
            <MenuBlock
              key={block.id}
              {...commonProps}
              renderChildBlock={renderChildBlock}
              canvasScale={transform.scale}
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
              onBlockDrop={!readOnly ? (blockType, containerId, index) => handleBlockDropIntoChoice(labelName, blockTree, blockType, containerId, index) : undefined}
              onBlockMove={!readOnly ? (blockId, containerId, index) => handleBlockMoveIntoChoice(labelName, blockTree, blockId, containerId, index) : undefined}
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
    transform.scale,
    collapsedBlocks,
    toggleBlockCollapsed,
    selectedBlockId,
  ])

  // Build class names
  const viewClasses = useMemo(() => [
    'multi-label-view',
    'free-canvas-mode',
    className,
  ].filter(Boolean).join(' '), [className])

  // Format zoom percentage for display
  const zoomPercentage = Math.round(transform.scale * 100)

  return (
    <DragDropProvider>
      <div 
        className={viewClasses}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Toolbar with zoom controls */}
        <MultiLabelToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSelect={handleSearchSelect}
          onCreateLabel={handleCreateLabel}
          layoutMode={layoutMode}
          onLayoutChange={setLayoutMode}
          onCollapseAll={handleCollapseAll}
          onExpandAll={handleExpandAll}
          labelCount={labelDataList.length}
          filteredCount={filteredLabels.length}
          readOnly={readOnly}
          existingLabelNames={allLabelNames}
          // Canvas controls
          zoomLevel={zoomPercentage}
          onResetZoom={handleResetZoom}
          onFitAll={handleFitAll}
        />

        {/* Main Content */}
        <div className="multi-label-view-content">
          {/* Left Panel: Block Palette */}
          <div className="multi-label-view-palette">
            <BlockPalette />
          </div>

          {/* Center Panel: Free Canvas */}
          <div className="multi-label-view-canvas" ref={canvasContainerRef}>
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
                      点击上方的"新建 Label"按钮创建第一个场景，或双击画布空白处创建
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* Free Canvas with DraggableLabelCards */
              <FreeCanvas
                ref={canvasRef}
                transform={transform}
                onTransformChange={setTransform}
                isPanning={isPanning}
                setIsPanning={setIsPanning}
                onSelectionBox={handleSelectionBox}
                onDoubleClickCanvas={handleDoubleClickCanvas}
                labelBounds={labelBounds}
                snapGuides={snapGuides}
                snapDisabled={snapDisabled}
                onSnapDisabledChange={setSnapDisabled}
                onClearSelection={handleClearSelection}
                onFitAll={handleFitAll}
              >
                {filteredLabels.map(labelData => {
                  const position = labelPositions.get(labelData.name) || { x: 0, y: 0 }
                  const isLabelSelected = selectedLabels.has(labelData.name)
                  const otherRects = getOtherLabelRects(labelData.name)
                  
                  return (
                    <DraggableLabelCard
                      key={labelData.name}
                      labelName={labelData.name}
                      labelBlock={labelData.blockTree}
                      collapsed={collapsedLabels.has(labelData.name)}
                      onToggleCollapse={() => toggleLabelCollapsed(labelData.name)}
                      onDelete={!readOnly ? () => handleDeleteLabel(labelData.name) : undefined}
                      selected={selectedLabel === labelData.name}
                      onClick={() => handleLabelClick(labelData.name)}
                      position={position}
                      onPositionChange={(pos) => handleLabelPositionChange(labelData.name, pos)}
                      isSelected={isLabelSelected}
                      onSelectionChange={(selected, additive) => 
                        handleLabelSelectionChange(labelData.name, selected, additive)
                      }
                      onDragStart={() => {
                        // Initialize multi-drag if multiple selected
                        if (selectedLabels.size > 1 && isLabelSelected) {
                          multiDragInitialPositionsRef.current = new Map()
                          for (const name of selectedLabels) {
                            const pos = labelPositions.get(name)
                            if (pos) {
                              multiDragInitialPositionsRef.current.set(name, { ...pos })
                            }
                          }
                        }
                      }}
                      onDragEnd={handleDragEnd}
                      canvasScale={transform.scale}
                      otherLabelRects={otherRects}
                      onSnapGuidesChange={setSnapGuides}
                      snapDisabled={snapDisabled}
                      onMultiDrag={selectedLabels.size > 1 && isLabelSelected ? handleMultiDrag : undefined}
                      isMultiDragging={selectedLabels.size > 1 && isLabelSelected}
                      // Don Norman: inline editing for newly created labels
                      isEditing={editingLabelName === labelData.name}
                      onNameChange={!readOnly ? (newName) => handleRenameLabel(labelData.name, newName) : undefined}
                      existingLabelNames={allLabelNames}
                      containerProps={{
                        onBlockClick: handleBlockClick,
                        onBlockDoubleClick: handleBlockDoubleClick,
                        onBlockDragStart: (blockId, event) =>
                          handleBlockDragStart(labelData.name, blockId, event),
                        onBlockDrop: (blockType, index) => 
                          handleBlockDrop(labelData.name, labelData.blockTree, blockType, index),
                        onBlockReorder: (blockId, newIndex) =>
                          handleBlockReorder(labelData.name, labelData.blockTree, blockId, newIndex),
                        onBlockMove: (blockId, index) =>
                          handleBlockMove(labelData.name, labelData.blockTree, blockId, index),
                        renderBlock: createRenderBlock(labelData.name, labelData.blockTree),
                        readOnly,
                        canvasScale: transform.scale,
                        onSlotChange: (blockId: string, slotName: string, value: unknown) =>
                          handleSlotChange(labelData.name, labelData.blockTree, blockId, slotName, value),
                        slotErrors: {},
                      }}
                    />
                  )
                })}
              </FreeCanvas>
            )}

            {/* MiniMap - only show when there are labels */}
            {filteredLabels.length > 0 && (
              <MiniMap
                labels={labelBounds}
                viewport={viewportBounds}
                onNavigate={handleMiniMapNavigate}
                visible={true}
              />
            )}
          </div>
        </div>

        {/* Drag Preview */}
        <DragPreview />
      </div>
    </DragDropProvider>
  )
}

// Display name for debugging
MultiLabelView.displayName = 'MultiLabelView'

export default MultiLabelView
