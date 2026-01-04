import React, { useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { ASTNode, LabelNode, DialogueNode, MenuNode, SceneNode, ShowNode, HideNode, WithNode, JumpNode, CallNode, ReturnNode, IfNode, SetNode, PythonNode, PlayNode, StopNode, PauseNode, NVLNode, DefineNode, DefaultNode, RawNode } from '../../types/ast'
import { getNodeTypeLabel, getNodeTypeColor } from './astNodeConverter'
import { generateNode } from '../../generator/codeGenerator'
import './NodePropertiesPanel.css'

/**
 * NodePropertiesPanel component - Shows properties for selected node
 * Implements Requirements 5.4: Show properties for selected node
 */
export const NodePropertiesPanel: React.FC = () => {
  const { ast, selectedNodeId, complexity, setAst } = useEditorStore()

  // Find the selected node in the AST
  const selectedNode = React.useMemo(() => {
    if (!ast || !selectedNodeId) return null
    return findNodeById(ast.statements, selectedNodeId)
  }, [ast, selectedNodeId])

  // Update node property in AST
  const updateNodeProperty = useCallback(
    (property: string, value: unknown) => {
      if (!ast || !selectedNodeId) return

      const updatedStatements = updateNodeInStatements(
        ast.statements,
        selectedNodeId,
        property,
        value
      )

      setAst({
        ...ast,
        statements: updatedStatements,
      })
    },
    [ast, selectedNodeId, setAst]
  )

  if (!selectedNode) {
    return (
      <div className="node-properties-panel">
        <div className="properties-empty">
          <p>Select a node to view its properties</p>
        </div>
      </div>
    )
  }

  const nodeColor = getNodeTypeColor(selectedNode.type)
  const nodeLabel = getNodeTypeLabel(selectedNode.type)

  return (
    <div className="node-properties-panel">
      <div className="properties-header" style={{ borderColor: nodeColor }}>
        <span className="properties-type-badge" style={{ backgroundColor: nodeColor }}>
          {nodeLabel}
        </span>
        <span className="properties-id">{selectedNode.id}</span>
      </div>

      <div className="properties-content">
        {renderNodeProperties(selectedNode, updateNodeProperty)}
      </div>

      {/* Code preview section - shown in preview and advanced modes */}
      {(complexity === 'preview' || complexity === 'advanced') && (
        <div className="properties-code-preview">
          <h4>Generated Code</h4>
          <pre className="code-preview">
            <code>{generateNode(selectedNode, 0)}</code>
          </pre>
          {complexity === 'advanced' && (
            <p className="code-edit-hint">
              Edit code directly in advanced mode
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Find a node by ID in the AST
 */
function findNodeById(statements: ASTNode[], id: string): ASTNode | null {
  for (const statement of statements) {
    if (statement.id === id) {
      return statement
    }

    // Check nested nodes
    if (statement.type === 'label') {
      const labelNode = statement as LabelNode
      const found = findNodeById(labelNode.body, id)
      if (found) return found
    }

    if (statement.type === 'menu') {
      const menuNode = statement as MenuNode
      for (const choice of menuNode.choices) {
        const found = findNodeById(choice.body, id)
        if (found) return found
      }
    }

    if (statement.type === 'if') {
      const ifNode = statement as IfNode
      for (const branch of ifNode.branches) {
        const found = findNodeById(branch.body, id)
        if (found) return found
      }
    }
  }

  return null
}

/**
 * Update a node property in the AST
 */
function updateNodeInStatements(
  statements: ASTNode[],
  nodeId: string,
  property: string,
  value: unknown
): ASTNode[] {
  return statements.map((statement) => {
    if (statement.id === nodeId) {
      return { ...statement, [property]: value }
    }

    // Handle nested nodes
    if (statement.type === 'label') {
      const labelNode = statement as LabelNode
      return {
        ...labelNode,
        body: updateNodeInStatements(labelNode.body, nodeId, property, value),
      }
    }

    if (statement.type === 'menu') {
      const menuNode = statement as MenuNode
      return {
        ...menuNode,
        choices: menuNode.choices.map((choice) => ({
          ...choice,
          body: updateNodeInStatements(choice.body, nodeId, property, value),
        })),
      }
    }

    if (statement.type === 'if') {
      const ifNode = statement as IfNode
      return {
        ...ifNode,
        branches: ifNode.branches.map((branch) => ({
          ...branch,
          body: updateNodeInStatements(branch.body, nodeId, property, value),
        })),
      }
    }

    return statement
  })
}

/**
 * Render properties for a specific node type
 */
function renderNodeProperties(
  node: ASTNode,
  updateProperty: (property: string, value: unknown) => void
): React.ReactNode {
  switch (node.type) {
    case 'label':
      return <LabelProperties node={node as LabelNode} updateProperty={updateProperty} />
    case 'dialogue':
      return <DialogueProperties node={node as DialogueNode} updateProperty={updateProperty} />
    case 'menu':
      return <MenuProperties node={node as MenuNode} updateProperty={updateProperty} />
    case 'scene':
      return <SceneProperties node={node as SceneNode} updateProperty={updateProperty} />
    case 'show':
      return <ShowProperties node={node as ShowNode} updateProperty={updateProperty} />
    case 'hide':
      return <HideProperties node={node as HideNode} updateProperty={updateProperty} />
    case 'with':
      return <WithProperties node={node as WithNode} updateProperty={updateProperty} />
    case 'jump':
      return <JumpProperties node={node as JumpNode} updateProperty={updateProperty} />
    case 'call':
      return <CallProperties node={node as CallNode} updateProperty={updateProperty} />
    case 'return':
      return <ReturnProperties node={node as ReturnNode} updateProperty={updateProperty} />
    case 'if':
      return <IfProperties node={node as IfNode} updateProperty={updateProperty} />
    case 'set':
      return <SetProperties node={node as SetNode} updateProperty={updateProperty} />
    case 'python':
      return <PythonProperties node={node as PythonNode} updateProperty={updateProperty} />
    case 'play':
      return <PlayProperties node={node as PlayNode} updateProperty={updateProperty} />
    case 'stop':
      return <StopProperties node={node as StopNode} updateProperty={updateProperty} />
    case 'pause':
      return <PauseProperties node={node as PauseNode} updateProperty={updateProperty} />
    case 'nvl':
      return <NVLProperties node={node as NVLNode} updateProperty={updateProperty} />
    case 'define':
      return <DefineProperties node={node as DefineNode} updateProperty={updateProperty} />
    case 'default':
      return <DefaultProperties node={node as DefaultNode} updateProperty={updateProperty} />
    case 'raw':
      return <RawProperties node={node as RawNode} updateProperty={updateProperty} />
    default:
      return <div className="property-group">Unknown node type</div>
  }
}

// Property components for each node type
interface PropertyProps<T> {
  node: T
  updateProperty: (property: string, value: unknown) => void
}

const LabelProperties: React.FC<PropertyProps<LabelNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Name"
      value={node.name}
      onChange={(v) => updateProperty('name', v)}
    />
    <PropertyField
      label="Parameters"
      value={node.parameters?.join(', ') || ''}
      onChange={(v) => updateProperty('parameters', v ? v.split(',').map((s) => s.trim()) : [])}
      placeholder="param1, param2"
    />
  </div>
)

const DialogueProperties: React.FC<PropertyProps<DialogueNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Speaker"
      value={node.speaker || ''}
      onChange={(v) => updateProperty('speaker', v || null)}
      placeholder="Leave empty for narration"
    />
    <PropertyTextArea
      label="Text"
      value={node.text}
      onChange={(v) => updateProperty('text', v)}
    />
    <PropertyField
      label="Attributes"
      value={node.attributes?.join(' ') || ''}
      onChange={(v) => updateProperty('attributes', v ? v.split(' ').filter(Boolean) : [])}
      placeholder="happy at left"
    />
  </div>
)

const MenuProperties: React.FC<PropertyProps<MenuNode>> = ({ node, updateProperty }) => {
  // Add a new choice
  const addChoice = () => {
    const newChoices = [...node.choices, { text: 'New choice', body: [] }]
    updateProperty('choices', newChoices)
  }

  // Update a choice's text
  const updateChoiceText = (index: number, text: string) => {
    const newChoices = [...node.choices]
    newChoices[index] = { ...newChoices[index], text }
    updateProperty('choices', newChoices)
  }

  // Update a choice's condition
  const updateChoiceCondition = (index: number, condition: string) => {
    const newChoices = [...node.choices]
    newChoices[index] = { 
      ...newChoices[index], 
      condition: condition.trim() || undefined 
    }
    updateProperty('choices', newChoices)
  }

  // Remove a choice
  const removeChoice = (index: number) => {
    if (node.choices.length <= 1) return // Must have at least one choice
    const newChoices = node.choices.filter((_, i) => i !== index)
    updateProperty('choices', newChoices)
  }

  return (
    <div className="property-group">
      <PropertyField
        label="Prompt"
        value={node.prompt || ''}
        onChange={(v) => updateProperty('prompt', v || undefined)}
        placeholder="Optional menu prompt"
      />
      <div className="property-item">
        <label>Choices ({node.choices.length})</label>
        <div className="menu-choices-editor">
          {node.choices.map((choice, index) => (
            <div key={index} className="menu-choice-editor-item">
              <div className="menu-choice-editor-header">
                <span className="menu-choice-index">{index + 1}</span>
                {node.choices.length > 1 && (
                  <button
                    className="menu-choice-remove-btn"
                    onClick={() => removeChoice(index)}
                    title="Remove choice"
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="menu-choice-editor-fields">
                <input
                  type="text"
                  value={choice.text}
                  onChange={(e) => updateChoiceText(index, e.target.value)}
                  placeholder="Choice text..."
                  className="property-input menu-choice-text-input"
                />
                <div className="menu-choice-condition-row">
                  <span className="menu-choice-condition-label">if</span>
                  <input
                    type="text"
                    value={choice.condition || ''}
                    onChange={(e) => updateChoiceCondition(index, e.target.value)}
                    placeholder="condition (optional)"
                    className="property-input menu-choice-condition-input"
                  />
                </div>
              </div>
              <div className="menu-choice-body-info">
                {choice.body.length} statement{choice.body.length !== 1 ? 's' : ''} in body
              </div>
            </div>
          ))}
        </div>
        <button
          className="menu-choice-add-btn"
          onClick={addChoice}
          type="button"
        >
          + Add Choice
        </button>
      </div>
    </div>
  )
}

const SceneProperties: React.FC<PropertyProps<SceneNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Image"
      value={node.image}
      onChange={(v) => updateProperty('image', v)}
    />
    <PropertyField
      label="Layer"
      value={node.layer || ''}
      onChange={(v) => updateProperty('layer', v || undefined)}
      placeholder="master"
    />
  </div>
)

const ShowProperties: React.FC<PropertyProps<ShowNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Image"
      value={node.image}
      onChange={(v) => updateProperty('image', v)}
    />
    <PropertyField
      label="Attributes"
      value={node.attributes?.join(' ') || ''}
      onChange={(v) => updateProperty('attributes', v ? v.split(' ').filter(Boolean) : [])}
      placeholder="happy casual"
    />
    <PropertyField
      label="Position"
      value={node.atPosition || ''}
      onChange={(v) => updateProperty('atPosition', v || undefined)}
      placeholder="left, right, center"
    />
  </div>
)

const HideProperties: React.FC<PropertyProps<HideNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Image"
      value={node.image}
      onChange={(v) => updateProperty('image', v)}
    />
  </div>
)

const WithProperties: React.FC<PropertyProps<WithNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Transition"
      value={node.transition}
      onChange={(v) => updateProperty('transition', v)}
      placeholder="dissolve, fade, etc."
    />
  </div>
)

const JumpProperties: React.FC<PropertyProps<JumpNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Target"
      value={node.target}
      onChange={(v) => updateProperty('target', v)}
    />
    <PropertyCheckbox
      label="Expression"
      checked={node.expression || false}
      onChange={(v) => updateProperty('expression', v || undefined)}
    />
  </div>
)

const CallProperties: React.FC<PropertyProps<CallNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Target"
      value={node.target}
      onChange={(v) => updateProperty('target', v)}
    />
    <PropertyField
      label="Arguments"
      value={node.arguments?.join(', ') || ''}
      onChange={(v) => updateProperty('arguments', v ? v.split(',').map((s) => s.trim()) : [])}
      placeholder="arg1, arg2"
    />
    <PropertyCheckbox
      label="Expression"
      checked={node.expression || false}
      onChange={(v) => updateProperty('expression', v || undefined)}
    />
  </div>
)

const ReturnProperties: React.FC<PropertyProps<ReturnNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Value"
      value={node.value || ''}
      onChange={(v) => updateProperty('value', v || undefined)}
      placeholder="Optional return value"
    />
  </div>
)

