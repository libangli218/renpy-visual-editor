/**
 * Slot Definitions
 * 属性槽定义常量
 * 
 * Defines default slot configurations for each block type
 */

import { BlockSlot, BlockType, SlotOption } from '../types'

/**
 * 过渡效果选项
 * Transition effect options
 */
export const TRANSITION_OPTIONS: SlotOption[] = [
  { value: 'dissolve', label: '溶解 (Dissolve)' },
  { value: 'fade', label: '淡入淡出 (Fade)' },
  { value: 'pixellate', label: '像素化 (Pixellate)' },
  { value: 'move', label: '移动 (Move)' },
  { value: 'moveinright', label: '从右移入 (Move In Right)' },
  { value: 'moveinleft', label: '从左移入 (Move In Left)' },
  { value: 'moveintop', label: '从上移入 (Move In Top)' },
  { value: 'moveinbottom', label: '从下移入 (Move In Bottom)' },
  { value: 'moveoutright', label: '向右移出 (Move Out Right)' },
  { value: 'moveoutleft', label: '向左移出 (Move Out Left)' },
  { value: 'moveouttop', label: '向上移出 (Move Out Top)' },
  { value: 'moveoutbottom', label: '向下移出 (Move Out Bottom)' },
  { value: 'ease', label: '缓动 (Ease)' },
  { value: 'zoomin', label: '放大 (Zoom In)' },
  { value: 'zoomout', label: '缩小 (Zoom Out)' },
  { value: 'vpunch', label: '垂直震动 (V Punch)' },
  { value: 'hpunch', label: '水平震动 (H Punch)' },
  { value: 'blinds', label: '百叶窗 (Blinds)' },
  { value: 'squares', label: '方块 (Squares)' },
  { value: 'wipeleft', label: '向左擦除 (Wipe Left)' },
  { value: 'wiperight', label: '向右擦除 (Wipe Right)' },
  { value: 'wipeup', label: '向上擦除 (Wipe Up)' },
  { value: 'wipedown', label: '向下擦除 (Wipe Down)' },
]

/**
 * 位置选项
 * Position options
 */
export const POSITION_OPTIONS: SlotOption[] = [
  { value: 'left', label: '左侧 (Left)' },
  { value: 'center', label: '中央 (Center)' },
  { value: 'right', label: '右侧 (Right)' },
  { value: 'truecenter', label: '正中央 (True Center)' },
  { value: 'topleft', label: '左上 (Top Left)' },
  { value: 'topright', label: '右上 (Top Right)' },
  { value: 'bottomleft', label: '左下 (Bottom Left)' },
  { value: 'bottomright', label: '右下 (Bottom Right)' },
]


/**
 * 默认属性槽配置映射
 * Default slot configurations by block type
 */
