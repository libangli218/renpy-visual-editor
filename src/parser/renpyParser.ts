/**
 * Ren'Py Script Parser
 * 
 * Parses .rpy files into an AST representation.
 * Uses a line-based approach to handle Ren'Py's indentation-based syntax.
 */

import {
  ASTNode,
  RenpyScript,
  MenuChoice,
  IfBranch,
  RawNode,
} from '../types/ast'

import {
  createLabelNode,
  createDialogueNode,
  createMenuNode,
  createMenuChoice,
  createSceneNode,
  createShowNode,
  createHideNode,
  createWithNode,
  createJumpNode,
  createCallNode,
  createReturnNode,
  createIfNode,
  createIfBranch,
  createSetNode,
  createPythonNode,
  createDefineNode,
  createDefaultNode,
  createPlayNode,
  createStopNode,
  createPauseNode,
  createNVLNode,
  createRawNode,
  createRenpyScript,
} from './nodeFactory'

// Parse error interface
export interface ParseError {
  line: number
  column: number
  message: string
}

// Parse warning interface
export interface ParseWarning {
  line: number
  column: number
  message: string
}

// Parse result interface
export interface ParseResult {
  ast: RenpyScript
  errors: ParseError[]
  warnings: ParseWarning[]
}

// Line info for parsing
interface LineInfo {
  lineNumber: number
  indent: number
  content: string
  raw: string
}

/**
 * Main parser class for Ren'Py scripts
 */
export class RenpyParser {
  private lines: LineInfo[] = []
  private currentIndex = 0
  private errors: ParseError[] = []
  private warnings: ParseWarning[] = []

  /**
   * Parse a Ren'Py script string into an AST
   */
  parse(source: string, filePath: string = ''): ParseResult {
    this.reset()
    this.lines = this.preprocessLines(source)
    
    const statements = this.parseStatements(0)
    
    return {
      ast: createRenpyScript(statements, { filePath }),
      errors: this.errors,
      warnings: this.warnings,
    }
  }

  /**
   * Reset parser state
   */
  private reset(): void {
    this.lines = []
    this.currentIndex = 0
    this.errors = []
    this.warnings = []
  }


  /**
   * Preprocess source into lines with indent info
   */
  private preprocessLines(source: string): LineInfo[] {
    const rawLines = source.split(/\r?\n/)
    const result: LineInfo[] = []
    
    for (let i = 0; i < rawLines.length; i++) {
      const raw = rawLines[i]
      const trimmed = raw.trimStart()
      
      // Skip empty lines and comments for parsing, but keep track of them
      if (trimmed === '' || trimmed.startsWith('#')) {
        continue
      }
      
      const indent = raw.length - trimmed.length
      result.push({
        lineNumber: i + 1,
        indent,
        content: trimmed,
        raw,
      })
    }
    
    return result
  }

  /**
   * Get current line or null if at end
   */
  private currentLine(): LineInfo | null {
    return this.currentIndex < this.lines.length ? this.lines[this.currentIndex] : null
  }

  /**
   * Advance to next line
   */
  private advance(): void {
    this.currentIndex++
  }

  /**
   * Parse statements at a given indent level
   */
  private parseStatements(minIndent: number): ASTNode[] {
    const statements: ASTNode[] = []
    
    while (this.currentLine() !== null) {
      const line = this.currentLine()!
      
      // Stop if we've dedented past our level
      if (line.indent < minIndent) {
        break
      }
      
      // Skip lines that are more indented than expected (handled by parent)
      if (line.indent > minIndent && statements.length === 0) {
        // This is an orphan indented line, treat as raw
        statements.push(createRawNode(line.raw, { line: line.lineNumber }))
        this.advance()
        continue
      }
      
      if (line.indent > minIndent) {
        break
      }
      
      const node = this.parseStatement(line)
      if (node) {
        statements.push(node)
      }
    }
    
    return statements
  }

