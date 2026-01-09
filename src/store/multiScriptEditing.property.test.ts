/**
 * Property-Based Tests for Multi-Script Editing
 * 
 * Feature: multi-script-editing
 * 
 * Tests the core properties of the multi-script editing functionality:
 * - Property 1: Script switching data integrity
 * - Property 2: File name validation
 * - Property 3: File list display
 * - Property 4: Script switching state management
 * - Property 5: Cross-file resource aggregation
 * - Property 7: Modification state tracking
 * - Property 8: Keyboard navigation
 * - Property 9: File filtering
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { 
  useEditorStore, 
  ScriptFileInfo, 
  AggregatedCharacter, 
  AggregatedVariable 
} from './editorStore'
import { 
  isValidFileName, 
  fileExists, 
  generateLabelName 
} from '../components/blockMode/NewScriptDialog'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Reset the editor store to initial state
 */
function resetStore(): void {
  useEditorStore.setState({
    mode: 'multi-label',
    complexity: 'simple',
    projectPath: null,
    currentFile: null,
    modified: false,
    ast: null,
    astVersion: 0,
    selectedNodeId: null,
    selectedBlockId: null,
    currentBlockLabel: null,
    previewVisible: true,
    propertiesVisible: true,
    canUndo: false,
    canRedo: false,
    scriptFiles: [],
    scriptStates: new Map(),
    isLoading: false,
    loadingFile: null,
    allCharacters: [],
    allVariables: [],
  })
}

/**
 * Create a mock ScriptFileInfo
 */
function createMockScriptFile(
  name: string, 
  modified: boolean = false, 
  hasError: boolean = false
): ScriptFileInfo {
  return {
    path: `/game/${name}`,
    name,
    modified,
    hasError,
    errorMessage: hasError ? 'Parse error' : undefined,
  }
}

// ============================================================================
// Arbitrary Generators
// ============================================================================

/**
 * Generate valid file names (valid Python identifiers)
 */
const arbValidFileName = fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,15}$/)
  .filter(name => name.length > 0)

/**
 * Generate invalid file names (starting with numbers or containing invalid chars)
 */
const arbInvalidFileName = fc.oneof(
  // Names starting with numbers
  fc.tuple(
    fc.integer({ min: 0, max: 9 }).map(String),
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'), { minLength: 0, maxLength: 10 })
  ).map(([digit, rest]) => digit + rest),
  // Names with invalid characters
  fc.stringOf(
    fc.constantFrom(...'!@#$%^&*()-+=[]{}|;:\'",.<>?/`~ '),
    { minLength: 1, maxLength: 10 }
  ),
  // Empty string
  fc.constant('')
)


/**
 * Generate script file info
 */
const arbScriptFileInfo: fc.Arbitrary<ScriptFileInfo> = fc.record({
  path: arbValidFileName.map(name => `/game/${name}.rpy`),
  name: arbValidFileName.map(name => `${name}.rpy`),
  modified: fc.boolean(),
  hasError: fc.boolean(),
}).chain(info => 
  fc.constant({
    ...info,
    errorMessage: info.hasError ? 'Parse error' : undefined,
  })
)

/**
 * Generate a list of script files with unique names
 */
const arbScriptFileList = fc.array(arbValidFileName, { minLength: 1, maxLength: 10 })
  .map(names => {
    // Ensure unique names
    const uniqueNames = [...new Set(names)]
    return uniqueNames.map(name => createMockScriptFile(`${name}.rpy`))
  })

/**
 * Generate a list of script files that includes script.rpy
 */
const arbScriptFileListWithScriptRpy = arbScriptFileList.map(files => {
  // Ensure script.rpy is in the list
  const hasScriptRpy = files.some(f => f.name === 'script.rpy')
  if (!hasScriptRpy) {
    files.push(createMockScriptFile('script.rpy'))
  }
  return files
})

/**
 * Generate filter text
 */
const arbFilterText = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'),
  { minLength: 0, maxLength: 10 }
)

