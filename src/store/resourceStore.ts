/**
 * Resource Store
 * 
 * Manages the state for the image management system in the left panel.
 * Handles expanded sections, search queries, thumbnail size, and resource selection.
 * 
 * Implements Requirements:
 * - 1.5: Configurable thumbnail size (small: 32px, medium: 48px, large: 64px)
 * - 7.1: Search input for Backgrounds section
 * - 7.2: Search input for Sprites section
 */

import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

/**
 * Resource section types
 */
export type ResourceSectionType = 'sprites' | 'backgrounds'

/**
 * Thumbnail size options
 * - small: 32px
 * - medium: 48px
 * - large: 64px
 */
export type ThumbnailSize = 'small' | 'medium' | 'large'

/**
 * Thumbnail size in pixels
 */
export const THUMBNAIL_SIZES: Record<ThumbnailSize, number> = {
  small: 32,
  medium: 48,
  large: 64,
} as const

/**
 * Resource drag data for drag-and-drop operations
 */
export interface ResourceDragData {
  /** Resource type */
  type: 'background' | 'sprite'
  /** Complete image tag (e.g., "bg room" or "eileen happy") */
  imageTag: string
  /** Image file path */
  imagePath: string
}

/**
 * Context menu state
 */
export interface ContextMenuState {
  /** Whether the context menu is open */
  open: boolean
  /** Menu position */
  position: { x: number; y: number }
  /** Resource associated with the menu */
  resource: ResourceDragData | null
}

/**
 * Resource state interface
 */
export interface ResourceState {
  /** Currently expanded sections */
  expandedSections: Set<ResourceSectionType>
  
  /** Search queries for each section */
  searchQueries: {
    sprites: string
    backgrounds: string
  }
  
  /** Thumbnail size setting */
  thumbnailSize: ThumbnailSize
  
  /** Currently selected resource (for preview) */
  selectedResource: ResourceDragData | null
  
  /** Whether the preview panel is open */
  previewOpen: boolean
  
  /** Context menu state */
  contextMenu: ContextMenuState
  
  /** Resource refresh version - incremented when resources need to be rescanned */
  resourceRefreshVersion: number
}

/**
 * Resource store actions
 */
export interface ResourceActions {
  /** Toggle a section's expanded state */
  toggleSection: (section: ResourceSectionType) => void
  
  /** Expand a section */
  expandSection: (section: ResourceSectionType) => void
  
  /** Collapse a section */
  collapseSection: (section: ResourceSectionType) => void
  
  /** Check if a section is expanded */
  isSectionExpanded: (section: ResourceSectionType) => boolean
  
  /** Set search query for a section */
  setSearchQuery: (section: ResourceSectionType, query: string) => void
  
  /** Clear search query for a section */
  clearSearchQuery: (section: ResourceSectionType) => void
  
  /** Set thumbnail size */
  setThumbnailSize: (size: ThumbnailSize) => void
  
  /** Select a resource (for preview) */
  selectResource: (resource: ResourceDragData | null) => void
  
  /** Open preview panel with a resource */
  openPreview: (resource: ResourceDragData) => void
  
  /** Close preview panel */
  closePreview: () => void
  
  /** Open context menu */
  openContextMenu: (position: { x: number; y: number }, resource: ResourceDragData) => void
  
  /** Close context menu */
  closeContextMenu: () => void
  
  /** Trigger resource refresh - increments version to notify listeners */
  triggerResourceRefresh: () => void
  
  /** Reset all state to defaults */
  reset: () => void
}

/**
 * Combined Resource Store interface
 */
export interface ResourceStore extends ResourceState, ResourceActions {}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ResourceState = {
  expandedSections: new Set<ResourceSectionType>(),
  searchQueries: {
    sprites: '',
    backgrounds: '',
  },
  thumbnailSize: 'medium',
  selectedResource: null,
  previewOpen: false,
  contextMenu: {
    open: false,
    position: { x: 0, y: 0 },
    resource: null,
  },
  resourceRefreshVersion: 0,
}

// ============================================================================
// Store Creation
// ============================================================================

/**
 * Zustand store for Resource state management
 */
