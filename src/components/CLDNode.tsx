import { memo, useState, useEffect, useRef } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useDiagramStore, type CLDNode as CLDNodeType } from '../store/diagramStore'

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

  const isLoopHighlighted = useDiagramStore((state) => {
    if (!state.selectedLoopId) return false
    const loop = state.loops.find((l) => l.id === state.selectedLoopId)
    return loop ? loop.nodeIds.includes(id) : false
  })

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastTapRef = useRef<number>(0)

  useEffect(() => {
    setDraft(data.label)
  }, [data.label])

  // Auto-enter edit mode when this node was just created
  useEffect(() => {
    if (pendingEditNodeId === id) {
      clearPendingEdit()
      setEditing(true)
    }
  }, [pendingEditNodeId, id, clearPendingEdit])

  useEffect(() => {
    if (editing) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [editing])

  const handleTouchEnd = (e: React.TouchEvent) => {
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

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      onTouchEnd={handleTouchEnd}
      onClick={() => setSelectedNode(id)}
      className={[
        'px-4 py-2 rounded-full border-2 bg-white shadow-sm cursor-pointer select-none min-w-[80px] text-center',
        isLoopHighlighted
          ? 'border-gray-700 ring-[3px] ring-gray-500 ring-offset-0 shadow-md'
          : selected
            ? 'border-blue-500 shadow-blue-200 shadow-md'
            : 'border-gray-500 hover:border-gray-700',
      ].join(' ')}
    >
      {/* Full-width transparent handle along top edge */}
      <Handle
        type="source" position={Position.Top} id="top"
        style={{ ...edgeHandleBase, width: '100%', height: '14px', top: '-7px', left: 0 }}
      />
      {/* Full-height transparent handle along right edge */}
      <Handle
        type="source" position={Position.Right} id="right"
        style={{ ...edgeHandleBase, width: '14px', height: '100%', right: '-7px', top: 0 }}
      />
      {/* Full-width transparent handle along bottom edge */}
      <Handle
        type="source" position={Position.Bottom} id="bottom"
        style={{ ...edgeHandleBase, width: '100%', height: '14px', bottom: '-7px', left: 0 }}
      />
      {/* Full-height transparent handle along left edge */}
      <Handle
        type="source" position={Position.Left} id="left"
        style={{ ...edgeHandleBase, width: '14px', height: '100%', left: '-7px', top: 0 }}
      />

      {/*
        Sizing layer: always rendered to hold the node's width.
        The span mirrors `draft` so the node grows as the user types.
        Hidden (invisible) while editing so only the input is visible.
      */}
      <div className="relative inline-flex items-center justify-center">
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
              if (e.key === 'Escape') {
                setDraft(data.label)
                setEditing(false)
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="text-sm font-medium text-gray-800 text-center bg-transparent outline-none absolute inset-0 w-full"
          />
        )}
      </div>
    </div>
  )
}

export default memo(CLDNode)
