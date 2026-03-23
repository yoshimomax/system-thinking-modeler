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
  delay?: boolean
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

type Snapshot = { nodes: CLDNode[]; edges: CLDEdge[] }

const MAX_HISTORY = 50

interface DiagramState {
  nodes: CLDNode[]
  edges: CLDEdge[]
  loops: LoopInfo[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  selectedLoopId: string | null
  pendingEditNodeId: string | null
  past: Snapshot[]
  future: Snapshot[]
  /** Non-null when the last loadDiagram call removed invalid data (self-loops, duplicate IDs). */
  importWarning: string | null

  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void

  addNode: (label?: string, position?: { x: number; y: number }) => string
  updateNodeLabel: (id: string, label: string) => void
  deleteNode: (id: string) => void
  deleteItems: (nodeIds: string[], edgeIds: string[]) => void

  toggleEdgePolarity: (id: string) => void
  toggleEdgeDelay: (id: string) => void
  updateEdgeControlPoint: (id: string, cp: { x: number; y: number } | null) => void
  deleteEdge: (id: string) => void

  setSelectedNode: (id: string | null) => void
  setSelectedEdge: (id: string | null) => void
  setSelectedLoop: (id: string | null) => void
  clearPendingEdit: () => void
  updateLoopName: (id: string, name: string) => void
  clearImportWarning: () => void

  undo: () => void
  redo: () => void

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
  past: [],
  future: [],
  importWarning: null,

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
      const past = [...state.past.slice(-MAX_HISTORY + 1), { nodes: state.nodes, edges: state.edges }]
      return { edges, loops, selectedLoopId, past, future: [] }
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
    set((state) => {
      const past = [...state.past.slice(-MAX_HISTORY + 1), { nodes: state.nodes, edges: state.edges }]
      return { nodes: [...state.nodes, newNode], pendingEditNodeId: id, past, future: [] }
    })
    return id
  },

