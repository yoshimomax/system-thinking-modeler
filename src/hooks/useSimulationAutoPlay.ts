import { useEffect } from 'react'
import { useSimulationStore } from '../store/simulationStore'

/**
 * Drives auto-play: advances one step every `animSpeed` ms while `isPlaying` is true.
 * Place this hook in a component that's always mounted during simulation (e.g. SimulationPanel).
 */
export function useSimulationAutoPlay() {
  const isPlaying = useSimulationStore((s) => s.isPlaying)
  const animSpeed = useSimulationStore((s) => s.animSpeed)
  const currentStep = useSimulationStore((s) => s.currentStep)
  const stepsCount = useSimulationStore((s) => s.steps.length)

  useEffect(() => {
    if (!isPlaying) return
    if (stepsCount === 0 || currentStep >= stepsCount - 1) {
      useSimulationStore.getState().pause()
      return
    }
    const timer = setTimeout(() => {
      useSimulationStore.getState().stepForward()
    }, animSpeed)
    return () => clearTimeout(timer)
  }, [isPlaying, currentStep, stepsCount, animSpeed])
}
