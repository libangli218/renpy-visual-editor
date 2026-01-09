/**
 * ResourceSection Component
 * 
 * A collapsible section for displaying resources (sprites or backgrounds)
 * with search, import, and thumbnail display capabilities.
 * 
 * Implements Requirements:
 * - 1.7: Lazy loading - don't load thumbnails when section is collapsed
 * - 3.1, 3.2: Import buttons for Backgrounds and Sprites sections
 * - 7.1, 7.2: Search input for Backgrounds and Sprites sections
 * - 2.3, 2.4: Group sprites by character tag
 */

import React, { useState, useCallback, useMemo } from 'react'
import { ResourceItem } from './ResourceItem'
import { ImageTag } from '../../resource/ResourceManager'
import {
  ResourceDragData,
  ThumbnailSize,
  ResourceSectionType,
} from '../../store/resourceStore'
import './ResourceSection.css'

/**
 * Resource data for display
 */
export interface ResourceData {
  /** Image tag (e.g., "bg room" or "eileen happy") */
  imageTag: string
  /** Resource type */
  type: 'sprite' | 'background'
  /** Image file path */
  imagePath: string
}

/**
 * Grouped resources by character tag
 */
export interface GroupedResources {
  /** Character tag (e.g., "eileen", "lucy") */
  tag: string
  /** Resources in this group */
  resources: ResourceData[]
}

/**
 * Props for ResourceSection component
 */
export interface ResourceSectionProps {
  /** Section title */
  title: string
  /** Section icon */
  icon: string
  /** Section type identifier */
  sectionType: ResourceSectionType
  /** Image tags from ResourceManager */
  imageTags: ImageTag[]
  /** Project path for resolving image paths */
  projectPath: string
  /** Function to get image path from tag */
  getImagePath: (imageTag: string) => string | null
  /** Whether the section is expanded */
  expanded: boolean
  /** Toggle expanded state */
  onToggle: () => void
  /** Import button click handler */
  onImport?: () => void
  /** Search query */
  searchQuery: string
  /** Set search query */
  onSearchChange: (query: string) => void
  /** Thumbnail size */
  thumbnailSize: ThumbnailSize
  /** Resource click handler */
  onResourceClick?: (resource: ResourceDragData) => void
  /** Resource double-click handler (for preview) */
  onResourceDoubleClick?: (resource: ResourceDragData) => void
  /** Resource context menu handler */
  onResourceContextMenu?: (event: React.MouseEvent, resource: ResourceDragData) => void
  /** Selected resource */
  selectedResource?: ResourceDragData | null
}

/**
 * Filter resources by search query
 * Implements Requirements 7.3, 7.4, 7.5, 7.6
 * 
 * @param resources - Array of resources to filter
 * @param query - Search query string
 * @returns Filtered resources matching the query (case-insensitive, partial match)
 */
