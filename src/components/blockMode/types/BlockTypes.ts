/**
 * Block Editor Type Definitions
 * 积木编辑器类型定义
 */

/**
 * 积木类型枚举
 * Block type enumeration
 */
export type BlockType =
  // 容器类型 (Container types)
  | 'label'
  | 'menu'
  | 'choice'
  | 'if'
  | 'elif'
  | 'else'
  // 语句类型 (Statement types)
  | 'dialogue'
  | 'scene'
  | 'show'
  | 'hide'
  | 'with'
  | 'play-music'
  | 'stop-music'
  | 'play-sound'
  | 'jump'
  | 'call'
  | 'return'
  | 'python'
  | 'set'
  | 'comment'

/**
 * 积木分类
 * Block category enumeration
 */
export type BlockCategory =
  | 'scene'      // 场景设置类 (Scene setup)
  | 'dialogue'   // 对话类 (Dialogue)
  | 'flow'       // 流程控制类 (Flow control)
  | 'audio'      // 音频类 (Audio)
  | 'advanced'   // 高级类 (Advanced)

/**
 * 属性槽类型
 * Slot type enumeration
 */
export type SlotType =
  | 'text'           // 文本输入 (Text input)
  | 'multiline'      // 多行文本 (Multiline text)
  | 'select'         // 下拉选择 (Dropdown select)
  | 'character'      // 角色选择 (Character select)
  | 'image'          // 图片资源 (Image resource)
  | 'audio'          // 音频资源 (Audio resource)
  | 'label'          // Label 选择 (Label select)
  | 'expression'     // Python 表达式 (Python expression)
  | 'number'         // 数字 (Number)
  | 'transition'     // 过渡效果 (Transition effect)
  | 'position'       // 位置 (Position)

/**
 * 下拉选项接口
 * Slot option interface
 */
export interface SlotOption {
  value: string
  label: string
  icon?: string
}

/**
 * 槽位验证接口
 * Slot validation interface
 */
export interface SlotValidation {
  pattern?: RegExp
  min?: number
  max?: number
  custom?: (value: unknown) => boolean
  errorMessage?: string
}


/**
 * 属性槽接口
 * Block slot interface for configurable parameters
 */
export interface BlockSlot {
  /** 槽位名称 (Slot name) */
  name: string
  /** 槽位类型 (Slot type) */
  type: SlotType
  /** 当前值 (Current value) */
  value: unknown
  /** 是否必填 (Required flag) */
  required: boolean
  /** 占位符文本 (Placeholder text) */
  placeholder?: string
  /** 下拉选项 (Dropdown options) */
  options?: SlotOption[]
  /** 验证规则 (Validation rules) */
  validation?: SlotValidation
  /** 是否为高级属性，true 表示在高级面板中显示 (Advanced flag - if true, displayed in advanced panel) */
  advanced?: boolean
  /** 属性的默认值，用于判断是否已配置 (Default value for determining if configured) */
  defaultValue?: unknown
}

/**
 * 积木基础接口
 * Block interface representing a visual code unit
 */
export interface Block {
  /** 唯一标识符 (Unique identifier) */
  id: string
  /** 积木类型 (Block type) */
  type: BlockType
  /** 积木分类 (Block category) */
  category: BlockCategory
  /** 关联的 AST 节点 ID (Associated AST node ID) */
  astNodeId: string
  /** 属性槽列表 (Attribute slots) */
  slots: BlockSlot[]
  /** 子积木列表 - 仅容器类型 (Child blocks - container types only) */
  children?: Block[]
  /** 是否折叠 (Collapsed state) */
  collapsed?: boolean
  /** 是否选中 (Selected state) */
  selected?: boolean
  /** 是否有错误 (Error state) */
  hasError?: boolean
  /** 注释内容 (Comment content) */
  comment?: string
}

/**
 * 积木定义接口 - 用于积木面板显示
 * Block definition interface for palette display
 */
export interface BlockDefinition {
  /** 积木类型 (Block type) */
  type: BlockType
  /** 积木分类 (Block category) */
  category: BlockCategory
  /** 显示标签 (Display label) */
  label: string
  /** 图标 (Icon) */
  icon: string
  /** 颜色 (Color) */
  color: string
  /** 描述 (Description) */
  description: string
}

/**
 * 积木模板接口
 * Block template interface for reusable block combinations
 */
export interface BlockTemplate {
  /** 模板 ID (Template ID) */
  id: string
  /** 模板名称 (Template name) */
  name: string
  /** 模板描述 (Template description) */
  description: string
  /** 模板包含的积木 (Blocks in template) */
  blocks: Block[]
  /** 是否为内置模板 (Built-in flag) */
  isBuiltIn: boolean
}

/**
 * 验证错误接口
 * Validation error interface
 */
export interface ValidationError {
  /** 积木 ID (Block ID) */
  blockId: string
  /** 槽位名称 (Slot name) */
  slotName?: string
  /** 错误类型 (Error type) */
  type: 'required' | 'invalid-target' | 'missing-resource' | 'syntax'
  /** 错误消息 (Error message) */
  message: string
}

/**
 * 验证结果接口
 * Validation result interface
 */
export interface ValidationResult {
  /** 是否有效 (Valid flag) */
  valid: boolean
  /** 错误列表 (Error list) */
  errors: ValidationError[]
}

/**
 * 错误汇总接口
 * Error summary interface
 */
export interface ErrorSummary {
  /** 总错误数 (Total error count) */
  total: number
  /** 按类型分组的错误数 (Error count by type) */
  byType: Record<ValidationError['type'], number>
}

/**
 * 剪贴板接口
 * Clipboard interface for copy/paste operations
 */
export interface BlockClipboard {
  /** 复制的积木 (Copied blocks) */
  blocks: Block[]
  /** 来源 Label (Source label) */
  sourceLabel: string
  /** 时间戳 (Timestamp) */
  timestamp: number
}

/**
 * 游戏状态接口 - 用于预览
 * Game state interface for preview
 */
export interface GameState {
  /** 背景图片 (Background image) */
  background?: string
  /** 角色状态列表 (Character states) */
  characters: CharacterState[]
  /** 对话内容 (Dialogue content) */
  dialogue?: {
    speaker?: string
    text: string
  }
  /** 当前音乐 (Current music) */
  music?: string
  /** 过渡效果 (Transition effect) */
  transition?: string
}

/**
 * 角色状态接口
 * Character state interface
 */
export interface CharacterState {
  /** 角色名称 (Character name) */
  name: string
  /** 角色图片 (Character image) */
  image: string
  /** 位置 (Position) */
  position: string
  /** 表情 (Expression) */
  expression?: string
}

/**
 * 播放状态接口
 * Playback state interface
 */
export interface PlaybackState {
  /** 是否正在播放 (Playing flag) */
  isPlaying: boolean
  /** 当前积木 ID (Current block ID) */
  currentBlockId: string | null
  /** 游戏状态 (Game state) */
  gameState: GameState
}

/**
 * 验证上下文接口
 * Validation context interface
 */
export interface ValidationContext {
  /** 可用的 Label 列表 (Available labels) */
  availableLabels: string[]
  /** 可用的角色列表 (Available characters) */
  availableCharacters: string[]
  /** 可用的图片资源 (Available image resources) */
  availableImages: string[]
  /** 可用的音频资源 (Available audio resources) */
  availableAudio: string[]
}
