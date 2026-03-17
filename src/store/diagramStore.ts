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
  name?: string
}

interface DiagramState {
  nodes: CLDNode[]
  edges: CLDEdge[]
  loops: LoopInfo[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  selectedLoopId: string | null
  pendingEditNodeId: string | null

  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void

  addNode: (label?: string, position?: { x: number; y: number }) => string
  updateNodeLabel: (id: string, label: string) => void
  deleteNode: (id: string) => void

  toggleEdgePolarity: (id: string) => void
  updateEdgeControlPoint: (id: string, cp: { x: number; y: number } | null) => void
  deleteEdge: (id: string) => void

  setSelectedNode: (id: string | null) => void
  setSelectedEdge: (id: string | null) => void
  setSelectedLoop: (id: string | null) => void
  clearPendingEdit: () => void
  updateLoopName: (id: string, name: string) => void

  detectLoops: () => void
  loadDiagram: (nodes: CLDNode[], edges: CLDEdge[]) => void
  clearDiagram: () => void
}

let nodeCounter = 1

/** Canonical key for a loop (path without the repeated endpoint) — stable across recalculations */
function loopKey(loop: LoopInfo): string {
  return loop.nodeIds.slice(0, -1).join(',')
}

/** Carry over names from old loops to newly detected loops by matching canonical keys */
function mergeLoopNames(newLoops: LoopInfo[], oldLoops: LoopInfo[]): LoopInfo[] {
  return newLoops.map(nl => {
    const key = loopKey(nl)
    const old = oldLoops.find(ol => loopKey(ol) === key)
    return old?.name ? { ...nl, name: old.name } : nl
  })
}

/** Preserve selectedLoopId across recalculations by canonical-key matching */
function preserveSelection(
  selectedId: string | null,
  oldLoops: LoopInfo[],
  newLoops: LoopInfo[]
): string | null {
  if (!selectedId) return null
  const old = oldLoops.find(l => l.id === selectedId)
  if (!old) return null
  const match = newLoops.find(nl => loopKey(nl) === loopKey(old))
  return match?.id ?? null
}

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
  selectedLoopId: null,
  pendingEditNodeId: null,

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
      const rawLoops = detectFeedbackLoops(state.nodes, edges)
      const loops = mergeLoopNames(rawLoops, state.loops)
      const selectedLoopId = preserveSelection(state.selectedLoopId, state.loops, loops)
      return { edges, loops, selectedLoopId }
    })
  },

  addNode: (label, position = { x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 }) => {
    const id = `node-${nodeCounter++}`
    const autoLabel = label ?? `変数${get().nodes.length + 1}`
    const newNode: CLDNode = {
      id,
      type: 'cld',
      position,
      data: { label: autoLabel },
    }
    set((state) => ({ nodes: [...state.nodes, newNode], pendingEditNodeId: id }))
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
      const rawLoops = detectFeedbackLoops(nodes, edges)
      const loops = mergeLoopNames(rawLoops, state.loops)
      const selectedLoopId = preserveSelection(state.selectedLoopId, state.loops, loops)
      return { nodes, edges, loops, selectedLoopId, selectedNodeId: null }
    })
  },

  toggleEdgePolarity: (id) => {
    set((state) => {
      const edges = state.edges.map((e) =>
        e.id === id
          ? { ...e, data: { ...e.data, polarity: (e.data?.polarity === '+' ? '-' : '+') as Polarity } }
          : e
      ) as CLDEdge[]
      const rawLoops = detectFeedbackLoops(state.nodes, edges)
      const loops = mergeLoopNames(rawLoops, state.loops)
      const selectedLoopId = preserveSelection(state.selectedLoopId, state.loops, loops)
      return { edges, loops, selectedLoopId }
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
      const rawLoops = detectFeedbackLoops(state.nodes, edges)
      const loops = mergeLoopNames(rawLoops, state.loops)
      const selectedLoopId = preserveSelection(state.selectedLoopId, state.loops, loops)
      return { edges, loops, selectedLoopId, selectedEdgeId: null }
    })
  },

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setSelectedLoop: (id) => set({ selectedLoopId: id }),
  clearPendingEdit: () => set({ pendingEditNodeId: null }),

  updateLoopName: (id, name) => {
    set((state) => ({
      loops: state.loops.map(l => l.id === id ? { ...l, name } : l),
    }))
  },

  detectLoops: () => {
    const { nodes, edges } = get()
    const loops = detectFeedbackLoops(nodes, edges)
    set({ loops })
  },

  loadDiagram: (nodes, edges) => {
    const loops = detectFeedbackLoops(nodes, edges)
    set({ nodes, edges, loops, selectedNodeId: null, selectedEdgeId: null, selectedLoopId: null })
  },

  clearDiagram: () => set({
    nodes: [], edges: [], loops: [],
    selectedNodeId: null, selectedEdgeId: null, selectedLoopId: null,
  }),
}))
