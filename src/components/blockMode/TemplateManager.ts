/**
 * TemplateManager
 * 模板管理器
 * 
 * Manages block templates including built-in templates and custom user templates.
 * Provides functionality to save, load, and apply templates.
 * 
 * Requirements: 14.1, 14.2
 * - 14.1: Block palette provides common block combination templates
 * - 14.2: Support saving selected blocks as custom templates
 */

import { Block, BlockTemplate, BlockType, BlockCategory } from './types'
import { getDefaultSlots } from './constants/SlotDefinitions'
import { getBlockDefinition, isContainerBlockType } from './constants/BlockDefinitions'

/**
 * Storage key for custom templates in localStorage
 */
const CUSTOM_TEMPLATES_STORAGE_KEY = 'renpy-visual-editor-custom-templates'

/**
 * Generate a unique ID for blocks
 */
let templateBlockIdCounter = 0
function generateTemplateBlockId(): string {
  return `tpl_block_${++templateBlockIdCounter}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generate a unique ID for templates
 */
function generateTemplateId(): string {
  return `template_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Get block category from block type
 */
function getBlockCategory(type: BlockType): BlockCategory {
  const definition = getBlockDefinition(type)
  return definition?.category ?? 'advanced'
}

/**
 * Create a block with default slots
 */
function createTemplateBlock(type: BlockType, overrides?: Partial<Block>): Block {
  const slots = getDefaultSlots(type)
  const category = getBlockCategory(type)

  const block: Block = {
    id: generateTemplateBlockId(),
    type,
    category,
    astNodeId: '',
    slots,
    collapsed: false,
    selected: false,
    hasError: false,
    ...overrides,
  }

  if (isContainerBlockType(type)) {
    block.children = overrides?.children ?? []
  }

  return block
}


/**
 * Built-in template: Scene Change + Dialogue
 * 场景切换+对话模板
 */
function createSceneChangeDialogueTemplate(): BlockTemplate {
  const sceneBlock = createTemplateBlock('scene')
  const sceneImageSlot = sceneBlock.slots.find(s => s.name === 'image')
  if (sceneImageSlot) {
    sceneImageSlot.value = ''
    sceneImageSlot.placeholder = '选择背景图片'
  }

  const dialogueBlock = createTemplateBlock('dialogue')
  const speakerSlot = dialogueBlock.slots.find(s => s.name === 'speaker')
  const textSlot = dialogueBlock.slots.find(s => s.name === 'text')
  if (speakerSlot) {
    speakerSlot.value = null
  }
  if (textSlot) {
    textSlot.value = ''
    textSlot.placeholder = '输入对话内容...'
  }

  return {
    id: 'builtin-scene-dialogue',
    name: '场景切换+对话',
    description: '切换场景背景并添加一段对话',
    blocks: [sceneBlock, dialogueBlock],
    isBuiltIn: true,
  }
}

/**
 * Built-in template: Character Entrance
 * 角色入场模板
 */
function createCharacterEntranceTemplate(): BlockTemplate {
  const showBlock = createTemplateBlock('show')
  const characterSlot = showBlock.slots.find(s => s.name === 'character')
  const positionSlot = showBlock.slots.find(s => s.name === 'position')
  if (characterSlot) {
    characterSlot.value = ''
    characterSlot.placeholder = '选择角色'
  }
  if (positionSlot) {
    positionSlot.value = 'center'
  }

  const withBlock = createTemplateBlock('with')
  const transitionSlot = withBlock.slots.find(s => s.name === 'transition')
  if (transitionSlot) {
    transitionSlot.value = 'dissolve'
  }

  const dialogueBlock = createTemplateBlock('dialogue')
  const speakerSlot = dialogueBlock.slots.find(s => s.name === 'speaker')
  const textSlot = dialogueBlock.slots.find(s => s.name === 'text')
  if (speakerSlot) {
    speakerSlot.value = null
  }
  if (textSlot) {
    textSlot.value = ''
    textSlot.placeholder = '角色入场后的对话...'
  }

  return {
    id: 'builtin-character-entrance',
    name: '角色入场',
    description: '显示角色并添加入场对话',
    blocks: [showBlock, withBlock, dialogueBlock],
    isBuiltIn: true,
  }
}

/**
 * Built-in template: Choice Branch
 * 选择分支模板
 */
function createChoiceBranchTemplate(): BlockTemplate {
  // Create choice blocks with default content
  const choice1 = createTemplateBlock('choice')
  const choice1TextSlot = choice1.slots.find(s => s.name === 'text')
  if (choice1TextSlot) {
    choice1TextSlot.value = '选项 A'
  }
  choice1.children = [createTemplateBlock('dialogue')]
  const choice1Dialogue = choice1.children[0]
  const choice1DialogueText = choice1Dialogue.slots.find(s => s.name === 'text')
  if (choice1DialogueText) {
    choice1DialogueText.value = ''
    choice1DialogueText.placeholder = '选项 A 的对话...'
  }

  const choice2 = createTemplateBlock('choice')
  const choice2TextSlot = choice2.slots.find(s => s.name === 'text')
  if (choice2TextSlot) {
    choice2TextSlot.value = '选项 B'
  }
  choice2.children = [createTemplateBlock('dialogue')]
  const choice2Dialogue = choice2.children[0]
  const choice2DialogueText = choice2Dialogue.slots.find(s => s.name === 'text')
  if (choice2DialogueText) {
    choice2DialogueText.value = ''
    choice2DialogueText.placeholder = '选项 B 的对话...'
  }

  // Create menu block with choices
  const menuBlock = createTemplateBlock('menu')
  menuBlock.children = [choice1, choice2]

  return {
    id: 'builtin-choice-branch',
    name: '选择分支',
    description: '创建带有两个选项的选择菜单',
    blocks: [menuBlock],
    isBuiltIn: true,
  }
}

/**
 * Built-in template: Conditional Branch
 * 条件分支模板
 */
function createConditionalBranchTemplate(): BlockTemplate {
  const ifBlock = createTemplateBlock('if')
  const conditionSlot = ifBlock.slots.find(s => s.name === 'condition')
  if (conditionSlot) {
    conditionSlot.value = 'True'
    conditionSlot.placeholder = '输入条件表达式'
  }
  
  // Add true branch content
  const trueDialogue = createTemplateBlock('dialogue')
  const trueTextSlot = trueDialogue.slots.find(s => s.name === 'text')
  if (trueTextSlot) {
    trueTextSlot.value = ''
    trueTextSlot.placeholder = '条件为真时的对话...'
  }
  ifBlock.children = [trueDialogue]

  return {
    id: 'builtin-conditional-branch',
    name: '条件分支',
    description: '根据条件执行不同内容',
    blocks: [ifBlock],
    isBuiltIn: true,
  }
}

/**
 * Built-in template: Play Music with Dialogue
 * 播放音乐+对话模板
 */
function createMusicDialogueTemplate(): BlockTemplate {
  const playMusicBlock = createTemplateBlock('play-music')
  const fileSlot = playMusicBlock.slots.find(s => s.name === 'file')
  const fadeinSlot = playMusicBlock.slots.find(s => s.name === 'fadein')
  if (fileSlot) {
    fileSlot.value = ''
    fileSlot.placeholder = '选择音乐文件'
  }
  if (fadeinSlot) {
    fadeinSlot.value = 1.0
  }

  const dialogueBlock = createTemplateBlock('dialogue')
  const textSlot = dialogueBlock.slots.find(s => s.name === 'text')
  if (textSlot) {
    textSlot.value = ''
    textSlot.placeholder = '音乐开始后的对话...'
  }

  return {
    id: 'builtin-music-dialogue',
    name: '播放音乐+对话',
    description: '播放背景音乐并添加对话',
    blocks: [playMusicBlock, dialogueBlock],
    isBuiltIn: true,
  }
}


/**
 * All built-in templates
 */
const BUILT_IN_TEMPLATES: BlockTemplate[] = [
  createSceneChangeDialogueTemplate(),
  createCharacterEntranceTemplate(),
  createChoiceBranchTemplate(),
  createConditionalBranchTemplate(),
  createMusicDialogueTemplate(),
]

/**
 * TemplateManager class
 * 
 * Manages block templates including built-in and custom templates.
 */
export class TemplateManager {
  private customTemplates: BlockTemplate[] = []

  constructor() {
    this.loadCustomTemplates()
  }

  /**
   * Get all built-in templates
   */
  getBuiltInTemplates(): BlockTemplate[] {
    return BUILT_IN_TEMPLATES.map(t => this.deepCopyTemplate(t))
  }

  /**
   * Get all custom templates
   */
  getCustomTemplates(): BlockTemplate[] {
    return this.customTemplates.map(t => this.deepCopyTemplate(t))
  }

  /**
   * Get all templates (built-in + custom)
   */
  getAllTemplates(): BlockTemplate[] {
    return [...this.getBuiltInTemplates(), ...this.getCustomTemplates()]
  }

  /**
   * Get a template by ID
   */
  getTemplateById(id: string): BlockTemplate | null {
    const allTemplates = [...BUILT_IN_TEMPLATES, ...this.customTemplates]
    const template = allTemplates.find(t => t.id === id)
    return template ? this.deepCopyTemplate(template) : null
  }

  /**
   * Save blocks as a custom template
   * 
   * @param name - Template name
   * @param description - Template description
   * @param blocks - Blocks to save as template
   * @returns The created template
   */
  saveAsTemplate(name: string, description: string, blocks: Block[]): BlockTemplate {
    const template: BlockTemplate = {
      id: generateTemplateId(),
      name,
      description,
      blocks: blocks.map(b => this.deepCopyBlock(b)),
      isBuiltIn: false,
    }

    this.customTemplates.push(template)
    this.persistCustomTemplates()

    return this.deepCopyTemplate(template)
  }

  /**
   * Update an existing custom template
   * 
   * @param id - Template ID
   * @param updates - Partial template updates
   * @returns Updated template or null if not found
   */
  updateTemplate(id: string, updates: Partial<Omit<BlockTemplate, 'id' | 'isBuiltIn'>>): BlockTemplate | null {
    const index = this.customTemplates.findIndex(t => t.id === id)
    if (index === -1) {
      return null
    }

    const template = this.customTemplates[index]
    if (template.isBuiltIn) {
      return null // Cannot update built-in templates
    }

    if (updates.name !== undefined) {
      template.name = updates.name
    }
    if (updates.description !== undefined) {
      template.description = updates.description
    }
    if (updates.blocks !== undefined) {
      template.blocks = updates.blocks.map(b => this.deepCopyBlock(b))
    }

    this.persistCustomTemplates()
    return this.deepCopyTemplate(template)
  }

  /**
   * Delete a custom template
   * 
   * @param id - Template ID
   * @returns True if deleted, false if not found or is built-in
   */
  deleteTemplate(id: string): boolean {
    const index = this.customTemplates.findIndex(t => t.id === id)
    if (index === -1) {
      return false
    }

    const template = this.customTemplates[index]
    if (template.isBuiltIn) {
      return false // Cannot delete built-in templates
    }

    this.customTemplates.splice(index, 1)
    this.persistCustomTemplates()
    return true
  }

  /**
   * Apply a template to get blocks with fresh IDs
   * 
   * @param templateId - Template ID
   * @returns Blocks with fresh IDs, or null if template not found
   */
  applyTemplate(templateId: string): Block[] | null {
    const template = this.getTemplateById(templateId)
    if (!template) {
      return null
    }

    return template.blocks.map(b => this.deepCopyBlockWithNewIds(b))
  }

  /**
   * Create blocks from a template with fresh IDs
   * 
   * @param template - Template to apply
   * @returns Blocks with fresh IDs
   */
  createBlocksFromTemplate(template: BlockTemplate): Block[] {
    return template.blocks.map(b => this.deepCopyBlockWithNewIds(b))
  }

  /**
   * Load custom templates from localStorage
   */
  private loadCustomTemplates(): void {
    try {
      const stored = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          this.customTemplates = parsed.filter(t => !t.isBuiltIn)
        }
      }
    } catch (error) {
      console.error('Failed to load custom templates:', error)
      this.customTemplates = []
    }
  }

  /**
   * Persist custom templates to localStorage
   */
  private persistCustomTemplates(): void {
    try {
      const toStore = this.customTemplates.filter(t => !t.isBuiltIn)
      localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(toStore))
    } catch (error) {
      console.error('Failed to persist custom templates:', error)
    }
  }

  /**
   * Deep copy a template
   */
  private deepCopyTemplate(template: BlockTemplate): BlockTemplate {
    return {
      ...template,
      blocks: template.blocks.map(b => this.deepCopyBlock(b)),
    }
  }

  /**
   * Deep copy a block
   */
  private deepCopyBlock(block: Block): Block {
    const copy: Block = {
      ...block,
      slots: block.slots.map(slot => ({ ...slot })),
    }

    if (block.children) {
      copy.children = block.children.map(child => this.deepCopyBlock(child))
    }

    return copy
  }

  /**
   * Deep copy a block with new IDs
   */
  private deepCopyBlockWithNewIds(block: Block): Block {
    const newId = generateTemplateBlockId()

    const copy: Block = {
      ...block,
      id: newId,
      astNodeId: '', // Will be set when added to AST
      slots: block.slots.map(slot => ({ ...slot })),
      selected: false,
    }

    if (block.children) {
      copy.children = block.children.map(child => this.deepCopyBlockWithNewIds(child))
    }

    return copy
  }

  /**
   * Clear all custom templates
   */
  clearCustomTemplates(): void {
    this.customTemplates = []
    this.persistCustomTemplates()
  }

  /**
   * Export custom templates as JSON string
   */
  exportCustomTemplates(): string {
    return JSON.stringify(this.customTemplates, null, 2)
  }

  /**
   * Import custom templates from JSON string
   * 
   * @param json - JSON string containing templates
   * @param merge - If true, merge with existing; if false, replace
   * @returns Number of templates imported
   */
  importCustomTemplates(json: string, merge: boolean = true): number {
    try {
      const parsed = JSON.parse(json)
      if (!Array.isArray(parsed)) {
        return 0
      }

      const validTemplates = parsed.filter(
        t => t.id && t.name && t.blocks && Array.isArray(t.blocks)
      ).map(t => ({
        ...t,
        isBuiltIn: false,
        id: merge ? generateTemplateId() : t.id, // Generate new IDs when merging
      }))

      if (merge) {
        this.customTemplates.push(...validTemplates)
      } else {
        this.customTemplates = validTemplates
      }

      this.persistCustomTemplates()
      return validTemplates.length
    } catch (error) {
      console.error('Failed to import templates:', error)
      return 0
    }
  }
}

/**
 * Singleton instance of TemplateManager
 */
let templateManagerInstance: TemplateManager | null = null

/**
 * Get the singleton TemplateManager instance
 */
export function getTemplateManager(): TemplateManager {
  if (!templateManagerInstance) {
    templateManagerInstance = new TemplateManager()
  }
  return templateManagerInstance
}

/**
 * Create a new TemplateManager instance (for testing)
 */
export function createTemplateManager(): TemplateManager {
  return new TemplateManager()
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetTemplateManager(): void {
  templateManagerInstance = null
}

export default TemplateManager