const IfProperties: React.FC<PropertyProps<IfNode>> = ({ node, updateProperty }) => {
  // Add a new branch (elif or else)
  const addBranch = (isElse: boolean) => {
    const newBranches = [...node.branches]
    
    if (isElse) {
      // Check if else already exists (last branch with null condition)
      const hasElse = newBranches.length > 0 && newBranches[newBranches.length - 1].condition === null
      if (hasElse) return // Can't add another else
      
      newBranches.push({ condition: null, body: [] })
    } else {
      // Add elif before else if exists
      const hasElse = newBranches.length > 0 && newBranches[newBranches.length - 1].condition === null
      if (hasElse) {
        // Insert before else
        newBranches.splice(newBranches.length - 1, 0, { condition: 'True', body: [] })
      } else {
        newBranches.push({ condition: 'True', body: [] })
      }
    }
    
    updateProperty('branches', newBranches)
  }

  // Update a branch condition
  const updateBranchCondition = (index: number, condition: string) => {
    const newBranches = [...node.branches]
    newBranches[index] = { ...newBranches[index], condition: condition || null }
    updateProperty('branches', newBranches)
  }

  // Remove a branch
  const removeBranch = (index: number) => {
    if (node.branches.length <= 1) return // Must have at least one branch
    const newBranches = node.branches.filter((_, i) => i !== index)
    updateProperty('branches', newBranches)
  }

  // Check if else branch exists
  const hasElse = node.branches.length > 0 && node.branches[node.branches.length - 1].condition === null

  return (
    <div className="property-group">
      <div className="property-item">
        <label>Branches ({node.branches.length})</label>
        <div className="branches-editor">
          {node.branches.map((branch, index) => (
            <div key={index} className="branch-editor-item">
              <div className="branch-editor-header">
                <span className="branch-editor-type">
                  {index === 0 ? 'if' : branch.condition === null ? 'else' : 'elif'}
                </span>
                {node.branches.length > 1 && (
                  <button
                    className="branch-remove-btn"
                    onClick={() => removeBranch(index)}
                    title="Remove branch"
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
              {branch.condition !== null && (
                <input
                  type="text"
                  value={branch.condition}
                  onChange={(e) => updateBranchCondition(index, e.target.value)}
                  placeholder="Enter condition..."
                  className="property-input branch-condition-input"
                />
              )}
              <div className="branch-body-info">
                {branch.body.length} statement{branch.body.length !== 1 ? 's' : ''} in body
              </div>
            </div>
          ))}
        </div>
        <div className="branch-add-buttons">
          <button
            className="branch-add-btn"
            onClick={() => addBranch(false)}
            type="button"
          >
            + Add elif
          </button>
          {!hasElse && (
            <button
              className="branch-add-btn branch-add-else"
              onClick={() => addBranch(true)}
              type="button"
            >
              + Add else
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const SetProperties: React.FC<PropertyProps<SetNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Variable"
      value={node.variable}
      onChange={(v) => updateProperty('variable', v)}
    />
    <PropertySelect
      label="Operator"
      value={node.operator}
      options={['=', '+=', '-=', '*=', '/=']}
      onChange={(v) => updateProperty('operator', v)}
    />
    <PropertyField
      label="Value"
      value={node.value}
      onChange={(v) => updateProperty('value', v)}
    />
  </div>
)

const PythonProperties: React.FC<PropertyProps<PythonNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyCheckbox
      label="Early"
      checked={node.early || false}
      onChange={(v) => updateProperty('early', v || undefined)}
    />
    <PropertyCheckbox
      label="Hide"
      checked={node.hide || false}
      onChange={(v) => updateProperty('hide', v || undefined)}
    />
    <PropertyTextArea
      label="Code"
      value={node.code}
      onChange={(v) => updateProperty('code', v)}
      rows={6}
      monospace
    />
  </div>
)

const PlayProperties: React.FC<PropertyProps<PlayNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertySelect
      label="Channel"
      value={node.channel}
      options={['music', 'sound', 'voice']}
      onChange={(v) => updateProperty('channel', v)}
    />
    <PropertyField
      label="File"
      value={node.file}
      onChange={(v) => updateProperty('file', v)}
      placeholder="audio/music.ogg"
    />
    <PropertyNumber
      label="Fade In (seconds)"
      value={node.fadeIn}
      onChange={(v) => updateProperty('fadeIn', v)}
      min={0}
      step={0.1}
      placeholder="0.0"
    />
    <PropertyNumber
      label="Volume"
      value={node.volume}
      onChange={(v) => updateProperty('volume', v)}
      min={0}
      max={1}
      step={0.1}
      placeholder="1.0"
    />
    <PropertyCheckbox
      label="Loop"
      checked={node.loop || false}
      onChange={(v) => updateProperty('loop', v || undefined)}
    />
    {node.channel === 'music' && (
      <PropertyCheckbox
        label="Queue (add to playlist)"
        checked={node.queue || false}
        onChange={(v) => updateProperty('queue', v || undefined)}
      />
    )}
  </div>
)

const StopProperties: React.FC<PropertyProps<StopNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertySelect
      label="Channel"
      value={node.channel}
      options={['music', 'sound', 'voice']}
      onChange={(v) => updateProperty('channel', v)}
    />
    <PropertyNumber
      label="Fade Out (seconds)"
      value={node.fadeOut}
      onChange={(v) => updateProperty('fadeOut', v)}
      min={0}
      step={0.1}
      placeholder="0.0"
    />
  </div>
)

const PauseProperties: React.FC<PropertyProps<PauseNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Duration"
      value={node.duration?.toString() || ''}
      onChange={(v) => updateProperty('duration', v ? parseFloat(v) : undefined)}
      placeholder="Leave empty for click"
    />
  </div>
)

const NVLProperties: React.FC<PropertyProps<NVLNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertySelect
      label="Action"
      value={node.action}
      options={['show', 'hide', 'clear']}
      onChange={(v) => updateProperty('action', v)}
    />
  </div>
)

