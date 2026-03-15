import { memo, useRef } from 'react'
import { EdgeLabelRenderer, useReactFlow, type EdgeProps } from '@xyflow/react'
import { useDiagramStore, type CLDEdge as CLDEdgeType } from '../store/diagramStore'

const DRAG_THRESHOLD = 4

/** Ellipse boundary intersection: returns distance from center to boundary along direction (nx, ny) */
function ellipseRadius(nx: number, ny: number, w: number, h: number): number {
  const a = w / 2
  const b = h / 2
  return 1 / Math.sqrt((nx / a) ** 2 + (ny / b) ** 2)
}

function CLDEdge({
  id,
  source,
  target,
  data,
  selected,
}: EdgeProps<CLDEdgeType>) {
  const { nodes, toggleEdgePolarity, setSelectedEdge, updateEdgeControlPoint } = useDiagramStore()
  const { getZoom } = useReactFlow()

  const polarity = data?.polarity ?? '+'
  const isPositive = polarity === '+'
  const strokeColor = isPositive ? '#16a34a' : '#dc2626'

  const sourceNode = nodes.find((n) => n.id === source)
  const targetNode = nodes.find((n) => n.id === target)

  // Node centers in flow coordinates
  const srcCx = (sourceNode?.position.x ?? 0) + (sourceNode?.measured?.width ?? 80) / 2
  const srcCy = (sourceNode?.position.y ?? 0) + (sourceNode?.measured?.height ?? 36) / 2
  const tgtCx = (targetNode?.position.x ?? 0) + (targetNode?.measured?.width ?? 80) / 2
  const tgtCy = (targetNode?.position.y ?? 0) + (targetNode?.measured?.height ?? 36) / 2

  const dx = tgtCx - srcCx
  const dy = tgtCy - srcCy
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Self-loop or unmeasured: skip
  if (dist < 1 || !sourceNode?.measured || !targetNode?.measured) return null

  const nx = dx / dist
  const ny = dy / dist

  // Edge starts/ends at node boundary (ellipse approximation for pill shape)
  const srcR = ellipseRadius(nx, ny, sourceNode.measured.width ?? 80, sourceNode.measured.height ?? 36)
  const tgtR = ellipseRadius(nx, ny, targetNode.measured.width ?? 80, targetNode.measured.height ?? 36)

  if (srcR + tgtR >= dist) return null // nodes overlap

  const sx = srcCx + nx * srcR
  const sy = srcCy + ny * srcR
  const tx = tgtCx - nx * tgtR
  const ty = tgtCy - ny * tgtR

  // Control point: through-point at t=0.5 on the quadratic bezier
  const defaultCpX = (sx + tx) / 2
  const defaultCpY = (sy + ty) / 2
  const cx = data?.controlPoint?.x ?? defaultCpX
  const cy = data?.controlPoint?.y ?? defaultCpY

  // SVG quadratic bezier Q control point such that curve passes through (cx,cy) at t=0.5
  const qcpX = 2 * cx - 0.5 * (sx + tx)
  const qcpY = 2 * cy - 0.5 * (sy + ty)

  const edgePath = `M ${sx} ${sy} Q ${qcpX} ${qcpY} ${tx} ${ty}`

  // Polarity badge: at (cx, cy) — the through-point the user controls
  const labelX = cx
  const labelY = cy

  // Drag state
  const dragRef = useRef<{
    startX: number
    startY: number
    cpX: number
    cpY: number
    moved: boolean
  } | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      cpX: cx,
      cpY: cy,
      moved: false,
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const ddx = e.clientX - dragRef.current.startX
    const ddy = e.clientY - dragRef.current.startY
    if (!dragRef.current.moved && Math.sqrt(ddx * ddx + ddy * ddy) > DRAG_THRESHOLD) {
      dragRef.current.moved = true
    }
    if (dragRef.current.moved) {
      const zoom = getZoom()
      updateEdgeControlPoint(id, {
        x: dragRef.current.cpX + ddx / zoom,
        y: dragRef.current.cpY + ddy / zoom,
      })
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation()
    if (dragRef.current && !dragRef.current.moved) {
      setSelectedEdge(id)
      toggleEdgePolarity(id)
    }
    dragRef.current = null
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateEdgeControlPoint(id, null)
  }

  return (
    <>
      {/* Wide invisible hit area */}
      <path
        d={edgePath}
        strokeWidth={20}
        stroke="transparent"
        fill="none"
        onClick={() => setSelectedEdge(id)}
        style={{ cursor: 'pointer' }}
      />
      {/* Visible edge */}
      <path
        id={id}
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={selected ? 3 : 2}
        fill="none"
        markerEnd={`url(#arrow-${isPositive ? 'positive' : 'negative'})`}
        className="react-flow__edge-path"
        style={{ pointerEvents: 'none' }}
      />

      <EdgeLabelRenderer>
        {/* Polarity badge — click to toggle, drag to bend edge, double-click to reset */}
        <button
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            cursor: dragRef.current?.moved ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          className={[
            'w-6 h-6 rounded-full border-2 text-xs font-bold flex items-center justify-center shadow-sm select-none',
            isPositive
              ? 'bg-green-100 border-green-600 text-green-700'
              : 'bg-red-100 border-red-600 text-red-700',
            selected ? 'ring-2 ring-blue-400 ring-offset-1' : '',
          ].join(' ')}
          title="クリック:極性切替 / ドラッグ:曲率変更 / ダブルクリック:リセット"
        >
          {polarity}
        </button>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(CLDEdge)
