/**
 * BlockValidator
 * 积木验证器
 * 
 * Validates block configurations and detects errors such as:
 * - Required slots being empty
 * - Invalid jump/call targets
 * - Missing resources
 * - Python expression syntax errors
 * 
 * Implements Requirements:
 * - 10.1: 必填属性槽为空时以视觉方式标记该槽位
 * - 10.2: Jump/Call 目标 Label 不存在时显示警告标记
 * - 10.3: 资源文件不存在时显示缺失资源警告
 * - 10.5: 在积木面板旁显示当前错误数量汇总
 */

import {
  Block,
  BlockSlot,
  ValidationContext,
  ValidationError,
  ValidationResult,
  ErrorSummary,
} from './types'

/**
 * Validation error types
 */
export type ValidationErrorType = 'required' | 'invalid-target' | 'missing-resource' | 'syntax'

/**
 * BlockValidator class
 * 
 * Validates blocks and their slot configurations.
 */
export class BlockValidator {
  /**
   * Validate a single block
   * 
   * @param block - The block to validate
   * @param context - The validation context containing available resources
   * @returns Validation result with errors
   */
  validateBlock(block: Block, context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = []

    // Validate required slots
    errors.push(...this.validateRequiredSlots(block))

    // Validate target references (jump/call)
    errors.push(...this.validateTargetReferences(block, context))

    // Validate resource references
    errors.push(...this.validateResourceReferences(block, context))

    // Validate Python expressions
    errors.push(...this.validateExpressions(block))

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate an entire block tree
   * 
   * @param root - The root block of the tree
   * @param context - The validation context
   * @returns Array of all validation errors
   */
  validateTree(root: Block, context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = []

    // Validate the root block
    const rootResult = this.validateBlock(root, context)
    errors.push(...rootResult.errors)

    // Recursively validate children
    if (root.children) {
      for (const child of root.children) {
        errors.push(...this.validateTree(child, context))
      }
    }

    return errors
  }

  /**
   * Get error summary grouped by type
   * 
   * @param errors - Array of validation errors
   * @returns Error summary with counts by type
   */
  getErrorSummary(errors: ValidationError[]): ErrorSummary {
    const byType: Record<ValidationErrorType, number> = {
      'required': 0,
      'invalid-target': 0,
      'missing-resource': 0,
      'syntax': 0,
    }

    for (const error of errors) {
      byType[error.type]++
    }

    return {
      total: errors.length,
      byType,
    }
  }

  // ========================================
  // Validation Rules
  // ========================================

  /**
   * Validate required slots are not empty
   * Implements Requirement 10.1
   */
  private validateRequiredSlots(block: Block): ValidationError[] {
    const errors: ValidationError[] = []

    for (const slot of block.slots) {
      if (slot.required && this.isSlotEmpty(slot)) {
        errors.push({
          blockId: block.id,
          slotName: slot.name,
          type: 'required',
          message: `必填字段 "${slot.name}" 不能为空`,
        })
      }
    }

    return errors
  }

  /**
   * Validate jump/call target labels exist
   * Implements Requirement 10.2
   */
  private validateTargetReferences(block: Block, context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = []

    // Only validate jump and call blocks
    if (block.type !== 'jump' && block.type !== 'call') {
      return errors
    }

    const targetSlot = block.slots.find(s => s.name === 'target')
    if (!targetSlot) {
      return errors
    }

    const targetValue = targetSlot.value as string
    
    // Skip validation if target is empty (will be caught by required validation)
    if (!targetValue || targetValue.trim() === '') {
      return errors
    }

    // Check if target label exists
    if (!context.availableLabels.includes(targetValue)) {
      errors.push({
        blockId: block.id,
        slotName: 'target',
        type: 'invalid-target',
        message: `目标 Label "${targetValue}" 不存在`,
      })
    }

    return errors
  }

  /**
   * Validate resource references (images, audio)
   * Implements Requirement 10.3
   */
  private validateResourceReferences(block: Block, context: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = []

    for (const slot of block.slots) {
      // Skip empty slots (will be caught by required validation if needed)
      if (this.isSlotEmpty(slot)) {
        continue
      }

      const value = slot.value as string

      // Validate image resources
      if (slot.type === 'image') {
        if (!context.availableImages.includes(value)) {
          errors.push({
            blockId: block.id,
            slotName: slot.name,
            type: 'missing-resource',
            message: `图片资源 "${value}" 不存在`,
          })
        }
      }

      // Validate audio resources
      if (slot.type === 'audio') {
        if (!context.availableAudio.includes(value)) {
          errors.push({
            blockId: block.id,
            slotName: slot.name,
            type: 'missing-resource',
            message: `音频资源 "${value}" 不存在`,
          })
        }
      }

      // Validate character references
      if (slot.type === 'character' && block.type !== 'dialogue') {
        // For show/hide blocks, character is an image tag, not a script-defined character
        // Skip validation for show/hide blocks - they use image tags
        if (block.type !== 'show' && block.type !== 'hide') {
          // For other non-dialogue blocks, character must exist
          if (!context.availableCharacters.includes(value)) {
            errors.push({
              blockId: block.id,
              slotName: slot.name,
              type: 'missing-resource',
              message: `角色 "${value}" 未定义`,
            })
          }
        }
      }
    }

    return errors
  }

  /**
   * Validate Python expressions for syntax errors
   * Implements Requirement 10.3 (syntax validation)
   */
  private validateExpressions(block: Block): ValidationError[] {
    const errors: ValidationError[] = []

    for (const slot of block.slots) {
      // Only validate expression type slots
      if (slot.type !== 'expression') {
        continue
      }

      // Skip empty expressions
      if (this.isSlotEmpty(slot)) {
        continue
      }

      const expression = slot.value as string
      const syntaxError = this.validatePythonExpression(expression)
      
      if (syntaxError) {
        errors.push({
          blockId: block.id,
          slotName: slot.name,
          type: 'syntax',
          message: `表达式语法错误: ${syntaxError}`,
        })
      }
    }

    // Also validate python block code
    if (block.type === 'python') {
      const codeSlot = block.slots.find(s => s.name === 'code')
      if (codeSlot && !this.isSlotEmpty(codeSlot)) {
        const code = codeSlot.value as string
        const syntaxError = this.validatePythonCode(code)
        
        if (syntaxError) {
          errors.push({
            blockId: block.id,
            slotName: 'code',
            type: 'syntax',
            message: `Python 代码语法错误: ${syntaxError}`,
          })
        }
      }
    }

    return errors
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Check if a slot value is empty
   */
  private isSlotEmpty(slot: BlockSlot): boolean {
    const value = slot.value

    if (value === null || value === undefined) {
      return true
    }

    if (typeof value === 'string') {
      return value.trim() === ''
    }

    return false
  }

  /**
   * Validate a Python expression for basic syntax errors
   * This is a simplified validation - full validation would require a Python parser
   */
  private validatePythonExpression(expression: string): string | null {
    // Check for balanced parentheses
    const parenError = this.checkBalancedParentheses(expression)
    if (parenError) {
      return parenError
    }

    // Check for balanced brackets
    const bracketError = this.checkBalancedBrackets(expression)
    if (bracketError) {
      return bracketError
    }

    // Check for balanced quotes
    const quoteError = this.checkBalancedQuotes(expression)
    if (quoteError) {
      return quoteError
    }

    // Check for common syntax errors
    const commonError = this.checkCommonSyntaxErrors(expression)
    if (commonError) {
      return commonError
    }

    return null
  }

  /**
   * Validate Python code block for basic syntax errors
   */
  private validatePythonCode(code: string): string | null {
    // Use the same validation as expressions
    return this.validatePythonExpression(code)
  }

  /**
   * Check for balanced parentheses
   */
  private checkBalancedParentheses(text: string): string | null {
    let count = 0
    let inString = false
    let stringChar = ''

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const prevChar = i > 0 ? text[i - 1] : ''

      // Track string state
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
        }
      }

      // Only count parentheses outside strings
      if (!inString) {
        if (char === '(') count++
        if (char === ')') count--
        if (count < 0) return '括号不匹配：多余的右括号'
      }
    }

