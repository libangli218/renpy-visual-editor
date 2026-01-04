/**
 * FileClassifier - 文件分类器
 * 
 * 将 Ren'Py 项目中的 .rpy 文件分类为剧情脚本和配置文件。
 * 
 * Implements Requirements 1.1, 1.2, 1.3:
 * - 1.1: 项目打开时分类 .rpy 文件
 * - 1.2: 通过检测 define/style/screen/init python/transform 识别配置文件
 * - 1.3: 通过检测包含对话的 label 识别剧情脚本
 */

import { RenpyScript, ASTNode, LabelNode } from '../../types/ast'

/**
 * File classification result
 */
export interface FileClassification {
  /** Story script file paths - files containing labels with dialogue */
  storyScripts: string[]
  /** Config file paths - files primarily containing define/style/screen statements */
  configFiles: string[]
  /** Files that couldn't be classified */
  unknownFiles: string[]
}

/**
 * Classification result for a single file
 */
export type SingleFileClassification = 'story' | 'config' | 'unknown'

/**
 * Statistics about file content for classification
 */
interface FileStats {
  /** Number of label statements */
  labelCount: number
  /** Number of dialogue statements (including those inside labels) */
  dialogueCount: number
  /** Number of define statements */
  defineCount: number
  /** Number of style statements (in raw nodes) */
  styleCount: number
  /** Number of screen statements (in raw nodes) */
  screenCount: number
  /** Number of init python blocks */
  initPythonCount: number
  /** Number of transform statements (in raw nodes) */
  transformCount: number
  /** Total number of statements */
  totalStatements: number
}

/**
 * Known config file names that are always classified as config files
 */
const KNOWN_CONFIG_FILES = [
  'options.rpy',
  'gui.rpy',
  'screens.rpy',
]

/**
 * FileClassifier class
 * 
 * Classifies Ren'Py script files into story scripts and config files
 * based on their content.
 */
export class FileClassifier {
  /**
   * Classify all scripts in a project
   * 
   * @param scripts - Map of file paths to parsed ASTs
   * @returns Classification result with categorized file paths
   */
  classifyProject(scripts: Map<string, RenpyScript>): FileClassification {
    const result: FileClassification = {
      storyScripts: [],
      configFiles: [],
      unknownFiles: [],
    }

    for (const [filePath, ast] of scripts) {
      const classification = this.classifyFile(ast, filePath)
      
      switch (classification) {
        case 'story':
          result.storyScripts.push(filePath)
          break
        case 'config':
          result.configFiles.push(filePath)
          break
        default:
          result.unknownFiles.push(filePath)
      }
    }

    return result
  }

  /**
   * Classify a single file
   * 
   * @param ast - Parsed AST of the file
   * @param filePath - Optional file path for name-based hints
   * @returns Classification: 'story', 'config', or 'unknown'
   */
  classifyFile(ast: RenpyScript, filePath?: string): SingleFileClassification {
    // Check for known config file names first
    if (filePath && this.isKnownConfigFile(filePath)) {
      return 'config'
    }

    // Analyze file content
    const stats = this.analyzeFile(ast)

    // Empty files are unknown
    if (stats.totalStatements === 0) {
      return 'unknown'
    }

    // Check if it's a story script (has labels with dialogue)
    if (this.isStoryScript(ast)) {
      return 'story'
    }

    // Check if it's a config file (primarily config statements)
    if (this.isConfigFile(ast)) {
      return 'config'
    }

    return 'unknown'
  }

