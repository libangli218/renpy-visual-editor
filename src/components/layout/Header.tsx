import React from 'react'
import { useEditorStore } from '../../store/editorStore'
import { ModeSwitcher } from './ModeSwitcher'
import { ComplexitySwitcher } from './ComplexitySwitcher'

/**
 * Header component - Top bar with title and mode/complexity switchers
 * Implements Requirements 2.1, 3.1
 */
export const Header: React.FC = () => {
  const { modified, projectPath } = useEditorStore()
  
  // Extract project name from path
  const projectName = projectPath 
    ? projectPath.split(/[/\\]/).pop() 
    : 'Untitled Project'

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">
          Ren'Py Visual Editor
          {projectPath && (
            <span className="project-name">
              {' - '}{projectName}{modified ? ' *' : ''}
            </span>
          )}
        </h1>
      </div>
      <div className="header-center">
        <ModeSwitcher />
      </div>
      <div className="header-right">
        <ComplexitySwitcher />
      </div>
    </header>
  )
}
