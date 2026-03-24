import { useSimulationStore } from '../store/simulationStore'
import { useSimulationAnimation } from '../hooks/useSimulationAnimation'

const SPEED_OPTIONS = [
  { label: '遅い', value: 0.7 },
  { label: '普通', value: 1.4 },
  { label: '速い', value: 2.8 },
]

export default function SimulationPanel() {
  useSimulationAnimation()

  const { signalSpeed, paused, togglePause, resetSimulation, setSignalSpeed } = useSimulationStore()

  return (
    <div className="flex flex-col gap-3">
      {/* Instructions */}
      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2 leading-relaxed">
        各ノード右側の <span className="text-green-600 font-bold">↑</span> /
        <span className="text-red-600 font-bold"> ↓</span> ボタンで初期変化を設定。
        再クリックで解除。ノード上のバッジが定性的な波及結果を示します。
      </div>

      {/* Speed control */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-600 shrink-0">伝播速度</span>
        <div className="flex rounded overflow-hidden border border-gray-300 text-xs font-medium">
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSignalSpeed(opt.value)}
              className={[
                'px-2 py-1 transition-colors',
                signalSpeed === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100',
                opt.value !== SPEED_OPTIONS[0].value ? 'border-l border-gray-300' : '',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pause / Reset */}
      <div className="flex gap-2">
        <button
          onClick={togglePause}
          className={[
            'flex-1 px-3 py-1.5 text-xs font-medium rounded border transition-colors',
            paused
              ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100',
          ].join(' ')}
        >
          {paused ? '▶ 再開' : '⏸ 一時停止'}
        </button>
        <button
          onClick={resetSimulation}
          className="flex-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
        >
          ⟳ リセット
        </button>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-400 space-y-0.5">
        <div className="font-medium text-gray-500 mb-1">定性的波及（ノードバッジ）</div>
        <div><span className="inline-block px-1.5 rounded bg-green-600 text-white text-[10px] mr-1 align-middle font-bold">↑</span>増加方向へ波及</div>
        <div><span className="inline-block px-1.5 rounded bg-red-600 text-white text-[10px] mr-1 align-middle font-bold">↓</span>減少方向へ波及</div>
        <div><span className="inline-block px-1.5 rounded bg-amber-500 text-white text-[10px] mr-1 align-middle font-bold">?</span>複数ループが競合（不定）</div>
        <div className="font-medium text-gray-500 mt-2 mb-1">粒子アニメーション</div>
        <div><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1 align-middle" />緑の波: 増加シグナル</div>
        <div><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1 align-middle" />赤の波: 減少シグナル</div>
        <div>ノードの塗り: 蓄積された変化量</div>
      </div>
    </div>
  )
}
