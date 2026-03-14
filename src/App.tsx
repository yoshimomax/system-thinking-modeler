import { ReactFlowProvider } from '@xyflow/react'
import Toolbar from './components/Toolbar'
import DiagramCanvas from './components/DiagramCanvas'
import SidePanel from './components/SidePanel'

function App() {
  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <DiagramCanvas />
          <SidePanel />
        </div>
      </div>
    </ReactFlowProvider>
  )
}

export default App
