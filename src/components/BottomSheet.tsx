import { useDiagramStore } from '../store/diagramStore'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function BottomSheet({ isOpen, onClose }: Props) {
  const { loops, nodes, edges, selectedNodeId, selectedEdgeId, updateNodeLabel, deleteNode, deleteEdge } = useDiagramStore()

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
          'transition-transform duration-300 ease-out',
          'max-h-[65vh] flex flex-col',
          isOpen ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
        style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
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
                選択中のエッジ
              </h3>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 flex flex-col gap-2">
                <p className="text-base text-gray-700">
                  極性:{' '}
                  <span className={selectedEdge.data?.polarity === '+' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {selectedEdge.data?.polarity === '+' ? '＋（強化）' : '−（抑制）'}
                  </span>
                </p>
                <p className="text-xs text-gray-400">エッジの極性ラベルをタップして切り替えられます</p>
                <button
                  onClick={() => { deleteEdge(selectedEdge.id); onClose() }}
                  className="text-sm text-red-500 font-medium text-left py-1"
                >
                  このエッジを削除
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
                  return (
                    <li
                      key={loop.id}
                      className={[
                        'rounded-xl border px-3 py-2.5 text-sm',
                        loop.type === 'R'
                          ? 'bg-orange-50 border-orange-300 text-orange-800'
                          : 'bg-blue-50 border-blue-300 text-blue-800',
                      ].join(' ')}
                    >
                      <span className="font-bold mr-1">{loop.type}</span>
                      {loop.type === 'R' ? '強化ループ' : '均衡ループ'}
                      <div className="mt-1 text-xs text-gray-500">{loopNodes.join(' → ')} → …</div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Legend */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">凡例</h3>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li><span className="text-green-600 font-bold">＋</span> 同方向（強化）</li>
              <li><span className="text-red-600 font-bold">−</span> 逆方向（抑制）</li>
              <li><span className="text-orange-600 font-bold">R</span> 強化ループ</li>
              <li><span className="text-blue-600 font-bold">B</span> 均衡ループ</li>
            </ul>
          </section>

        </div>
      </div>
    </>
  )
}
