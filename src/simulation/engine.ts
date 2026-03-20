import type { CLDNode, CLDEdge } from '../store/diagramStore'

export type NodeSimState = 'up' | 'down' | 'ambiguous' | 'neutral'

export interface SimulationStep {
  /** Cumulative state of all nodes at this step */
  states: Record<string, NodeSimState>
  /** Edges that propagated signals in this step */
  activeEdgeIds: string[]
  /** Nodes whose state changed in this step */
  newNodeIds: string[]
}

function applyPolarity(state: 'up' | 'down', polarity: '+' | '-'): 'up' | 'down' {
  return polarity === '+' ? state : state === 'up' ? 'down' : 'up'
}

/**
 * BFS-based qualitative simulation.
 * Returns array of steps starting with step 0 (initial perturbations only).
 * Each step propagates signals from nodes that changed in the previous step.
 * Initial perturbation nodes are treated as "locked" — they cannot be overridden by loop feedback.
 */
export function runSimulation(
  nodes: CLDNode[],
  edges: CLDEdge[],
  initialPerturbations: Record<string, 'up' | 'down'>,
  maxSteps = 30,
): SimulationStep[] {
  if (Object.keys(initialPerturbations).length === 0) return []

  // Step 0: initial state — only perturbation nodes have a state
  const step0States: Record<string, NodeSimState> = {}
  for (const node of nodes) {
    step0States[node.id] = initialPerturbations[node.id] ?? 'neutral'
  }

  const steps: SimulationStep[] = [{
    states: step0States,
    activeEdgeIds: [],
    newNodeIds: Object.keys(initialPerturbations),
  }]

  let currentStates = { ...step0States }
  let activeNodes = new Set(Object.keys(initialPerturbations))

  for (let i = 0; i < maxSteps; i++) {
    const newStates = { ...currentStates }
    const activeEdgeIds: string[] = []
    const changedNodes = new Set<string>()

    for (const edge of edges) {
      // Only propagate from nodes that changed in the previous step
      if (!activeNodes.has(edge.source)) continue

      const sourceState = currentStates[edge.source]
      // Neutral or ambiguous nodes don't propagate
      if (sourceState === 'neutral' || sourceState === 'ambiguous') continue

      // Initial perturbation nodes are locked — skip overriding them
      if (initialPerturbations[edge.target] !== undefined) continue

      const polarity = (edge.data?.polarity ?? '+') as '+' | '-'
      const effect = applyPolarity(sourceState, polarity)
      activeEdgeIds.push(edge.id)

      const targetCurrent = newStates[edge.target]
      if (targetCurrent === 'neutral') {
        newStates[edge.target] = effect
        changedNodes.add(edge.target)
      } else if (targetCurrent !== 'ambiguous' && targetCurrent !== effect) {
        // Conflict: node receives opposing signals
        newStates[edge.target] = 'ambiguous'
        changedNodes.add(edge.target)
      }
      // Same state as current: no change needed
    }

    if (changedNodes.size === 0) break // convergence

    steps.push({
      states: newStates,
      activeEdgeIds,
      newNodeIds: [...changedNodes],
    })
    currentStates = newStates
    activeNodes = changedNodes
  }

  return steps
}
