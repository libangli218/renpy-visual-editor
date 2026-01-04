/**
 * Unit Tests for PendingNodePool
 * 
 * Tests for the temporary node pool that manages nodes not yet synced to AST.
 * 
 * Validates: Requirements 1.1, 6.1
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  PendingNodePool,
  PendingNodeStatus,
  createPendingNode,
} from './PendingNodePool'

describe('PendingNodePool', () => {
  let pool: PendingNodePool

  beforeEach(() => {
    pool = new PendingNodePool()
  })

  describe('add and get', () => {
    it('should add a node and retrieve it by id', () => {
      const node = createPendingNode(
        'node-1',
        'dialogue-block',
        { x: 100, y: 200 },
        { dialogues: [] }
      )

      pool.add(node)

      const retrieved = pool.get('node-1')
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('node-1')
      expect(retrieved?.type).toBe('dialogue-block')
      expect(retrieved?.position).toEqual({ x: 100, y: 200 })
    })

    it('should return undefined for non-existent node', () => {
      const retrieved = pool.get('non-existent')
      expect(retrieved).toBeUndefined()
    })

    it('should update existing node when adding with same id', () => {
      const node1 = createPendingNode(
        'node-1',
        'dialogue-block',
        { x: 100, y: 200 },
        { dialogues: [] }
      )
      const node2 = createPendingNode(
        'node-1',
        'menu',
        { x: 300, y: 400 },
        { choices: [] }
      )

      pool.add(node1)
      pool.add(node2)

      const retrieved = pool.get('node-1')
      expect(retrieved?.type).toBe('menu')
      expect(retrieved?.position).toEqual({ x: 300, y: 400 })
      expect(pool.size()).toBe(1)
    })
  })

  describe('remove', () => {
    it('should remove an existing node', () => {
      const node = createPendingNode(
        'node-1',
        'dialogue-block',
        { x: 100, y: 200 },
        { dialogues: [] }
      )

      pool.add(node)
      expect(pool.isPending('node-1')).toBe(true)

      const removed = pool.remove('node-1')
      expect(removed).toBe(true)
      expect(pool.isPending('node-1')).toBe(false)
      expect(pool.get('node-1')).toBeUndefined()
    })

    it('should return false when removing non-existent node', () => {
      const removed = pool.remove('non-existent')
      expect(removed).toBe(false)
    })
  })

  describe('getAll', () => {
    it('should return empty array when pool is empty', () => {
      expect(pool.getAll()).toEqual([])
    })

    it('should return all nodes in the pool', () => {
      const node1 = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {})
      const node2 = createPendingNode('node-2', 'menu', { x: 100, y: 100 }, {})
      const node3 = createPendingNode('node-3', 'jump', { x: 200, y: 200 }, {})

      pool.add(node1)
      pool.add(node2)
      pool.add(node3)

      const all = pool.getAll()
      expect(all.length).toBe(3)
      expect(all.map(n => n.id).sort()).toEqual(['node-1', 'node-2', 'node-3'])
    })
  })

  describe('isPending', () => {
    it('should return true for pending nodes', () => {
      const node = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {})
      pool.add(node)

      expect(pool.isPending('node-1')).toBe(true)
    })

    it('should return false for non-existent nodes', () => {
      expect(pool.isPending('non-existent')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should remove all nodes from the pool', () => {
      pool.add(createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {}))
      pool.add(createPendingNode('node-2', 'menu', { x: 100, y: 100 }, {}))

      expect(pool.size()).toBe(2)

      pool.clear()

      expect(pool.size()).toBe(0)
      expect(pool.getAll()).toEqual([])
    })
  })

  describe('size', () => {
    it('should return 0 for empty pool', () => {
      expect(pool.size()).toBe(0)
    })

    it('should return correct count after adding nodes', () => {
      pool.add(createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {}))
      expect(pool.size()).toBe(1)

      pool.add(createPendingNode('node-2', 'menu', { x: 100, y: 100 }, {}))
      expect(pool.size()).toBe(2)
    })

    it('should decrease after removing nodes', () => {
      pool.add(createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {}))
      pool.add(createPendingNode('node-2', 'menu', { x: 100, y: 100 }, {}))

      pool.remove('node-1')
      expect(pool.size()).toBe(1)
    })
  })

  describe('updateStatus', () => {
    it('should update node status', () => {
      const node = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {})
      pool.add(node)

      expect(pool.get('node-1')?.status).toBe(PendingNodeStatus.CREATED)

      pool.updateStatus('node-1', PendingNodeStatus.CONNECTED)
      expect(pool.get('node-1')?.status).toBe(PendingNodeStatus.CONNECTED)
    })

    it('should return false for non-existent node', () => {
      const result = pool.updateStatus('non-existent', PendingNodeStatus.CONNECTED)
      expect(result).toBe(false)
    })

    it('should update the updatedAt timestamp', () => {
      const node = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {})
      pool.add(node)

      const originalUpdatedAt = pool.get('node-1')?.updatedAt

      // Small delay to ensure timestamp changes
      pool.updateStatus('node-1', PendingNodeStatus.ORPHAN)

      const newUpdatedAt = pool.get('node-1')?.updatedAt
      expect(newUpdatedAt).toBeGreaterThanOrEqual(originalUpdatedAt!)
    })
  })

  describe('updateConnection', () => {
    it('should update connection info and set status to CONNECTED', () => {
      const node = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {})
      pool.add(node)

      pool.updateConnection('node-1', { sourceNodeId: 'scene-1', sourceHandle: 'output' })

      const updated = pool.get('node-1')
      expect(updated?.status).toBe(PendingNodeStatus.CONNECTED)
      expect(updated?.connectedTo).toEqual({ sourceNodeId: 'scene-1', sourceHandle: 'output' })
    })

    it('should return false for non-existent node', () => {
      const result = pool.updateConnection('non-existent', { sourceNodeId: 'scene-1' })
      expect(result).toBe(false)
    })
  })

  describe('markSynced', () => {
    it('should mark node as synced with AST info', () => {
      const node = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {})
      pool.add(node)

      pool.markSynced('node-1', 'ast-dialogue-1', 'start')

      const updated = pool.get('node-1')
      expect(updated?.status).toBe(PendingNodeStatus.SYNCED)
      expect(updated?.astNodeId).toBe('ast-dialogue-1')
      expect(updated?.labelName).toBe('start')
    })

    it('should return false for non-existent node', () => {
      const result = pool.markSynced('non-existent', 'ast-1', 'label')
      expect(result).toBe(false)
    })
  })

  describe('getByStatus', () => {
    it('should return nodes with specified status', () => {
      const node1 = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {})
      const node2 = createPendingNode('node-2', 'menu', { x: 100, y: 100 }, {})
      const node3 = createPendingNode('node-3', 'jump', { x: 200, y: 200 }, {})

      pool.add(node1)
      pool.add(node2)
      pool.add(node3)

      pool.updateStatus('node-2', PendingNodeStatus.CONNECTED)
      pool.updateStatus('node-3', PendingNodeStatus.ORPHAN)

      const created = pool.getByStatus(PendingNodeStatus.CREATED)
      expect(created.length).toBe(1)
      expect(created[0].id).toBe('node-1')

      const connected = pool.getByStatus(PendingNodeStatus.CONNECTED)
      expect(connected.length).toBe(1)
      expect(connected[0].id).toBe('node-2')

      const orphan = pool.getByStatus(PendingNodeStatus.ORPHAN)
      expect(orphan.length).toBe(1)
      expect(orphan[0].id).toBe('node-3')
    })

    it('should return empty array when no nodes match status', () => {
      const node = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {})
      pool.add(node)

      const synced = pool.getByStatus(PendingNodeStatus.SYNCED)
      expect(synced).toEqual([])
    })
  })

  describe('getOrphanNodes', () => {
    it('should return only orphan nodes', () => {
      const node1 = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {})
      const node2 = createPendingNode('node-2', 'menu', { x: 100, y: 100 }, {})

      pool.add(node1)
      pool.add(node2)

      pool.updateStatus('node-1', PendingNodeStatus.ORPHAN)

      const orphans = pool.getOrphanNodes()
      expect(orphans.length).toBe(1)
      expect(orphans[0].id).toBe('node-1')
    })
  })

  describe('getConnectedNodes', () => {
    it('should return only connected nodes', () => {
      const node1 = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {})
      const node2 = createPendingNode('node-2', 'menu', { x: 100, y: 100 }, {})

      pool.add(node1)
      pool.add(node2)

      pool.updateConnection('node-2', { sourceNodeId: 'scene-1' })

      const connected = pool.getConnectedNodes()
      expect(connected.length).toBe(1)
      expect(connected[0].id).toBe('node-2')
    })
  })

  describe('updateData', () => {
    it('should update node data partially', () => {
      const node = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {
        dialogues: [{ speaker: 'Alice', text: 'Hello', id: 'd-1' }],
        preview: 'Original preview',
      })
      pool.add(node)

      pool.updateData('node-1', { preview: 'Updated preview' })

      const updated = pool.get('node-1')
      expect(updated?.data.preview).toBe('Updated preview')
      expect(updated?.data.dialogues).toEqual([{ speaker: 'Alice', text: 'Hello', id: 'd-1' }])
    })

    it('should return false for non-existent node', () => {
      const result = pool.updateData('non-existent', { preview: 'test' })
      expect(result).toBe(false)
    })
  })

  describe('updatePosition', () => {
    it('should update node position', () => {
      const node = createPendingNode('node-1', 'dialogue-block', { x: 0, y: 0 }, {})
      pool.add(node)

      pool.updatePosition('node-1', { x: 500, y: 600 })

      const updated = pool.get('node-1')
      expect(updated?.position).toEqual({ x: 500, y: 600 })
    })

    it('should return false for non-existent node', () => {
      const result = pool.updatePosition('non-existent', { x: 100, y: 100 })
      expect(result).toBe(false)
    })
  })
})

describe('createPendingNode', () => {
  it('should create a pending node with correct initial values', () => {
    const node = createPendingNode(
      'test-node',
      'menu',
      { x: 150, y: 250 },
      { choices: [], prompt: 'Choose:' }
    )

    expect(node.id).toBe('test-node')
    expect(node.type).toBe('menu')
    expect(node.position).toEqual({ x: 150, y: 250 })
    expect(node.data).toEqual({ choices: [], prompt: 'Choose:' })
    expect(node.status).toBe(PendingNodeStatus.CREATED)
    expect(node.createdAt).toBeDefined()
    expect(node.updatedAt).toBeDefined()
    expect(node.createdAt).toBe(node.updatedAt)
  })

  it('should set timestamps to current time', () => {
    const before = Date.now()
    const node = createPendingNode('test', 'jump', { x: 0, y: 0 }, {})
    const after = Date.now()

    expect(node.createdAt).toBeGreaterThanOrEqual(before)
    expect(node.createdAt).toBeLessThanOrEqual(after)
  })
})
