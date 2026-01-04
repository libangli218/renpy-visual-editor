/**
 * Preview Engine - Computes preview state from AST
 * Implements Requirements 4.1, 4.2, 4.7
 * 
 * Property 16: Preview State Synchronization
 * For any selected node, the preview state should reflect the scene state at that point.
 */

import {
  PreviewState,
  PreviewStep,
  PreviewCharacter,
  CharacterChange,
  CharacterPosition,
  STANDARD_POSITIONS,
  createDefaultPreviewState,
} from './types'
import {
  ASTNode,
  RenpyScript,
  LabelNode,
  DialogueNode,
  SceneNode,
  ShowNode,
  HideNode,
  MenuNode,
  NVLNode,
  PlayNode,
  StopNode,
  IfNode,
} from '../types/ast'

/**
 * PreviewEngine class - Manages preview state computation
 */
export class PreviewEngine {
  private steps: PreviewStep[] = []
  
  /**
   * Build preview steps from AST
   */
  buildSteps(ast: RenpyScript | null): PreviewStep[] {
    this.steps = []
    
    if (!ast || !ast.statements) {
      return this.steps
    }
    
    // Flatten all statements into previewable steps
    this.processStatements(ast.statements)
    
    return this.steps
  }
  
  /**
   * Process a list of statements recursively
   */
  private processStatements(statements: ASTNode[]): void {
    for (const node of statements) {
      this.processNode(node)
    }
  }
  
  /**
   * Process a single AST node
   */
  private processNode(node: ASTNode): void {
    switch (node.type) {
      case 'label':
        this.processLabel(node as LabelNode)
        break
      case 'dialogue':
        this.processDialogue(node as DialogueNode)
        break
      case 'scene':
        this.processScene(node as SceneNode)
        break
      case 'show':
        this.processShow(node as ShowNode)
        break
      case 'hide':
        this.processHide(node as HideNode)
        break
      case 'menu':
        this.processMenu(node as MenuNode)
        break
      case 'nvl':
        this.processNVL(node as NVLNode)
        break
      case 'play':
        this.processPlay(node as PlayNode)
        break
      case 'stop':
        this.processStop(node as StopNode)
        break
      case 'if':
        this.processIf(node as IfNode)
        break
      // Other node types don't create preview steps
    }
  }
  
  /**
   * Process label node - recurse into body
   */
  private processLabel(node: LabelNode): void {
    if (node.body) {
      this.processStatements(node.body)
    }
  }
  
  /**
   * Process dialogue node
   */
  private processDialogue(node: DialogueNode): void {
    const step: PreviewStep = {
      index: this.steps.length,
      nodeId: node.id,
      type: 'dialogue',
      dialogue: {
        speaker: node.speaker,
        text: node.text,
        mode: 'adv', // Default to ADV mode, will be updated by NVL nodes
      },
    }
    this.steps.push(step)
  }
  
  /**
   * Process scene node
   */
  private processScene(node: SceneNode): void {
    const step: PreviewStep = {
      index: this.steps.length,
      nodeId: node.id,
      type: 'scene',
      sceneChange: node.image,
      // Scene also clears all characters
      characterChanges: [], // Will be handled in state computation
    }
    this.steps.push(step)
  }
  
  /**
   * Process show node
   */
  private processShow(node: ShowNode): void {
    const position = this.parsePosition(node.atPosition)
    
    const step: PreviewStep = {
      index: this.steps.length,
      nodeId: node.id,
      type: 'show',
      characterChanges: [{
        action: 'show',
        name: node.image,
        attributes: node.attributes,
        position,
      }],
    }
    this.steps.push(step)
  }
  
  /**
   * Process hide node
   */
  private processHide(node: HideNode): void {
    const step: PreviewStep = {
      index: this.steps.length,
      nodeId: node.id,
      type: 'hide',
      characterChanges: [{
        action: 'hide',
        name: node.image,
      }],
    }
    this.steps.push(step)
  }
  
  /**
   * Process menu node
   */
  private processMenu(node: MenuNode): void {
    // Menu itself is a step
    const step: PreviewStep = {
      index: this.steps.length,
      nodeId: node.id,
      type: 'menu',
      dialogue: node.prompt ? {
        speaker: null,
        text: node.prompt,
        mode: 'adv',
      } : undefined,
    }
    this.steps.push(step)
    
    // Process first choice's body for preview (simplified)
    if (node.choices && node.choices.length > 0 && node.choices[0].body) {
      this.processStatements(node.choices[0].body)
    }
  }
  
  /**
   * Process NVL node
   */
  private processNVL(node: NVLNode): void {
    const step: PreviewStep = {
      index: this.steps.length,
      nodeId: node.id,
      type: 'nvl',
      nvlAction: node.action,
    }
    this.steps.push(step)
  }
  
  /**
   * Process play node
   */
  private processPlay(node: PlayNode): void {
    const step: PreviewStep = {
      index: this.steps.length,
      nodeId: node.id,
      type: 'audio',
    }
    
    if (node.channel === 'music') {
      step.musicChange = node.file
    } else if (node.channel === 'sound') {
      step.soundChange = node.file
    }
    
    this.steps.push(step)
  }
  
