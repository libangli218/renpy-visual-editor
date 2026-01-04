import React, { useCallback, useMemo, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
  NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEditorStore } from '../../store/editorStore'
import { flowNodeTypesSync } from './nodes/flowNodes'
import { FlowGraphBuilder, FlowEdgeType } from './FlowGraphBuilder'
import { FileClassifier, FileClassification } from './FileClassifier'
import { isValidConnection, createEdgeId, handleNodeDeletion } from './connectionUtils'
import { projectManager } from '../../project/ProjectManager'
import { RenpyScript } from '../../types/ast'
import { NodeDetailPanel } from './NodeDetailPanel'
import './NodeModeEditor.css'

/**
 * Get edge style based on edge type
 * Implements Requirements 5.3, 5.4, 5.5: Edge styling
 * - Normal flow: solid line
 * - Jump: pink solid line
 * - Call: teal dashed line
 * - Invalid target: red warning
 */
function getEdgeStyle(type: FlowEdgeType, valid?: boolean): React.CSSProperties {
  if (valid === false) {
    return {
      stroke: '#ef4444',
      strokeWidth: 2,
      strokeDasharray: '5,5',
    }
  }
  
  switch (type) {
    case 'jump':
      return {
        stroke: '#ec4899',
        strokeWidth: 2,
      }
    case 'call':
      return {
        stroke: '#14b8a6',
        strokeWidth: 2,
        strokeDasharray: '8,4',
      }
    case 'return':
      return {
        stroke: '#f97316',
        strokeWidth: 2,
      }
    case 'normal':
    default:
      return {
        stroke: '#6366f1',
        strokeWidth: 2,
      }
  }
}

/**
 * Get edge CSS class based on type
 */
function getEdgeClassName(type: FlowEdgeType, valid?: boolean): string {
  const classes = ['flow-edge', `flow-edge-${type}`]
  if (valid === false) {
    classes.push('flow-edge-invalid')
  }
  return classes.join(' ')
}

/**
 * Extract file name from path
 */
function getFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}

/**
 * NodeModeEditor component - Flow chart editing view (Redesigned)
 * 
 * Implements Requirements:
 * - 1.4: Show Story_Script files by default with file selection dropdown
 * - 2.1: Create Scene_Node for each label
 * - 5.3, 5.4, 5.5: Edge styling based on type
 * - 2.6: Node detail panel for selected nodes
 * 
 * Features:
 * - React Flow canvas with zoom and pan
 * - Minimap for navigation
 * - Flow node types for story visualization
 * - File classification and selection
 * - Node detail panel
 */
