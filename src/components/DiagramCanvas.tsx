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
  type ReactFlowProps,
} from '@xyflow/react'
import { useDiagramStore } from '../store/diagramStore'
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
    deleteNode,
    deleteEdge,
    selectedNodeId,
    selectedEdgeId,
  } = useDiagramStore()

  const { fitView, screenToFlowPosition } = useReactFlow()
  const prevNodeCount = useRef(nodes.length)

  // On mobile: whenever a node is added, fit the view to show it
  useEffect(() => {
    if (nodes.length > prevNodeCount.current && window.innerWidth < 768) {
      prevNodeCount.current = nodes.length
      setTimeout(() => {
        fitView({ duration: 300, padding: 0.4, maxZoom: 1 })
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

  const onPaneDoubleClick = useCallback<NonNullable<ReactFlowProps['onPaneClick']>>(
    (e) => {
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNode('変数', position)
    },
    [addNode, screenToFlowPosition]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) deleteNode(selectedNodeId)
        else if (selectedEdgeId) deleteEdge(selectedEdgeId)
      }
      // N key: add a new node at the center of the viewport
      if (e.key === 'n' || e.key === 'N') {
        const el = e.currentTarget as HTMLElement
        const rect = el.getBoundingClientRect()
        const position = screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        })
        addNode('変数', position)
      }
    },
    [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge, addNode, screenToFlowPosition]
  )

  return (
    <div className="flex-1 h-full w-full relative" onKeyDown={handleKeyDown} tabIndex={0}>
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
        onPaneClick={() => setSelectedLoop(null)}
        onPaneDoubleClick={onPaneDoubleClick}
        onSelectionChange={onSelectionChange}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.Straight}
        connectionLineComponent={CustomConnectionLine}
        connectionRadius={50}
        fitView
        deleteKeyCode={null}
      >
        <Background gap={20} color="#e5e7eb" />
        <Controls />
        <MiniMap nodeColor="#93c5fd" maskColor="rgba(0,0,0,0.05)" />
      </ReactFlow>
    </div>
  )
}
