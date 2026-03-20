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

  // Actions
  setMode: (mode: SimMode) => void
  /** Cycle through: none → up → down → none */
  cyclePerturbation: (nodeId: string) => void
  clearAllPerturbations: () => void
  /** Compute all steps and start playback from step 0 */
  startSimulation: (nodes: CLDNode[], edges: CLDEdge[]) => void
  stepForward: () => void
  stepBackward: () => void
  /** Clear computed steps but keep perturbations (back to setup phase) */
  resetSteps: () => void
  /** Get display states for the current view */
  getDisplayStates: () => Record<string, NodeSimState>
  /** IDs of edges active in the current step */
  getActiveEdgeIds: () => string[]
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  mode: 'edit',
  initialPerturbations: {},
  steps: [],
  currentStep: 0,

  setMode: (mode) => {
    if (mode === 'edit') {
      // Clear all simulation state when returning to edit mode
      set({ mode, steps: [], currentStep: 0, initialPerturbations: {} })
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
      // Reset steps when perturbations change
      return { initialPerturbations: newPerturbs, steps: [], currentStep: 0 }
    })
  },

  clearAllPerturbations: () => set({ initialPerturbations: {}, steps: [], currentStep: 0 }),

  startSimulation: (nodes, edges) => {
    const { initialPerturbations } = get()
    const allSteps = runSimulation(nodes, edges, initialPerturbations)
    if (allSteps.length === 0) return
    set({ steps: allSteps, currentStep: 0 })
  },

  stepForward: () => {
    const { steps, currentStep } = get()
    if (currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 })
    }
  },

  stepBackward: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 })
    }
  },

  resetSteps: () => set({ steps: [], currentStep: 0 }),

  getDisplayStates: () => {
    const { steps, currentStep, initialPerturbations, mode } = get()
    if (mode === 'edit') return {}
    if (steps.length === 0) {
      // Setup phase: show only perturbations
      return Object.fromEntries(
        Object.entries(initialPerturbations)
      ) as Record<string, NodeSimState>
    }
    return steps[currentStep]?.states ?? {}
  },

  getActiveEdgeIds: () => {
    const { steps, currentStep } = get()
    if (steps.length === 0 || currentStep === 0) return []
    return steps[currentStep]?.activeEdgeIds ?? []
  },
}))