  updateNodeLabel: (id, label) => {
    set((state) => {
      const past = [...state.past.slice(-MAX_HISTORY + 1), { nodes: state.nodes, edges: state.edges }]
      return {
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label } } : n
        ),
        past,
        future: [],
      }
    })
  },

  deleteNode: (id) => {
    set((state) => {
      const past = [...state.past.slice(-MAX_HISTORY + 1), { nodes: state.nodes, edges: state.edges }]
      const nodes = state.nodes.filter((n) => n.id !== id)
      const edges = state.edges.filter((e) => e.source !== id && e.target !== id)
      const rawLoops = detectFeedbackLoops(nodes, edges)
      const loops = mergeLoopNames(rawLoops, state.loops)
      const selectedLoopId = preserveSelection(state.selectedLoopId, state.loops, loops)
      return { nodes, edges, loops, selectedLoopId, selectedNodeId: null, past, future: [] }
    })
  },

  /** Batch-delete nodes and edges in a single transaction (one history entry). */
  deleteItems: (nodeIds, edgeIds) => {
    set((state) => {
      const past = [...state.past.slice(-MAX_HISTORY + 1), { nodes: state.nodes, edges: state.edges }]
      const nodeIdSet = new Set(nodeIds)
      const edgeIdSet = new Set(edgeIds)
      const nodes = state.nodes.filter((n) => !nodeIdSet.has(n.id))
      const edges = state.edges.filter(
        (e) => !edgeIdSet.has(e.id) && !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target)
      )
      const rawLoops = detectFeedbackLoops(nodes, edges)
      const loops = mergeLoopNames(rawLoops, state.loops)
      const selectedLoopId = preserveSelection(state.selectedLoopId, state.loops, loops)
      return { nodes, edges, loops, selectedLoopId, selectedNodeId: null, selectedEdgeId: null, past, future: [] }
    })
  },

  toggleEdgePolarity: (id) => {
    set((state) => {
      const past = [...state.past.slice(-MAX_HISTORY + 1), { nodes: state.nodes, edges: state.edges }]
      const edges = state.edges.map((e) =>
        e.id === id
          ? { ...e, data: { ...e.data, polarity: (e.data?.polarity === '+' ? '-' : '+') as Polarity } }
          : e
      ) as CLDEdge[]
      const rawLoops = detectFeedbackLoops(state.nodes, edges)
      const loops = mergeLoopNames(rawLoops, state.loops)
      const selectedLoopId = preserveSelection(state.selectedLoopId, state.loops, loops)
      return { edges, loops, selectedLoopId, past, future: [] }
    })
  },

  toggleEdgeDelay: (id) => {
    set((state) => {
      const past = [...state.past.slice(-MAX_HISTORY + 1), { nodes: state.nodes, edges: state.edges }]
      const edges = state.edges.map((e) =>
        e.id === id
          ? { ...e, data: { ...e.data, delay: !e.data?.delay } as CLDEdgeData }
          : e
      ) as CLDEdge[]
      return { edges, past, future: [] }
    })
  },

  // Not tracked in history (called on every pointer-move during drag)
  updateEdgeControlPoint: (id, cp) => {
    set((state) => ({
      edges: state.edges.map((e) => {
        if (e.id !== id) return e
        const data: CLDEdgeData = cp
          ? { ...e.data!, controlPoint: cp }
          : { polarity: e.data?.polarity ?? '+', delay: e.data?.delay }
        return { ...e, data }
      }) as CLDEdge[],
    }))
  },

  deleteEdge: (id) => {
    set((state) => {
      const past = [...state.past.slice(-MAX_HISTORY + 1), { nodes: state.nodes, edges: state.edges }]
      const edges = state.edges.filter((e) => e.id !== id)
      const rawLoops = detectFeedbackLoops(state.nodes, edges)
      const loops = mergeLoopNames(rawLoops, state.loops)
      const selectedLoopId = preserveSelection(state.selectedLoopId, state.loops, loops)
      return { edges, loops, selectedLoopId, selectedEdgeId: null, past, future: [] }
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

  undo: () => {
    const state = get()
    if (state.past.length === 0) return
    const prev = state.past[state.past.length - 1]
    const newPast = state.past.slice(0, -1)
    const newFuture = [{ nodes: state.nodes, edges: state.edges }, ...state.future.slice(0, MAX_HISTORY - 1)]
    const rawLoops = detectFeedbackLoops(prev.nodes, prev.edges)
    const loops = mergeLoopNames(rawLoops, state.loops)
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      loops,
      past: newPast,
      future: newFuture,
      selectedNodeId: null,
      selectedEdgeId: null,
    })
  },

  redo: () => {
    const state = get()
    if (state.future.length === 0) return
    const next = state.future[0]
    const newFuture = state.future.slice(1)
    const newPast = [...state.past.slice(-MAX_HISTORY + 1), { nodes: state.nodes, edges: state.edges }]
    const rawLoops = detectFeedbackLoops(next.nodes, next.edges)
    const loops = mergeLoopNames(rawLoops, state.loops)
    set({
      nodes: next.nodes,
      edges: next.edges,
      loops,
      past: newPast,
      future: newFuture,
      selectedNodeId: null,
      selectedEdgeId: null,
    })
  },

  detectLoops: () => {
    const { nodes, edges } = get()
    const loops = detectFeedbackLoops(nodes, edges)
    set({ loops })
  },

  loadDiagram: (nodes, edges) => {
    // --- Sanitize imported data ---
    const warnings: string[] = []

    // 1. Deduplicate nodes by ID (keep first occurrence)
    const seenNodeIds = new Set<string>()
    const cleanNodes = nodes.filter((n) => {
      if (seenNodeIds.has(n.id)) return false
      seenNodeIds.add(n.id)
      return true
    })
    if (cleanNodes.length < nodes.length) {
      warnings.push(`重複ノード ID を ${nodes.length - cleanNodes.length} 件除去しました`)
    }

    // 2. Remove self-loop edges (source === target).
    //    In a CLD a variable cannot be its own direct cause; self-loops are
    //    always accidental and break signal propagation simulation.
    const cleanEdges = edges.filter((e) => e.source !== e.target)
    if (cleanEdges.length < edges.length) {
      warnings.push(`自己ループ辺を ${edges.length - cleanEdges.length} 件除去しました`)
    }

    // Advance nodeCounter past any existing node IDs to prevent collisions
    cleanNodes.forEach((n) => {
      const m = n.id.match(/^node-(\d+)$/)
      if (m) nodeCounter = Math.max(nodeCounter, parseInt(m[1]) + 1)
    })

    const state = get()
    const past = [...state.past.slice(-MAX_HISTORY + 1), { nodes: state.nodes, edges: state.edges }]
    const loops = detectFeedbackLoops(cleanNodes, cleanEdges)
    set({
      nodes: cleanNodes,
      edges: cleanEdges,
      loops,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedLoopId: null,
      past,
      future: [],
      importWarning: warnings.length > 0 ? warnings.join('・') : null,
    })
  },

  clearImportWarning: () => set({ importWarning: null }),

  clearDiagram: () => {
    const state = get()
    const past = [...state.past.slice(-MAX_HISTORY + 1), { nodes: state.nodes, edges: state.edges }]
    set({
      nodes: [], edges: [], loops: [],
      selectedNodeId: null, selectedEdgeId: null, selectedLoopId: null,
      past, future: [],
    })
  },
}))
