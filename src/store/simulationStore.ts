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
}

// ----- Simulation constants -----
const INJECT_STRENGTH = 0.4
const SIGNAL_THRESHOLD = 0.005 // drop signals weaker than this (guards against float drift)
const DEFAULT_SPEED = 1.4      // edge traversals per second
/** Hard cap on total active signals to prevent exponential growth in dense graphs */
const MAX_SIGNALS = 200

// ---- helpers ----
function uid() { return Math.random().toString(36).slice(2, 9) }

function spawnSignals(
  sourceNodeId: string,
  strength: number,
  edges: CLDEdge[],
): SimSignal[] {
  const out: SimSignal[] = []
  for (const edge of edges) {
    if (edge.source !== sourceNodeId) continue
    const polarity = (edge.data?.polarity ?? '+') === '+' ? 1 : -1
    const s = strength * polarity
    if (Math.abs(s) < SIGNAL_THRESHOLD) continue
    out.push({ id: uid(), edgeId: edge.id, progress: 0, strength: s })
  }
  return out
}

interface SimulationState {
  mode: SimMode
  nodeValues: Record<string, number>   // clamped to [-1, 1]
  signals: SimSignal[]
  signalSpeed: number                  // traversals / second

  // actions
  setMode: (mode: SimMode) => void
  injectSignal: (nodeId: string, direction: 'up' | 'down', edges: CLDEdge[]) => void
  tickSimulation: (dt: number, edges: CLDEdge[]) => void
  resetSimulation: () => void
  setSignalSpeed: (speed: number) => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  mode: 'edit',
  nodeValues: {},
  signals: [],
  signalSpeed: DEFAULT_SPEED,

  setMode: (mode) => {
    if (mode === 'edit') {
      set({ mode, nodeValues: {}, signals: [] })
    } else {
      set({ mode })
    }
  },

  injectSignal: (nodeId, direction, edges) => {
    const strength = direction === 'up' ? INJECT_STRENGTH : -INJECT_STRENGTH
    set((state) => {
      const values = { ...state.nodeValues }
      values[nodeId] = Math.max(-1, Math.min(1, (values[nodeId] ?? 0) + strength))
      const newSigs = spawnSignals(nodeId, strength, edges)
      return { nodeValues: values, signals: [...state.signals, ...newSigs] }
    })
  },

  tickSimulation: (dt, edges) => {
    set((state) => {
      if (state.signals.length === 0) return state

      const advance = dt * state.signalSpeed
      const kept: SimSignal[] = []
      const spawned: SimSignal[] = []
      // Copy nodeValues only when a signal actually arrives (copy-on-write)
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

          // Spawn continuation signals — respect the cap to prevent runaway growth
          if (kept.length + spawned.length < MAX_SIGNALS) {
            spawned.push(...spawnSignals(edge.target, sig.strength, edges))
          }
        }
      }

      return { nodeValues: values, signals: [...kept, ...spawned] }
    })
  },

  resetSimulation: () => set({ nodeValues: {}, signals: [] }),
  setSignalSpeed: (speed) => set({ signalSpeed: speed }),
}))
