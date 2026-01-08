/**
 * Ren'Py Code Generator
 * 
 * Converts AST nodes back to valid Ren'Py script code.
 * Handles proper indentation (4 spaces) and formatting.
 */

import {
  ASTNode,
  RenpyScript,
  LabelNode,
  DialogueNode,
  MenuNode,
  SceneNode,
  ShowNode,
  HideNode,
  WithNode,
  JumpNode,
  CallNode,
  ReturnNode,
  IfNode,
  SetNode,
  PythonNode,
  DefineNode,
  DefaultNode,
  PlayNode,
  StopNode,
  PauseNode,
  NVLNode,
  RawNode,
} from '../types/ast'

/**
 * Generator options
 */
export interface GeneratorOptions {
  indentSize: number        // Default: 4
  preserveComments: boolean // Preserve comments in raw nodes
  insertBlankLines: boolean // Insert blank lines between top-level statements
}

const DEFAULT_OPTIONS: GeneratorOptions = {
  indentSize: 4,
  preserveComments: true,
  insertBlankLines: true,
}

/**
 * Code Generator class
 */
export class CodeGenerator {
  private options: GeneratorOptions

  constructor(options: Partial<GeneratorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Generate Ren'Py code from a script AST
   */
  generate(ast: RenpyScript): string {
    const lines: string[] = []
    
    for (let i = 0; i < ast.statements.length; i++) {
      const node = ast.statements[i]
      const code = this.generateNode(node, 0)
      lines.push(code)
      
      // Add blank line between top-level statements if enabled
      if (this.options.insertBlankLines && i < ast.statements.length - 1) {
        const nextNode = ast.statements[i + 1]
        
        // Add blank line in these cases:
        // 1. After labels
        // 2. Before labels
        // 3. After define/default blocks (group them together)
        // 4. Between different statement types at top level
        if (this.shouldInsertBlankLine(node, nextNode)) {
          lines.push('')
        }
      }
    }
    
    return lines.join('\n')
  }

  /**
   * Determine if a blank line should be inserted between two nodes
   */
  private shouldInsertBlankLine(current: ASTNode, next: ASTNode): boolean {
    // Always add blank line after labels
    if (current.type === 'label') {
      return true
    }
    
    // Always add blank line before labels
    if (next.type === 'label') {
      return true
    }
    
    // Add blank line when transitioning from define/default to other types
    const isDefineType = (type: string) => type === 'define' || type === 'default'
    if (isDefineType(current.type) && !isDefineType(next.type)) {
      return true
    }
    
    // Add blank line after raw blocks (they might be screen definitions, etc.)
    if (current.type === 'raw' && (current as RawNode).content.includes('\n')) {
      return true
    }
    
    // Add blank line before raw blocks
    if (next.type === 'raw' && (next as RawNode).content.includes('\n')) {
      return true
    }
    
    return false
  }

  /**
   * Generate code for a single AST node
   */
  generateNode(node: ASTNode, indent: number): string {
    switch (node.type) {
      case 'label':
        return this.generateLabel(node, indent)
      case 'dialogue':
        return this.generateDialogue(node, indent)
      case 'menu':
        return this.generateMenu(node, indent)
      case 'scene':
        return this.generateScene(node, indent)
      case 'show':
        return this.generateShow(node, indent)
      case 'hide':
        return this.generateHide(node, indent)
      case 'with':
        return this.generateWith(node, indent)
      case 'jump':
        return this.generateJump(node, indent)
      case 'call':
        return this.generateCall(node, indent)
      case 'return':
        return this.generateReturn(node, indent)
      case 'if':
        return this.generateIf(node, indent)
      case 'set':
        return this.generateSet(node, indent)
      case 'python':
        return this.generatePython(node, indent)
      case 'define':
        return this.generateDefine(node, indent)
      case 'default':
        return this.generateDefault(node, indent)
      case 'play':
        return this.generatePlay(node, indent)
      case 'stop':
        return this.generateStop(node, indent)
      case 'pause':
        return this.generatePause(node, indent)
      case 'nvl':
        return this.generateNVL(node, indent)
      case 'raw':
        return this.generateRaw(node, indent)
      default:
        // Unknown node type, return empty string
        return ''
    }
  }

  /**
   * Get indentation string for a given level
   */
  private getIndent(level: number): string {
    return ' '.repeat(level * this.options.indentSize)
  }

  /**
   * Escape string content for Ren'Py
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
  }

  /**
   * Generate label statement
   * Format: label name(params):
   */
  private generateLabel(node: LabelNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    let line = `${indentStr}label ${node.name}`
    
    if (node.parameters && Array.isArray(node.parameters) && node.parameters.length > 0) {
      line += `(${node.parameters.join(', ')})`
    }
    
    line += ':'
    
    // Generate body
    const bodyLines = node.body.map(child => this.generateNode(child, indent + 1))
    
    if (bodyLines.length > 0) {
      return line + '\n' + bodyLines.join('\n')
    }
    
    // Empty body - add pass statement
    return line + '\n' + this.getIndent(indent + 1) + 'pass'
  }

  /**
   * Generate dialogue or narration
   * Format: "text" [with transition] or speaker "text" [with transition] or speaker attr1 attr2 "text" [with transition]
   */
  private generateDialogue(node: DialogueNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    const escapedText = this.escapeString(node.text)
    
    let line: string
    
    if (node.speaker === null) {
      // Narration
      line = `${indentStr}"${escapedText}"`
    } else {
      // Dialogue with speaker
      line = `${indentStr}${node.speaker}`
      
      if (node.attributes && node.attributes.length > 0) {
        line += ' ' + node.attributes.join(' ')
      }
      
      line += ` "${escapedText}"`
    }
    
    // with transition (advanced property)
    if (node.withTransition) {
      line += ` with ${node.withTransition}`
    }
    
    return line
  }

  /**
   * Generate jump statement
   * Format: jump target or jump expression target
   */
  private generateJump(node: JumpNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    
    if (node.expression) {
      return `${indentStr}jump expression ${node.target}`
    }
    
    return `${indentStr}jump ${node.target}`
  }

  /**
   * Generate call statement
   * Format: call target(args) or call expression target
   */
  private generateCall(node: CallNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    
    if (node.expression) {
      let line = `${indentStr}call expression ${node.target}`
      
      // For expression mode, arguments need 'pass' keyword
      if (node.arguments && Array.isArray(node.arguments) && node.arguments.length > 0) {
        line += ` pass (${node.arguments.join(', ')})`
      }
      
      // Add from clause if specified
      if (node.from) {
        line += ` from ${node.from}`
      }
      
      return line
    }
    
    let line = `${indentStr}call ${node.target}`
    
    if (node.arguments && Array.isArray(node.arguments) && node.arguments.length > 0) {
      line += `(${node.arguments.join(', ')})`
    }
    
    // Add from clause if specified
    if (node.from) {
      line += ` from ${node.from}`
    }
    
    return line
  }

  /**
   * Generate return statement
   * Format: return or return value
   */
  private generateReturn(node: ReturnNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    
    if (node.value) {
      return `${indentStr}return ${node.value}`
    }
    
    return `${indentStr}return`
  }

  /**
   * Generate menu statement
   * Format: menu [name] [arguments]:
   *     [set var]
   *     [caption]
   *     "choice":
   *         body
   */
  private generateMenu(node: MenuNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    let line = `${indentStr}menu`
    
    // Add screen argument if present (advanced property)
    // Format: menu (screen=screen_name):
    if (node.screen) {
      line += ` (screen=${node.screen})`
    }
    
    line += ':'
    
    // Generate menu body
    const choiceLines: string[] = []
    
    // Add set clause if present (must be first line in menu block)
    if (node.setVar) {
      choiceLines.push(`${this.getIndent(indent + 1)}set ${node.setVar}`)
    }
    
    // Generate prompt as a dialogue line inside the menu (if present)
    if (node.prompt) {
      // Prompt is a dialogue line inside the menu block
      // Check if prompt has a speaker (format: 'speaker: "text"')
      const promptMatch = node.prompt.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*"(.+)"$/)
      if (promptMatch) {
        // Has speaker: s "text"
        const speaker = promptMatch[1]
        const text = promptMatch[2]
        choiceLines.push(`${this.getIndent(indent + 1)}${speaker} "${this.escapeString(text)}"`)
      } else {
        // No speaker, just text - add quotes
        choiceLines.push(`${this.getIndent(indent + 1)}"${this.escapeString(node.prompt)}"`)
      }
      choiceLines.push('') // Empty line after prompt
    }
    
    // Generate choices
    for (const choice of node.choices) {
      const choiceIndent = this.getIndent(indent + 1)
      let choiceLine = `${choiceIndent}"${this.escapeString(choice.text)}"`
      
      if (choice.condition) {
        choiceLine += ` if ${choice.condition}`
      }
      
      choiceLine += ':'
      choiceLines.push(choiceLine)
      
      // Generate choice body
      if (choice.body.length > 0) {
        for (const bodyNode of choice.body) {
          choiceLines.push(this.generateNode(bodyNode, indent + 2))
        }
      } else {
        // Empty body - add pass
        choiceLines.push(this.getIndent(indent + 2) + 'pass')
      }
    }
    
    return line + '\n' + choiceLines.join('\n')
  }

