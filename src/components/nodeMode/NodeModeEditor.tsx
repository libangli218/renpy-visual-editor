import React, { useCallback, useMemo } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEditorStore } from '../../store/editorStore'
import { nodeTypes } from './nodeTypes'
import { astToNodes, nodesToAst } from './astNodeConverter'
import { isValidConnection, createEdgeId, handleNodeDeletion } from './connectionUtils'
import './NodeModeEditor.css'

/**
 * NodeModeEditor component - Flow chart editing view
 * Implements Requirements 5.6, 5.7: Canvas zoom/pan and minimap
 * Implements Requirements 5.3, 5.8: Node connections and edge management
 * 
 * Features:
 * - React Flow canvas with zoom and pan
 * - Minimap for navigation
 * - Custom node types for Ren'Py statements
 * - Node connections for flow control
 */
export const NodeModeEditor: React.FC = () => {
  const { ast, setAst, setSelectedNodeId } = useEditorStore()
  
  // Convert AST to React Flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!ast) {
      return { initialNodes: [], initialEdges: [] }
    }
    return astToNodes(ast)
  }, [ast])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Validate connections before allowing them
  const isValidConnectionCallback = useCallback(
    (connection: Edge | Connection) => {
      // Handle both Edge and Connection types
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

  // Handle node drag end - update AST
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      // Update AST when nodes are repositioned
      if (ast) {
        const updatedAst = nodesToAst(nodes, edges, ast)
        setAst(updatedAst)
      }
    },
    [nodes, edges, ast, setAst]
  )

  // Handle node deletion - also remove connected edges
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const deletedIds = deletedNodes.map((n) => n.id)
      setEdges((eds) => handleNodeDeletion(deletedIds, eds))
      
      // Update nodes state
      setNodes((nds) => nds.filter((n) => !deletedIds.includes(n.id)))
      
      // Update AST
      if (ast) {
        const remainingNodes = nodes.filter((n) => !deletedIds.includes(n.id))
        const remainingEdges = handleNodeDeletion(deletedIds, edges)
        const updatedAst = nodesToAst(remainingNodes, remainingEdges, ast)
        setAst(updatedAst)
      }
    },
    [nodes, edges, ast, setAst, setEdges, setNodes]
  )

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      // Update AST when edges are deleted
      if (ast) {
        const remainingEdges = edges.filter(
          (e) => !deletedEdges.find((de) => de.id === e.id)
        )
        const updatedAst = nodesToAst(nodes, remainingEdges, ast)
        setAst(updatedAst)
      }
    },
    [nodes, edges, ast, setAst]
  )

  // Minimap node color based on node type
  const nodeColor = useCallback((node: Node) => {
    const colorMap: Record<string, string> = {
      label: '#6366f1',
      dialogue: '#22c55e',
      menu: '#f59e0b',
      scene: '#3b82f6',
      show: '#8b5cf6',
      hide: '#ef4444',
      jump: '#ec4899',
      call: '#14b8a6',
      return: '#f97316',
      if: '#eab308',
      python: '#64748b',
      play: '#06b6d4',
      stop: '#dc2626',
      default: '#94a3b8',
    }
    return colorMap[node.type || 'default'] || colorMap.default
  }, [])

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
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        isValidConnection={isValidConnectionCallback}
        nodeTypes={nodeTypes}
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
        <Panel position="top-left" className="node-mode-panel">
          <div className="node-count">
            {nodes.length} nodes • {edges.length} connections
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
