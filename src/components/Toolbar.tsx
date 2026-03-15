import { useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useDiagramStore, type CLDNode, type CLDEdge } from '../store/diagramStore'

export default function Toolbar() {
  const { addNode, clearDiagram, loadDiagram, nodes, edges } = useDiagramStore()
  const { screenToFlowPosition } = useReactFlow()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddNode = () => {
    const el = document.querySelector('.react-flow')
    const rect = el?.getBoundingClientRect()
    const pos = screenToFlowPosition({
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    })
    addNode('変数', pos)
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

      <button
        onClick={handleAddNode}
        className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 active:bg-blue-800"
      >
        + ノード追加
      </button>

      <div className="h-5 w-px bg-gray-300 mx-1" />

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
    </header>
  )
}
