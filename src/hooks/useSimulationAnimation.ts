import { useEffect, useRef } from 'react'
import { useDiagramStore } from '../store/diagramStore'
import { useSimulationStore } from '../store/simulationStore'

/**
 * Drives the continuous simulation loop via requestAnimationFrame.
 * Reads edges directly from the diagram store (via ref, not subscription)
 * to avoid restarting the loop on diagram changes.
 */
export function useSimulationAnimation() {
  const mode = useSimulationStore((s) => s.mode)
  const edgesRef = useRef(useDiagramStore.getState().edges)

  // Keep edgesRef current without subscribing to re-renders
  useEffect(() => {
    return useDiagramStore.subscribe((s) => {
      edgesRef.current = s.edges
    })
  }, [])

  useEffect(() => {
    if (mode !== 'simulation') return

    let rafId: number
    let last = performance.now()

    const tick = (now: number) => {
      const { paused } = useSimulationStore.getState()
      if (!paused) {
        const dt = Math.min((now - last) / 1000, 0.05) // cap at 50 ms to avoid large jumps
        useSimulationStore.getState().tickSimulation(dt, edgesRef.current)
      }
      last = now
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [mode])
}