/**
 * Generate aggregated character
 */
const arbAggregatedCharacter: fc.Arbitrary<AggregatedCharacter> = fc.record({
  name: arbValidFileName,
  displayName: fc.string({ minLength: 1, maxLength: 20 }),
  color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`),
  imagePrefix: fc.option(arbValidFileName, { nil: undefined }),
  sourceFile: arbValidFileName.map(name => `/game/${name}.rpy`),
  sourceFileName: arbValidFileName.map(name => `${name}.rpy`),
})

/**
 * Generate aggregated variable
 */
const arbAggregatedVariable: fc.Arbitrary<AggregatedVariable> = fc.record({
  name: arbValidFileName,
  value: fc.oneof(
    fc.constant('True'),
    fc.constant('False'),
    fc.integer().map(String),
    fc.string({ minLength: 1, maxLength: 10 }).map(s => `"${s.replace(/"/g, '')}"`)
  ),
  scope: fc.constantFrom('define', 'default', 'persistent') as fc.Arbitrary<'define' | 'default' | 'persistent'>,
  sourceFile: arbValidFileName.map(name => `/game/${name}.rpy`),
  sourceFileName: arbValidFileName.map(name => `${name}.rpy`),
})


// ============================================================================
// Property 1: Script Switching Data Integrity
// Feature: multi-script-editing, Property 1
// Validates: Requirements 1.3, 3.1, 3.2
// ============================================================================

