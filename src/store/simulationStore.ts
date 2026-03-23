import { create } from 'zustand'
import type { CLDEdge } from './diagramStore'

export type SimMode = 'edit' | 'simulation'

export interface SimSignal {
  id: string
  edgeId: string
  /** Travel progress along the edge: 0 = at source, 1 = at target */
  progress: number
  /** Signed strength: positive = ↑ effect on target, negative = ↓ effect */
  strength: number
  /**
   * Edge IDs already traversed by this signal's propagation wave.
   * Prevents revisiting the same edge and stops exponential multiplication
   * in graphs with loops or branching.
   */
  visitedEdges: string[]
}

// ----- Simulation constants -----
const INJECT_STRENGTH = 0.1
const SIGNAL_THRESHOLD = 0.005 // drop signals weaker than this (guards against float drift)
const DEFAULT_SPEED = 1.4      // edge traversals per second

// ---- helpers ----
function uid() { return Math.random().toString(36).slice(2, 9) }

function spawnSignals(
  sourceNodeId: string,
  strength: number,
  edges: CLDEdge[],
  visitedEdges: string[],
): SimSignal[] {
  const out: SimSignal[] = []
  for (const edge of edges) {
    if (edge.source !== sourceNodeId) continue
    if (visitedEdges.includes(edge.id)) continue   // already traversed — stop here
    const polarity = (edge.data?.polarity ?? '+') === '+' ? 1 : -1
    const s = strength * polarity
    if (Math.abs(s) < SIGNAL_THRESHOLD) continue
    out.push({
      id: uid(),
      edgeId: edge.id,
      progress: 0,
      strength: s,
      visitedEdges: [...visitedEdges, edge.id],
    })
  }
  return out
}

interface SimulationState {
  mode: SimMode
  paused: boolean
  nodeValues: Record<string, number>   // clamped to [-1, 1]
  signals: SimSignal[]
  signalSpeed: number                  // traversals / second

  // actions
  setMode: (mode: SimMode) => void
  togglePause: () => void
  injectSignal: (nodeId: string, direction: 'up' | 'down', edges: CLDEdge[]) => void
  tickSimulation: (dt: number, edges: CLDEdge[]) => void
  resetSimulation: () => void
  setSignalSpeed: (speed: number) => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  mode: 'edit',
  paused: false,
  nodeValues: {},
  signals: [],
  signalSpeed: DEFAULT_SPEED,

  setMode: (mode) => {
    if (mode === 'edit') {
      set({ mode, paused: false, nodeValues: {}, signals: [] })
    } else {
      set({ mode })
    }
  },

  togglePause: () => set((s) => ({ paused: !s.paused })),

  injectSignal: (nodeId, direction, edges) => {
    const strength = direction === 'up' ? INJECT_STRENGTH : -INJECT_STRENGTH
    set((state) => {
      const values = { ...state.nodeValues }
      values[nodeId] = Math.max(-1, Math.min(1, (values[nodeId] ?? 0) + strength))
      const newSigs = spawnSignals(nodeId, strength, edges, [])
      return { nodeValues: values, signals: [...state.signals, ...newSigs] }
    })
  },

  tickSimulation: (dt, edges) => {
    set((state) => {
      if (state.signals.length === 0) return state

      const advance = dt * state.signalSpeed
      const kept: SimSignal[] = []
      const spawned: SimSignal[] = []
      let values = state.nodeValues

      for (const sig of state.signals) {
        const newProgress = sig.progress + advance
        if (newProgress < 1) {
          kept.push({ ...sig, progress: newProgress })
          continue
        }

        // Signal arrived at target node
        const edge = edges.find((e) => e.id === sig.edgeId)
        if (edge) {
          if (values === state.nodeValues) values = { ...state.nodeValues }
          values[edge.target] = Math.max(-1, Math.min(1, (values[edge.target] ?? 0) + sig.strength))

          // Propagate to outgoing edges not yet visited by this wave
          spawned.push(...spawnSignals(edge.target, sig.strength, edges, sig.visitedEdges))
        }
      }

      return { nodeValues: values, signals: [...kept, ...spawned] }
    })
  },

  resetSimulation: () => set({ nodeValues: {}, signals: [] }),
  setSignalSpeed: (speed) => set({ signalSpeed: speed }),
}))
