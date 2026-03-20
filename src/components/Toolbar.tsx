import { useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useDiagramStore, type CLDNode, type CLDEdge } from '../store/diagramStore'
import { useSimulationStore } from '../store/simulationStore'
import { useUiStore } from '../store/uiStore'

export default function Toolbar() {
  const { addNode, clearDiagram, loadDiagram, nodes, edges } = useDiagramStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { fitView } = useReactFlow()
  const { mode, setMode } = useSimulationStore()
  const isSimMode = mode === 'simulation'
  const { trackpadMode, setTrackpadMode } = useUiStore()

  const handleAddNode = () => {
    addNode('変数')
  }

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
    <header className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
      <span className="font-bold text-gray-800 mr-2">CLD エディタ</span>

      {/* Mode toggle */}
      <div className="flex rounded overflow-hidden border border-gray-300 text-sm font-medium shrink-0">
        <button
          onClick={() => setMode('edit')}
          className={['px-3 py-1.5 transition-colors', !isSimMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'].join(' ')}
        >
          編集
        </button>
        <button
          onClick={() => setMode('simulation')}
          className={['px-3 py-1.5 transition-colors border-l border-gray-300', isSimMode ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'].join(' ')}
        >
          シミュレーション
        </button>
      </div>

      {/* Trackpad mode toggle */}
      <button
        onClick={() => setTrackpadMode(!trackpadMode)}
        title={trackpadMode ? 'トラックパッドモード (クリックでマウスモードに切替)' : 'マウスモード (クリックでトラックパッドモードに切替)'}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors shrink-0',
          trackpadMode
            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100'
            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200',
        ].join(' ')}
      >
        {trackpadMode ? (
          /* Trackpad icon: rounded rect with lines */
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="2" y="2" width="12" height="12" rx="2" />
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="9" x2="14" y2="9" />
          </svg>
        ) : (
          /* Mouse icon: pointer with scroll wheel */
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 2C5.8 2 4 3.8 4 6v4c0 2.2 1.8 4 4 4s4-1.8 4-4V6c0-2.2-1.8-4-4-4z" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="8" y1="6" x2="8" y2="8" strokeWidth="2" />
          </svg>
        )}
        {trackpadMode ? 'トラックパッド' : 'マウス'}
      </button>

      <div className="h-5 w-px bg-gray-300 mx-1" />

      {!isSimMode && (
        <button
          onClick={handleAddNode}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 active:bg-blue-800"
        >
          + ノード追加
        </button>
      )}

      {!isSimMode && <div className="h-5 w-px bg-gray-300 mx-1" />}

      {!isSimMode && (
        <>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 border border-gray-300"
          >
            保存 (JSON)
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 border border-gray-300"
          >
            読み込み
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleLoad}
            className="hidden"
          />

          <button
            onClick={handleExportPNG}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 border border-gray-300"
          >
            PNG 出力
          </button>

          <div className="h-5 w-px bg-gray-300 mx-1" />

          <button
            onClick={() => {
              if (confirm('ダイアグラムをすべてクリアしますか？')) clearDiagram()
            }}
            className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-sm font-medium hover:bg-red-100 border border-red-200"
          >
            クリア
          </button>
        </>
      )}
    </header>
  )
}
