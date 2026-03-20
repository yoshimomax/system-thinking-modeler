import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ConnectionMode,
  ConnectionLineType,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeParams,
  type ConnectionLineComponentProps,
} from '@xyflow/react'
import { useDiagramStore } from '../store/diagramStore'
import { useSimulationStore } from '../store/simulationStore'
import CLDNode from './CLDNode'
import CLDEdge from './CLDEdge'

const nodeTypes: NodeTypes = { cld: CLDNode }
const edgeTypes: EdgeTypes = { cld: CLDEdge }

/** Connection line that snaps both endpoints to node centers */
function CustomConnectionLine({ fromNode, toNode, toX, toY }: ConnectionLineComponentProps) {
  const x1 = fromNode.internals.positionAbsolute.x + (fromNode.measured?.width ?? 80) / 2
  const y1 = fromNode.internals.positionAbsolute.y + (fromNode.measured?.height ?? 36) / 2
  const x2 = toNode
    ? toNode.internals.positionAbsolute.x + (toNode.measured?.width ?? 80) / 2
    : toX
  const y2 = toNode
    ? toNode.internals.positionAbsolute.y + (toNode.measured?.height ?? 36) / 2
    : toY
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" />
  )
}

export default function DiagramCanvas() {
  const isMobile = window.innerWidth < 768
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNode,
    setSelectedEdge,
    setSelectedLoop,
    deleteItems,
    selectedNodeId,
    selectedEdgeId,
    undo,
    redo,
  } = useDiagramStore()

  const { fitView, screenToFlowPosition } = useReactFlow()
  const isSimMode = useSimulationStore((s) => s.mode === 'simulation')
  const prevNodeCount = useRef(nodes.length)
  const didInitialFit = useRef(false)
  const initialNodeCount = useRef(nodes.length)

  // Initial fitView — runs once after nodes are first laid out.
  // Skip when starting fresh (0 nodes) so a first double-click creates the node
  // at the clicked position instead of having fitView re-center the viewport.
  useEffect(() => {
    if (didInitialFit.current) return
    didInitialFit.current = true
    if (initialNodeCount.current > 0) {
      setTimeout(() => fitView({ padding: 0.4, duration: 400 }), 80)
    }
  }, [fitView])

  // On mobile: whenever a node is added, fit the view to show it
  useEffect(() => {
    if (nodes.length > prevNodeCount.current && window.innerWidth < 768) {
      prevNodeCount.current = nodes.length
      setTimeout(() => {
        fitView({ duration: 400, padding: 0.4, maxZoom: 1 })
      }, 80)
    } else {
      prevNodeCount.current = nodes.length
    }
  }, [nodes.length, fitView])

  const onSelectionChange = useCallback(
    ({ nodes: sNodes, edges: sEdges }: OnSelectionChangeParams) => {
      if (sNodes.length === 1) setSelectedNode(sNodes[0].id)
      else if (sEdges.length === 1) setSelectedEdge(sEdges[0].id)
      else {
        setSelectedNode(null)
        setSelectedEdge(null)
      }
    },
    [setSelectedNode, setSelectedEdge]
  )

  const onPaneClick = useCallback(
    () => { setSelectedLoop(null) },
    [setSelectedLoop]
  )

  const onCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isSimMode) return
      if (!(e.target as Element).closest('.react-flow__pane')) return
      const center = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNode(undefined, { x: center.x - 40, y: center.y - 18 })
    },
    [addNode, screenToFlowPosition, isSimMode]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSimMode) return
      const tag = (e.target as HTMLElement).tagName
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      // Redo: Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isEditing) return
        // Use getState() to read current selection, avoiding stale closure
        const { nodes: currentNodes, edges: currentEdges, selectedNodeId: snid, selectedEdgeId: seid } = useDiagramStore.getState()
        const selNodes = currentNodes.filter((n) => n.selected)
        const selEdges = currentEdges.filter((ed) => ed.selected)
        if (selNodes.length > 0 || selEdges.length > 0) {
          deleteItems(selNodes.map((n) => n.id), selEdges.map((ed) => ed.id))
        } else {
          if (snid) deleteItems([snid], [])
          else if (seid) deleteItems([], [seid])
        }
      }

      // N key: add a new node at the center of the viewport
      if ((e.key === 'n' || e.key === 'N') && !isEditing) {
        const el = e.currentTarget as HTMLElement
        const rect = el.getBoundingClientRect()
        const position = screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        })
        addNode(undefined, position)
      }
    },
    [selectedNodeId, selectedEdgeId, deleteItems, undo, redo, addNode, screenToFlowPosition]
  )

  return (
    <div className="flex-1 h-full w-full relative outline-none" onKeyDown={handleKeyDown} onDoubleClick={onCanvasDoubleClick} tabIndex={0}>
      {/* Custom SVG arrow markers */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker
            id="arrow-positive"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#16a34a" />
          </marker>
          <marker
            id="arrow-negative"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#dc2626" />
          </marker>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.Straight}
        connectionLineComponent={CustomConnectionLine}
        connectionRadius={50}
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        zoomOnPinch={isMobile}
        panOnScroll={false}
        panOnDrag={isSimMode ? true : isMobile ? false : [1, 2]}
        selectionOnDrag={!isSimMode}
        nodesDraggable={!isSimMode}
        nodesConnectable={!isSimMode}
        elementsSelectable={!isSimMode}
      >
        <Background gap={20} color="#e5e7eb" />
        <Controls fitViewOptions={{ padding: 0.4, duration: 400 }} />
        <MiniMap nodeColor="#93c5fd" maskColor="rgba(0,0,0,0.05)" />
      </ReactFlow>
    </div>
  )
}
