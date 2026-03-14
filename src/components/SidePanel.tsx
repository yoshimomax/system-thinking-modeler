import { useDiagramStore } from '../store/diagramStore'

export default function SidePanel() {
  const {
    loops,
    nodes,
    selectedNodeId,
    selectedEdgeId,
    updateNodeLabel,
    deleteNode,
    deleteEdge,
    edges,
  } = useDiagramStore()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId)

  return (
    <aside className="w-60 flex flex-col gap-4 border-l border-gray-200 bg-gray-50 overflow-y-auto p-3 shrink-0">

      {/* Selected element properties */}
      {selectedNode && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            選択中のノード
          </h3>
          <div className="bg-white rounded border border-gray-200 p-2 flex flex-col gap-2">
            <label className="text-xs text-gray-600">ラベル</label>
            <input
              type="text"
              value={selectedNode.data.label}
              onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
            />
            <button
              onClick={() => deleteNode(selectedNode.id)}
              className="text-xs text-red-600 hover:text-red-800 text-left"
            >
              削除
            </button>
          </div>
        </section>
      )}

      {selectedEdge && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            選択中のエッジ
          </h3>
          <div className="bg-white rounded border border-gray-200 p-2 flex flex-col gap-2">
            <p className="text-sm text-gray-700">
              極性:{' '}
              <span
                className={
                  selectedEdge.data?.polarity === '+'
                    ? 'text-green-600 font-bold'
                    : 'text-red-600 font-bold'
                }
              >
                {selectedEdge.data?.polarity === '+' ? '+ (強化)' : '− (抑制)'}
              </span>
            </p>
            <p className="text-xs text-gray-500">
              ラベルをクリックすると極性を切り替えられます
            </p>
            <button
              onClick={() => deleteEdge(selectedEdge.id)}
              className="text-xs text-red-600 hover:text-red-800 text-left"
            >
              削除
            </button>
          </div>
        </section>
      )}

      {/* Loop detection results */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          フィードバックループ
        </h3>
        {loops.length === 0 ? (
          <p className="text-xs text-gray-400">ループなし</p>
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
                    'rounded border px-2 py-1.5 text-xs',
                    loop.type === 'R'
                      ? 'bg-orange-50 border-orange-300 text-orange-800'
                      : 'bg-blue-50 border-blue-300 text-blue-800',
                  ].join(' ')}
                >
                  <span className="font-bold mr-1">
                    {loop.type === 'R' ? 'R' : 'B'}
                  </span>
                  {loop.type === 'R' ? '強化ループ' : '均衡ループ'}
                  <div className="mt-1 text-gray-600">
                    {loopNodes.join(' → ')} → …
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Legend */}
      <section className="mt-auto">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          凡例
        </h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>
            <span className="text-green-600 font-bold">+</span> 同方向（強化）
          </li>
          <li>
            <span className="text-red-600 font-bold">−</span> 逆方向（抑制）
          </li>
          <li>
            <span className="text-orange-600 font-bold">R</span> 強化ループ
          </li>
          <li>
            <span className="text-blue-600 font-bold">B</span> 均衡ループ
          </li>
          <li className="pt-1 text-gray-400">ノードをダブルクリックで編集</li>
          <li className="text-gray-400">極性ラベルをクリックで切り替え</li>
          <li className="text-gray-400">Deleteキーで選択要素を削除</li>
        </ul>
      </section>
    </aside>
  )
}