  /**
   * Check if a file is a story script
   * 
   * A story script contains label statements with dialogue content.
   * 
   * @param ast - Parsed AST of the file
   * @returns true if the file is a story script
   */
  isStoryScript(ast: RenpyScript): boolean {
    // Look for labels that contain dialogue
    for (const node of ast.statements) {
      if (node.type === 'label') {
        const labelNode = node as LabelNode
        if (this.labelHasDialogue(labelNode)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Check if a file is a config file
   * 
   * A config file primarily contains define, style, screen, init python,
   * or transform statements.
   * 
   * @param ast - Parsed AST of the file
   * @returns true if the file is a config file
   */
  isConfigFile(ast: RenpyScript): boolean {
    const stats = this.analyzeFile(ast)
    
    // If there are no statements, it's not a config file
    if (stats.totalStatements === 0) {
      return false
    }

    // Count config-related statements
    const configStatements = 
      stats.defineCount + 
      stats.styleCount + 
      stats.screenCount + 
      stats.initPythonCount + 
      stats.transformCount

    // If more than 50% of statements are config-related, it's a config file
    // Also consider it a config file if it has no labels and has config statements
    const configRatio = configStatements / stats.totalStatements
    
    if (configRatio > 0.5) {
      return true
    }

    // If there are no labels but there are config statements, it's a config file
    if (stats.labelCount === 0 && configStatements > 0) {
      return true
    }

    return false
  }

  /**
   * Check if a file path matches a known config file name
   */
  private isKnownConfigFile(filePath: string): boolean {
    const fileName = this.getFileName(filePath).toLowerCase()
    return KNOWN_CONFIG_FILES.some(name => fileName === name.toLowerCase())
  }

  /**
   * Get file name from path
   */
  private getFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/)
    return parts[parts.length - 1] || ''
  }

  /**
   * Check if a label contains dialogue statements
   */
  private labelHasDialogue(label: LabelNode): boolean {
    return this.hasDialogueInStatements(label.body)
  }

  /**
   * Recursively check if statements contain dialogue
   */
  private hasDialogueInStatements(statements: ASTNode[]): boolean {
    for (const node of statements) {
      if (node.type === 'dialogue') {
        return true
      }
      
      // Check nested statements in menu choices
      if (node.type === 'menu') {
        for (const choice of node.choices) {
          if (this.hasDialogueInStatements(choice.body)) {
            return true
          }
        }
      }
      
      // Check nested statements in if branches
      if (node.type === 'if') {
        for (const branch of node.branches) {
          if (this.hasDialogueInStatements(branch.body)) {
            return true
          }
        }
      }
    }
    return false
  }

  /**
   * Analyze file content and return statistics
   */
  private analyzeFile(ast: RenpyScript): FileStats {
    const stats: FileStats = {
      labelCount: 0,
      dialogueCount: 0,
      defineCount: 0,
      styleCount: 0,
      screenCount: 0,
      initPythonCount: 0,
      transformCount: 0,
      totalStatements: ast.statements.length,
    }

    for (const node of ast.statements) {
      this.analyzeNode(node, stats)
    }

    return stats
  }

  /**
   * Analyze a single node and update statistics
   */
  private analyzeNode(node: ASTNode, stats: FileStats): void {
    switch (node.type) {
      case 'label':
        stats.labelCount++
        // Also count dialogues inside the label
        this.countDialoguesInStatements((node as LabelNode).body, stats)
        break
      
      case 'dialogue':
        stats.dialogueCount++
        break
      
      case 'define':
        stats.defineCount++
        break
      
      case 'python':
        // Check if it's an init python block
        if (node.early || node.hide) {
          stats.initPythonCount++
        }
        break
      
      case 'raw':
        // Check raw content for style, screen, transform, init python
        const content = node.content.toLowerCase()
        if (content.startsWith('style ') || content.includes('\nstyle ')) {
          stats.styleCount++
        }
        if (content.startsWith('screen ') || content.includes('\nscreen ')) {
          stats.screenCount++
        }
        if (content.startsWith('transform ') || content.includes('\ntransform ')) {
          stats.transformCount++
        }
        if (content.startsWith('init python') || content.includes('\ninit python')) {
          stats.initPythonCount++
        }
        break
    }
  }

  /**
   * Count dialogues in a list of statements recursively
   */
  private countDialoguesInStatements(statements: ASTNode[], stats: FileStats): void {
    for (const node of statements) {
      if (node.type === 'dialogue') {
        stats.dialogueCount++
      } else if (node.type === 'menu') {
        for (const choice of node.choices) {
          this.countDialoguesInStatements(choice.body, stats)
        }
      } else if (node.type === 'if') {
        for (const branch of node.branches) {
          this.countDialoguesInStatements(branch.body, stats)
        }
      }
    }
  }
}

/**
 * Find the best default file to open
 * 
 * Priority:
 * 1. script.rpy (if it's a story script)
 * 2. First story script found
 * 3. First file in the project
 * 
 * @param scripts - Map of file paths to parsed ASTs
 * @returns The file path to open, or undefined if no files
 */
export function findDefaultFile(scripts: Map<string, RenpyScript>): string | undefined {
  if (scripts.size === 0) {
    return undefined
  }

  const classifier = new FileClassifier()
  const classification = classifier.classifyProject(scripts)

  // Priority 1: Look for script.rpy in story scripts
  const scriptRpy = classification.storyScripts.find(path => {
    const fileName = path.split(/[/\\]/).pop()?.toLowerCase()
    return fileName === 'script.rpy'
  })
  
  if (scriptRpy) {
    return scriptRpy
  }

  // Priority 2: First story script
  if (classification.storyScripts.length > 0) {
    return classification.storyScripts[0]
  }

  // Priority 3: First file in the project
  return Array.from(scripts.keys())[0]
}

// Export singleton instance for convenience
export const fileClassifier = new FileClassifier()
