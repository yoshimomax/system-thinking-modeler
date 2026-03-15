import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'

export type Polarity = '+' | '-'

export interface CLDEdgeData extends Record<string, unknown> {
  polarity: Polarity
  controlPoint?: { x: number; y: number }
}

export interface CLDNodeData extends Record<string, unknown> {
  label: string
}

export type CLDNode = Node<CLDNodeData>
export type CLDEdge = Edge<CLDEdgeData>

export interface LoopInfo {
  id: string
  nodeIds: string[]
  type: 'R' | 'B' // Reinforcing or Balancing
}

interface DiagramState {
  nodes: CLDNode[]
  edges: CLDEdge[]
  loops: LoopInfo[]
  selectedNodeId: string | null
  selectedEdgeId: string | null

  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void

  addNode: (label: string, position?: { x: number; y: number }) => string
  updateNodeLabel: (id: string, label: string) => void
  deleteNode: (id: string) => void

  toggleEdgePolarity: (id: string) => void
  updateEdgeControlPoint: (id: string, cp: { x: number; y: number } | null) => void
  deleteEdge: (id: string) => void

  setSelectedNode: (id: string | null) => void
  setSelectedEdge: (id: string | null) => void

  detectLoops: () => void
  loadDiagram: (nodes: CLDNode[], edges: CLDEdge[]) => void
  clearDiagram: () => void
}

let nodeCounter = 1

function detectFeedbackLoops(
  nodes: CLDNode[],
  edges: CLDEdge[]
): LoopInfo[] {
  const adj = new Map<string, { to: string; polarity: Polarity }[]>()
  nodes.forEach((n) => adj.set(n.id, []))
  edges.forEach((e) => {
    const data = e.data as CLDEdgeData | undefined
    const polarity = data?.polarity ?? '+'
    adj.get(e.source)?.push({ to: e.target, polarity })
  })

  const loops: LoopInfo[] = []
  const visited = new Set<string>()

  function dfs(
    startId: string,
    currentId: string,
    path: string[],
    polarityCount: number
  ) {
    const neighbors = adj.get(currentId) ?? []
    for (const { to, polarity } of neighbors) {
      const newPolarity = polarityCount + (polarity === '-' ? 1 : 0)
      if (to === startId && path.length >= 2) {
        // Found a loop - avoid duplicates by requiring startId to be min
        const isMinStart = path.every((id) => startId <= id)
        if (isMinStart) {
          const isBalancing = newPolarity % 2 === 1
          loops.push({
            id: `loop-${loops.length + 1}`,
            nodeIds: [...path, startId],
            type: isBalancing ? 'B' : 'R',
          })
        }
      } else if (!path.includes(to)) {
        dfs(startId, to, [...path, to], newPolarity)
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, node.id, [node.id], 0)
      visited.add(node.id)
    }
  }

  return loops
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],
  loops: [],
  selectedNodeId: null,
  selectedEdgeId: null,

  onNodesChange: (changes) => {
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) as CLDNode[] }))
  },

  onEdgesChange: (changes) => {
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) as CLDEdge[] }))
  },

  onConnect: (connection) => {
    const newEdge: CLDEdge = {
      ...connection,
      id: `e-${Date.now()}`,
      type: 'cld',
      data: { polarity: '+' },
      markerEnd: { type: 'arrowclosed' as const },
    } as CLDEdge
    set((state) => {
      const edges = addEdge(newEdge, state.edges) as CLDEdge[]
      const loops = detectFeedbackLoops(state.nodes, edges)
      return { edges, loops }
    })
  },

  addNode: (label, position = { x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 }) => {
    const id = `node-${nodeCounter++}`
    const newNode: CLDNode = {
      id,
      type: 'cld',
      position,
      data: { label },
    }
    set((state) => ({ nodes: [...state.nodes, newNode] }))
    return id
  },

  updateNodeLabel: (id, label) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label } } : n
      ),
    }))
  },

  deleteNode: (id) => {
    set((state) => {
      const nodes = state.nodes.filter((n) => n.id !== id)
      const edges = state.edges.filter((e) => e.source !== id && e.target !== id)
      const loops = detectFeedbackLoops(nodes, edges)
      return { nodes, edges, loops, selectedNodeId: null }
    })
  },

  toggleEdgePolarity: (id) => {
    set((state) => {
      const edges = state.edges.map((e) =>
        e.id === id
          ? { ...e, data: { ...e.data, polarity: (e.data?.polarity === '+' ? '-' : '+') as Polarity } }
          : e
      ) as CLDEdge[]
      const loops = detectFeedbackLoops(state.nodes, edges)
      return { edges, loops }
    })
  },

  updateEdgeControlPoint: (id, cp) => {
    set((state) => ({
      edges: state.edges.map((e) => {
        if (e.id !== id) return e
        const data: CLDEdgeData = cp
          ? { ...e.data!, controlPoint: cp }
          : { polarity: e.data?.polarity ?? '+' }
        return { ...e, data }
      }) as CLDEdge[],
    }))
  },

  deleteEdge: (id) => {
    set((state) => {
      const edges = state.edges.filter((e) => e.id !== id)
      const loops = detectFeedbackLoops(state.nodes, edges)
      return { edges, loops, selectedEdgeId: null }
    })
  },

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  detectLoops: () => {
    const { nodes, edges } = get()
    const loops = detectFeedbackLoops(nodes, edges)
    set({ loops })
  },

  loadDiagram: (nodes, edges) => {
    const loops = detectFeedbackLoops(nodes, edges)
    set({ nodes, edges, loops, selectedNodeId: null, selectedEdgeId: null })
  },

  clearDiagram: () => set({ nodes: [], edges: [], loops: [], selectedNodeId: null, selectedEdgeId: null }),
}))
