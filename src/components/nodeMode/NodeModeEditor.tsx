import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
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
  OnConnectStart,
  OnConnectEnd,
  ReactFlowProvider,
  ConnectionLineType,
  useReactFlow,
  XYPosition,
  SelectionMode,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEditorStore } from '../../store/editorStore'
import { flowNodeTypesSync } from './nodes/flowNodes'
import { FlowGraphBuilder, FlowEdgeType, FlowNodeData, FlowNodeType } from './FlowGraphBuilder'
import { FileClassifier, FileClassification } from './FileClassifier'
import { isValidConnection, createEdgeId, handleNodeDeletion, findDisconnectedNodes } from './connectionUtils'
import { projectManager } from '../../project/ProjectManager'
import { RenpyScript } from '../../types/ast'
import { NodeDetailPanel } from './NodeDetailPanel'
import { cacheManager } from '../../cache'
import { computeHash } from '../../cache/hashUtils'
import { NodeOperationHandler } from './NodeOperationHandler'
import { PendingNodePool } from './PendingNodePool'
import './NodeModeEditor.css'

/**
 * Node creation menu item definition
 */
interface NodeCreationMenuItem {
  type: string
  label: string
  icon: string
  description: string
}

/**
 * Available node types for creation
 * Implements Requirement 6.3: Support creating new label, dialogue, etc.
 */
const NODE_CREATION_MENU_ITEMS: NodeCreationMenuItem[] = [
  {
    type: 'scene',
    label: 'New Scene (Label)',
    icon: '🏷️',
    description: 'Create a new scene entry point',
  },
  {
    type: 'dialogue-block',
    label: 'Dialogue Block',
    icon: '💬',
    description: 'Add a dialogue sequence',
  },
  {
    type: 'menu',
    label: 'Menu Choice',
    icon: '🔀',
    description: 'Add a branching menu',
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: '❓',
    description: 'Add a conditional branch',
  },
  {
    type: 'jump',
    label: 'Jump',
    icon: '➡️',
    description: 'Jump to another scene',
  },
  {
    type: 'call',
    label: 'Call',
    icon: '📞',
    description: 'Call another scene and return',
  },
  {
    type: 'return',
    label: 'Return',
    icon: '↩️',
    description: 'Return from current scene',
  },
]

/**
 * Context menu position state
 */
interface ContextMenuState {
  visible: boolean
  position: { x: number; y: number }
  flowPosition: XYPosition
}

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
 * - 6.1: Drag from output port to show preview line
 * - 6.2: Drop on valid input port to create new edge
 * 
 * Features:
 * - React Flow canvas with zoom and pan
 * - Minimap for navigation
 * - Flow node types for story visualization
 * - File classification and selection
 * - Node detail panel
 * - Drag-to-connect with visual feedback
 */

/**
 * Viewport state for persistence
 */
interface ViewportState {
  x: number
  y: number
  zoom: number
}

/**
 * Store for viewport states per file
 * Implements Requirement 7.6: Remember zoom level and position per file
 */
const viewportStates = new Map<string, ViewportState>()

/**
 * Inner component that uses React Flow hooks
 */
