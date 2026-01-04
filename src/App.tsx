import { MainLayout, KeyboardShortcutProvider } from './components'

/**
 * Main App component
 * Renders the MainLayout which contains:
 * - Header with mode and complexity switchers
 * - Left panel (project browser)
 * - Center editor area with preview
 * - Right panel (properties)
 * 
 * Wrapped with KeyboardShortcutProvider for global keyboard shortcuts
 */
function App() {
  return (
    <KeyboardShortcutProvider>
      <MainLayout />
    </KeyboardShortcutProvider>
  )
}

export default App