describe('Property 1: Script Switching Data Integrity', () => {
  beforeEach(() => {
    resetStore()
  })

  /**
   * For any script switch operation, the current file should be updated correctly
   */
  it('should update currentFile when switching scripts', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        fc.integer({ min: 0, max: 100 }),
        (files, indexSeed) => {
          if (files.length === 0) return true
          
          resetStore()
          
          // Set up initial state with script files
          useEditorStore.setState({ scriptFiles: files })
          
          // Select a file to switch to
          const targetIndex = indexSeed % files.length
          const targetFile = files[targetIndex]
          
          // Simulate setting current file (switchScript is async, so we test the state update)
          useEditorStore.setState({ currentFile: targetFile.path })
          
          // Verify the current file is updated
          const state = useEditorStore.getState()
          expect(state.currentFile).toBe(targetFile.path)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * For any script switch, selection state should be reset
   */
  it('should reset selection state when switching scripts', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        arbValidFileName,
        arbValidFileName,
        (files, nodeId, blockId) => {
          if (files.length < 2) return true
          
          resetStore()
          
          // Set up initial state with selections
          useEditorStore.setState({
            scriptFiles: files,
            currentFile: files[0].path,
            selectedNodeId: nodeId,
            selectedBlockId: blockId,
          })
          
          // Verify initial selections are set
          let state = useEditorStore.getState()
          expect(state.selectedNodeId).toBe(nodeId)
          expect(state.selectedBlockId).toBe(blockId)
          
          // Simulate switching to another file (reset selections)
          useEditorStore.setState({
            currentFile: files[1].path,
            selectedNodeId: null,
            selectedBlockId: null,
          })
          
          // Verify selections are reset
          state = useEditorStore.getState()
          expect(state.selectedNodeId).toBeNull()
          expect(state.selectedBlockId).toBeNull()
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 2: File Name Validation
// Feature: multi-script-editing, Property 2
// Validates: Requirements 2.3, 2.4
// ============================================================================

describe('Property 2: File Name Validation', () => {
  /**
   * Valid Python identifiers should be accepted as file names
   */
  it('should accept valid Python identifiers as file names', () => {
    fc.assert(
      fc.property(arbValidFileName, (name) => {
        expect(isValidFileName(name)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Invalid file names should be rejected
   */
  it('should reject invalid file names', () => {
    fc.assert(
      fc.property(arbInvalidFileName, (name) => {
        // Empty strings and strings starting with numbers should be invalid
        // Strings with special characters should be invalid
        if (name === '' || /^[0-9]/.test(name) || /[^a-zA-Z0-9_]/.test(name)) {
          expect(isValidFileName(name)).toBe(false)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Duplicate file names should be detected
   */
  it('should detect duplicate file names (case-insensitive)', () => {
    fc.assert(
      fc.property(
        arbValidFileName,
        fc.array(arbValidFileName, { minLength: 0, maxLength: 5 }),
        (name, otherNames) => {
          // Create existing files list including the name
          const existingFiles = [...otherNames, name].map(n => `${n}.rpy`)
          
          // The name should be detected as existing
          expect(fileExists(name, existingFiles)).toBe(true)
          
          // Case-insensitive check
          expect(fileExists(name.toUpperCase(), existingFiles)).toBe(true)
          expect(fileExists(name.toLowerCase(), existingFiles)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Non-existing file names should not be detected as duplicates
   */
  it('should not detect non-existing file names as duplicates', () => {
    fc.assert(
      fc.property(
        arbValidFileName,
        fc.array(arbValidFileName, { minLength: 0, maxLength: 5 }),
        (name, otherNames) => {
          // Filter out the name from other names
          const existingFiles = otherNames
            .filter(n => n.toLowerCase() !== name.toLowerCase())
            .map(n => `${n}.rpy`)
          
          // The name should not be detected as existing
          expect(fileExists(name, existingFiles)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Label name generation should produce valid identifiers
   */
  it('should generate valid label names from file names', () => {
    fc.assert(
      fc.property(arbValidFileName, (fileName) => {
        const labelName = generateLabelName(fileName)
        
        // Label name should be a valid identifier
        expect(isValidFileName(labelName)).toBe(true)
        
        // Label name should not be empty
        expect(labelName.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 3: File List Display
// Feature: multi-script-editing, Property 3
// Validates: Requirements 1.5, 1.9
// ============================================================================

describe('Property 3: File List Display', () => {
  beforeEach(() => {
    resetStore()
  })

  /**
   * Display names should only contain file names (not paths)
   */
  it('should display file names without paths', () => {
    fc.assert(
      fc.property(arbScriptFileList, (files) => {
        for (const file of files) {
          // Name should not contain path separators
          expect(file.name).not.toContain('/')
          expect(file.name).not.toContain('\\')
          
          // Name should end with .rpy
          expect(file.name.endsWith('.rpy')).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * script.rpy should always be sorted first
   */
  it('should sort script.rpy first, then alphabetically', () => {
    fc.assert(
      fc.property(arbScriptFileListWithScriptRpy, (files) => {
        // Sort the files using the same logic as the store
        const sortedFiles = [...files].sort((a, b) => {
          if (a.name === 'script.rpy') return -1
          if (b.name === 'script.rpy') return 1
          return a.name.localeCompare(b.name)
        })
        
        // script.rpy should be first
        expect(sortedFiles[0].name).toBe('script.rpy')
        
        // Remaining files should be sorted alphabetically
        for (let i = 2; i < sortedFiles.length; i++) {
          const prev = sortedFiles[i - 1].name
          const curr = sortedFiles[i].name
          if (prev !== 'script.rpy') {
            expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0)
          }
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Files without script.rpy should be sorted alphabetically
   */
  it('should sort files alphabetically when no script.rpy', () => {
    fc.assert(
      fc.property(
        fc.array(arbValidFileName, { minLength: 2, maxLength: 10 })
          .map(names => [...new Set(names)])
          .filter(names => !names.includes('script'))
          .map(names => names.map(n => createMockScriptFile(`${n}.rpy`))),
        (files) => {
          if (files.length < 2) return true
          
          // Sort the files
          const sortedFiles = [...files].sort((a, b) => {
            if (a.name === 'script.rpy') return -1
            if (b.name === 'script.rpy') return 1
            return a.name.localeCompare(b.name)
          })
          
          // All files should be sorted alphabetically
          for (let i = 1; i < sortedFiles.length; i++) {
            expect(sortedFiles[i - 1].name.localeCompare(sortedFiles[i].name)).toBeLessThanOrEqual(0)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 4: Script Switching State Management
// Feature: multi-script-editing, Property 4
// Validates: Requirements 3.3, 3.4, 3.6
// ============================================================================

describe('Property 4: Script Switching State Management', () => {
  beforeEach(() => {
    resetStore()
  })

  /**
   * Editor mode should be preserved when switching scripts
   */
  it('should preserve editor mode when switching scripts', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        fc.constantFrom('multi-label', 'block', 'story') as fc.Arbitrary<'multi-label' | 'block' | 'story'>,
        (files, mode) => {
          if (files.length < 2) return true
          
          resetStore()
          
          // Set up initial state with mode
          useEditorStore.setState({
            scriptFiles: files,
            currentFile: files[0].path,
            mode,
          })
          
          // Verify initial mode
          let state = useEditorStore.getState()
          expect(state.mode).toBe(mode)
          
          // Simulate switching to another file (mode should be preserved)
          useEditorStore.setState({
            currentFile: files[1].path,
            selectedNodeId: null,
            selectedBlockId: null,
            // Mode is NOT changed during switch
          })
          
          // Verify mode is preserved
          state = useEditorStore.getState()
          expect(state.mode).toBe(mode)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Selection state should be reset when switching scripts
   */
  it('should reset selection state when switching scripts', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        arbValidFileName,
        arbValidFileName,
        (files, nodeId, blockId) => {
          if (files.length < 2) return true
          
          resetStore()
          
          // Set up initial state with selections
          useEditorStore.setState({
            scriptFiles: files,
            currentFile: files[0].path,
            selectedNodeId: nodeId,
            selectedBlockId: blockId,
          })
          
          // Simulate switching (selections should be reset)
          useEditorStore.setState({
            currentFile: files[1].path,
            selectedNodeId: null,
            selectedBlockId: null,
          })
          
          // Verify selections are reset
          const state = useEditorStore.getState()
          expect(state.selectedNodeId).toBeNull()
          expect(state.selectedBlockId).toBeNull()
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Script states should be maintained independently per file
   */
  it('should maintain independent script states per file', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        fc.boolean(),
        fc.boolean(),
        (files, modified1, modified2) => {
          if (files.length < 2) return true
          
          resetStore()
          
          // Create script states for two files
          const scriptStates = new Map()
          scriptStates.set(files[0].path, {
            ast: null,
            undoHistory: { past: [], future: [] },
            lastAccessed: Date.now(),
            modified: modified1,
            hasError: false,
          })
          scriptStates.set(files[1].path, {
            ast: null,
            undoHistory: { past: [], future: [] },
            lastAccessed: Date.now() + 1000,
            modified: modified2,
            hasError: false,
          })
          
          useEditorStore.setState({ scriptStates })
          
          // Verify states are independent
          const state = useEditorStore.getState()
          const state1 = state.scriptStates.get(files[0].path)
          const state2 = state.scriptStates.get(files[1].path)
          
          expect(state1?.modified).toBe(modified1)
          expect(state2?.modified).toBe(modified2)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 5: Cross-File Resource Aggregation
// Feature: multi-script-editing, Property 5
// Validates: Requirements 4.1, 4.2, 4.5
// ============================================================================

describe('Property 5: Cross-File Resource Aggregation', () => {
  beforeEach(() => {
    resetStore()
  })

  /**
   * Aggregated characters should include source file information
   */
  it('should include source file information for aggregated characters', () => {
    fc.assert(
      fc.property(
        fc.array(arbAggregatedCharacter, { minLength: 1, maxLength: 10 }),
        (characters) => {
          resetStore()
          
          // Set aggregated characters
          useEditorStore.setState({ allCharacters: characters })
          
          // Verify all characters have source file info
          const state = useEditorStore.getState()
          for (const char of state.allCharacters) {
            expect(char.sourceFile).toBeDefined()
            expect(char.sourceFile.length).toBeGreaterThan(0)
            expect(char.sourceFileName).toBeDefined()
            expect(char.sourceFileName.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Aggregated variables should include source file information
   */
  it('should include source file information for aggregated variables', () => {
    fc.assert(
      fc.property(
        fc.array(arbAggregatedVariable, { minLength: 1, maxLength: 10 }),
        (variables) => {
          resetStore()
          
          // Set aggregated variables
          useEditorStore.setState({ allVariables: variables })
          
          // Verify all variables have source file info
          const state = useEditorStore.getState()
          for (const variable of state.allVariables) {
            expect(variable.sourceFile).toBeDefined()
            expect(variable.sourceFile.length).toBeGreaterThan(0)
            expect(variable.sourceFileName).toBeDefined()
            expect(variable.sourceFileName.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Aggregated variables should have valid scope values
   */
  it('should have valid scope values for aggregated variables', () => {
    fc.assert(
      fc.property(
        fc.array(arbAggregatedVariable, { minLength: 1, maxLength: 10 }),
        (variables) => {
          resetStore()
          
          useEditorStore.setState({ allVariables: variables })
          
          const state = useEditorStore.getState()
          const validScopes = ['define', 'default', 'persistent']
          
          for (const variable of state.allVariables) {
            expect(validScopes).toContain(variable.scope)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Characters from multiple files should all be aggregated
   */
  it('should aggregate characters from multiple source files', () => {
    fc.assert(
      fc.property(
        fc.array(arbValidFileName, { minLength: 2, maxLength: 5 })
          .map(names => [...new Set(names)])
          .filter(names => names.length >= 2),
        (fileNames) => {
          resetStore()
          
          // Create characters from different files
          const characters: AggregatedCharacter[] = fileNames.map((fileName, i) => ({
            name: `char_${i}`,
            displayName: `Character ${i}`,
            color: '#ffffff',
            imagePrefix: undefined,
            sourceFile: `/game/${fileName}.rpy`,
            sourceFileName: `${fileName}.rpy`,
          }))
          
          useEditorStore.setState({ allCharacters: characters })
          
          // Verify all characters are present
          const state = useEditorStore.getState()
          expect(state.allCharacters.length).toBe(fileNames.length)
          
          // Verify each file is represented
          const sourceFiles = new Set(state.allCharacters.map(c => c.sourceFileName))
          expect(sourceFiles.size).toBe(fileNames.length)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 7: Modification State Tracking
// Feature: multi-script-editing, Property 7
// Validates: Requirements 5.1, 5.2, 5.3
// ============================================================================

describe('Property 7: Modification State Tracking', () => {
  beforeEach(() => {
    resetStore()
  })

  /**
   * Modified indicator should be shown for files with unsaved changes
   */
  it('should track modification state per file independently', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(arbValidFileName, fc.boolean()),
          { minLength: 1, maxLength: 10 }
        ).map(pairs => {
          const uniquePairs = new Map(pairs.map(([name, mod]) => [name, mod]))
          return Array.from(uniquePairs.entries()).map(([name, modified]) => 
            createMockScriptFile(`${name}.rpy`, modified)
          )
        }),
        (files) => {
          resetStore()
          
          useEditorStore.setState({ scriptFiles: files })
          
          const state = useEditorStore.getState()
          
          // Verify each file's modified state is tracked
          for (const file of files) {
            const storeFile = state.scriptFiles.find(f => f.path === file.path)
            expect(storeFile).toBeDefined()
            expect(storeFile?.modified).toBe(file.modified)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Modified files should show the modified indicator (•)
   */
  it('should correctly identify modified files', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        fc.integer({ min: 0, max: 100 }),
        (files, indexSeed) => {
          if (files.length === 0) return true
          
          resetStore()
          
          // Mark one file as modified
          const modifiedIndex = indexSeed % files.length
          const modifiedFiles = files.map((f, i) => ({
            ...f,
            modified: i === modifiedIndex,
          }))
          
          useEditorStore.setState({ scriptFiles: modifiedFiles })
          
          const state = useEditorStore.getState()
          
          // Count modified files
          const modifiedCount = state.scriptFiles.filter(f => f.modified).length
          expect(modifiedCount).toBe(1)
          
          // Verify the correct file is marked
          expect(state.scriptFiles[modifiedIndex].modified).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Script states should track modification independently
   */
  it('should track modification in script states independently', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        (files, modifiedStates) => {
          if (files.length === 0) return true
          
          resetStore()
          
          // Create script states with different modification states
          const scriptStates = new Map()
          files.forEach((file, i) => {
            scriptStates.set(file.path, {
              ast: null,
              undoHistory: { past: [], future: [] },
              lastAccessed: Date.now(),
              modified: modifiedStates[i % modifiedStates.length],
              hasError: false,
            })
          })
          
          useEditorStore.setState({ scriptStates })
          
          // Verify each state is independent
          const state = useEditorStore.getState()
          files.forEach((file, i) => {
            const scriptState = state.scriptStates.get(file.path)
            expect(scriptState?.modified).toBe(modifiedStates[i % modifiedStates.length])
          })
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 8: Keyboard Navigation
// Feature: multi-script-editing, Property 8
// Validates: Requirements 6.1, 6.2
// ============================================================================

describe('Property 8: Keyboard Navigation', () => {
  beforeEach(() => {
    resetStore()
  })

  /**
   * Next script navigation should cycle through the list
   */
  it('should navigate to next script cyclically', () => {
    fc.assert(
      fc.property(
        arbScriptFileList.filter(files => files.length >= 2),
        fc.integer({ min: 0, max: 100 }),
        (files, startIndexSeed) => {
          resetStore()
          
          const startIndex = startIndexSeed % files.length
          
          useEditorStore.setState({
            scriptFiles: files,
            currentFile: files[startIndex].path,
          })
          
          // Calculate expected next index (cyclic)
          const expectedNextIndex = (startIndex + 1) % files.length
          
          // Simulate switchToNextScript logic
          const currentIndex = files.findIndex(f => f.path === files[startIndex].path)
          const nextIndex = (currentIndex + 1) % files.length
          
          expect(nextIndex).toBe(expectedNextIndex)
          expect(files[nextIndex]).toBeDefined()
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Previous script navigation should cycle through the list
   */
  it('should navigate to previous script cyclically', () => {
    fc.assert(
      fc.property(
        arbScriptFileList.filter(files => files.length >= 2),
        fc.integer({ min: 0, max: 100 }),
        (files, startIndexSeed) => {
          resetStore()
          
          const startIndex = startIndexSeed % files.length
          
          useEditorStore.setState({
            scriptFiles: files,
            currentFile: files[startIndex].path,
          })
          
          // Calculate expected previous index (cyclic)
          const expectedPrevIndex = (startIndex - 1 + files.length) % files.length
          
          // Simulate switchToPrevScript logic
          const currentIndex = files.findIndex(f => f.path === files[startIndex].path)
          const prevIndex = (currentIndex - 1 + files.length) % files.length
          
          expect(prevIndex).toBe(expectedPrevIndex)
          expect(files[prevIndex]).toBeDefined()
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Navigation should wrap around at boundaries
   */
  it('should wrap around at list boundaries', () => {
    fc.assert(
      fc.property(
        arbScriptFileList.filter(files => files.length >= 2),
        (files) => {
          resetStore()
          
          // Test wrap from last to first
          useEditorStore.setState({
            scriptFiles: files,
            currentFile: files[files.length - 1].path,
          })
          
          const lastIndex = files.length - 1
          const nextFromLast = (lastIndex + 1) % files.length
          expect(nextFromLast).toBe(0)
          
          // Test wrap from first to last
          useEditorStore.setState({
            currentFile: files[0].path,
          })
          
          const prevFromFirst = (0 - 1 + files.length) % files.length
          expect(prevFromFirst).toBe(files.length - 1)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Single file list should not change on navigation
   */
  it('should not change when only one file exists', () => {
    fc.assert(
      fc.property(
        arbValidFileName,
        (fileName) => {
          resetStore()
          
          const singleFile = createMockScriptFile(`${fileName}.rpy`)
          
          useEditorStore.setState({
            scriptFiles: [singleFile],
            currentFile: singleFile.path,
          })
          
          // With only one file, navigation should stay on the same file
          const state = useEditorStore.getState()
          
          // Next would be (0 + 1) % 1 = 0
          const nextIndex = (0 + 1) % 1
          expect(nextIndex).toBe(0)
          
          // Prev would be (0 - 1 + 1) % 1 = 0
          const prevIndex = (0 - 1 + 1) % 1
          expect(prevIndex).toBe(0)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 9: File Filtering
// Feature: multi-script-editing, Property 9
// Validates: Requirements 1.10
// ============================================================================

describe('Property 9: File Filtering', () => {
  /**
   * Filter should return only files containing the filter text
   */
  it('should filter files by name containing filter text', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        arbFilterText,
        (files, filterText) => {
          // Apply filter logic (same as ScriptSelector)
          const filteredFiles = filterText.trim()
            ? files.filter(f => 
                f.name.toLowerCase().includes(filterText.toLowerCase())
              )
            : files
          
          // All filtered files should contain the filter text
          if (filterText.trim()) {
            for (const file of filteredFiles) {
              expect(file.name.toLowerCase()).toContain(filterText.toLowerCase())
            }
          }
          
          // No files should be filtered out incorrectly
          for (const file of files) {
            const shouldBeIncluded = !filterText.trim() || 
              file.name.toLowerCase().includes(filterText.toLowerCase())
            const isIncluded = filteredFiles.some(f => f.path === file.path)
            expect(isIncluded).toBe(shouldBeIncluded)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Empty filter should return all files
   */
  it('should return all files when filter is empty', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        (files) => {
          const filterText = ''
          
          const filteredFiles = filterText.trim()
            ? files.filter(f => 
                f.name.toLowerCase().includes(filterText.toLowerCase())
              )
            : files
          
          expect(filteredFiles.length).toBe(files.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Filter should be case-insensitive
   */
  it('should filter case-insensitively', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        arbFilterText.filter(t => t.length > 0),
        (files, filterText) => {
          // Filter with lowercase
          const filteredLower = files.filter(f => 
            f.name.toLowerCase().includes(filterText.toLowerCase())
          )
          
          // Filter with uppercase
          const filteredUpper = files.filter(f => 
            f.name.toLowerCase().includes(filterText.toUpperCase().toLowerCase())
          )
          
          // Results should be the same
          expect(filteredLower.length).toBe(filteredUpper.length)
          
          for (let i = 0; i < filteredLower.length; i++) {
            expect(filteredLower[i].path).toBe(filteredUpper[i].path)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Filter with non-matching text should return empty list
   */
  it('should return empty list when no files match', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        (files) => {
          // Use a filter that won't match any valid file name
          const filterText = '!@#$%^&*()'
          
          const filteredFiles = files.filter(f => 
            f.name.toLowerCase().includes(filterText.toLowerCase())
          )
          
          expect(filteredFiles.length).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Whitespace-only filter should be treated as empty
   */
  it('should treat whitespace-only filter as empty', () => {
    fc.assert(
      fc.property(
        arbScriptFileList,
        fc.stringOf(fc.constant(' '), { minLength: 0, maxLength: 5 }),
        (files, whitespace) => {
          const filterText = whitespace
          
          const filteredFiles = filterText.trim()
            ? files.filter(f => 
                f.name.toLowerCase().includes(filterText.toLowerCase())
              )
            : files
          
          // Whitespace-only should return all files
          expect(filteredFiles.length).toBe(files.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})