  /**
   * Parse a single statement
   */
  private parseStatement(line: LineInfo): ASTNode | null {
    // Try each statement type
    const parsers = [
      () => this.parseLabel(line),
      () => this.parseJump(line),
      () => this.parseCall(line),
      () => this.parseReturn(line),
      () => this.parseMenu(line),
      () => this.parseIf(line),
      () => this.parseScene(line),
      () => this.parseShow(line),
      () => this.parseHide(line),
      () => this.parseWith(line),
      () => this.parsePlay(line),
      () => this.parseStop(line),
      () => this.parseVoice(line),
      () => this.parsePause(line),
      () => this.parseNVL(line),
      () => this.parseDefine(line),
      () => this.parseDefault(line),
      () => this.parseSet(line),      // parseSet before parsePython so $ var = value is parsed as Set
      () => this.parsePython(line),
      () => this.parseDialogue(line),
    ]
    
    for (const parser of parsers) {
      const result = parser()
      if (result !== null) {
        return result
      }
    }
    
    // If nothing matched, check if it's a block statement (ends with :)
    // and collect the entire block as raw
    if (line.content.endsWith(':')) {
      return this.parseRawBlock(line)
    }
    
    // Otherwise, treat as single raw line
    this.advance()
    return createRawNode(line.raw, { line: line.lineNumber })
  }

  /**
   * Parse an unsupported block statement (like screen, init, transform, etc.)
   * Preserves the entire block including indentation
   */
  private parseRawBlock(line: LineInfo): RawNode {
    const rawLines: string[] = [line.raw]
    this.advance()
    
    // Collect all indented lines that belong to this block
    const blockIndent = line.indent
    while (this.currentLine() !== null && this.currentLine()!.indent > blockIndent) {
      rawLines.push(this.currentLine()!.raw)
      this.advance()
    }
    
    return createRawNode(rawLines.join('\n'), { line: line.lineNumber })
  }


  /**
   * Parse a label statement
   * Format: label name(params):
   */
  private parseLabel(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^label\s+(\w+)(?:\s*\((.*?)\))?\s*:?\s*$/)
    if (!match) return null
    
    const name = match[1]
    const paramsStr = match[2]
    const parameters = paramsStr ? paramsStr.split(',').map(p => p.trim()).filter(p => p) : undefined
    
    this.advance()
    
    // Parse body (indented statements)
    const bodyIndent = this.currentLine()?.indent ?? 0
    const body = bodyIndent > line.indent ? this.parseStatements(bodyIndent) : []
    
