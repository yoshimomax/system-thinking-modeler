import { memo, useState, useEffect, useRef } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import { useDiagramStore, type CLDNode as CLDNodeType } from '../store/diagramStore'
import { useSimulationStore } from '../store/simulationStore'

// Transparent handle covering the full length of each node edge.
// No visible indicator — the crosshair cursor signals "drag here to connect".
const edgeHandleBase: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  cursor: 'crosshair',
  opacity: 0,
  position: 'absolute',
  // Override ReactFlow's default translateX/Y centering
  transform: 'none',
}

function CLDNode({ id, data, selected }: NodeProps<CLDNodeType>) {
  const { updateNodeLabel, setSelectedNode, pendingEditNodeId, clearPendingEdit } = useDiagramStore()
  const { updateNode } = useReactFlow()
  const edges = useDiagramStore((s) => s.edges)

  const isLoopHighlighted = useDiagramStore((state) => {
    if (!state.selectedLoopId) return false
    const loop = state.loops.find((l) => l.id === state.selectedLoopId)
    return loop ? loop.nodeIds.includes(id) : false
  })

  const simMode = useSimulationStore((s) => s.mode)
  // Continuous node value: null in edit mode, number in sim mode
  const nodeValue = useSimulationStore((s) =>
    s.mode === 'edit' ? null : (s.nodeValues[id] ?? 0)
  )
  const { injectSignal } = useSimulationStore.getState()

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastTapRef = useRef<number>(0)
  const pendingCaretPos = useRef<number | null>(null)

  useEffect(() => { setDraft(data.label) }, [data.label])

  useEffect(() => {
    updateNode(id, { draggable: !editing })
  }, [editing, id, updateNode])

  useEffect(() => {
    if (pendingEditNodeId === id) {
      clearPendingEdit()
      pendingCaretPos.current = null
      setEditing(true)
    }
  }, [pendingEditNodeId, id, clearPendingEdit])

  useEffect(() => {
    if (!editing) return
    setTimeout(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      const pos = pendingCaretPos.current
      if (pos === null) {
        input.select()
      } else {
        const safePos = Math.min(pos, input.value.length)
        input.setSelectionRange(safePos, safePos)
        pendingCaretPos.current = null
      }
    }, 50)
  }, [editing])

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (simMode === 'simulation') return
    const now = Date.now()
    const delta = now - lastTapRef.current
    if (delta < 300 && delta > 0) {
      e.preventDefault()
      setEditing(true)
    }
    lastTapRef.current = now
  }

  const commitEdit = () => {
    const trimmed = draft.trim()
    if (trimmed) updateNodeLabel(id, trimmed)
    else setDraft(data.label)
    setEditing(false)
  }

  // ---- fill level derived from continuous nodeValue ----
  // Positive = green fill, negative = red fill, magnitude = fill height %
  const fillPct = nodeValue !== null ? Math.min(100, Math.abs(nodeValue) * 100) : 0
  const fillColor =
    nodeValue !== null && nodeValue > 0.02 ? 'rgba(34,197,94,0.38)'
    : nodeValue !== null && nodeValue < -0.02 ? 'rgba(239,68,68,0.38)'
    : 'transparent'

  // Border color reflects sign
  const simBorderClass =
    nodeValue === null || Math.abs(nodeValue) < 0.05 ? ''
    : nodeValue > 0 ? 'border-green-500'
    : 'border-red-500'

  return (
    // Outer wrapper: no overflow-hidden so handles extend outside; pulse stays here
    <div style={{ position: 'relative', display: 'inline-block' }}>

      {/* ── Handles (outside overflow clipping) ── */}
      <Handle type="source" position={Position.Top} id="top"
        style={{ ...edgeHandleBase, width: '100%', height: '14px', top: '-7px', left: 0 }} />
      <Handle type="source" position={Position.Right} id="right"
        style={{ ...edgeHandleBase, width: '14px', height: '100%', right: '-7px', top: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom"
        style={{ ...edgeHandleBase, width: '100%', height: '14px', bottom: '-7px', left: 0 }} />
      <Handle type="source" position={Position.Left} id="left"
        style={{ ...edgeHandleBase, width: '14px', height: '100%', left: '-7px', top: 0 }} />

      {/* ── Pill (overflow-hidden to clip the fill) ── */}
      <div
        onDoubleClick={(e) => {
          if (simMode === 'simulation') return
          e.stopPropagation()
          let caretPos: number | null = null
          if (document.caretRangeFromPoint) {
            const range = document.caretRangeFromPoint(e.clientX, e.clientY)
            if (range?.startContainer.nodeType === Node.TEXT_NODE) caretPos = range.startOffset
          } else if ('caretPositionFromPoint' in document) {
            const pos = (document as Document & {
              caretPositionFromPoint: (x: number, y: number) => { offset: number } | null
            }).caretPositionFromPoint(e.clientX, e.clientY)
            if (pos) caretPos = pos.offset
          }
          pendingCaretPos.current = caretPos ?? draft.length
          setEditing(true)
        }}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (simMode === 'edit') setSelectedNode(id) }}
        className={[
          'px-4 py-2 rounded-full border-2 shadow-sm cursor-pointer select-none min-w-[80px] text-center',
          'overflow-hidden relative transition-colors duration-200',
          simMode === 'simulation' ? 'bg-white' : 'bg-white',
          simBorderClass ||
            (selected && simMode === 'edit' ? 'border-blue-500 shadow-blue-200 shadow-md'
            : isLoopHighlighted ? 'border-gray-700 shadow-md'
            : 'border-gray-500 hover:border-gray-700'),
          isLoopHighlighted ? 'ring-[3px] ring-gray-500 ring-offset-0' : '',
        ].join(' ')}
      >
        {/* ── Fill level (liquid) ── */}
        {simMode === 'simulation' && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${fillPct}%`,
              background: fillColor,
              transition: 'height 0.12s ease-out, background 0.2s ease-out',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* ── Label ── */}
        <div className="relative inline-flex items-center justify-center" style={{ zIndex: 1 }}>
          <span
            className={[
              'text-sm font-medium whitespace-nowrap',
              isLoopHighlighted ? 'font-bold text-gray-900' : 'text-gray-800',
              editing ? 'invisible' : '',
            ].join(' ')}
          >
            {editing ? (draft || '\u00A0') : data.label}
          </span>

          {editing && (
            <input
              ref={inputRef}
              value={draft}
              inputMode="text"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') { setDraft(data.label); setEditing(false) }
              }}
              className="text-sm font-medium text-gray-800 text-center bg-transparent outline-none absolute inset-0 w-full"
            />
          )}
        </div>
      </div>

      {/* ── ↑ / ↓ inject buttons (sim mode only) ── */}
      {simMode === 'simulation' && !editing && (
        <div
          className="nopan"
          style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            marginLeft: '5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            zIndex: 20,
          }}
        >
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); injectSignal(id, 'up', edges) }}
            title="増加を注入"
            style={{
              width: '20px', height: '20px',
              borderRadius: '50%',
              background: '#16a34a',
              color: 'white',
              border: '2px solid white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              padding: 0,
            }}
          >↑</button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); injectSignal(id, 'down', edges) }}
            title="減少を注入"
            style={{
              width: '20px', height: '20px',
              borderRadius: '50%',
              background: '#dc2626',
              color: 'white',
              border: '2px solid white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              padding: 0,
            }}
          >↓</button>
        </div>
      )}
    </div>
  )
}

export default memo(CLDNode)
