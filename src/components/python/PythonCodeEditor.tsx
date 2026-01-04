import React, { useCallback, useRef } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import './PythonCodeEditor.css'

export interface PythonCodeEditorProps {
  value: string
  onChange: (value: string) => void
  height?: string | number
  readOnly?: boolean
  showLineNumbers?: boolean
  minimap?: boolean
  placeholder?: string
}

/**
 * PythonCodeEditor - Monaco Editor integration for Python code editing
 * Implements Requirements 13.1, 13.3: Python code block with syntax highlighting
 */
export const PythonCodeEditor: React.FC<PythonCodeEditorProps> = ({
  value,
  onChange,
  height = '200px',
  readOnly = false,
  showLineNumbers = true,
  minimap = false,
  placeholder = '# Enter Python code here...',
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
    
    // Focus the editor when mounted
    editor.focus()
  }, [])

  const handleChange: OnChange = useCallback((newValue) => {
    onChange(newValue || '')
  }, [onChange])

  // Show placeholder when empty
  const displayValue = value || ''

  return (
    <div className="python-code-editor">
      <Editor
        height={height}
        language="python"
        value={displayValue}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          readOnly,
          lineNumbers: showLineNumbers ? 'on' : 'off',
          minimap: { enabled: minimap },
          scrollBeyondLastLine: false,
          fontSize: 13,
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
          wordWrap: 'on',
          folding: true,
          renderLineHighlight: 'line',
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          padding: {
            top: 8,
            bottom: 8,
          },
          // Python-specific settings
          bracketPairColorization: {
            enabled: true,
          },
          guides: {
            indentation: true,
            bracketPairs: true,
          },
        }}
        loading={
          <div className="python-editor-loading">
            Loading editor...
          </div>
        }
      />
      {!value && (
        <div className="python-editor-placeholder">
          {placeholder}
        </div>
      )}
    </div>
  )
}

export default PythonCodeEditor