const DefineProperties: React.FC<PropertyProps<DefineNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Name"
      value={node.name}
      onChange={(v) => updateProperty('name', v)}
    />
    <PropertyField
      label="Store"
      value={node.store || ''}
      onChange={(v) => updateProperty('store', v || undefined)}
      placeholder="Optional namespace"
    />
    <PropertyField
      label="Value"
      value={node.value}
      onChange={(v) => updateProperty('value', v)}
    />
  </div>
)

const DefaultProperties: React.FC<PropertyProps<DefaultNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyField
      label="Name"
      value={node.name}
      onChange={(v) => updateProperty('name', v)}
    />
    <PropertyField
      label="Value"
      value={node.value}
      onChange={(v) => updateProperty('value', v)}
    />
  </div>
)

const RawProperties: React.FC<PropertyProps<RawNode>> = ({ node, updateProperty }) => (
  <div className="property-group">
    <PropertyTextArea
      label="Content"
      value={node.content}
      onChange={(v) => updateProperty('content', v)}
      rows={6}
      monospace
    />
  </div>
)

// Reusable property field components
interface PropertyFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const PropertyField: React.FC<PropertyFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
}) => (
  <div className="property-item">
    <label>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="property-input"
    />
  </div>
)

interface PropertyTextAreaProps {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  monospace?: boolean
}

const PropertyTextArea: React.FC<PropertyTextAreaProps> = ({
  label,
  value,
  onChange,
  rows = 3,
  monospace,
}) => (
  <div className="property-item">
    <label>{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className={`property-textarea ${monospace ? 'monospace' : ''}`}
    />
  </div>
)

interface PropertyCheckboxProps {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}

const PropertyCheckbox: React.FC<PropertyCheckboxProps> = ({
  label,
  checked,
  onChange,
}) => (
  <div className="property-item property-checkbox">
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  </div>
)

interface PropertySelectProps {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

const PropertySelect: React.FC<PropertySelectProps> = ({
  label,
  value,
  options,
  onChange,
}) => (
  <div className="property-item">
    <label>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="property-select"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
)

interface PropertyNumberProps {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

const PropertyNumber: React.FC<PropertyNumberProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
}) => (
  <div className="property-item">
    <label>{label}</label>
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const val = e.target.value
        onChange(val === '' ? undefined : parseFloat(val))
      }}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      className="property-input"
    />
  </div>
)