  /**
   * Process stop node
   */
  private processStop(node: StopNode): void {
    const step: PreviewStep = {
      index: this.steps.length,
      nodeId: node.id,
      type: 'audio',
    }
    
    if (node.channel === 'music') {
      step.musicChange = null
    } else if (node.channel === 'sound') {
      step.soundChange = null
    }
    
    this.steps.push(step)
  }
  
  /**
   * Process if node - process first branch for preview
   */
  private processIf(node: IfNode): void {
    if (node.branches && node.branches.length > 0 && node.branches[0].body) {
      this.processStatements(node.branches[0].body)
    }
  }
  
  /**
   * Parse position string to CharacterPosition
   */
  private parsePosition(positionStr?: string): CharacterPosition {
    if (!positionStr) {
      return STANDARD_POSITIONS['center']
    }
    
    const normalized = positionStr.toLowerCase().replace(/^at\s+/, '')
    
    if (STANDARD_POSITIONS[normalized]) {
      return STANDARD_POSITIONS[normalized]
    }
    
    // Default to center if unknown position
    return STANDARD_POSITIONS['center']
  }
  
  /**
   * Compute preview state at a given step index
   * Property 16: Preview State Synchronization
   */
  computeStateAtStep(stepIndex: number): PreviewState {
    const state = createDefaultPreviewState()
    state.totalSteps = this.steps.length
    
    // Apply all steps up to and including stepIndex
    for (let i = 0; i <= stepIndex && i < this.steps.length; i++) {
      this.applyStep(state, this.steps[i])
    }
    
    state.currentIndex = stepIndex
    return state
  }
  
  /**
   * Compute preview state for a specific node ID
   */
  computeStateForNode(nodeId: string): PreviewState {
    const stepIndex = this.steps.findIndex(s => s.nodeId === nodeId)
    if (stepIndex === -1) {
      return createDefaultPreviewState()
    }
    return this.computeStateAtStep(stepIndex)
  }
  
  /**
   * Apply a step to the preview state
   */
  private applyStep(state: PreviewState, step: PreviewStep): void {
    // Handle scene change
    if (step.sceneChange !== undefined) {
      state.scene = step.sceneChange
      // Scene change clears all characters
      state.characters.clear()
    }
    
    // Handle character changes
    if (step.characterChanges) {
      for (const change of step.characterChanges) {
        this.applyCharacterChange(state, change)
      }
    }
    
    // Handle dialogue
    if (step.dialogue) {
      if (state.nvlMode) {
        // In NVL mode, add to history
        state.nvlHistory.push({
          speaker: step.dialogue.speaker,
          text: step.dialogue.text,
        })
        state.dialogue = { ...step.dialogue, mode: 'nvl' }
      } else {
        state.dialogue = step.dialogue
      }
    }
    
    // Handle NVL actions
    if (step.nvlAction) {
      switch (step.nvlAction) {
        case 'show':
          state.nvlMode = true
          break
        case 'hide':
          state.nvlMode = false
          state.nvlHistory = []
          break
        case 'clear':
          state.nvlHistory = []
          break
      }
    }
    
    // Handle audio changes
    if (step.musicChange !== undefined) {
      state.currentMusic = step.musicChange
    }
    if (step.soundChange !== undefined) {
      state.currentSound = step.soundChange
    }
  }
  
  /**
   * Apply a character change to the state
   */
  private applyCharacterChange(state: PreviewState, change: CharacterChange): void {
    switch (change.action) {
      case 'show':
        state.characters.set(change.name, {
          name: change.name,
          attributes: change.attributes || [],
          position: change.position || STANDARD_POSITIONS['center'],
          visible: true,
        })
        break
      case 'hide':
        state.characters.delete(change.name)
        break
      case 'update':
        const existing = state.characters.get(change.name)
        if (existing) {
          state.characters.set(change.name, {
            ...existing,
            attributes: change.attributes || existing.attributes,
            position: change.position || existing.position,
          })
        }
        break
    }
  }
  
  /**
   * Get all steps
   */
  getSteps(): PreviewStep[] {
    return this.steps
  }
  
  /**
   * Get step count
   */
  getStepCount(): number {
    return this.steps.length
  }
  
  /**
   * Find step index for a node ID
   */
  findStepForNode(nodeId: string): number {
    return this.steps.findIndex(s => s.nodeId === nodeId)
  }
}

// Singleton instance
let previewEngineInstance: PreviewEngine | null = null

export function getPreviewEngine(): PreviewEngine {
  if (!previewEngineInstance) {
    previewEngineInstance = new PreviewEngine()
  }
  return previewEngineInstance
}

/**
 * Compute scene state at a specific node
 * Used for Property 16 validation
 */
export function sceneAtNode(ast: RenpyScript, nodeId: string): string | null {
  const engine = new PreviewEngine()
  engine.buildSteps(ast)
  const state = engine.computeStateForNode(nodeId)
  return state.scene
}

/**
 * Compute characters at a specific node
 * Used for Property 16 validation
 */
export function charactersAtNode(ast: RenpyScript, nodeId: string): PreviewCharacter[] {
  const engine = new PreviewEngine()
  engine.buildSteps(ast)
  const state = engine.computeStateForNode(nodeId)
  return Array.from(state.characters.values())
}
