/**
 * ResourceStore Unit Tests
 * 
 * Tests for the resource state management store.
 * Validates Requirements: 1.5, 7.1, 7.2
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  useResourceStore,
  filterResourcesByQuery,
  getThumbnailSizePixels,
  createResourceDragData,
  serializeDragData,
  deserializeDragData,
  THUMBNAIL_SIZES,
  RESOURCE_DRAG_DATA_TYPE,
  type ResourceDragData,
} from './resourceStore'

describe('ResourceStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useResourceStore.getState().reset()
  })

  describe('Section Management', () => {
    it('should start with no expanded sections', () => {
      const state = useResourceStore.getState()
      expect(state.expandedSections.size).toBe(0)
    })

    it('should toggle section expansion', () => {
      const store = useResourceStore.getState()
      
      // Expand sprites section
      store.toggleSection('sprites')
      expect(useResourceStore.getState().expandedSections.has('sprites')).toBe(true)
      
      // Toggle again to collapse
      store.toggleSection('sprites')
      expect(useResourceStore.getState().expandedSections.has('sprites')).toBe(false)
    })

    it('should expand a section', () => {
      const store = useResourceStore.getState()
      store.expandSection('backgrounds')
      expect(useResourceStore.getState().expandedSections.has('backgrounds')).toBe(true)
    })

    it('should collapse a section', () => {
      const store = useResourceStore.getState()
      store.expandSection('sprites')
      store.collapseSection('sprites')
      expect(useResourceStore.getState().expandedSections.has('sprites')).toBe(false)
    })

    it('should check if section is expanded', () => {
      const store = useResourceStore.getState()
      expect(store.isSectionExpanded('sprites')).toBe(false)
      store.expandSection('sprites')
      expect(useResourceStore.getState().isSectionExpanded('sprites')).toBe(true)
    })
  })

  describe('Search Queries', () => {
    it('should start with empty search queries', () => {
      const state = useResourceStore.getState()
      expect(state.searchQueries.sprites).toBe('')
      expect(state.searchQueries.backgrounds).toBe('')
    })

    it('should set search query for a section', () => {
      const store = useResourceStore.getState()
      store.setSearchQuery('sprites', 'eileen')
      expect(useResourceStore.getState().searchQueries.sprites).toBe('eileen')
    })

    it('should clear search query for a section', () => {
      const store = useResourceStore.getState()
      store.setSearchQuery('backgrounds', 'room')
      store.clearSearchQuery('backgrounds')
      expect(useResourceStore.getState().searchQueries.backgrounds).toBe('')
    })
  })

  describe('Thumbnail Size', () => {
    it('should start with medium thumbnail size', () => {
      const state = useResourceStore.getState()
      expect(state.thumbnailSize).toBe('medium')
    })

    it('should set thumbnail size', () => {
      const store = useResourceStore.getState()
      store.setThumbnailSize('large')
      expect(useResourceStore.getState().thumbnailSize).toBe('large')
    })
  })

  describe('Resource Selection', () => {
    it('should start with no selected resource', () => {
      const state = useResourceStore.getState()
      expect(state.selectedResource).toBeNull()
    })

    it('should select a resource', () => {
      const store = useResourceStore.getState()
      const resource: ResourceDragData = {
        type: 'sprite',
        imageTag: 'eileen happy',
        imagePath: '/path/to/eileen_happy.png',
      }
      store.selectResource(resource)
      expect(useResourceStore.getState().selectedResource).toEqual(resource)
    })

    it('should deselect resource by passing null', () => {
      const store = useResourceStore.getState()
      const resource: ResourceDragData = {
        type: 'sprite',
        imageTag: 'eileen happy',
        imagePath: '/path/to/eileen_happy.png',
      }
      store.selectResource(resource)
      store.selectResource(null)
      expect(useResourceStore.getState().selectedResource).toBeNull()
    })
  })

  describe('Preview Panel', () => {
    it('should start with preview closed', () => {
      const state = useResourceStore.getState()
      expect(state.previewOpen).toBe(false)
    })

    it('should open preview with resource', () => {
      const store = useResourceStore.getState()
      const resource: ResourceDragData = {
        type: 'background',
        imageTag: 'bg room',
        imagePath: '/path/to/bg_room.png',
      }
      store.openPreview(resource)
      
      const newState = useResourceStore.getState()
      expect(newState.previewOpen).toBe(true)
      expect(newState.selectedResource).toEqual(resource)
    })

    it('should close preview', () => {
      const store = useResourceStore.getState()
      const resource: ResourceDragData = {
        type: 'background',
        imageTag: 'bg room',
        imagePath: '/path/to/bg_room.png',
      }
      store.openPreview(resource)
      store.closePreview()
      expect(useResourceStore.getState().previewOpen).toBe(false)
    })
  })

  describe('Context Menu', () => {
    it('should start with context menu closed', () => {
      const state = useResourceStore.getState()
      expect(state.contextMenu.open).toBe(false)
    })

    it('should open context menu with position and resource', () => {
      const store = useResourceStore.getState()
      const resource: ResourceDragData = {
        type: 'sprite',
        imageTag: 'eileen happy',
        imagePath: '/path/to/eileen_happy.png',
      }
      store.openContextMenu({ x: 100, y: 200 }, resource)
      
      const newState = useResourceStore.getState()
      expect(newState.contextMenu.open).toBe(true)
      expect(newState.contextMenu.position).toEqual({ x: 100, y: 200 })
      expect(newState.contextMenu.resource).toEqual(resource)
    })

    it('should close context menu', () => {
      const store = useResourceStore.getState()
      const resource: ResourceDragData = {
        type: 'sprite',
        imageTag: 'eileen happy',
        imagePath: '/path/to/eileen_happy.png',
      }
      store.openContextMenu({ x: 100, y: 200 }, resource)
      store.closeContextMenu()
      expect(useResourceStore.getState().contextMenu.open).toBe(false)
    })
  })

  describe('Reset', () => {
    it('should reset all state to defaults', () => {
      const store = useResourceStore.getState()
      
      // Modify state
      store.expandSection('sprites')
      store.setSearchQuery('backgrounds', 'test')
      store.setThumbnailSize('large')
      store.selectResource({
        type: 'sprite',
        imageTag: 'test',
        imagePath: '/test.png',
      })
      
      // Reset
      store.reset()
      
      const newState = useResourceStore.getState()
      expect(newState.expandedSections.size).toBe(0)
      expect(newState.searchQueries.sprites).toBe('')
      expect(newState.searchQueries.backgrounds).toBe('')
      expect(newState.thumbnailSize).toBe('medium')
      expect(newState.selectedResource).toBeNull()
      expect(newState.previewOpen).toBe(false)
      expect(newState.contextMenu.open).toBe(false)
    })
  })
})

describe('Utility Functions', () => {
  describe('filterResourcesByQuery', () => {
    const resources = [
      { name: 'eileen happy' },
      { name: 'eileen sad' },
      { name: 'lucy normal' },
      { name: 'bg room' },
    ]

    it('should return all resources for empty query', () => {
      const result = filterResourcesByQuery(resources, '')
      expect(result).toEqual(resources)
    })

    it('should filter by partial match', () => {
      const result = filterResourcesByQuery(resources, 'eileen')
      expect(result.length).toBe(2)
      expect(result.every(r => r.name.includes('eileen'))).toBe(true)
    })

    it('should be case-insensitive', () => {
      const result = filterResourcesByQuery(resources, 'EILEEN')
      expect(result.length).toBe(2)
    })

    it('should handle whitespace in query', () => {
      const result = filterResourcesByQuery(resources, '  eileen  ')
      expect(result.length).toBe(2)
    })

    it('should return empty array for no matches', () => {
      const result = filterResourcesByQuery(resources, 'nonexistent')
      expect(result.length).toBe(0)
    })
  })

  describe('getThumbnailSizePixels', () => {
    it('should return correct pixel values', () => {
      expect(getThumbnailSizePixels('small')).toBe(32)
      expect(getThumbnailSizePixels('medium')).toBe(48)
      expect(getThumbnailSizePixels('large')).toBe(64)
    })
  })

  describe('THUMBNAIL_SIZES', () => {
    it('should have correct values', () => {
      expect(THUMBNAIL_SIZES.small).toBe(32)
      expect(THUMBNAIL_SIZES.medium).toBe(48)
      expect(THUMBNAIL_SIZES.large).toBe(64)
    })
  })

  describe('createResourceDragData', () => {
    it('should create drag data object', () => {
      const data = createResourceDragData('sprite', 'eileen happy', '/path/to/image.png')
      expect(data).toEqual({
        type: 'sprite',
        imageTag: 'eileen happy',
        imagePath: '/path/to/image.png',
      })
    })
  })

  describe('serializeDragData / deserializeDragData', () => {
    it('should serialize and deserialize drag data', () => {
      const original: ResourceDragData = {
        type: 'background',
        imageTag: 'bg room',
        imagePath: '/path/to/bg_room.png',
      }
      
      const serialized = serializeDragData(original)
      const deserialized = deserializeDragData(serialized)
      
      expect(deserialized).toEqual(original)
    })

    it('should return null for invalid JSON', () => {
      const result = deserializeDragData('invalid json')
      expect(result).toBeNull()
    })
  })

  describe('RESOURCE_DRAG_DATA_TYPE', () => {
    it('should be the correct MIME type', () => {
      expect(RESOURCE_DRAG_DATA_TYPE).toBe('application/x-renpy-resource')
    })
  })
})