export const NodeModeEditor: React.FC = () => {
  const { ast, setAst, setSelectedNodeId, selectedNodeId, projectPath } = useEditorStore()
  
  // File classification state
  const [fileClassification, setFileClassification] = useState<FileClassification | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [showConfigFiles, setShowConfigFiles] = useState(false)
  const [scripts, setScripts] = useState<Map<string, RenpyScript>>(new Map())
  
  // Initialize file classifier and flow graph builder
  const fileClassifier = useMemo(() => new FileClassifier(), [])
  const flowGraphBuilder = useMemo(() => new FlowGraphBuilder(), [])
  
  // Load and classify files when project changes
  useEffect(() => {
    const loadProjectFiles = async () => {
      if (!projectPath) {
        setFileClassification(null)
        setScripts(new Map())
        return
      }
      
      // Get project from project manager
      const project = projectManager.getProject()
      if (project && project.scripts.size > 0) {
        setScripts(project.scripts)
        const classification = fileClassifier.classifyProject(project.scripts)
        setFileClassification(classification)
        
        // Auto-select first story script if none selected
        if (!selectedFile && classification.storyScripts.length > 0) {
          const defaultFile = classification.storyScripts.find(f => 
            f.toLowerCase().endsWith('script.rpy')
          ) || classification.storyScripts[0]
          setSelectedFile(defaultFile)
          
          // Load the AST for the selected file
          const fileAst = project.scripts.get(defaultFile)
          if (fileAst) {
            setAst(fileAst)
          }
        }
      }
    }
    
    loadProjectFiles()
  }, [projectPath, fileClassifier, setAst, selectedFile])
  
  // Handle file selection change
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const filePath = event.target.value
    setSelectedFile(filePath)
    const fileAst = scripts.get(filePath)
    if (fileAst) {
      setAst(fileAst)
    }
  }, [scripts, setAst])
  
  // Get available files based on filter
  const availableFiles = useMemo(() => {
    if (!fileClassification) return []
    return showConfigFiles 
      ? [...fileClassification.storyScripts, ...fileClassification.configFiles]
      : fileClassification.storyScripts
  }, [fileClassification, showConfigFiles])
  
  // Convert AST to React Flow nodes and edges using FlowGraphBuilder
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!ast) {
      return { initialNodes: [] as Node[], initialEdges: [] as Edge[] }
    }
    
    // Build flow graph from AST
    const graph = flowGraphBuilder.buildGraph(ast)
    
    // Apply auto-layout
    const layoutedGraph = flowGraphBuilder.autoLayout(graph)
    
    // Convert FlowGraph to React Flow format
    const nodes: Node[] = layoutedGraph.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data as Record<string, unknown>,
    }))
    
    // Convert edges with proper styling
    const edges: Edge[] = layoutedGraph.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'smoothstep',
      animated: edge.animated,
      style: getEdgeStyle(edge.type, edge.valid),
      className: getEdgeClassName(edge.type, edge.valid),
    }))
    
    return { initialNodes: nodes, initialEdges: edges }
  }, [ast, flowGraphBuilder])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
  // Update nodes and edges when initialNodes/initialEdges change
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  // Validate connections before allowing them
  const isValidConnectionCallback = useCallback(
    (connection: Edge | Connection) => {
      const conn: Connection = {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      }
      return isValidConnection(conn, nodes, edges)
    },
    [nodes, edges]
  )

  // Handle new connections between nodes
  const onConnect = useCallback(
    (params: Connection) => {
      if (isValidConnection(params, nodes, edges)) {
        const newEdge: Edge = {
          id: createEdgeId(params),
          source: params.source!,
          target: params.target!,
          sourceHandle: params.sourceHandle || undefined,
          targetHandle: params.targetHandle || undefined,
          type: 'smoothstep',
          style: getEdgeStyle('jump'),
        }
        setEdges((eds) => addEdge(newEdge, eds))
      }
    },
    [nodes, edges, setEdges]
  )

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id)
    },
    [setSelectedNodeId]
  )

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [setSelectedNodeId])

  // Handle node deletion - also remove connected edges
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const deletedIds = deletedNodes.map((n) => n.id)
      setEdges((eds) => handleNodeDeletion(deletedIds, eds))
      setNodes((nds) => nds.filter((n) => !deletedIds.includes(n.id)))
    },
    [setEdges, setNodes]
  )

  // Minimap node color based on node type
  // Implements Requirements 9.1: Use distinct colors for different node types
  const nodeColor = useCallback((node: Node) => {
    const colorMap: Record<string, string> = {
      'scene': '#4f46e5',           // indigo - Scene nodes
      'dialogue-block': '#16a34a',  // green - Dialogue blocks
      'menu': '#d97706',            // amber - Menu nodes
      'condition': '#ca8a04',       // yellow - Condition nodes
      'jump': '#db2777',            // pink - Jump nodes
      'call': '#0d9488',            // teal - Call nodes
      'return': '#ea580c',          // orange - Return nodes
      'default': '#94a3b8',
    }
    return colorMap[node.type || 'default'] || colorMap.default
  }, [])
  
  // Get selected node data for detail panel
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    return nodes.find(n => n.id === selectedNodeId) || null
  }, [selectedNodeId, nodes])

  return (
    <div className="node-mode-editor-container" data-testid="node-mode-editor">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        isValidConnection={isValidConnectionCallback}
        nodeTypes={flowNodeTypesSync as NodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="node-mode-minimap"
        />
        
        {/* File selection panel - Implements Requirement 1.4 */}
        <Panel position="top-left" className="node-mode-panel">
          <div className="file-selector">
            {availableFiles.length > 0 ? (
              <>
                <select 
                  value={selectedFile || ''} 
                  onChange={handleFileChange}
                  className="file-select"
                >
                  {availableFiles.map(file => (
                    <option key={file} value={file}>
                      {getFileName(file)}
                    </option>
                  ))}
                </select>
                <label className="config-toggle">
                  <input
                    type="checkbox"
                    checked={showConfigFiles}
                    onChange={(e) => setShowConfigFiles(e.target.checked)}
                  />
                  <span>Show config files</span>
                </label>
              </>
            ) : (
              <span className="no-files">No story files found</span>
            )}
          </div>
          <div className="node-count">
            {nodes.length} nodes • {edges.length} connections
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Node detail panel - Implements Requirement 2.6 */}
      {selectedNode && (
        <div className="node-detail-panel">
          <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} />
        </div>
      )}
    </div>
  )
}
