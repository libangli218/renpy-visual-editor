/**
 * MultiLabelView Unit Tests
 * 多 Label 视图单元测试
 * 
 * Tests for MultiLabelView component logic.
 * 
 * Requirements: 1.1, 2.1, 6.1
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { RenpyScript, LabelNode, DialogueNode, SceneNode } from '../../types/ast'
import { createBlockTreeBuilder } from './BlockTreeBuilder'
import { useMultiLabelViewStore } from './stores/multiLabelViewStore'

// Helper to create a mock AST with labels
function createMockAST(labels: { name: string; blockCount: number }[]): RenpyScript {
  const statements: LabelNode[] = labels.map(({ name, blockCount }) => {
    const body: (DialogueNode | SceneNode)[] = []
    for (let i = 0; i < blockCount; i++) {
      body.push({
        id: `dialogue_${name}_${i}`,
        type: 'dialogue',
        speaker: 'alice',
        text: `Dialogue ${i} in ${name}`,
      })
    }
    return {
      id: `label_${name}`,
      type: 'label',
      name,
      body,
    }
  })

  return {
    type: 'script',
    statements,
    metadata: {
      filePath: 'test.rpy',
      parseTime: new Date(),
      version: '1.0',
    },
  }
}

// Helper to extract labels from AST
function extractLabels(ast: RenpyScript): LabelNode[] {
  return ast.statements.filter((s): s is LabelNode => s.type === 'label')
}

// Helper to filter labels by search query
function filterLabels(labels: LabelNode[], query: string): LabelNode[] {
  if (!query.trim()) return labels
  const lowerQuery = query.toLowerCase().trim()
  return labels.filter(label => label.name.toLowerCase().includes(lowerQuery))
}

describe('MultiLabelView', () => {
  describe('Label extraction from AST', () => {
    it('should extract all labels from AST', () => {
      const ast = createMockAST([
        { name: 'start', blockCount: 2 },
        { name: 'chapter1', blockCount: 3 },
        { name: 'ending', blockCount: 1 },
      ])

      const labels = extractLabels(ast)

      expect(labels).toHaveLength(3)
      expect(labels.map(l => l.name)).toEqual(['start', 'chapter1', 'ending'])
    })

    it('should return empty array for AST with no labels', () => {
      const ast: RenpyScript = {
        type: 'script',
        statements: [],
        metadata: {
          filePath: 'test.rpy',
          parseTime: new Date(),
          version: '1.0',
        },
      }

      const labels = extractLabels(ast)

      expect(labels).toHaveLength(0)
    })

    it('should extract labels with correct block counts', () => {
      const ast = createMockAST([
        { name: 'start', blockCount: 5 },
        { name: 'empty', blockCount: 0 },
      ])

      const labels = extractLabels(ast)

      expect(labels[0].body).toHaveLength(5)
      expect(labels[1].body).toHaveLength(0)
    })
  })

  describe('Search filtering', () => {
    const labels = [
      { id: 'l1', type: 'label' as const, name: 'start', body: [] },
      { id: 'l2', type: 'label' as const, name: 'chapter1', body: [] },
      { id: 'l3', type: 'label' as const, name: 'chapter2', body: [] },
      { id: 'l4', type: 'label' as const, name: 'ending_good', body: [] },
      { id: 'l5', type: 'label' as const, name: 'ending_bad', body: [] },
    ]

    it('should return all labels when search query is empty', () => {
      const filtered = filterLabels(labels, '')
      expect(filtered).toHaveLength(5)
    })

    it('should return all labels when search query is whitespace', () => {
      const filtered = filterLabels(labels, '   ')
      expect(filtered).toHaveLength(5)
    })

    it('should filter labels by exact match', () => {
      const filtered = filterLabels(labels, 'start')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('start')
    })

    it('should filter labels by partial match', () => {
      const filtered = filterLabels(labels, 'chapter')
      expect(filtered).toHaveLength(2)
      expect(filtered.map(l => l.name)).toEqual(['chapter1', 'chapter2'])
    })

    it('should filter labels case-insensitively', () => {
      const filtered = filterLabels(labels, 'CHAPTER')
      expect(filtered).toHaveLength(2)
    })

    it('should filter labels with underscore in name', () => {
      const filtered = filterLabels(labels, 'ending')
      expect(filtered).toHaveLength(2)
      expect(filtered.map(l => l.name)).toEqual(['ending_good', 'ending_bad'])
    })

    it('should return empty array when no labels match', () => {
      const filtered = filterLabels(labels, 'nonexistent')
      expect(filtered).toHaveLength(0)
    })
  })

  describe('Block tree building', () => {
    it('should build block tree from label', () => {
      const ast = createMockAST([{ name: 'test', blockCount: 3 }])
      const label = extractLabels(ast)[0]
      const builder = createBlockTreeBuilder()

      const blockTree = builder.buildFromLabel(label)

      expect(blockTree.type).toBe('label')
      expect(blockTree.children).toHaveLength(3)
    })

    it('should build empty block tree for empty label', () => {
      const ast = createMockAST([{ name: 'empty', blockCount: 0 }])
      const label = extractLabels(ast)[0]
      const builder = createBlockTreeBuilder()

      const blockTree = builder.buildFromLabel(label)

      expect(blockTree.type).toBe('label')
      expect(blockTree.children).toHaveLength(0)
    })

    it('should preserve label name in block tree', () => {
      const ast = createMockAST([{ name: 'my_label', blockCount: 1 }])
      const label = extractLabels(ast)[0]
      const builder = createBlockTreeBuilder()

      const blockTree = builder.buildFromLabel(label)

      const nameSlot = blockTree.slots.find(s => s.name === 'name')
      expect(nameSlot?.value).toBe('my_label')
    })
  })

  describe('MultiLabelViewStore', () => {
    beforeEach(() => {
      // Reset store before each test
      useMultiLabelViewStore.getState().reset()
    })

    describe('Collapse state', () => {
      it('should start with no collapsed labels', () => {
        const { collapsedLabels } = useMultiLabelViewStore.getState()
        expect(collapsedLabels.size).toBe(0)
      })

      it('should toggle label collapsed state', () => {
        const store = useMultiLabelViewStore.getState()

        store.toggleLabelCollapsed('start')
        expect(store.isLabelCollapsed('start')).toBe(true)

        store.toggleLabelCollapsed('start')
        expect(store.isLabelCollapsed('start')).toBe(false)
      })

      it('should collapse all labels', () => {
        const store = useMultiLabelViewStore.getState()
        const labelNames = ['start', 'chapter1', 'ending']

        store.collapseAll(labelNames)

        expect(store.isLabelCollapsed('start')).toBe(true)
        expect(store.isLabelCollapsed('chapter1')).toBe(true)
        expect(store.isLabelCollapsed('ending')).toBe(true)
      })

      it('should expand all labels', () => {
        const store = useMultiLabelViewStore.getState()
        store.collapseAll(['start', 'chapter1'])

        store.expandAll()

        expect(store.isLabelCollapsed('start')).toBe(false)
        expect(store.isLabelCollapsed('chapter1')).toBe(false)
      })
    })

    describe('Search query', () => {
      it('should start with empty search query', () => {
        const { searchQuery } = useMultiLabelViewStore.getState()
        expect(searchQuery).toBe('')
      })

      it('should update search query', () => {
        const store = useMultiLabelViewStore.getState()

        store.setSearchQuery('chapter')

        expect(useMultiLabelViewStore.getState().searchQuery).toBe('chapter')
      })

      it('should clear search query', () => {
        const store = useMultiLabelViewStore.getState()
        store.setSearchQuery('test')

        store.clearSearchQuery()

        expect(useMultiLabelViewStore.getState().searchQuery).toBe('')
      })
    })

    describe('Layout mode', () => {
      it('should start with grid layout', () => {
        const { layoutMode } = useMultiLabelViewStore.getState()
        expect(layoutMode).toBe('grid')
      })

      it('should change layout mode', () => {
        const store = useMultiLabelViewStore.getState()

        store.setLayoutMode('list')

        expect(useMultiLabelViewStore.getState().layoutMode).toBe('list')
      })

      it('should toggle layout mode', () => {
        const store = useMultiLabelViewStore.getState()

        store.toggleLayoutMode()
        expect(useMultiLabelViewStore.getState().layoutMode).toBe('list')

        store.toggleLayoutMode()
        expect(useMultiLabelViewStore.getState().layoutMode).toBe('grid')
      })
    })

    describe('Selected label', () => {
      it('should start with no selected label', () => {
        const { selectedLabel } = useMultiLabelViewStore.getState()
        expect(selectedLabel).toBeNull()
      })

      it('should set selected label', () => {
        const store = useMultiLabelViewStore.getState()

        store.setSelectedLabel('chapter1')

        expect(useMultiLabelViewStore.getState().selectedLabel).toBe('chapter1')
      })

      it('should clear selected label', () => {
        const store = useMultiLabelViewStore.getState()
        store.setSelectedLabel('chapter1')

        store.setSelectedLabel(null)

        expect(useMultiLabelViewStore.getState().selectedLabel).toBeNull()
      })
    })

    describe('Reset', () => {
      it('should reset all state to initial values', () => {
        const store = useMultiLabelViewStore.getState()
        store.setSearchQuery('test')
        store.setLayoutMode('list')
        store.setSelectedLabel('chapter1')
        store.collapseAll(['start', 'ending'])

        store.reset()

        const state = useMultiLabelViewStore.getState()
        expect(state.searchQuery).toBe('')
        expect(state.layoutMode).toBe('grid')
        expect(state.selectedLabel).toBeNull()
        expect(state.collapsedLabels.size).toBe(0)
      })
    })
  })

  describe('Label count calculation', () => {
    it('should count blocks in a label', () => {
      const ast = createMockAST([
        { name: 'start', blockCount: 5 },
        { name: 'chapter1', blockCount: 10 },
        { name: 'empty', blockCount: 0 },
      ])

      const labels = extractLabels(ast)

      expect(labels[0].body.length).toBe(5)
      expect(labels[1].body.length).toBe(10)
      expect(labels[2].body.length).toBe(0)
    })
  })

  describe('Label creation', () => {
    it('should create a new label with unique name', () => {
      const existingNames = ['start', 'chapter1', 'new_label']
      
      // Simulate finding a unique name
      let labelName = 'new_label'
      let counter = 1
      while (existingNames.includes(labelName)) {
        labelName = `new_label_${counter}`
        counter++
      }

      expect(labelName).toBe('new_label_1')
    })

    it('should validate label name format', () => {
      const validNames = ['start', 'chapter_1', '_private', 'CamelCase']
      const invalidNames = ['1start', 'has space', 'has-dash', '']

      const isValidLabelName = (name: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)

      for (const name of validNames) {
        expect(isValidLabelName(name)).toBe(true)
      }

      for (const name of invalidNames) {
        expect(isValidLabelName(name)).toBe(false)
      }
    })
  })

  describe('Label deletion', () => {
    it('should remove label from AST', () => {
      const ast = createMockAST([
        { name: 'start', blockCount: 2 },
        { name: 'chapter1', blockCount: 3 },
        { name: 'ending', blockCount: 1 },
      ])

      // Simulate deletion
      const labelToDelete = 'chapter1'
      const newStatements = ast.statements.filter(s => 
        !(s.type === 'label' && (s as LabelNode).name === labelToDelete)
      )

      expect(newStatements).toHaveLength(2)
      expect(newStatements.map(s => (s as LabelNode).name)).toEqual(['start', 'ending'])
    })

    it('should handle deleting last label', () => {
      const ast = createMockAST([{ name: 'only_label', blockCount: 1 }])

      const newStatements = ast.statements.filter(s => 
        !(s.type === 'label' && (s as LabelNode).name === 'only_label')
      )

      expect(newStatements).toHaveLength(0)
    })
  })
})
