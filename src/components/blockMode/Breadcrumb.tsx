/**
 * Breadcrumb Component
 * 面包屑导航组件
 * 
 * Displays the current navigation path in block mode editor.
 * Shows: Flow Graph > Label Name
 * 
 * Requirements: 9.5
 */

import React, { useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import './Breadcrumb.css'

/**
 * Props for Breadcrumb component
 */
export interface BreadcrumbProps {
  /** Current label name being edited */
  labelName: string
  /** Callback when clicking on flow graph breadcrumb */
  onNavigateToFlow?: () => void
  /** Custom class name */
  className?: string
}

/**
 * Breadcrumb item interface
 */
interface BreadcrumbItem {
  id: string
  label: string
  icon: string
  onClick?: () => void
  isActive: boolean
}

/**
 * Breadcrumb - Navigation breadcrumb component
 * 
 * Implements Requirements:
 * - 9.5: Display current label name and breadcrumb navigation
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  labelName,
  onNavigateToFlow,
  className = '',
}) => {
  const { exitBlockMode } = useEditorStore()

  /**
   * Handle click on flow graph breadcrumb
   */
  const handleFlowClick = useCallback(() => {
    if (onNavigateToFlow) {
      onNavigateToFlow()
    } else {
      exitBlockMode()
    }
  }, [onNavigateToFlow, exitBlockMode])

  // Build breadcrumb items
  const items: BreadcrumbItem[] = [
    {
      id: 'flow',
      label: '流程图',
      icon: '🔗',
      onClick: handleFlowClick,
      isActive: false,
    },
    {
      id: 'label',
      label: labelName,
      icon: '🏷️',
      isActive: true,
    },
  ]

  return (
    <nav className={`breadcrumb ${className}`} aria-label="Breadcrumb navigation">
      <ol className="breadcrumb-list">
        {items.map((item, index) => (
          <li key={item.id} className="breadcrumb-item">
            {index > 0 && (
              <span className="breadcrumb-separator" aria-hidden="true">
                /
              </span>
            )}
            {item.onClick && !item.isActive ? (
              <button
                className="breadcrumb-link"
                onClick={item.onClick}
                title={`返回${item.label}`}
              >
                <span className="breadcrumb-icon">{item.icon}</span>
                <span className="breadcrumb-label">{item.label}</span>
              </button>
            ) : (
              <span
                className={`breadcrumb-current ${item.isActive ? 'active' : ''}`}
                aria-current={item.isActive ? 'page' : undefined}
              >
                <span className="breadcrumb-icon">{item.icon}</span>
                <span className="breadcrumb-label">{item.label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb
