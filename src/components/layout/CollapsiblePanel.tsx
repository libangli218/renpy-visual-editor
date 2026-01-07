/**
 * CollapsiblePanel Component - Figma-style collapsible panel
 * 
 * Features:
 * - Click toggle button to collapse/expand
 * - Double-click header to collapse/expand
 * - Smooth animation (200ms)
 * - Collapsed state shows only icons
 * - Persists state to localStorage
 */

import React, { useState, useEffect, useCallback } from 'react'

interface CollapsiblePanelProps {
  id: string
  title: string
  position: 'left' | 'right'
  defaultCollapsed?: boolean
  children: React.ReactNode
}

// Storage key prefix
const STORAGE_KEY_PREFIX = 'panel-collapsed-'

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  id,
  title,
  position,
  defaultCollapsed = false,
  children,
}) => {
  // Load initial state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + id)
    if (stored !== null) {
      return stored === 'true'
    }
    return defaultCollapsed
  })

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + id, String(isCollapsed))
  }, [id, isCollapsed])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  // Handle double-click on header
  const handleHeaderDoubleClick = useCallback(() => {
    toggleCollapse()
  }, [toggleCollapse])

  return (
    <aside 
      className={`collapsible-panel ${position}-panel ${isCollapsed ? 'collapsed' : ''}`}
      aria-label={title}
    >
      {/* Panel Header */}
      <div 
        className="panel-header"
        onDoubleClick={handleHeaderDoubleClick}
      >
        {!isCollapsed && <h2>{title}</h2>}
        <button
          className="panel-collapse-btn"
          onClick={toggleCollapse}
          title={isCollapsed ? `展开${title}` : `折叠${title}`}
          aria-expanded={!isCollapsed}
        >
          {position === 'left' 
            ? (isCollapsed ? '»' : '«')
            : (isCollapsed ? '«' : '»')
          }
        </button>
      </div>

      {/* Panel Content */}
      <div className="panel-content-wrapper">
        {children}
      </div>
    </aside>
  )
}

export default CollapsiblePanel
