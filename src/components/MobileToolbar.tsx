import { useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useDiagramStore, type CLDNode, type CLDEdge } from '../store/diagramStore'
import { useSimulationStore } from '../store/simulationStore'
import { useUiStore } from '../store/uiStore'

interface Props {
  onShowPanel: () => void
  panelOpen: boolean
}

export default function MobileToolbar({ onShowPanel, panelOpen }: Props) {
  const { addNode, clearDiagram, loadDiagram, clearImportWarning, importWarning, nodes, edges } = useDiagramStore()
  const { fitView } = useReactFlow()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mode, setMode } = useSimulationStore()
  const isSimMode = mode === 'simulation'
  const { trackpadMode, setTrackpadMode } = useUiStore()

  const handleSave = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cld-diagram.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (parsed.nodes && parsed.edges) {
          loadDiagram(parsed.nodes as CLDNode[], parsed.edges as CLDEdge[])
          setTimeout(() => fitView({ padding: 0.4, duration: 400 }), 80)
        }
      } catch {
        alert('ファイルの読み込みに失敗しました。')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExportPNG = async () => {
    const { toPng } = await import('html-to-image')
    const el = document.querySelector('.react-flow__viewport') as HTMLElement | null
    if (!el) return
    const dataUrl = await toPng(el, { backgroundColor: '#ffffff' })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'cld-diagram.png'
    a.click()
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)', touchAction: 'manipulation' }}>
      {importWarning && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5zm0 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/>
          </svg>
          <span className="flex-1">自動修正：{importWarning}</span>
          <button onClick={clearImportWarning} className="text-amber-600 hover:text-amber-900" aria-label="閉じる">✕</button>
        </div>
      )}
      <div className="flex items-center justify-around">

        {/* Simulation mode toggle */}
        <button
          onClick={() => setMode(isSimMode ? 'edit' : 'simulation')}
          className={`flex flex-col items-center py-2 px-3 active:opacity-60 ${isSimMode ? 'text-green-600' : 'text-gray-600'}`}
          style={{ touchAction: 'manipulation' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">{isSimMode ? 'シミュ中' : 'シミュ'}</span>
        </button>

        {/* Add Node - primary action (hidden in sim mode) */}
        {!isSimMode && (
        <button
          onPointerDown={(e) => { e.stopPropagation(); addNode('変数') }}
          className="flex flex-col items-center py-2 px-3 text-blue-600 active:opacity-60"
          style={{ touchAction: 'manipulation' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M12 8v8M8 12h8" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">追加</span>
        </button>
        )}

        {/* Trackpad mode toggle */}
        <button
          onClick={() => setTrackpadMode(!trackpadMode)}
          className={`flex flex-col items-center py-2 px-3 active:opacity-60 ${trackpadMode ? 'text-indigo-600' : 'text-gray-600'}`}
          style={{ touchAction: 'manipulation' }}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <line x1="12" y1="4" x2="12" y2="20" />
            <line x1="4" y1="13" x2="20" y2="13" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">{trackpadMode ? 'パッド中' : 'パッド'}</span>
        </button>

        {/* Fit View */}
        <button
          onClick={() => fitView({ duration: 300, padding: 0.3 })}
          className="flex flex-col items-center py-2 px-3 text-gray-600 active:opacity-60"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">全体</span>
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          className="flex flex-col items-center py-2 px-3 text-gray-600 active:opacity-60"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">保存</span>
        </button>

        {/* Load */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center py-2 px-3 text-gray-600 active:opacity-60"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">読込</span>
        </button>

        {/* Export PNG */}
        <button
          onClick={handleExportPNG}
          className="flex flex-col items-center py-2 px-3 text-gray-600 active:opacity-60"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">PNG</span>
        </button>

        {/* Clear */}
        <button
          onClick={() => { if (confirm('ダイアグラムをすべてクリアしますか？')) clearDiagram() }}
          className="flex flex-col items-center py-2 px-3 text-red-500 active:opacity-60"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">クリア</span>
        </button>

        {/* Panel toggle */}
        <button
          onClick={onShowPanel}
          className={`flex flex-col items-center py-2 px-3 active:opacity-60 ${panelOpen ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <svg className={`w-6 h-6 transition-transform ${panelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-[10px] mt-0.5 font-medium">パネル</span>
        </button>

      </div>

      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleLoad}
        className="hidden"
      />
    </nav>
  )
}
