import { useState, useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import Toolbar from './components/Toolbar'
import DiagramCanvas from './components/DiagramCanvas'
import SidePanel from './components/SidePanel'
import MobileToolbar from './components/MobileToolbar'
import BottomSheet from './components/BottomSheet'
import { useDiagramStore } from './store/diagramStore'
import { useSimulationAnimation } from './hooks/useSimulationAnimation'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function AppContent() {
  // Simulation RAF loop — must live here (always mounted) so it keeps running
  // even when the side panel (which contains SimulationPanel) is closed.
  useSimulationAnimation()
  const isMobile = useIsMobile()
  const [panelOpen, setPanelOpen] = useState(false)
  const [sidePanelOpen, setSidePanelOpen] = useState(true)
  const selectedEdgeId = useDiagramStore((s) => s.selectedEdgeId)

  // Auto-open bottom sheet when an edge is selected on mobile
  useEffect(() => {
    if (isMobile && selectedEdgeId) setPanelOpen(true)
  }, [isMobile, selectedEdgeId])

  if (isMobile) {
    return (
      <div className="flex flex-col" style={{ height: '100dvh' }}>
        <header className="flex items-center px-4 shrink-0 bg-white border-b border-gray-200" style={{ height: '44px' }}>
          <span className="font-bold text-gray-800 text-sm">CLD エディタ</span>
        </header>
        <div className="flex-1 overflow-hidden">
          <DiagramCanvas />
        </div>
        <BottomSheet isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
        <MobileToolbar onShowPanel={() => setPanelOpen((p) => !p)} panelOpen={panelOpen} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <DiagramCanvas />
        <SidePanel isOpen={sidePanelOpen} onToggle={() => setSidePanelOpen((v) => !v)} />
      </div>
    </div>
  )
}

function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  )
}

export default App