    if (count > 0) return '括号不匹配：缺少右括号'
    return null
  }

  /**
   * Check for balanced brackets
   */
  private checkBalancedBrackets(text: string): string | null {
    let squareCount = 0
    let curlyCount = 0
    let inString = false
    let stringChar = ''

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const prevChar = i > 0 ? text[i - 1] : ''

      // Track string state
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
        }
      }

      // Only count brackets outside strings
      if (!inString) {
        if (char === '[') squareCount++
        if (char === ']') squareCount--
        if (char === '{') curlyCount++
        if (char === '}') curlyCount--
        if (squareCount < 0) return '方括号不匹配：多余的右方括号'
        if (curlyCount < 0) return '花括号不匹配：多余的右花括号'
      }
    }

    if (squareCount > 0) return '方括号不匹配：缺少右方括号'
    if (curlyCount > 0) return '花括号不匹配：缺少右花括号'
    return null
  }

  /**
   * Check for balanced quotes
   */
  private checkBalancedQuotes(text: string): string | null {
    let inSingleQuote = false
    let inDoubleQuote = false
    let inTripleSingle = false
    let inTripleDouble = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const prevChar = i > 0 ? text[i - 1] : ''
      const nextTwo = text.substring(i, i + 3)

      // Skip escaped quotes
      if (prevChar === '\\') continue

      // Check for triple quotes first
      if (nextTwo === '"""') {
        if (!inSingleQuote && !inTripleSingle) {
          inTripleDouble = !inTripleDouble
          i += 2
          continue
        }
      }
      if (nextTwo === "'''") {
        if (!inDoubleQuote && !inTripleDouble) {
          inTripleSingle = !inTripleSingle
          i += 2
          continue
        }
      }

      // Check for single quotes
      if (char === "'" && !inDoubleQuote && !inTripleDouble && !inTripleSingle) {
        inSingleQuote = !inSingleQuote
      }
      if (char === '"' && !inSingleQuote && !inTripleDouble && !inTripleSingle) {
        inDoubleQuote = !inDoubleQuote
      }
    }

    if (inSingleQuote) return '引号不匹配：缺少单引号'
    if (inDoubleQuote) return '引号不匹配：缺少双引号'
    if (inTripleSingle) return '引号不匹配：缺少三单引号'
    if (inTripleDouble) return '引号不匹配：缺少三双引号'
    return null
  }

  /**
   * Check for common Python syntax errors
   */
  private checkCommonSyntaxErrors(text: string): string | null {
    // Check for assignment in condition (common mistake)
    // This is a heuristic - single = in a condition-like context
    const trimmed = text.trim()
    
    // Check for empty comparison operators
    if (/[<>=!]=\s*$/.test(trimmed)) {
      return '比较运算符后缺少值'
    }

    // Check for dangling operators
    if (/[+\-*/%]\s*$/.test(trimmed) && !trimmed.endsWith('++') && !trimmed.endsWith('--')) {
      return '运算符后缺少操作数'
    }

    // Check for invalid identifier start
    if (/^\d+[a-zA-Z_]/.test(trimmed)) {
      return '标识符不能以数字开头'
    }

    return null
  }
}

/**
 * Factory function to create a BlockValidator instance
 */
export function createBlockValidator(): BlockValidator {
  return new BlockValidator()
}

/**
 * Convenience function to validate a block tree
 */
export function validateBlockTree(root: Block, context: ValidationContext): ValidationError[] {
  const validator = new BlockValidator()
  return validator.validateTree(root, context)
}

/**
 * Convenience function to get error summary
 */
export function getValidationErrorSummary(errors: ValidationError[]): ErrorSummary {
  const validator = new BlockValidator()
  return validator.getErrorSummary(errors)
}
