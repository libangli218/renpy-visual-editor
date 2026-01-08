/**
 * Block Definitions
 * 积木定义常量
 * 
 * Defines all available block types with their visual properties
 */

import { BlockDefinition } from '../types'

/**
 * 积木颜色常量
 * Block color constants by category
 */
export const BLOCK_COLORS = {
  scene: '#4CAF50',      // 绿色 - 场景设置类
  dialogue: '#2196F3',   // 蓝色 - 对话类
  flow: '#FF9800',       // 橙色 - 流程控制类
  audio: '#9C27B0',      // 紫色 - 音频类
  advanced: '#607D8B',   // 灰色 - 高级类
} as const

/**
 * 积木定义数组
 * Block definitions array for palette display
 */
export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // ========================================
  // 场景设置类 (Scene Setup Category)
  // ========================================
  {
    type: 'scene',
    category: 'scene',
    label: '场景背景',
    icon: '🎬',
    color: BLOCK_COLORS.scene,
    description: '设置场景背景图片',
  },
  {
    type: 'show',
    category: 'scene',
    label: '显示角色',
    icon: '👤',
    color: BLOCK_COLORS.scene,
    description: '在场景中显示角色',
  },
  {
    type: 'hide',
    category: 'scene',
    label: '隐藏角色',
    icon: '👻',
    color: BLOCK_COLORS.scene,
    description: '从场景中隐藏角色',
  },
  {
    type: 'with',
    category: 'scene',
    label: '过渡效果',
    icon: '✨',
    color: BLOCK_COLORS.scene,
    description: '添加过渡效果',
  },


  // ========================================
  // 对话类 (Dialogue Category)
  // ========================================
  {
    type: 'dialogue',
    category: 'dialogue',
    label: '对话',
    icon: '💬',
    color: BLOCK_COLORS.dialogue,
    description: '添加角色对话或旁白',
  },

  // ========================================
  // 流程控制类 (Flow Control Category)
  // ========================================
  {
    type: 'menu',
    category: 'flow',
    label: '选择菜单',
    icon: '🔀',
    color: BLOCK_COLORS.flow,
    description: '创建玩家选择菜单',
  },
  {
    type: 'choice',
    category: 'flow',
    label: '选项',
    icon: '📋',
    color: BLOCK_COLORS.flow,
    description: '菜单中的一个选项',
  },
  {
    type: 'jump',
    category: 'flow',
    label: '跳转',
    icon: '➡️',
    color: BLOCK_COLORS.flow,
    description: '跳转到其他场景',
  },
  {
    type: 'call',
    category: 'flow',
    label: '调用',
    icon: '📞',
    color: BLOCK_COLORS.flow,
    description: '调用其他场景并返回',
  },
  {
    type: 'return',
    category: 'flow',
    label: '返回',
    icon: '🔙',
    color: BLOCK_COLORS.flow,
    description: '结束当前场景',
  },
  {
    type: 'if',
    category: 'flow',
    label: '条件分支',
    icon: '❓',
    color: BLOCK_COLORS.flow,
    description: '根据条件执行不同内容',
  },
  {
    type: 'elif',
    category: 'flow',
    label: '否则如果',
    icon: '❔',
    color: BLOCK_COLORS.flow,
    description: '条件分支的额外条件',
  },
  {
    type: 'else',
    category: 'flow',
    label: '否则',
    icon: '⬜',
    color: BLOCK_COLORS.flow,
    description: '条件分支的默认情况',
  },

  // ========================================
  // 音频类 (Audio Category)
  // ========================================
  {
    type: 'play-music',
    category: 'audio',
    label: '播放音乐',
    icon: '🎵',
    color: BLOCK_COLORS.audio,
    description: '播放背景音乐',
  },
  {
    type: 'stop-music',
    category: 'audio',
    label: '停止音乐',
    icon: '🔇',
    color: BLOCK_COLORS.audio,
    description: '停止背景音乐',
  },
  {
    type: 'play-sound',
    category: 'audio',
    label: '播放音效',
    icon: '🔊',
    color: BLOCK_COLORS.audio,
    description: '播放音效',
  },

  // ========================================
  // 高级类 (Advanced Category)
  // ========================================
  {
    type: 'python',
    category: 'advanced',
    label: 'Python 代码',
    icon: '🐍',
    color: BLOCK_COLORS.advanced,
    description: '执行 Python 代码',
  },
  {
    type: 'set',
    category: 'advanced',
    label: '赋值',
    icon: '📝',
    color: BLOCK_COLORS.advanced,
    description: '变量赋值',
  },
  {
    type: 'comment',
    category: 'advanced',
    label: '注释',
    icon: '💬',
    color: BLOCK_COLORS.advanced,
    description: '添加注释（不生成代码）',
  },
  {
    type: 'label',
    category: 'flow',
    label: 'Label 容器',
    icon: '🏷️',
    color: BLOCK_COLORS.flow,
    description: 'Label 容器积木',
  },
]

/**
 * 根据类型获取积木定义
 * Get block definition by type
 */
export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find(def => def.type === type)
}

/**
 * 根据分类获取积木定义列表
 * Get block definitions by category
 */
export function getBlocksByCategory(category: string): BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter(def => def.category === category)
}

/**
 * 获取所有分类
 * Get all categories
 */
export function getAllCategories(): string[] {
  return [...new Set(BLOCK_DEFINITIONS.map(def => def.category))]
}

/**
 * 容器类型积木列表
 * Container block types
 */
export const CONTAINER_BLOCK_TYPES = ['label', 'menu', 'choice', 'if', 'elif', 'else'] as const

/**
 * 判断是否为容器类型积木
 * Check if block type is a container
 */
export function isContainerBlockType(type: string): boolean {
  return CONTAINER_BLOCK_TYPES.includes(type as typeof CONTAINER_BLOCK_TYPES[number])
}