export const useResourceStore = create<ResourceStore>((set, get) => ({
  // Initial state
  ...initialState,
  // Need to create a new Set to avoid sharing reference
  expandedSections: new Set<ResourceSectionType>(),

  /**
   * Toggle a section's expanded state
   * Implements lazy loading behavior (Requirement 1.7)
   */
  toggleSection: (section: ResourceSectionType) => {
    set((state) => {
      const newExpanded = new Set(state.expandedSections)
      if (newExpanded.has(section)) {
        newExpanded.delete(section)
      } else {
        newExpanded.add(section)
      }
      return { expandedSections: newExpanded }
    })
  },

  /**
   * Expand a section
   */
  expandSection: (section: ResourceSectionType) => {
    set((state) => {
      const newExpanded = new Set(state.expandedSections)
      newExpanded.add(section)
      return { expandedSections: newExpanded }
    })
  },

  /**
   * Collapse a section
   */
  collapseSection: (section: ResourceSectionType) => {
    set((state) => {
      const newExpanded = new Set(state.expandedSections)
      newExpanded.delete(section)
      return { expandedSections: newExpanded }
    })
  },

  /**
   * Check if a section is expanded
   */
  isSectionExpanded: (section: ResourceSectionType) => {
    return get().expandedSections.has(section)
  },

  /**
   * Set search query for a section
   * Implements Requirements 7.1, 7.2
   */
  setSearchQuery: (section: ResourceSectionType, query: string) => {
    set((state) => ({
      searchQueries: {
        ...state.searchQueries,
        [section]: query,
      },
    }))
  },

  /**
   * Clear search query for a section
   * Implements Requirement 7.6
   */
  clearSearchQuery: (section: ResourceSectionType) => {
    set((state) => ({
      searchQueries: {
        ...state.searchQueries,
        [section]: '',
      },
    }))
  },

  /**
   * Set thumbnail size
   * Implements Requirement 1.5
   */
  setThumbnailSize: (size: ThumbnailSize) => {
    set({ thumbnailSize: size })
  },

  /**
   * Select a resource (for preview)
   */
  selectResource: (resource: ResourceDragData | null) => {
    set({ selectedResource: resource })
  },

  /**
   * Open preview panel with a resource
   * Implements Requirement 6.1
   */
  openPreview: (resource: ResourceDragData) => {
    set({
      selectedResource: resource,
      previewOpen: true,
    })
  },

  /**
   * Close preview panel
   * Implements Requirement 6.7
   */
  closePreview: () => {
    set({
      previewOpen: false,
      // Keep selectedResource for potential re-opening
    })
  },

  /**
   * Open context menu
   * Implements Requirement 5.1
   */
  openContextMenu: (position: { x: number; y: number }, resource: ResourceDragData) => {
    set({
      contextMenu: {
        open: true,
        position,
        resource,
      },
    })
  },

  /**
   * Close context menu
   */
  closeContextMenu: () => {
    set((state) => ({
      contextMenu: {
        ...state.contextMenu,
        open: false,
      },
    }))
  },

  /**
   * Trigger resource refresh
   * Increments version to notify listeners (like EditorArea) to rescan resources
   */
  triggerResourceRefresh: () => {
    set((state) => ({
      resourceRefreshVersion: state.resourceRefreshVersion + 1,
    }))
  },

  /**
   * Reset all state to defaults
   */
  reset: () => {
    set({
      ...initialState,
      expandedSections: new Set<ResourceSectionType>(),
    })
  },
}))

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the current resource state (for testing)
 */
export function getResourceState(): ResourceState {
  const state = useResourceStore.getState()
  return {
    expandedSections: state.expandedSections,
    searchQueries: state.searchQueries,
    thumbnailSize: state.thumbnailSize,
    selectedResource: state.selectedResource,
    previewOpen: state.previewOpen,
    contextMenu: state.contextMenu,
    resourceRefreshVersion: state.resourceRefreshVersion,
  }
}

/**
 * Get thumbnail size in pixels
 */
export function getThumbnailSizePixels(size: ThumbnailSize): number {
  return THUMBNAIL_SIZES[size]
}

/**
 * Filter resources by search query
 * Implements Requirements 7.3, 7.4, 7.5
 * 
 * @param resources - Array of resources to filter
 * @param query - Search query string
 * @returns Filtered resources matching the query (case-insensitive, partial match)
 */
export function filterResourcesByQuery<T extends { name: string }>(
  resources: T[],
  query: string
): T[] {
  if (!query || query.trim() === '') {
    return resources
  }
  
  const lowerQuery = query.toLowerCase().trim()
  return resources.filter((resource) =>
    resource.name.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Create drag data for a resource
 */
export function createResourceDragData(
  type: 'background' | 'sprite',
  imageTag: string,
  imagePath: string
): ResourceDragData {
  return {
    type,
    imageTag,
    imagePath,
  }
}

/**
 * Drag data type constant for dataTransfer
 */
export const RESOURCE_DRAG_DATA_TYPE = 'application/x-renpy-resource'

/**
 * Serialize drag data for dataTransfer
 */
export function serializeDragData(data: ResourceDragData): string {
  return JSON.stringify(data)
}

/**
 * Deserialize drag data from dataTransfer
 */
export function deserializeDragData(data: string): ResourceDragData | null {
  try {
    return JSON.parse(data) as ResourceDragData
  } catch {
    return null
  }
}