export const DEFAULT_SLOT_CONFIGS: Record<BlockType, BlockSlot[]> = {
  // ========================================
  // 对话类 (Dialogue)
  // ========================================
  dialogue: [
    {
      name: 'speaker',
      type: 'character',
      value: null,
      required: false,
      placeholder: '选择角色（留空为旁白）',
    },
    {
      name: 'text',
      type: 'multiline',
      value: '',
      required: true,
      placeholder: '输入对话内容...',
    },
  ],

  // ========================================
  // 场景设置类 (Scene Setup)
  // ========================================
  scene: [
    {
      name: 'image',
      type: 'image',
      value: '',
      required: true,
      placeholder: '选择背景图片',
    },
    {
      name: 'transition',
      type: 'transition',
      value: null,
      required: false,
      placeholder: '选择过渡效果',
      options: TRANSITION_OPTIONS,
    },
  ],

  show: [
    {
      name: 'character',
      type: 'character',
      value: '',
      required: true,
      placeholder: '选择角色',
    },
    {
      name: 'position',
      type: 'position',
      value: 'center',
      required: false,
      placeholder: '选择位置',
      options: POSITION_OPTIONS,
    },
    {
      name: 'expression',
      type: 'select',
      value: null,
      required: false,
      placeholder: '选择表情',
      options: [], // 动态填充
    },
  ],

  hide: [
    {
      name: 'character',
      type: 'character',
      value: '',
      required: true,
      placeholder: '选择要隐藏的角色',
    },
  ],

  with: [
    {
      name: 'transition',
      type: 'transition',
      value: 'dissolve',
      required: true,
      placeholder: '选择过渡效果',
      options: TRANSITION_OPTIONS,
    },
  ],

  // ========================================
  // 流程控制类 (Flow Control)
  // ========================================
  label: [
    {
      name: 'name',
      type: 'text',
      value: '',
      required: true,
      placeholder: '输入 Label 名称',
    },
  ],

  menu: [
    // Menu 无槽位，但可包含 choice 子积木
  ],

  choice: [
    {
      name: 'text',
      type: 'text',
      value: '',
      required: true,
      placeholder: '输入选项文本',
    },
    {
      name: 'condition',
      type: 'expression',
      value: null,
      required: false,
      placeholder: '输入显示条件（可选）',
    },
  ],

  jump: [
    {
      name: 'target',
      type: 'label',
      value: '',
      required: true,
      placeholder: '选择目标 Label',
    },
  ],

  call: [
    {
      name: 'target',
      type: 'label',
      value: '',
      required: true,
      placeholder: '选择目标 Label',
    },
  ],

  return: [
    // Return 无属性槽
  ],

  if: [
    {
      name: 'condition',
      type: 'expression',
      value: '',
      required: true,
      placeholder: '输入条件表达式',
    },
  ],

  elif: [
    {
      name: 'condition',
      type: 'expression',
      value: '',
      required: true,
      placeholder: '输入条件表达式',
    },
  ],

  else: [
    // Else 无属性槽
  ],

  // ========================================
  // 音频类 (Audio)
  // ========================================
  'play-music': [
    {
      name: 'file',
      type: 'audio',
      value: '',
      required: true,
      placeholder: '选择音乐文件',
    },
    {
      name: 'fadein',
      type: 'number',
      value: null,
      required: false,
      placeholder: '淡入时间（秒）',
      validation: {
        min: 0,
        max: 60,
      },
    },
    {
      name: 'loop',
      type: 'select',
      value: true,
      required: false,
      placeholder: '是否循环',
      options: [
        { value: 'true', label: '循环' },
        { value: 'false', label: '不循环' },
      ],
    },
  ],

  'stop-music': [
    {
      name: 'fadeout',
      type: 'number',
      value: null,
      required: false,
      placeholder: '淡出时间（秒）',
      validation: {
        min: 0,
        max: 60,
      },
    },
  ],

  'play-sound': [
    {
      name: 'file',
      type: 'audio',
      value: '',
      required: true,
      placeholder: '选择音效文件',
    },
  ],

  // ========================================
  // 高级类 (Advanced)
  // ========================================
  python: [
    {
      name: 'code',
      type: 'multiline',
      value: '',
      required: true,
      placeholder: '输入 Python 代码',
    },
  ],

  comment: [
    {
      name: 'text',
      type: 'multiline',
      value: '',
      required: false,
      placeholder: '输入注释内容',
    },
  ],
}

/**
 * 获取积木类型的默认属性槽配置
 * Get default slot configuration for a block type
 */
export function getDefaultSlots(type: BlockType): BlockSlot[] {
  const config = DEFAULT_SLOT_CONFIGS[type]
  if (!config) {
    return []
  }
  // 返回深拷贝以避免修改原始配置
  return config.map(slot => ({ ...slot }))
}

/**
 * 创建带有默认值的属性槽
 * Create a slot with default value
 */
export function createSlot(
  name: string,
  type: BlockSlot['type'],
  required: boolean,
  options?: Partial<BlockSlot>
): BlockSlot {
  return {
    name,
    type,
    value: options?.value ?? null,
    required,
    placeholder: options?.placeholder,
    options: options?.options,
    validation: options?.validation,
  }
}
