import React from 'react'
import { LeftPanel } from './LeftPanel'
import { RightPanel } from './RightPanel'
import { EditorArea } from './EditorArea'
import { Header } from './Header'
import './MainLayout.css'

/**
 * MainLayout component - The primary layout structure for the editor
 * Implements Requirements 1.3: Display project structure in left panel
 * 
 * Layout structure:
 * - Header: Title, mode switcher, complexity switcher
 * - Left Panel: Project browser (scenes, characters, backgrounds, audio, variables)
 * - Center: Editor area with preview panel on top and edit panel below
 * - Right Panel: Properties panel for selected elements
 */
export const MainLayout: React.FC = () => {
  return (
    <div className="main-layout">
      <Header />
      <main className="main-content">
        <LeftPanel />
        <EditorArea />
        <RightPanel />
      </main>
    </div>
  )
}