  /**
   * Generate scene statement
   * Order: scene image [onlayer layer] [with transition]
   */
  private generateScene(node: SceneNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    let line = `${indentStr}scene ${node.image}`
    
    // onlayer layer
    if (node.onLayer) {
      line += ` onlayer ${node.onLayer}`
    }
    
    // with transition (must be last)
    if (node.withTransition) {
      line += ` with ${node.withTransition}`
    }
    
    return line
  }

  /**
   * Generate show statement
   * Order: show image [attributes] [as tag] [at transform] [behind tag] [onlayer layer] [zorder integer] [with transition]
   */
  private generateShow(node: ShowNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    let line = `${indentStr}show ${node.image}`
    
    if (node.attributes && node.attributes.length > 0) {
      line += ' ' + node.attributes.join(' ')
    }
    
    // as tag (must come before at)
    if (node.asTag) {
      line += ` as ${node.asTag}`
    }
    
    // at position/transform
    if (node.atPosition) {
      line += ` at ${node.atPosition}`
    }
    
    // behind tag
    if (node.behindTag) {
      line += ` behind ${node.behindTag}`
    }
    
    // onlayer layer
    if (node.onLayer) {
      line += ` onlayer ${node.onLayer}`
    }
    
    // zorder integer
    if (node.zorder !== undefined && node.zorder !== null) {
      line += ` zorder ${node.zorder}`
    }
    
    // with transition (must be last)
    if (node.withTransition) {
      line += ` with ${node.withTransition}`
    }
    
    return line
  }

