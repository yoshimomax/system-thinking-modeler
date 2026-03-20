import { useDiagramStore } from '../store/diagramStore'
import { useSimulationStore } from '../store/simulationStore'
import { useSimulationAutoPlay } from '../hooks/useSimulationAutoPlay'

const SPEED_OPTIONS = [
  { label: '遅い', value: 2500 },
  { label: '普通', value: 1500 },
  { label: '速い', value: 700 },
]

export default function SimulationPanel() {
  useSimulationAutoPlay()

  const { nodes, edges } = useDiagramStore()
  const {
    initialPerturbations,
    steps,
    currentStep,
    isPlaying,
    animSpeed,
    clearAllPerturbations,
    startSimulation,
    stepForward,
    stepBackward,
    resetSteps,
    play,
    pause,
    setAnimSpeed,
  } = useSimulationStore()

  const isSetupPhase = steps.length === 0
  const hasPerturbations = Object.keys(initialPerturbations).length > 0
  const isAtEnd = !isSetupPhase && currentStep === steps.length - 1
  const currentStepInfo = !isSetupPhase ? steps[currentStep] : null

  return (
    <div className="flex flex-col gap-3">
      {isSetupPhase ? (
        <>
          <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2 leading-relaxed">
            ノードをクリックして初期変化を設定します。<br />
            クリックごとに <span className="text-green-600 font-bold">↑</span>（増加）→
            <span className="text-red-600 font-bold"> ↓</span>（減少）→ 未設定 と切り替わります。
          </div>

          {hasPerturbations && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-gray-500 font-medium">設定済み：</p>
              {Object.entries(initialPerturbations).map(([nodeId, dir]) => {
                const label = nodes.find((n) => n.id === nodeId)?.data.label ?? nodeId
                return (
                  <div key={nodeId} className="flex items-center justify-between text-xs bg-white border border-gray-200 rounded px-2 py-1">
                    <span className="text-gray-700 truncate">{label}</span>
                    <span className={dir === 'up' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                      {dir === 'up' ? '↑ 増加' : '↓ 減少'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => startSimulation(nodes, edges)}
              disabled={!hasPerturbations}
              className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ▶ 実行
            </button>
            {hasPerturbations && (
              <button
                onClick={clearAllPerturbations}
                className="px-2 py-1.5 text-gray-500 hover:text-gray-700 text-xs border border-gray-300 rounded hover:bg-gray-100"
              >
                クリア
              </button>
            )}
          </div>

          {nodes.length === 0 && (
            <p className="text-xs text-gray-400 text-center">先にノードを追加してください</p>
          )}
        </>
      ) : (
        <>
          {/* Play/Pause + speed controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={isPlaying ? pause : play}
              disabled={isAtEnd && !isPlaying}
              className={[
                'flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : isAtEnd
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white',
              ].join(' ')}
            >
              {isPlaying ? '⏸ 一時停止' : isAtEnd ? '完了' : '▶ 再生'}
            </button>

            <select
              value={animSpeed}
              onChange={(e) => setAnimSpeed(Number(e.target.value))}
              className="text-xs border border-gray-300 rounded px-1 py-1.5 bg-white text-gray-600"
            >
              {SPEED_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Step navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={stepBackward}
              disabled={currentStep === 0}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ◀
            </button>
            <span className="flex-1 text-center text-sm font-medium text-gray-700">
              {currentStep === 0 ? '初期状態' : `Step ${currentStep} / ${steps.length - 1}`}
            </span>
            <button
              onClick={stepForward}
              disabled={isAtEnd}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ▶
            </button>
          </div>

          {/* Step info */}
          {currentStep === 0 ? (
            <div className="text-xs text-gray-500 text-center bg-gray-50 rounded p-2">
              ▶ 再生 または ▶ を押して伝播を開始
            </div>
          ) : currentStepInfo && currentStepInfo.newNodeIds.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-gray-500 font-medium">このステップの変化：</p>
              {currentStepInfo.newNodeIds.map((nodeId) => {
                const label = nodes.find((n) => n.id === nodeId)?.data.label ?? nodeId
                const state = currentStepInfo.states[nodeId]
                const stateEl =
                  state === 'up' ? <span className="text-green-600 font-bold">↑ 増加</span>
                  : state === 'down' ? <span className="text-red-600 font-bold">↓ 減少</span>
                  : <span className="text-amber-600 font-bold">? 競合</span>
                return (
                  <div key={nodeId} className="flex items-center justify-between text-xs bg-white border border-gray-200 rounded px-2 py-1">
                    <span className="text-gray-700 truncate">{label}</span>
                    {stateEl}
                  </div>
                )
              })}
            </div>
          ) : null}

          {isAtEnd && (
            <p className="text-xs text-center text-gray-400 bg-gray-50 rounded p-1">
              伝播完了 — これ以上の変化なし
            </p>
          )}

          <button
            onClick={resetSteps}
            className="w-full px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
          >
            ⟳ 初期設定に戻る
          </button>
        </>
      )}
    </div>
  )
}
