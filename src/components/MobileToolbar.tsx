import { useRef } from 'react'
import { useDiagramStore, type CLDNode, type CLDEdge } from '../store/diagramStore'

interface Props {
  onShowPanel: () => void
  panelOpen: boolean
}

export default function MobileToolbar({ onShowPanel, panelOpen }: Props) {
  const { addNode, clearDiagram, loadDiagram, nodes, edges } = useDiagramStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      <div className="flex items-center justify-around">

        {/* Add Node - primary action */}
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
