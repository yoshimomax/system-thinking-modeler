import { memo, useState, useEffect, useRef } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useDiagramStore, type CLDNode as CLDNodeType } from '../store/diagramStore'

function CLDNode({ id, data, selected }: NodeProps<CLDNodeType>) {
  const { updateNodeLabel, setSelectedNode } = useDiagramStore()
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
        selected
          ? 'border-blue-500 shadow-blue-200 shadow-md'
          : 'border-gray-400 hover:border-gray-600',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
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
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  )
}

export default memo(CLDNode)
