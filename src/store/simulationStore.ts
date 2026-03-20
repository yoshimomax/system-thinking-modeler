import { create } from 'zustand'
import type { CLDNode, CLDEdge } from './diagramStore'
import { runSimulation, type SimulationStep, type NodeSimState } from '../simulation/engine'

export type SimMode = 'edit' | 'simulation'

interface SimulationState {
  mode: SimMode
  /** Initial perturbations set by the user (setup phase) */
  initialPerturbations: Record<string, 'up' | 'down'>
  /** All computed steps. Empty = not yet run (setup phase). */
  steps: SimulationStep[]
  /** Current step index into steps[] */
  currentStep: number
  /** Auto-play active */
  isPlaying: boolean
  /** Milliseconds between auto-play steps */
  animSpeed: number

  // Actions
  setMode: (mode: SimMode) => void
  /** Cycle through: none → up → down → none */
  cyclePerturbation: (nodeId: string) => void
  clearAllPerturbations: () => void
  /** Compute all steps and start from step 0 */
  startSimulation: (nodes: CLDNode[], edges: CLDEdge[]) => void
  stepForward: () => void
  stepBackward: () => void
  /** Clear computed steps but keep perturbations (back to setup phase) */
  resetSteps: () => void
  play: () => void
  pause: () => void
  setAnimSpeed: (ms: number) => void
  /** Get display states for the current view */
  getDisplayStates: () => Record<string, NodeSimState>
  /** Edge effects active in the current step (for particle animation) */
  getActiveEdgeEffects: () => Record<string, 'up' | 'down'>
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  mode: 'edit',
  initialPerturbations: {},
  steps: [],
  currentStep: 0,
  isPlaying: false,
  animSpeed: 1500,

  setMode: (mode) => {
    if (mode === 'edit') {
      set({ mode, steps: [], currentStep: 0, initialPerturbations: {}, isPlaying: false })
    } else {
      set({ mode })
    }
  },

  cyclePerturbation: (nodeId) => {
    set((state) => {
      const current = state.initialPerturbations[nodeId]
      const newPerturbs = { ...state.initialPerturbations }
      if (current === undefined) {
        newPerturbs[nodeId] = 'up'
      } else if (current === 'up') {
        newPerturbs[nodeId] = 'down'
      } else {
        delete newPerturbs[nodeId]
      }
      return { initialPerturbations: newPerturbs, steps: [], currentStep: 0, isPlaying: false }
    })
  },

  clearAllPerturbations: () => set({ initialPerturbations: {}, steps: [], currentStep: 0, isPlaying: false }),

  startSimulation: (nodes, edges) => {
    const { initialPerturbations } = get()
    const allSteps = runSimulation(nodes, edges, initialPerturbations)
    if (allSteps.length === 0) return
    set({ steps: allSteps, currentStep: 0 })
  },

  stepForward: () => {
    const { steps, currentStep, isPlaying, pause } = get()
    if (currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 })
    } else if (isPlaying) {
      pause()
    }
  },

  stepBackward: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1, isPlaying: false })
    }
  },

  resetSteps: () => set({ steps: [], currentStep: 0, isPlaying: false }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setAnimSpeed: (ms) => set({ animSpeed: ms }),

  getDisplayStates: () => {
    const { steps, currentStep, initialPerturbations, mode } = get()
    if (mode === 'edit') return {}
    if (steps.length === 0) {
      return Object.fromEntries(
        Object.entries(initialPerturbations)
      ) as Record<string, NodeSimState>
    }
    return steps[currentStep]?.states ?? {}
  },

  getActiveEdgeEffects: () => {
    const { steps, currentStep } = get()
    if (steps.length === 0 || currentStep === 0) return {}
    return steps[currentStep]?.activeEdgeEffects ?? {}
  },
}))
