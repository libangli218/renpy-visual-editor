/**
 * Block Mode Editor Module
 * 积木模式编辑器模块
 */

// Types
export * from './types'

// Constants
export * from './constants'

// Stores
export * from './stores'

// Builders
export { 
  BlockTreeBuilder, 
  createBlockTreeBuilder, 
  resetBlockIdCounter 
} from './BlockTreeBuilder'

// Operation Handlers
export { 
  BlockOperationHandler, 
  createBlockOperationHandler 
} from './BlockOperationHandler'

// Validators
export * from './BlockValidator'

// Preview State Calculator
export { 
  PreviewStateCalculator, 
  createPreviewStateCalculator 
} from './PreviewStateCalculator'

// Hooks
export * from './useBlockOperations'
export * from './hooks'

// Block Components
export * from './blocks'

// Slot Components
export * from './slots'

// Container Components
export * from './LabelContainer'
export * from './LabelCard'
export * from './DraggableLabelCard'

// Free Canvas Layout
export * from './FreeCanvas'
export type { FreeCanvasHandle } from './FreeCanvas'
export * from './MiniMap'
export * from './SnapGuides'

// Multi-Label View Components
export * from './MultiLabelToolbar'
export * from './MultiLabelView'

// Script Selector
export * from './ScriptSelector'

// Drag-Drop System
export * from './DragDropContext'
export * from './SnapIndicator'
export * from './DragPreview'

// Mode Switching
export * from './EditorModeSwitch'

// Breadcrumb Navigation
export * from './Breadcrumb'

// Validation Components
export * from './ValidationOverlay'
export * from './ErrorTooltip'
export { 
  ErrorSummary, 
  ErrorBadge, 
  useErrorSummary, 
  useBlockErrorSummary 
} from './ErrorSummary'
export type { ErrorSummaryProps, ErrorBadgeProps } from './ErrorSummary'

// Preview Panel
export * from './PreviewPanel'

// Context View
export * from './ContextView'

// Template System
export { 
  TemplateManager, 
  getTemplateManager, 
  createTemplateManager, 
  resetTemplateManager 
} from './TemplateManager'
export * from './TemplatePanel'

// Block Filter
export * from './BlockFilter'

// Main Editor Component
export * from './BlockModeEditor'
