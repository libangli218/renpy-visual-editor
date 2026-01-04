import { useEditorStore } from './store/editorStore'

function App() {
  const { mode, complexity, setMode, setComplexity } = useEditorStore()

  return (
    <div className="app">
      <header className="app-header">
        <h1>Ren'Py Visual Editor</h1>
        <div className="mode-switcher">
          <button
            className={mode === 'story' ? 'active' : ''}
            onClick={() => setMode('story')}
          >
            Story Mode
          </button>
          <button
            className={mode === 'node' ? 'active' : ''}
            onClick={() => setMode('node')}
          >
            Node Mode
          </button>
        </div>
        <div className="complexity-switcher">
          <button
            className={complexity === 'simple' ? 'active' : ''}
            onClick={() => setComplexity('simple')}
            title="Simple Mode"
          >
            🟢
          </button>
          <button
            className={complexity === 'preview' ? 'active' : ''}
            onClick={() => setComplexity('preview')}
            title="Code Preview Mode"
          >
            🟡
          </button>
          <button
            className={complexity === 'advanced' ? 'active' : ''}
            onClick={() => setComplexity('advanced')}
            title="Advanced Mode"
          >
            🔴
          </button>
        </div>
      </header>
      <main className="app-main">
        <aside className="left-panel">
          <h2>Project</h2>
          {/* Project browser will go here */}
        </aside>
        <section className="editor-area">
          <div className="preview-panel">
            {/* Preview engine will go here */}
          </div>
          <div className="edit-panel">
            {mode === 'story' ? (
              <div>Story Mode Editor</div>
            ) : (
              <div>Node Mode Editor</div>
            )}
          </div>
        </section>
        <aside className="right-panel">
          <h2>Properties</h2>
          {/* Properties panel will go here */}
        </aside>
      </main>
    </div>
  )
}

export default App