const NodeModeEditorInner: React.FC = () => {
  const { ast, setAst, setSelectedNodeId, selectedNodeId, projectPath } = useEditorStore()
  const reactFlowInstance = useReactFlow()
  
  // Connection state for drag-to-connect visual feedback
  const [isConnecting, setIsConnecting] = useState(false)
  const connectingNodeRef = useRef<{ nodeId: string; handleId: string | null } | null>(null)
  
  // Zoom level state for display
  // Implements Requirement 7.1: Zoom support
  const [zoomLevel, setZoomLevel] = useState(1)
  
  // Context menu state for node creation
  // Implements Requirement 6.3: Double-click canvas to show creation menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    position: { x: 0, y: 0 },
    flowPosition: { x: 0, y: 0 },
  })
  
  // File classification state
  const [fileClassification, setFileClassification] = useState<FileClassification | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [showConfigFiles, setShowConfigFiles] = useState(false)
  const [scripts, setScripts] = useState<Map<string, RenpyScript>>(new Map())
  
  // Track previous file for viewport persistence
  const previousFileRef = useRef<string | null>(null)
  
  // Initialize file classifier and flow graph builder
  const fileClassifier = useMemo(() => new FileClassifier(), [])
  const flowGraphBuilder = useMemo(() => new FlowGraphBuilder(), [])
  
  // Initialize NodeOperationHandler and PendingNodePool for node creation persistence
  // Implements Requirement 1.1: 对话节点创建与持久化
  const pendingNodePoolRef = useRef(new PendingNodePool())
  const nodeOperationHandlerRef = useRef(new NodeOperationHandler(pendingNodePoolRef.current))
  
  // Orphan node confirmation dialog state
  // Implements Requirement 6.2, 6.3: 保存前孤立节点检查
  const [showOrphanDialog, setShowOrphanDialog] = useState(false)
  const [orphanNodesForDialog, setOrphanNodesForDialog] = useState<string[]>([])
  const pendingSaveCallbackRef = useRef<(() => void) | null>(null)
  
  // Load and classify files when project changes
  // Uses cacheManager for AST retrieval
  // Implements Requirements 2.1, 2.2: Cache AST with content hash
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
          
          // Load the AST for the selected file using cache
          const originalContent = projectManager.getOriginalContent(defaultFile)
          if (originalContent) {
            // Use cached AST if available, otherwise parse and cache
            const cachedAst = cacheManager.getAST(defaultFile, originalContent)
            setAst(cachedAst)
          } else {
            // Fallback to project scripts if content not available
            const fileAst = project.scripts.get(defaultFile)
            if (fileAst) {
              setAst(fileAst)
            }
          }
        }
      }
    }
    
    loadProjectFiles()
  }, [projectPath, fileClassifier, setAst, selectedFile])
  
  // Handle file selection change
  // Uses cacheManager for AST retrieval when content is available
  // Implements Requirements 2.1, 2.2: Cache AST with content hash
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const filePath = event.target.value
    setSelectedFile(filePath)
    
    // Try to get AST from cache using original content
    const originalContent = projectManager.getOriginalContent(filePath)
    if (originalContent) {
      // Use cached AST if available, otherwise parse and cache
      const cachedAst = cacheManager.getAST(filePath, originalContent)
      setAst(cachedAst)
    } else {
      // Fallback to scripts map if content not available
      const fileAst = scripts.get(filePath)
      if (fileAst) {
        setAst(fileAst)
      }
    }
  }, [scripts, setAst])
  
  // Track previous content hash for change detection
  // Implements Requirements 1.3, 2.3, 3.3: Cache invalidation on file change
  const previousContentHashRef = useRef<string | null>(null)
  
  /**
   * Detect file content changes and invalidate cache
   * Implements Requirements 1.3, 2.3, 3.3: Cache invalidation on file change
   * 
   * When the AST is modified (via setAst), we need to:
   * 1. Detect that the content has changed from the original
   * 2. Invalidate the cache for the current file
   * 
   * This ensures that the next time the file is accessed, it will be
   * re-parsed and the flow graph will be rebuilt.
   */
  useEffect(() => {
    if (!selectedFile || !ast) {
      previousContentHashRef.current = null
      return
    }
    
    // Get the current content hash from the cache
    const currentHash = cacheManager.getFileHash(selectedFile)
    
    // Get the original content to compute its hash
    const originalContent = projectManager.getOriginalContent(selectedFile)
    if (!originalContent) {
      previousContentHashRef.current = currentHash || null
      return
    }
    
    const originalHash = computeHash(originalContent)
    
    // If this is the first time we're seeing this file, just store the hash
    if (previousContentHashRef.current === null) {
      previousContentHashRef.current = originalHash
      return
    }
    
    // Check if the AST has been modified (different from original)
    // When AST changes, we need to invalidate the cache so that
    // the next load will re-parse the file
    if (currentHash && currentHash !== originalHash) {
      // Content has changed from original - invalidate cache
      // This ensures the cache doesn't serve stale data
      cacheManager.invalidate(selectedFile)
      console.log(`[NodeModeEditor] Cache invalidated for modified file: ${selectedFile}`)
      
      // Mark the script as modified in the project manager
      projectManager.markScriptModified(selectedFile)
    }
    
    // Update the previous hash reference
    previousContentHashRef.current = currentHash || originalHash
  }, [selectedFile, ast])
  
  // Get available files based on filter
  const availableFiles = useMemo(() => {
    if (!fileClassification) return []
    return showConfigFiles 
      ? [...fileClassification.storyScripts, ...fileClassification.configFiles]
      : fileClassification.storyScripts
  }, [fileClassification, showConfigFiles])
  
  // Convert AST to React Flow nodes and edges using FlowGraphBuilder
  // Uses cacheManager for FlowGraph caching
  // Implements Requirements 3.1, 3.2: Cache FlowGraph with AST hash
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!ast) {
      return { initialNodes: [] as Node[], initialEdges: [] as Edge[] }
    }
    
    // Get content hash for caching - use selectedFile to get the hash
    const contentHash = selectedFile ? cacheManager.getFileHash(selectedFile) : null
    
    // Build flow graph from AST, using cache if hash is available
    let graph
    if (contentHash) {
      // Use cached FlowGraph if available, otherwise build and cache
      graph = cacheManager.getFlowGraph(contentHash, () => flowGraphBuilder.buildGraph(ast))
    } else {
      // Fallback to direct build if no hash available
      graph = flowGraphBuilder.buildGraph(ast)
    }
    
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
  }, [ast, flowGraphBuilder, selectedFile])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
  // Update nodes and edges when initialNodes/initialEdges change
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  /**
   * Handle node data change from detail panel
   * Updates the node data in React Flow state without triggering AST rebuild
   */
  const handleNodeDataChange = useCallback((nodeId: string, newData: FlowNodeData) => {
    setNodes((nds) => 
      nds.map((node) => 
        node.id === nodeId 
          ? { ...node, data: newData as Record<string, unknown> }
          : node
      )
    )
  }, [setNodes])

  // Detect disconnected nodes - Implements Requirement 9.5
  const disconnectedNodeIds = useMemo(() => {
    return findDisconnectedNodes(nodes, edges)
  }, [nodes, edges])

  // Detect orphan nodes from PendingNodePool - Implements Requirement 1.5, 6.1
  const orphanNodeIds = useMemo(() => {
    const orphanIds = new Set<string>()
    const pendingNodes = pendingNodePoolRef.current.getAll()
    
    for (const pendingNode of pendingNodes) {
      // A pending node is orphan if it's not connected to any edge
      const hasIncomingEdge = edges.some(e => e.target === pendingNode.id)
      const hasOutgoingEdge = edges.some(e => e.source === pendingNode.id)
      
      if (!hasIncomingEdge && !hasOutgoingEdge) {
        orphanIds.add(pendingNode.id)
      }
    }
    
    return orphanIds
  }, [edges])

  // Detect nodes with invalid targets - Implements Requirement 4.3
  // Jump/Call 节点的目标 label 不存在时显示无效目标警告
  const invalidTargetNodeIds = useMemo(() => {
    const invalidIds = new Set<string>()
    
    // Collect all valid label names from scene nodes
    const validLabels = new Set<string>()
    for (const node of nodes) {
      if (node.type === 'scene' && node.data?.label) {
        validLabels.add(node.data.label as string)
      }
    }
    
    // Also collect labels from pending scene nodes
    const pendingNodes = pendingNodePoolRef.current.getAll()
    for (const pendingNode of pendingNodes) {
      if (pendingNode.type === 'scene' && pendingNode.data.label) {
        validLabels.add(pendingNode.data.label)
      }
    }
    
    // Check jump and call nodes for invalid targets
    for (const node of nodes) {
      if (node.type === 'jump' || node.type === 'call') {
        const target = node.data?.target as string | undefined
        if (!target || !validLabels.has(target)) {
          invalidIds.add(node.id)
        }
      }
    }
    
    // Also check pending jump/call nodes
    for (const pendingNode of pendingNodes) {
      if (pendingNode.type === 'jump' || pendingNode.type === 'call') {
        const target = pendingNode.data.target
        if (!target || !validLabels.has(target)) {
          invalidIds.add(pendingNode.id)
        }
      }
    }
    
    return invalidIds
  }, [nodes])

  // Add disconnected/orphan/pending/invalid-target class to nodes
  // Implements Requirements 1.5, 6.1: 孤立节点视觉标记
  // Implements Requirement 4.3: 无效目标节点标记
  const nodesWithStatusClass = useMemo(() => {
    return nodes.map(node => {
      const classes: string[] = []
      
      // Check if node is pending (in PendingNodePool)
      const isPending = pendingNodePoolRef.current.isPending(node.id)
      
      if (isPending) {
        // Check if it's an orphan (pending and not connected)
        if (orphanNodeIds.has(node.id)) {
          classes.push('orphan-node')
        } else {
          classes.push('pending-node')
        }
      } else if (disconnectedNodeIds.has(node.id)) {
        // Existing node that's disconnected from main flow
        classes.push('disconnected')
      }
      
      // Check if node has invalid target - Implements Requirement 4.3
      if (invalidTargetNodeIds.has(node.id)) {
        classes.push('invalid-target')
      }
      
      // Preserve existing className if any
      if (node.className) {
        const existingClasses = node.className.split(' ').filter(c => 
          c && !['orphan-node', 'pending-node', 'disconnected', 'invalid-target'].includes(c)
        )
        classes.push(...existingClasses)
      }
      
      return {
        ...node,
        className: classes.join(' ') || undefined,
      }
    })
  }, [nodes, disconnectedNodeIds, orphanNodeIds, invalidTargetNodeIds])

  // Validate connections before allowing them
  // Implements Requirements 6.1, 6.2: Connection validation
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

  /**
   * Handle connection start - show visual feedback
   * Implements Requirement 6.1: Show preview line when dragging from output port
   */
  const onConnectStart: OnConnectStart = useCallback(
    (_event, { nodeId, handleId }) => {
      setIsConnecting(true)
      connectingNodeRef.current = { nodeId: nodeId || '', handleId }
    },
    []
  )

  /**
   * Handle connection end - cleanup visual feedback
   */
  const onConnectEnd: OnConnectEnd = useCallback(
    () => {
      setIsConnecting(false)
      connectingNodeRef.current = null
    },
    []
  )

  /**
   * Handle new connections between nodes
   * Implements Requirement 6.2: Create new edge when dropped on valid input port
   * Implements Requirement 1.2: 将对话节点添加到对应 label 的 body 中
   * Implements Requirement 5.2: 连接建立后将节点 AST 表示插入到正确的 label body 中
   * 
   * Uses NodeOperationHandler to sync pending nodes to AST when connected.
   */
  const onConnect = useCallback(
    (params: Connection) => {
      if (isValidConnection(params, nodes, edges)) {
        // Determine edge type based on source node type
        const sourceNode = nodes.find(n => n.id === params.source)
        let edgeType: FlowEdgeType = 'normal'
        
        if (sourceNode) {
          if (sourceNode.type === 'jump') {
            edgeType = 'jump'
          } else if (sourceNode.type === 'call') {
            edgeType = 'call'
          } else if (sourceNode.type === 'menu' || sourceNode.type === 'condition') {
            edgeType = 'jump' // Menu/condition choices are like jumps
          }
        }
        
        const newEdge: Edge = {
          id: createEdgeId(params),
          source: params.source!,
          target: params.target!,
          sourceHandle: params.sourceHandle || undefined,
          targetHandle: params.targetHandle || undefined,
          type: 'smoothstep',
          style: getEdgeStyle(edgeType),
          className: getEdgeClassName(edgeType),
        }
        setEdges((eds) => addEdge(newEdge, eds))
        
        // Check if target is a pending node and sync to AST
        if (ast && params.source && params.target) {
          const isPendingTarget = pendingNodePoolRef.current.isPending(params.target)
          
          if (isPendingTarget) {
            // Build current flow graph for context
            const currentGraph = {
              nodes: nodes.map(n => ({
                id: n.id,
                type: n.type as FlowNodeType,
                position: n.position,
                data: n.data as FlowNodeData,
              })),
              edges: [...edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle ?? undefined,
                targetHandle: e.targetHandle ?? undefined,
                type: 'normal' as const,
              })), {
                id: newEdge.id,
                source: newEdge.source,
                target: newEdge.target,
                sourceHandle: newEdge.sourceHandle ?? undefined,
                targetHandle: newEdge.targetHandle ?? undefined,
                type: edgeType,
              }],
            }
            
            // Use NodeOperationHandler to connect and sync to AST
            const result = nodeOperationHandlerRef.current.connectNodes(
              params.source,
              params.target,
              params.sourceHandle || undefined,
              currentGraph,
              ast
            )
            
            if (result.success) {
              // Remove pending class from the node since it's now synced
              setNodes((nds) => 
                nds.map((n) => 
                  n.id === params.target 
                    ? { ...n, className: n.className?.replace('pending-node', '').trim() || undefined }
                    : n
                )
              )
              
              // Mark the script as modified
              if (selectedFile) {
                projectManager.updateScript(selectedFile, ast)
                projectManager.markScriptModified(selectedFile)
              }
              
              console.log(`[NodeModeEditor] Synced pending node ${params.target} to AST`)
            } else {
              console.warn(`[NodeModeEditor] Failed to sync pending node: ${result.error}`)
            }
          } else {
            // Handle connection between existing nodes (e.g., menu choice to scene)
            const targetNode = nodes.find(n => n.id === params.target)
            if (targetNode && targetNode.data && typeof targetNode.data === 'object' && 'label' in targetNode.data) {
              const currentGraph = {
                nodes: nodes.map(n => ({
                  id: n.id,
                  type: n.type as FlowNodeType,
                  position: n.position,
                  data: n.data as FlowNodeData,
                })),
                edges: edges.map(e => ({
                  id: e.id,
                  source: e.source,
                  target: e.target,
                  sourceHandle: e.sourceHandle ?? undefined,
                  targetHandle: e.targetHandle ?? undefined,
                  type: 'normal' as const,
                })),
              }
              
              const result = nodeOperationHandlerRef.current.connectNodes(
                params.source,
                params.target,
                params.sourceHandle || undefined,
                currentGraph,
                ast
              )
              
              if (result.success && selectedFile) {
                projectManager.updateScript(selectedFile, ast)
                projectManager.markScriptModified(selectedFile)
              }
            }
          }
        }
      }
    },
    [nodes, edges, setEdges, setNodes, ast, selectedFile]
  )

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id)
    },
    [setSelectedNodeId]
  )

  /**
   * Handle double-click on a node
   * Implements Requirement 9.2: Double-click on scene node to enter block mode
   */
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Only handle scene nodes (which represent labels)
      if (node.type === 'scene') {
        const nodeData = node.data as unknown as FlowNodeData
        const labelName = nodeData.label
        
        if (labelName) {
          // Enter block mode for this label
          // Use the enterBlockMode action from editorStore
          const { enterBlockMode } = useEditorStore.getState()
          enterBlockMode(labelName)
        }
      }
    },
    []
  )

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
    // Close context menu when clicking on canvas
    setContextMenu(prev => ({ ...prev, visible: false }))
  }, [setSelectedNodeId])

  /**
   * Handle double-click on canvas to show node creation menu
   * Implements Requirement 6.3: Double-click on empty canvas shows creation menu
   */
  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Get the position in flow coordinates
      const flowPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      
      setContextMenu({
        visible: true,
        position: { x: event.clientX, y: event.clientY },
        flowPosition,
      })
    },
    [reactFlowInstance]
  )

  /**
   * Close the context menu
   */
  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }))
  }, [])

  /**
   * Create a new node at the specified position
   * Implements Requirement 6.3: Support creating new label, dialogue, etc.
   * Implements Requirement 1.1: 对话节点创建与持久化
   * 
   * Uses NodeOperationHandler to create nodes and add them to PendingNodePool.
   * Nodes are stored in the pending pool until connected to the flow.
   */
  const createNode = useCallback(
    (type: string) => {
      const position = contextMenu.flowPosition
      
      // Use NodeOperationHandler to create the node and add to PendingNodePool
      const nodeId = nodeOperationHandlerRef.current.createNode(
        type as FlowNodeType,
        position,
        {} // Use default data from NodeOperationHandler
      )
      
      // Get the pending node to create the React Flow node
      const pendingNode = pendingNodePoolRef.current.get(nodeId)
      
      if (pendingNode) {
        // Create React Flow node from pending node
        const newNode: Node = {
          id: pendingNode.id,
          type: pendingNode.type,
          position: pendingNode.position,
          data: pendingNode.data as Record<string, unknown>,
          // Mark as pending for visual styling
          className: 'pending-node',
        }
        
        setNodes((nds) => [...nds, newNode])
      }
      
      closeContextMenu()
      
      // Select the newly created node
      setSelectedNodeId(nodeId)
      
      // Note: Node is now in PendingNodePool. It will be synced to AST when:
      // 1. The user connects this node to an existing flow (via onConnect)
      // 2. The user explicitly saves the file (via commitPendingNodes)
    },
    [contextMenu.flowPosition, setNodes, closeContextMenu, setSelectedNodeId]
  )

  // Handle node deletion - also remove connected edges and pending nodes
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const deletedIds = deletedNodes.map((n) => n.id)
      
      // Remove from PendingNodePool if they are pending nodes
      for (const nodeId of deletedIds) {
        if (pendingNodePoolRef.current.isPending(nodeId)) {
          pendingNodePoolRef.current.remove(nodeId)
        }
      }
      
      setEdges((eds) => handleNodeDeletion(deletedIds, eds))
      setNodes((nds) => nds.filter((n) => !deletedIds.includes(n.id)))
    },
    [setEdges, setNodes]
  )

  /**
   * Handle viewport change to track zoom level and save state
   * Implements Requirements 7.1, 7.6: Zoom support and viewport persistence
   */
  const onMoveEnd = useCallback(
    (_event: unknown, viewport: { x: number; y: number; zoom: number }) => {
      setZoomLevel(viewport.zoom)
      
      // Save viewport state for current file
      if (selectedFile) {
        viewportStates.set(selectedFile, {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        })
      }
    },
    [selectedFile]
  )

  /**
   * Restore viewport state when switching files
   * Implements Requirement 7.6: Remember zoom level and position per file
   */
  useEffect(() => {
    if (selectedFile && selectedFile !== previousFileRef.current) {
      // Save previous file's viewport state
      if (previousFileRef.current) {
        const currentViewport = reactFlowInstance.getViewport()
        viewportStates.set(previousFileRef.current, {
          x: currentViewport.x,
          y: currentViewport.y,
          zoom: currentViewport.zoom,
        })
      }
      
      // Restore viewport state for new file
      const savedState = viewportStates.get(selectedFile)
      if (savedState) {
        // Use setTimeout to ensure nodes are rendered first
        setTimeout(() => {
          reactFlowInstance.setViewport(savedState, { duration: 200 })
          setZoomLevel(savedState.zoom)
        }, 100)
      }
      
      previousFileRef.current = selectedFile
    }
  }, [selectedFile, reactFlowInstance])

  /**
   * Handle save with orphan node check
   * Implements Requirement 6.2, 6.3: 保存前孤立节点检查
   */
  const handleSaveWithOrphanCheck = useCallback(() => {
    // Check for orphan nodes
    const orphanIds = Array.from(orphanNodeIds)
    
    if (orphanIds.length > 0) {
      // Show confirmation dialog
      setOrphanNodesForDialog(orphanIds)
      setShowOrphanDialog(true)
      
      // Store the callback to continue save after confirmation
      pendingSaveCallbackRef.current = () => {
        // Dispatch the actual save event
        window.dispatchEvent(new CustomEvent('editor:save:confirmed'))
      }
    } else {
      // No orphan nodes, proceed with save
      window.dispatchEvent(new CustomEvent('editor:save:confirmed'))
    }
  }, [orphanNodeIds])

  /**
   * Handle orphan dialog confirmation
   */
  const handleOrphanDialogConfirm = useCallback(() => {
    setShowOrphanDialog(false)
    
    // Execute the pending save callback
    if (pendingSaveCallbackRef.current) {
      pendingSaveCallbackRef.current()
      pendingSaveCallbackRef.current = null
    }
  }, [])

  /**
   * Handle orphan dialog cancel
   */
  const handleOrphanDialogCancel = useCallback(() => {
    setShowOrphanDialog(false)
    pendingSaveCallbackRef.current = null
  }, [])

  /**
   * Listen for save events and intercept to check for orphan nodes
   * Implements Requirement 6.2, 6.3: 保存前孤立节点检查
   */
  useEffect(() => {
    const handleSaveEvent = (event: Event) => {
      // Prevent the default save and do orphan check first
      event.stopPropagation()
      handleSaveWithOrphanCheck()
    }

    // Listen for the original save event
    window.addEventListener('editor:save', handleSaveEvent, true)

    return () => {
      window.removeEventListener('editor:save', handleSaveEvent, true)
    }
  }, [handleSaveWithOrphanCheck])

  /**
   * Fit all nodes in view
   * Implements Requirement 7.5: Fit to View button
   */
  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 300 })
  }, [reactFlowInstance])

  /**
   * Zoom in by 25%
   */
  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn({ duration: 200 })
  }, [reactFlowInstance])

  /**
   * Zoom out by 25%
   */
  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut({ duration: 200 })
  }, [reactFlowInstance])

  /**
   * Reset zoom to 100%
   */
  const handleResetZoom = useCallback(() => {
    reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 })
  }, [reactFlowInstance])

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
  
  // Count selected nodes for multi-select indicator
  // Implements Requirement 6.6: Multi-select support
  const selectedNodesCount = useMemo(() => {
    return nodes.filter(n => n.selected).length
  }, [nodes])

  return (
    <div 
      className={`node-mode-editor-container ${isConnecting ? 'connecting' : ''}`} 
      data-testid="node-mode-editor"
    >
      <ReactFlow
        nodes={nodesWithStatusClass}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onDoubleClick={onPaneDoubleClick}
        onNodesDelete={onNodesDelete}
        onMoveEnd={onMoveEnd}
        isValidConnection={isValidConnectionCallback}
        nodeTypes={flowNodeTypesSync as NodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        connectionLineStyle={{
          stroke: '#6366f1',
          strokeWidth: 2,
          strokeDasharray: '5,5',
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
        deleteKeyCode={['Backspace', 'Delete']}
        /* Multi-select configuration - Implements Requirement 6.6 */
        selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        panOnDrag={[1, 2]}
        selectNodesOnDrag={true}
        /* Zoom and pan configuration - Implements Requirements 7.1, 7.2 */
        panActivationKeyCode="Space"
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
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
            {selectedNodesCount > 1 && (
              <span className="selection-count"> • {selectedNodesCount} selected</span>
            )}
            {orphanNodeIds.size > 0 && (
              <span className="orphan-indicator" title="Nodes not connected to any flow">
                <span className="warning-icon">⚠️</span>
                {orphanNodeIds.size} orphan
              </span>
            )}
            {disconnectedNodeIds.size > 0 && (
              <span className="disconnected-indicator">
                <span className="warning-icon">⚠</span>
                {disconnectedNodeIds.size} disconnected
              </span>
            )}
          </div>
        </Panel>
        
        {/* Multi-select indicator - Implements Requirement 6.6 */}
        {selectedNodesCount > 1 && (
          <Panel position="top-center" className="selection-panel">
            <div className="selection-info">
              <span className="selection-icon">☑️</span>
              <span>{selectedNodesCount} nodes selected</span>
              <span className="selection-hint">Press Delete to remove</span>
            </div>
          </Panel>
        )}
        
        {/* Connection status indicator */}
        {isConnecting && (
          <Panel position="top-center" className="connection-status-panel">
            <div className="connection-status">
              <span className="connection-icon">🔗</span>
              <span>Drag to a target node to connect</span>
            </div>
          </Panel>
        )}
        
        {/* Zoom controls panel - Implements Requirements 7.1, 7.5 */}
        <Panel position="top-right" className="zoom-controls-panel">
          <div className="zoom-controls">
            <button 
              className="zoom-btn" 
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              −
            </button>
            <button 
              className="zoom-level" 
              onClick={handleResetZoom}
              title="Reset Zoom (100%)"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button 
              className="zoom-btn" 
              onClick={handleZoomIn}
              title="Zoom In"
            >
              +
            </button>
            <button 
              className="zoom-btn fit-view-btn" 
              onClick={handleFitView}
              title="Fit to View"
            >
              ⊡
            </button>
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Node detail panel - Implements Requirement 2.6 */}
      {selectedNode && (
        <div className="node-detail-panel">
          <NodeDetailPanel 
            node={selectedNode} 
            onClose={() => setSelectedNodeId(null)}
            onNodeDataChange={handleNodeDataChange}
            onModified={() => {
              // Sync AST to ProjectManager and mark as modified
              if (selectedFile && ast) {
                // Update the AST in ProjectManager so save will use the modified version
                projectManager.updateScript(selectedFile, ast)
                projectManager.markScriptModified(selectedFile)
              }
            }}
          />
        </div>
      )}
      
      {/* Node creation context menu - Implements Requirement 6.3 */}
      {contextMenu.visible && (
        <div 
          className="node-creation-menu"
          style={{
            position: 'fixed',
            left: contextMenu.position.x,
            top: contextMenu.position.y,
          }}
        >
          <div className="node-creation-menu-header">
            <span>Create Node</span>
            <button 
              className="node-creation-menu-close"
              onClick={closeContextMenu}
            >
              ×
            </button>
          </div>
          <div className="node-creation-menu-items">
            {NODE_CREATION_MENU_ITEMS.map((item) => (
              <button
                key={item.type}
                className="node-creation-menu-item"
                onClick={() => createNode(item.type)}
              >
                <span className="node-creation-menu-icon">{item.icon}</span>
                <div className="node-creation-menu-content">
                  <span className="node-creation-menu-label">{item.label}</span>
                  <span className="node-creation-menu-description">{item.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Orphan node confirmation dialog - Implements Requirement 6.2, 6.3 */}
      {showOrphanDialog && (
        <div className="orphan-dialog-overlay">
          <div className="orphan-dialog">
            <div className="orphan-dialog-header">
              <span className="orphan-dialog-icon">⚠️</span>
              <span className="orphan-dialog-title">Orphan Nodes Detected</span>
            </div>
            <div className="orphan-dialog-content">
              <p>
                There are <strong>{orphanNodesForDialog.length}</strong> orphan node(s) 
                that are not connected to any flow. These nodes will not be saved.
              </p>
              <p className="orphan-dialog-hint">
                Connect these nodes to a scene or delete them before saving.
              </p>
            </div>
            <div className="orphan-dialog-actions">
              <button 
                className="orphan-dialog-btn orphan-dialog-btn-cancel"
                onClick={handleOrphanDialogCancel}
              >
                Cancel
              </button>
              <button 
                className="orphan-dialog-btn orphan-dialog-btn-confirm"
                onClick={handleOrphanDialogConfirm}
              >
                Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * NodeModeEditor wrapper with ReactFlowProvider
 */
export const NodeModeEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <NodeModeEditorInner />
    </ReactFlowProvider>
  )
}