    return createLabelNode(name, body, { parameters, line: line.lineNumber })
  }

  /**
   * Parse a jump statement
   * Format: jump target or jump expression target
   */
  private parseJump(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^jump\s+(expression\s+)?(.+?)\s*$/)
    if (!match) return null
    
    const expression = !!match[1]
    const target = match[2].trim()
    
    this.advance()
    return createJumpNode(target, { expression, line: line.lineNumber })
  }

  /**
   * Parse a call statement
   * Format: call target(args) or call expression target
   */
  private parseCall(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^call\s+(expression\s+)?(\w+)(?:\s*\((.*?)\))?\s*$/)
    if (!match) return null
    
    const expression = !!match[1]
    const target = match[2]
    const argsStr = match[3]
    const args = argsStr ? argsStr.split(',').map(a => a.trim()).filter(a => a) : undefined
    
    this.advance()
    return createCallNode(target, { arguments: args, expression, line: line.lineNumber })
  }

  /**
   * Parse a return statement
   * Format: return or return value
   */
  private parseReturn(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^return(?:\s+(.+))?\s*$/)
    if (!match) return null
    
    const value = match[1]?.trim()
    
    this.advance()
    return createReturnNode({ value, line: line.lineNumber })
  }

  /**
   * Parse dialogue or narration
   * Format: "text" or speaker "text" or speaker attr "text"
   */
  private parseDialogue(line: LineInfo): ASTNode | null {
    // Narration: just a quoted string
    const narrationMatch = line.content.match(/^"((?:[^"\\]|\\.)*)"\s*$/)
    if (narrationMatch) {
      this.advance()
      return createDialogueNode(this.unescapeString(narrationMatch[1]), null, { line: line.lineNumber })
    }
    
    // Dialogue with speaker: speaker "text" or speaker attr1 attr2 "text"
    const dialogueMatch = line.content.match(/^(\w+)(?:\s+([^"]+))?\s+"((?:[^"\\]|\\.)*)"\s*$/)
    if (dialogueMatch) {
      const speaker = dialogueMatch[1]
      const attrsStr = dialogueMatch[2]?.trim()
      const text = this.unescapeString(dialogueMatch[3])
      const attributes = attrsStr ? attrsStr.split(/\s+/).filter(a => a) : undefined
      
      this.advance()
      return createDialogueNode(text, speaker, { attributes, line: line.lineNumber })
    }
    
    return null
  }

  /**
   * Unescape string content
   */
  private unescapeString(str: string): string {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }


  /**
   * Parse a menu statement
   * Format: menu:
   *     "prompt text"  # optional prompt (no colon at end)
   *     speaker "prompt text"  # optional prompt with speaker (no colon at end)
   *     "choice text":
   *         body
   */
  private parseMenu(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^menu(?:\s+(\w+))?\s*:\s*$/)
    if (!match) return null
    
    let prompt = match[1]
    this.advance()
    
    const choices: MenuChoice[] = []
    const choiceIndent = this.currentLine()?.indent ?? 0
    
    if (choiceIndent <= line.indent) {
      return createMenuNode(choices, { prompt, line: line.lineNumber })
    }
    
    // Parse menu choices
    while (this.currentLine() !== null && this.currentLine()!.indent >= choiceIndent) {
      const choiceLine = this.currentLine()!
      
      if (choiceLine.indent > choiceIndent) {
        // This is part of a choice body, skip
        this.advance()
        continue
      }
      
      // Check if this is a prompt text (quoted string without colon at end)
      // Format 1: "prompt text"
      const promptMatch = choiceLine.content.match(/^"((?:[^"\\]|\\.)*)"\s*$/)
      if (promptMatch && !choiceLine.content.endsWith(':')) {
        // This is a menu prompt, not a choice
        prompt = this.unescapeString(promptMatch[1])
        this.advance()
        continue
      }
      
      // Format 2: speaker "prompt text" (dialogue as prompt)
      const dialoguePromptMatch = choiceLine.content.match(/^(\w+)\s+"((?:[^"\\]|\\.)*)"\s*$/)
      if (dialoguePromptMatch && !choiceLine.content.endsWith(':')) {
        // This is a dialogue used as menu prompt
        const speaker = dialoguePromptMatch[1]
        const text = this.unescapeString(dialoguePromptMatch[2])
        prompt = `${speaker}: "${text}"`
        this.advance()
        continue
      }
      
      const choice = this.parseMenuChoice(choiceLine, choiceIndent)
      if (choice) {
        choices.push(choice)
      } else {
        // If we can't parse as a choice, break to avoid infinite loop
        break
      }
    }
    
    return createMenuNode(choices, { prompt, line: line.lineNumber })
  }

  /**
   * Parse a single menu choice
   */
  private parseMenuChoice(line: LineInfo, baseIndent: number): MenuChoice | null {
    // Format: "choice text" if condition:
    const match = line.content.match(/^"((?:[^"\\]|\\.)*)"\s*(?:if\s+(.+?))?\s*:\s*$/)
    if (!match) return null
    
    const text = this.unescapeString(match[1])
    const condition = match[2]?.trim()
    
    this.advance()
    
    // Parse choice body
    const bodyIndent = this.currentLine()?.indent ?? 0
    const body = bodyIndent > baseIndent ? this.parseStatements(bodyIndent) : []
    
    return createMenuChoice(text, body, condition)
  }

  /**
   * Parse an if statement
   * Format: if condition:
   */
  private parseIf(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^if\s+(.+?)\s*:\s*$/)
    if (!match) return null
    
    const condition = match[1]
    this.advance()
    
    const branches: IfBranch[] = []
    
    // Parse if body
    const bodyIndent = this.currentLine()?.indent ?? 0
    const ifBody = bodyIndent > line.indent ? this.parseStatements(bodyIndent) : []
    branches.push(createIfBranch(condition, ifBody))
    
    // Parse elif/else branches
    while (this.currentLine() !== null && this.currentLine()!.indent === line.indent) {
      const branchLine = this.currentLine()!
      
      // Check for elif
      const elifMatch = branchLine.content.match(/^elif\s+(.+?)\s*:\s*$/)
      if (elifMatch) {
        this.advance()
        const elifBodyIndent = this.currentLine()?.indent ?? 0
        const elifBody = elifBodyIndent > line.indent ? this.parseStatements(elifBodyIndent) : []
        branches.push(createIfBranch(elifMatch[1], elifBody))
        continue
      }
      
      // Check for else
      const elseMatch = branchLine.content.match(/^else\s*:\s*$/)
      if (elseMatch) {
        this.advance()
        const elseBodyIndent = this.currentLine()?.indent ?? 0
        const elseBody = elseBodyIndent > line.indent ? this.parseStatements(elseBodyIndent) : []
        branches.push(createIfBranch(null, elseBody))
        break
      }
      
      // Not an elif or else, stop
      break
    }
    
    return createIfNode(branches, { line: line.lineNumber })
  }


  /**
   * Parse a scene statement
   * Format: scene image or scene image with transition
   */
  private parseScene(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^scene\s+(.+?)\s*$/)
    if (!match) return null
    
    const image = match[1].trim()
    
    this.advance()
    return createSceneNode(image, { line: line.lineNumber })
  }

  /**
   * Parse a show statement
   * Format: show image or show image at position
   */
  private parseShow(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^show\s+(.+?)\s*$/)
    if (!match) return null
    
    let rest = match[1].trim()
    let atPosition: string | undefined
    
    // Check for "at position"
    const atMatch = rest.match(/^(.+?)\s+at\s+(.+)$/)
    if (atMatch) {
      rest = atMatch[1].trim()
      atPosition = atMatch[2].trim()
    }
    
    // Parse image and attributes
    const parts = rest.split(/\s+/)
    const image = parts[0]
    const attributes = parts.length > 1 ? parts.slice(1) : undefined
    
    this.advance()
    return createShowNode(image, { attributes, atPosition, line: line.lineNumber })
  }

  /**
   * Parse a hide statement
   * Format: hide image
   */
  private parseHide(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^hide\s+(\w+)\s*$/)
    if (!match) return null
    
    const image = match[1]
    
    this.advance()
    return createHideNode(image, { line: line.lineNumber })
  }

  /**
   * Parse a with statement
   * Format: with transition
   */
  private parseWith(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^with\s+(.+?)\s*$/)
    if (!match) return null
    
    const transition = match[1].trim()
    
    this.advance()
    return createWithNode(transition, { line: line.lineNumber })
  }

  /**
   * Parse a play statement
   * Format: play channel "file" or play channel "file" fadein X loop
   * Also handles: queue music "file"
   */
  private parsePlay(line: LineInfo): ASTNode | null {
    // Check for queue music first
    const queueMatch = line.content.match(/^queue\s+(music)\s+"([^"]+)"(.*)$/)
    if (queueMatch) {
      const channel = queueMatch[1] as 'music'
      const file = queueMatch[2]
      const options = queueMatch[3].trim()
      
      let fadeIn: number | undefined
      let loop: boolean | undefined
      let volume: number | undefined
      
      const fadeInMatch = options.match(/fadein\s+([\d.]+)/)
      if (fadeInMatch) fadeIn = parseFloat(fadeInMatch[1])
      
      if (options.includes('loop')) loop = true
      if (options.includes('noloop')) loop = false
      
      const volumeMatch = options.match(/volume\s+([\d.]+)/)
      if (volumeMatch) volume = parseFloat(volumeMatch[1])
      
      this.advance()
      return createPlayNode(channel, file, { fadeIn, loop, volume, queue: true, line: line.lineNumber })
    }
    
    const match = line.content.match(/^play\s+(music|sound)\s+"([^"]+)"(.*)$/)
    if (!match) return null
    
    const channel = match[1] as 'music' | 'sound'
    const file = match[2]
    const options = match[3].trim()
    
    let fadeIn: number | undefined
    let loop: boolean | undefined
    let volume: number | undefined
    
    // Parse options
    const fadeInMatch = options.match(/fadein\s+([\d.]+)/)
    if (fadeInMatch) fadeIn = parseFloat(fadeInMatch[1])
    
    if (options.includes('loop')) loop = true
    if (options.includes('noloop')) loop = false
    
    const volumeMatch = options.match(/volume\s+([\d.]+)/)
    if (volumeMatch) volume = parseFloat(volumeMatch[1])
    
    this.advance()
    return createPlayNode(channel, file, { fadeIn, loop, volume, line: line.lineNumber })
  }

  /**
   * Parse a voice statement
   * Format: voice "file"
   */
  private parseVoice(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^voice\s+"([^"]+)"\s*$/)
    if (!match) return null
    
    const file = match[1]
    
    this.advance()
    return createPlayNode('voice', file, { line: line.lineNumber })
  }

  /**
   * Parse a stop statement
   * Format: stop channel or stop channel fadeout X
   */
  private parseStop(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^stop\s+(music|sound|voice)(.*)$/)
    if (!match) return null
    
    const channel = match[1] as 'music' | 'sound' | 'voice'
    const options = match[2].trim()
    
    let fadeOut: number | undefined
    const fadeOutMatch = options.match(/fadeout\s+([\d.]+)/)
    if (fadeOutMatch) fadeOut = parseFloat(fadeOutMatch[1])
    
    this.advance()
    return createStopNode(channel, { fadeOut, line: line.lineNumber })
  }


  /**
   * Parse a pause statement
   * Format: pause or pause X
   */
  private parsePause(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^pause(?:\s+([\d.]+))?\s*$/)
    if (!match) return null
    
    const duration = match[1] ? parseFloat(match[1]) : undefined
    
    this.advance()
    return createPauseNode({ duration, line: line.lineNumber })
  }

  /**
   * Parse NVL statements
   * Format: nvl show, nvl hide, nvl clear
   */
  private parseNVL(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^nvl\s+(show|hide|clear)\s*$/)
    if (!match) return null
    
    const action = match[1] as 'show' | 'hide' | 'clear'
    
    this.advance()
    return createNVLNode(action, { line: line.lineNumber })
  }

  /**
   * Parse a python block or single line
   * Format: python: or $ code
   */
  private parsePython(line: LineInfo): ASTNode | null {
    // Single line python: $ code
    const singleMatch = line.content.match(/^\$\s+(.+)$/)
    if (singleMatch) {
      this.advance()
      return createPythonNode(singleMatch[1], { line: line.lineNumber })
    }
    
    // Python block: python: or init python:
    const blockMatch = line.content.match(/^(init\s+)?python(\s+early)?(\s+hide)?\s*:\s*$/)
    if (blockMatch) {
      const early = !!blockMatch[2]
      const hide = !!blockMatch[3]
      
      this.advance()
      
      // Collect python code lines
      const codeLines: string[] = []
      const codeIndent = this.currentLine()?.indent ?? 0
      
      if (codeIndent > line.indent) {
        while (this.currentLine() !== null && this.currentLine()!.indent >= codeIndent) {
          const codeLine = this.currentLine()!
          // Preserve relative indentation
          const relativeIndent = codeLine.indent - codeIndent
          codeLines.push(' '.repeat(relativeIndent) + codeLine.content)
          this.advance()
        }
      }
      
      return createPythonNode(codeLines.join('\n'), { early, hide, line: line.lineNumber })
    }
    
    return null
  }

  /**
   * Parse a define statement
   * Format: define name = value
   */
  private parseDefine(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^define\s+(?:(\w+)\.)?(\w+)\s*=\s*(.+)$/)
    if (!match) return null
    
    const store = match[1]
    const name = match[2]
    const value = match[3].trim()
    
    this.advance()
    return createDefineNode(name, value, { store, line: line.lineNumber })
  }

  /**
   * Parse a default statement
   * Format: default name = value
   */
  private parseDefault(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^default\s+(\w+)\s*=\s*(.+)$/)
    if (!match) return null
    
    const name = match[1]
    const value = match[2].trim()
    
    this.advance()
    return createDefaultNode(name, value, { line: line.lineNumber })
  }

  /**
   * Parse a set/assignment statement
   * Format: $ var = value or $ var += value
   */
  private parseSet(line: LineInfo): ASTNode | null {
    const match = line.content.match(/^\$\s+(\w+)\s*(\+?=|-?=|\*?=|\/=)\s*(.+)$/)
    if (!match) return null
    
    const variable = match[1]
    let operator = match[2] as '=' | '+=' | '-=' | '*=' | '/='
    // Normalize operators
    if (operator === '+=') operator = '+='
    else if (operator === '-=') operator = '-='
    else if (operator === '*=') operator = '*='
    else if (operator === '/=') operator = '/='
    else operator = '='
    
    const value = match[3].trim()
    
    this.advance()
    return createSetNode(variable, value, { operator, line: line.lineNumber })
  }
}

/**
 * Create a parser instance and parse source
 */
export function parse(source: string, filePath: string = ''): ParseResult {
  const parser = new RenpyParser()
  return parser.parse(source, filePath)
}
