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
  /** Remaining cascade hops */
  hopsLeft: number
  /** Attenuation multiplier applied each hop */
  attenuation: number
}

// ----- Simulation constants -----
const INJECT_STRENGTH = 0.4
const HOP_ATTENUATION = 0.65
const MAX_HOPS = 5
const SIGNAL_THRESHOLD = 0.03
const DECAY_RATE = 0.28   // value half-life ≈ 2.5s
const DEFAULT_SPEED = 1.4 // edge traversals per second

// Stable empty array reference so selector doesn't re-render edge with no signals
const EMPTY_SIGNALS: SimSignal[] = []

// ---- helpers ----
function uid() { return Math.random().toString(36).slice(2, 9) }

function spawnSignals(
  sourceNodeId: string,
  strength: number,
  hopsLeft: number,
  attenuation: number,
  edges: CLDEdge[],
): SimSignal[] {
  const out: SimSignal[] = []
  for (const edge of edges) {
    if (edge.source !== sourceNodeId) continue
    const polarity = (edge.data?.polarity ?? '+') === '+' ? 1 : -1
    const s = strength * polarity
    if (Math.abs(s) < SIGNAL_THRESHOLD) continue
    out.push({ id: uid(), edgeId: edge.id, progress: 0, strength: s, hopsLeft, attenuation })
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
      const newSigs = spawnSignals(nodeId, strength, MAX_HOPS, HOP_ATTENUATION, edges)
      return { nodeValues: values, signals: [...state.signals, ...newSigs] }
    })
  },

  tickSimulation: (dt, edges) => {
    set((state) => {
      const values = { ...state.nodeValues }

      // Decay all node values toward zero
      for (const id of Object.keys(values)) {
        const v = values[id]
        if (v === 0) continue
        const next = v * (1 - DECAY_RATE * dt)
        values[id] = Math.abs(next) < 0.005 ? 0 : next
      }

      if (state.signals.length === 0) {
        // No signals — just emit new values if something changed
        const anyChange = Object.keys(values).some((id) => values[id] !== state.nodeValues[id])
        return anyChange ? { nodeValues: values } : state
      }

      const advance = dt * state.signalSpeed
      const kept: SimSignal[] = []
      const spawned: SimSignal[] = []

      for (const sig of state.signals) {
        const newProgress = sig.progress + advance
        if (newProgress < 1) {
          kept.push({ ...sig, progress: newProgress })
          continue
        }

        // Signal arrived at target
        const edge = edges.find((e) => e.id === sig.edgeId)
        if (edge) {
          const current = values[edge.target] ?? 0
          values[edge.target] = Math.max(-1, Math.min(1, current + sig.strength))

          if (sig.hopsLeft > 0) {
            const nextStr = sig.strength * sig.attenuation
            if (Math.abs(nextStr) >= SIGNAL_THRESHOLD) {
              spawned.push(...spawnSignals(edge.target, nextStr, sig.hopsLeft - 1, sig.attenuation, edges))
            }
          }
        }
      }

      return { nodeValues: values, signals: [...kept, ...spawned] }
    })
  },

  resetSimulation: () => set({ nodeValues: {}, signals: [] }),
  setSignalSpeed: (speed) => set({ signalSpeed: speed }),
}))

/** Memoization-safe selector: returns stable EMPTY_SIGNALS ref when no signals on this edge */
export function selectEdgeSignals(edgeId: string) {
  return (s: SimulationState) => {
    if (s.mode === 'edit') return EMPTY_SIGNALS
    const filtered = s.signals.filter((sig) => sig.edgeId === edgeId)
    return filtered.length === 0 ? EMPTY_SIGNALS : filtered
  }
}