  /**
   * Generate hide statement
   * Order: hide image [onlayer layer] [with transition]
   * Note: hide supports "with" clause per Ren'Py docs "With Clause of Scene, Show, and Hide Statements"
   */
  private generateHide(node: HideNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    let line = `${indentStr}hide ${node.image}`
    
    // onlayer layer
    if (node.onLayer) {
      line += ` onlayer ${node.onLayer}`
    }
    
    // with transition (must be last)
    if (node.withTransition) {
      line += ` with ${node.withTransition}`
    }
    
    return line
  }

  /**
   * Generate with statement
   */
  private generateWith(node: WithNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    return `${indentStr}with ${node.transition}`
  }

  /**
   * Generate if/elif/else statement
   */
  private generateIf(node: IfNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    const lines: string[] = []
    
    for (let i = 0; i < node.branches.length; i++) {
      const branch = node.branches[i]
      
      if (i === 0) {
        // First branch is always 'if'
        lines.push(`${indentStr}if ${branch.condition}:`)
      } else if (branch.condition === null) {
        // No condition means 'else'
        lines.push(`${indentStr}else:`)
      } else {
        // Has condition means 'elif'
        lines.push(`${indentStr}elif ${branch.condition}:`)
      }
      
      // Generate branch body
      if (branch.body.length > 0) {
        for (const bodyNode of branch.body) {
          lines.push(this.generateNode(bodyNode, indent + 1))
        }
      } else {
        // Empty body - add pass
        lines.push(this.getIndent(indent + 1) + 'pass')
      }
    }
    
    return lines.join('\n')
  }

  /**
   * Generate set/assignment statement
   */
  private generateSet(node: SetNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    return `${indentStr}$ ${node.variable} ${node.operator} ${node.value}`
  }