export function filterResources(resources: ResourceData[], query: string): ResourceData[] {
  if (!query || query.trim() === '') {
    return resources
  }
  
  const lowerQuery = query.toLowerCase().trim()
  return resources.filter((resource) =>
    resource.imageTag.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Group resources by character tag (for sprites)
 * Implements Requirements 2.3, 2.4
 * 
 * @param resources - Array of resources to group
 * @returns Grouped resources by character tag
 */
export function groupResourcesByTag(resources: ResourceData[]): GroupedResources[] {
  const groups = new Map<string, ResourceData[]>()
  
  for (const resource of resources) {
    // Extract the first word as the character tag
    const parts = resource.imageTag.split(' ')
    const tag = parts[0]
    
    if (!groups.has(tag)) {
      groups.set(tag, [])
    }
    groups.get(tag)!.push(resource)
  }
  
  // Convert to array and sort by tag name
  return Array.from(groups.entries())
    .map(([tag, resources]) => ({ tag, resources }))
    .sort((a, b) => a.tag.localeCompare(b.tag))
}

/**
 * Convert ImageTags to ResourceData array
 */
function imageTagsToResources(
  imageTags: ImageTag[],
  type: 'sprite' | 'background',
  getImagePath: (imageTag: string) => string | null
): ResourceData[] {
  const resources: ResourceData[] = []
  
  for (const imageTag of imageTags) {
    if (imageTag.attributes.length === 0) {
      // No attributes, just the tag itself
      const fullTag = imageTag.tag
      const imagePath = getImagePath(fullTag)
      if (imagePath) {
        resources.push({
          imageTag: fullTag,
          type,
          imagePath,
        })
      }
    } else {
      // Has attributes, create entry for each attribute combination
      for (const attrs of imageTag.attributes) {
        const fullTag = `${imageTag.tag} ${attrs.join(' ')}`
        const imagePath = getImagePath(fullTag)
        if (imagePath) {
          resources.push({
            imageTag: fullTag,
            type,
            imagePath,
          })
        }
      }
    }
  }
  
  return resources
}

/**
 * ResourceSection - Collapsible resource section component
 */
export const ResourceSection: React.FC<ResourceSectionProps> = ({
  title,
  icon,
  sectionType,
  imageTags,
  getImagePath,
  expanded,
  onToggle,
  onImport,
  searchQuery,
  onSearchChange,
  thumbnailSize,
  onResourceClick,
  onResourceDoubleClick,
  onResourceContextMenu,
  selectedResource,
}) => {
  // Track expanded groups for sprites
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  // Convert image tags to resource data
  const resourceType = sectionType === 'backgrounds' ? 'background' : 'sprite'
  const allResources = useMemo(
    () => imageTagsToResources(imageTags, resourceType, getImagePath),
    [imageTags, resourceType, getImagePath]
  )
  
  // Filter resources by search query
  const filteredResources = useMemo(
    () => filterResources(allResources, searchQuery),
    [allResources, searchQuery]
  )
  
  // Group resources for sprites
  const groupedResources = useMemo(
    () => sectionType === 'sprites' ? groupResourcesByTag(filteredResources) : null,
    [sectionType, filteredResources]
  )
  
  // Toggle group expansion
  const toggleGroup = useCallback((tag: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      return next
    })
  }, [])
  
  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }, [onSearchChange])
  
  // Handle clear search
  const handleClearSearch = useCallback(() => {
    onSearchChange('')
  }, [onSearchChange])
  
  // Handle resource click
  const handleResourceClick = useCallback((resource: ResourceData) => {
    if (onResourceClick) {
      onResourceClick({
        type: resource.type,
        imageTag: resource.imageTag,
        imagePath: resource.imagePath,
      })
    }
  }, [onResourceClick])
  
  // Handle resource double-click
  const handleResourceDoubleClick = useCallback((resource: ResourceData) => {
    if (onResourceDoubleClick) {
      onResourceDoubleClick({
        type: resource.type,
        imageTag: resource.imageTag,
        imagePath: resource.imagePath,
      })
    }
  }, [onResourceDoubleClick])
  
  // Handle resource context menu
  const handleResourceContextMenu = useCallback((event: React.MouseEvent, resource: ResourceData) => {
    if (onResourceContextMenu) {
      onResourceContextMenu(event, {
        type: resource.type,
        imageTag: resource.imageTag,
        imagePath: resource.imagePath,
      })
    }
  }, [onResourceContextMenu])
  
  // Check if a resource is selected
  const isResourceSelected = useCallback((resource: ResourceData) => {
    return selectedResource?.imageTag === resource.imageTag
  }, [selectedResource])
  
  // Render a single resource item
  const renderResourceItem = useCallback((resource: ResourceData) => (
    <ResourceItem
      key={resource.imageTag}
      imageTag={resource.imageTag}
      type={resource.type}
      imagePath={resource.imagePath}
      thumbnailSize={thumbnailSize}
      selected={isResourceSelected(resource)}
      onClick={() => handleResourceClick(resource)}
      onDoubleClick={() => handleResourceDoubleClick(resource)}
      onContextMenu={(e) => handleResourceContextMenu(e, resource)}
    />
  ), [thumbnailSize, isResourceSelected, handleResourceClick, handleResourceDoubleClick, handleResourceContextMenu])
  
  // Render grouped resources (for sprites)
  const renderGroupedResources = useCallback(() => {
    if (!groupedResources) return null
    
    return (
      <div className="resource-groups">
        {groupedResources.map(group => (
          <div key={group.tag} className="resource-group">
            <button
              className="resource-group-header"
              onClick={() => toggleGroup(group.tag)}
              aria-expanded={expandedGroups.has(group.tag)}
            >
              <span className="group-toggle">
                {expandedGroups.has(group.tag) ? '▾' : '▸'}
              </span>
              <span className="group-icon">👤</span>
              <span className="group-name">{group.tag}</span>
              <span className="group-count">{group.resources.length}</span>
            </button>
            {expandedGroups.has(group.tag) && (
              <div className="resource-group-content">
                <div className="resource-grid">
                  {group.resources.map(renderResourceItem)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }, [groupedResources, expandedGroups, toggleGroup, renderResourceItem])
  
  // Render flat resource list (for backgrounds)
  const renderFlatResources = useCallback(() => {
    if (filteredResources.length === 0) {
      return (
        <p className="section-empty">
          {searchQuery ? 'No matching resources' : 'No resources found'}
        </p>
      )
    }
    
    return (
      <div className="resource-grid">
        {filteredResources.map(renderResourceItem)}
      </div>
    )
  }, [filteredResources, searchQuery, renderResourceItem])
  
  return (
    <div className="resource-section">
      {/* Section Header */}
      <button
        className="section-header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="section-toggle">
          {expanded ? '▾' : '▸'}
        </span>
        <span className="section-icon">{icon}</span>
        <span className="section-label">{title}</span>
        <span className="section-count">{allResources.length}</span>
      </button>
      
      {/* Section Content - Only render when expanded (lazy loading) */}
      {expanded && (
        <div className="section-content resource-section-content">
          {/* Search and Import Bar */}
          <div className="resource-toolbar">
            <div className="resource-search">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="搜索..."
                value={searchQuery}
                onChange={handleSearchChange}
                aria-label={`Search ${title}`}
              />
              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {onImport && (
              <button
                className="resource-import-btn"
                onClick={onImport}
                title={`导入${title}`}
              >
                +
              </button>
            )}
          </div>
          
          {/* Resource List */}
          <div className="resource-list-container">
            {sectionType === 'sprites' ? renderGroupedResources() : renderFlatResources()}
          </div>
        </div>
      )}
    </div>
  )
}

export default ResourceSection
