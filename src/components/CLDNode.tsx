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
  const { updateNodeLabel, setSelectedNode } = useDiagramStore()

  const isLoopHighlighted = useDiagramStore((state) => {
    if (!state.selectedLoopId) return false
    const loop = state.loops.find((l) => l.id === state.selectedLoopId)
    return loop ? loop.nodeIds.includes(id) : false
  })

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(data.label)
  }, [data.label])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commitEdit = () => {
    const trimmed = draft.trim()
    if (trimmed) updateNodeLabel(id, trimmed)
    else setDraft(data.label)
    setEditing(false)
  }

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      onClick={() => setSelectedNode(id)}
      className={[
        'px-4 py-2 rounded-full border-2 bg-white shadow-sm cursor-pointer select-none min-w-[80px] text-center',
        isLoopHighlighted
          ? 'border-amber-400 shadow-amber-200 shadow-md'
          : selected
            ? 'border-blue-500 shadow-blue-200 shadow-md'
            : 'border-gray-400 hover:border-gray-600',
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

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') {
              setDraft(data.label)
              setEditing(false)
            }
          }}
          className="text-sm font-medium text-gray-800 text-center bg-transparent outline-none w-full"
          style={{ minWidth: '60px', maxWidth: '160px' }}
        />
      ) : (
        <span className="text-sm font-medium text-gray-800 whitespace-nowrap">
          {data.label}
        </span>
      )}
    </div>
  )
}

export default memo(CLDNode)