  /**
   * Generate python block or single line
   */
  private generatePython(node: PythonNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    
    // Check if it's a single line (no newlines in code)
    if (!node.code.includes('\n') && !node.early && !node.hide) {
      return `${indentStr}$ ${node.code}`
    }
    
    // Multi-line python block
    let header = `${indentStr}python`
    if (node.early) {
      header = `${indentStr}init python early`
    } else if (node.hide) {
      header = `${indentStr}python hide`
    }
    header += ':'
    
    // Add code lines with proper indentation
    const codeLines = node.code.split('\n')
    const bodyIndent = this.getIndent(indent + 1)
    const formattedCode = codeLines.map(line => bodyIndent + line).join('\n')
    
    return header + '\n' + formattedCode
  }

  /**
   * Generate define statement
   */
  private generateDefine(node: DefineNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    
    if (node.store) {
      return `${indentStr}define ${node.store}.${node.name} = ${node.value}`
    }
    
    return `${indentStr}define ${node.name} = ${node.value}`
  }

  /**
   * Generate default statement
   */
  private generateDefault(node: DefaultNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    return `${indentStr}default ${node.name} = ${node.value}`
  }

  /**
   * Generate play statement
   */
  private generatePlay(node: PlayNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    
    // Voice is special
    if (node.channel === 'voice') {
      return `${indentStr}voice "${node.file}"`
    }
    
    // Queue music (only valid for music channel)
    if (node.queue && node.channel === 'music') {
      let line = `${indentStr}queue ${node.channel} "${node.file}"`
      line += this.generatePlayOptions(node)
      return line
    }
    
    // Regular play
    let line = `${indentStr}play ${node.channel} "${node.file}"`
    line += this.generatePlayOptions(node)
    
    return line
  }

  /**
   * Generate play options (fadein, fadeout, loop, volume, if_changed)
   */
  private generatePlayOptions(node: PlayNode): string {
    const options: string[] = []
    
    if (node.fadeIn !== undefined && node.fadeIn !== null) {
      options.push(`fadein ${node.fadeIn}`)
    }
    
    // fadeout for current music (advanced property)
    if (node.fadeOut !== undefined && node.fadeOut !== null) {
      options.push(`fadeout ${node.fadeOut}`)
    }
    
    if (node.loop === true) {
      options.push('loop')
    } else if (node.loop === false) {
      options.push('noloop')
    }
    
    if (node.volume !== undefined && node.volume !== null) {
      options.push(`volume ${node.volume}`)
    }
    
    // if_changed flag (advanced property)
    if (node.ifChanged === true) {
      options.push('if_changed')
    }
    
    return options.length > 0 ? ' ' + options.join(' ') : ''
  }

  /**
   * Generate stop statement
   */
  private generateStop(node: StopNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    let line = `${indentStr}stop ${node.channel}`
    
    if (node.fadeOut !== undefined && node.fadeOut !== null) {
      line += ` fadeout ${node.fadeOut}`
    }
    
    return line
  }

  /**
   * Generate pause statement
   */
  private generatePause(node: PauseNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    
    if (node.duration !== undefined && node.duration !== null) {
      return `${indentStr}pause ${node.duration}`
    }
    
    return `${indentStr}pause`
  }

  /**
   * Generate NVL statement
   */
  private generateNVL(node: NVLNode, indent: number): string {
    const indentStr = this.getIndent(indent)
    return `${indentStr}nvl ${node.action}`
  }

  /**
   * Generate raw node (unsupported syntax preserved as-is)
   */
  private generateRaw(node: RawNode, indent: number): string {
    // Raw nodes preserve their original content including indentation
    // We need to handle the case where the raw content might need re-indentation
    if (indent === 0) {
      return node.content
    }
    
    // Re-indent the raw content
    const indentStr = this.getIndent(indent)
    const lines = node.content.split('\n')
    return lines.map(line => indentStr + line).join('\n')
  }
}

/**
 * Convenience function to generate code from an AST
 */
export function generate(ast: RenpyScript, options?: Partial<GeneratorOptions>): string {
  const generator = new CodeGenerator(options)
  return generator.generate(ast)
}

/**
 * Generate code for a single node
 */
export function generateNode(node: ASTNode, indent: number = 0, options?: Partial<GeneratorOptions>): string {
  const generator = new CodeGenerator(options)
  return generator.generateNode(node, indent)
}
