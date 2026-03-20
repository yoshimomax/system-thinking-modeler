import { useRef, useState } from 'react'
import { useDiagramStore } from '../store/diagramStore'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const SWIPE_CLOSE_THRESHOLD = 80

export default function BottomSheet({ isOpen, onClose }: Props) {
  const {
    loops, nodes, edges,
    selectedNodeId, selectedEdgeId, selectedLoopId,
    updateNodeLabel, deleteNode, deleteEdge,
    toggleEdgeDelay, setSelectedLoop, updateLoopName,
  } = useDiagramStore()

  const [legendOpen, setLegendOpen] = useState(false)
  const touchStartY = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    setDragOffset(0)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0) setDragOffset(dy)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const dy = e.changedTouches[0].clientY - touchStartY.current
    setDragOffset(0)
    if (dy > SWIPE_CLOSE_THRESHOLD) onClose()
    touchStartY.current = null
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId)

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={[
          'fixed left-0 right-0 z-40 bg-white rounded-t-2xl shadow-2xl',
          'max-h-[65vh] flex flex-col',
          dragOffset === 0 ? 'transition-transform duration-300 ease-out' : '',
          isOpen ? 'pointer-events-auto' : 'translate-y-full pointer-events-none',
        ].join(' ')}
        style={{
          bottom: 'calc(56px + env(safe-area-inset-bottom))',
          transform: isOpen ? `translateY(${dragOffset}px)` : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex items-center justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="overflow-y-auto flex flex-col gap-4 px-4 pt-2 pb-6">

          {/* Selected node */}
          {selectedNode && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                選択中のノード
              </h3>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 flex flex-col gap-3">
                <label className="text-xs text-gray-500">ラベル</label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-base w-full focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => { deleteNode(selectedNode.id); onClose() }}
                  className="text-sm text-red-500 font-medium text-left py-1"
                >
                  このノードを削除
                </button>
              </div>
            </section>
          )}

          {/* Selected edge */}
          {selectedEdge && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                選択中のコネクタ
              </h3>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className={[
                    'w-6 h-6 rounded-full border-2 text-xs font-bold flex items-center justify-center',
                    selectedEdge.data?.polarity === '+'
                      ? 'bg-green-200 border-green-700 text-green-800'
                      : 'bg-red-200 border-red-700 text-red-800',
                  ].join(' ')}>
                    {selectedEdge.data?.polarity ?? '+'}
                  </span>
                  <span className="flex-1 text-xs text-gray-500">
                    {nodes.find((n) => n.id === selectedEdge.source)?.data.label ?? selectedEdge.source}
                    {'  →  '}
                    {nodes.find((n) => n.id === selectedEdge.target)?.data.label ?? selectedEdge.target}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">遅延</span>
                  <button
                    onClick={() => toggleEdgeDelay(selectedEdge.id)}
                    className={[
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
                      selectedEdge.data?.delay ? 'bg-amber-500' : 'bg-gray-300',
                    ].join(' ')}
                    title="遅延のオン/オフ"
                  >
                    <span
                      className={[
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                        selectedEdge.data?.delay ? 'translate-x-6' : 'translate-x-1',
                      ].join(' ')}
                    />
                  </button>
                </div>
                <button
                  onClick={() => { deleteEdge(selectedEdge.id); onClose() }}
                  className="text-sm text-red-500 font-medium text-left py-1"
                >
                  このコネクタを削除
                </button>
              </div>
            </section>
          )}

          {/* Feedback loops */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              フィードバックループ
            </h3>
            {loops.length === 0 ? (
              <p className="text-sm text-gray-400">ループなし</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {loops.map((loop) => {
                  const loopNodes = loop.nodeIds
                    .slice(0, -1)
                    .map((nid) => nodes.find((n) => n.id === nid)?.data.label ?? nid)
                  const isSelected = selectedLoopId === loop.id
                  return (
                    <li
                      key={loop.id}
                      onClick={() => setSelectedLoop(isSelected ? null : loop.id)}
                      className={[
                        'rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-shadow',
                        loop.type === 'R'
                          ? 'bg-orange-50 border-orange-300 text-orange-800'
                          : 'bg-blue-50 border-blue-300 text-blue-800',
                        isSelected ? 'ring-2 ring-amber-400 shadow-md' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold shrink-0">{loop.type}</span>
                        <input
                          type="text"
                          value={loop.name ?? ''}
                          onChange={(e) => updateLoopName(loop.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={loop.type === 'R' ? '強化ループ' : '均衡ループ'}
                          className="flex-1 bg-transparent border-b border-current/30 focus:outline-none focus:border-current text-sm min-w-0"
                        />
                      </div>
                      <div className="mt-1 text-xs opacity-60">{loopNodes.join(' → ')} → …</div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Legend — collapsible */}
          <section>
            <button
              className="flex items-center gap-1 w-full text-left"
              onClick={() => setLegendOpen((v) => !v)}
            >
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-1">凡例</h3>
              <span className={['text-gray-400 text-xs transition-transform duration-200', legendOpen ? 'rotate-180' : ''].join(' ')}>▼</span>
            </button>
            {legendOpen && (
              <ul className="text-sm text-gray-600 space-y-1.5 mt-2">
                <li><span className="text-green-600 font-bold">＋</span> 同方向（強化）</li>
                <li><span className="text-red-600 font-bold">−</span> 逆方向（抑制）</li>
                <li><span className="text-amber-600 font-bold">‖</span> 遅延あり</li>
                <li><span className="text-orange-600 font-bold">R</span> 強化ループ</li>
                <li><span className="text-blue-600 font-bold">B</span> 均衡ループ</li>
              </ul>
            )}
          </section>

        </div>
      </div>
    </>
  )
}
