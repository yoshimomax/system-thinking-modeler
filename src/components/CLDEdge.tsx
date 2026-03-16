import { memo, useRef } from 'react'
import { EdgeLabelRenderer, useReactFlow, type EdgeProps } from '@xyflow/react'
import { useDiagramStore, type CLDEdge as CLDEdgeType } from '../store/diagramStore'

const DRAG_THRESHOLD = 4

/** Ellipse boundary distance from center along direction (nx, ny) */
function ellipseRadius(nx: number, ny: number, w: number, h: number): number {
  const a = Math.max(1, w / 2)
  const b = Math.max(1, h / 2)
  return 1 / Math.sqrt((nx / a) ** 2 + (ny / b) ** 2)
}

/** Point on quadratic bezier at parameter t */
function bezierPoint(
  t: number,
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
) {
  const mt = 1 - t
  return {
    x: mt * mt * p0x + 2 * mt * t * p1x + t * t * p2x,
    y: mt * mt * p0y + 2 * mt * t * p1y + t * t * p2y,
  }
}

/** Unit tangent of quadratic bezier at parameter t */
function bezierTangent(
  t: number,
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
) {
  const dx = 2 * (1 - t) * (p1x - p0x) + 2 * t * (p2x - p1x)
  const dy = 2 * (1 - t) * (p1y - p0y) + 2 * t * (p2y - p1y)
  const d = Math.sqrt(dx * dx + dy * dy)
  return { x: d > 0 ? dx / d : 1, y: d > 0 ? dy / d : 0 }
}

/**
 * Binary search for t where the bezier first enters the target ellipse.
 * Assumes t=0 is outside and t=1 (target center) is inside.
 */
function findEllipseEntryT(
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  cx: number, cy: number,
  a: number, b: number,  // must be > 0
): number {
  // Verify t=0 is outside and t=1 is inside; if not, return a safe fallback
  const p0 = bezierPoint(0, p0x, p0y, p1x, p1y, p2x, p2y)
  const insideAtZero = ((p0.x - cx) / a) ** 2 + ((p0.y - cy) / b) ** 2 < 1
  if (insideAtZero) return 0 // degenerate: source center is inside target

  let tLo = 0, tHi = 1
  for (let i = 0; i < 24; i++) {
    const tMid = (tLo + tHi) / 2
    const p = bezierPoint(tMid, p0x, p0y, p1x, p1y, p2x, p2y)
    const inside = ((p.x - cx) / a) ** 2 + ((p.y - cy) / b) ** 2 < 1
    if (inside) tHi = tMid
    else tLo = tMid
  }
  return (tLo + tHi) / 2
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

  const isLoopHighlighted = useDiagramStore((state) => {
    if (!state.selectedLoopId) return false
    const loop = state.loops.find((l) => l.id === state.selectedLoopId)
    if (!loop) return false
    for (let i = 0; i < loop.nodeIds.length - 1; i++) {
      if (loop.nodeIds[i] === source && loop.nodeIds[i + 1] === target) return true
    }
    return false
  })

  const polarity = data?.polarity ?? '+'
  const isPositive = polarity === '+'
  const baseColor = isPositive ? '#16a34a' : '#dc2626'
  const strokeColor = baseColor  // color unchanged on highlight; thickness carries the emphasis

  // Drag state — must be declared before any early return
  const dragRef = useRef<{
    startX: number
    startY: number
    cpX: number
    cpY: number
    moved: boolean
  } | null>(null)

  const sourceNode = nodes.find((n) => n.id === source)
  const targetNode = nodes.find((n) => n.id === target)

  // Node centers
  const srcCx = (sourceNode?.position.x ?? 0) + (sourceNode?.measured?.width ?? 80) / 2
  const srcCy = (sourceNode?.position.y ?? 0) + (sourceNode?.measured?.height ?? 36) / 2
  const tgtCx = (targetNode?.position.x ?? 0) + (targetNode?.measured?.width ?? 80) / 2
  const tgtCy = (targetNode?.position.y ?? 0) + (targetNode?.measured?.height ?? 36) / 2

  const dx = tgtCx - srcCx
  const dy = tgtCy - srcCy
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Guard: nodes unmeasured, same position, or not found
  if (
    dist < 1 ||
    !sourceNode?.measured?.width ||
    !sourceNode?.measured?.height ||
    !targetNode?.measured?.width ||
    !targetNode?.measured?.height
  ) return null

  const nx = dx / dist
  const ny = dy / dist

  // Overlap check
  const srcR = ellipseRadius(nx, ny, sourceNode.measured.width, sourceNode.measured.height)
  const tgtR = ellipseRadius(nx, ny, targetNode.measured.width, targetNode.measured.height)
  if (srcR + tgtR >= dist) return null

  // Control point stored as offset from midpoint — so it follows node movement
  const defaultCpX = (srcCx + tgtCx) / 2
  const defaultCpY = (srcCy + tgtCy) / 2
  const cx = defaultCpX + (data?.controlPoint?.x ?? 0)
  const cy = defaultCpY + (data?.controlPoint?.y ?? 0)

  // Bezier control point (passes through cx,cy at t=0.5)
  const qcpX = 2 * cx - 0.5 * (srcCx + tgtCx)
  const qcpY = 2 * cy - 0.5 * (srcCy + tgtCy)

  // Path: source center → target center
  const edgePath = `M ${srcCx} ${srcCy} Q ${qcpX} ${qcpY} ${tgtCx} ${tgtCy}`

  // Arrowhead: exact bezier–ellipse intersection
  const tgtA = Math.max(1, targetNode.measured.width / 2)
  const tgtB = Math.max(1, targetNode.measured.height / 2)
  const arrowT = findEllipseEntryT(srcCx, srcCy, qcpX, qcpY, tgtCx, tgtCy, tgtCx, tgtCy, tgtA, tgtB)
  const arrowPos = bezierPoint(arrowT, srcCx, srcCy, qcpX, qcpY, tgtCx, tgtCy)
  const arrowDir = bezierTangent(arrowT, srcCx, srcCy, qcpX, qcpY, tgtCx, tgtCy)

  // Guard: reject any NaN/Infinity that slipped through
  if (
    !Number.isFinite(arrowPos.x) || !Number.isFinite(arrowPos.y) ||
    !Number.isFinite(arrowDir.x) || !Number.isFinite(arrowDir.y) ||
    !Number.isFinite(qcpX)       || !Number.isFinite(qcpY)
  ) return null

  const arrowLen = 11
  const arrowHW = 5
  const arrowPoints = [
    `${arrowPos.x},${arrowPos.y}`,
    `${arrowPos.x - arrowDir.x * arrowLen + arrowDir.y * arrowHW},${arrowPos.y - arrowDir.y * arrowLen - arrowDir.x * arrowHW}`,
    `${arrowPos.x - arrowDir.x * arrowLen - arrowDir.y * arrowHW},${arrowPos.y - arrowDir.y * arrowLen + arrowDir.x * arrowHW}`,
  ].join(' ')

  const labelX = cx
  const labelY = cy

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      cpX: data?.controlPoint?.x ?? 0,
      cpY: data?.controlPoint?.y ?? 0,
      moved: false,
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    e.stopPropagation()
    e.preventDefault()
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
      {/* Visible edge line */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        className="react-flow__edge-path"
        style={{
          pointerEvents: 'none',
          stroke: strokeColor,
          strokeWidth: isLoopHighlighted ? 3.5 : selected ? 3 : 2.5,
        }}
      />
      {/* Arrowhead at exact bezier–ellipse intersection */}
      <polygon
        points={arrowPoints}
        fill={strokeColor}
        style={{ pointerEvents: 'none' }}
      />

      <EdgeLabelRenderer>
        {/* Polarity badge — nopan: ReactFlow skips pan logic on this element */}
        <button
          className={[
            'nopan',
            'w-6 h-6 rounded-full border-2 text-xs font-bold flex items-center justify-center shadow-sm select-none',
            isPositive
              ? 'bg-green-200 border-green-700 text-green-800'
              : 'bg-red-200 border-red-700 text-red-800',
            selected ? 'ring-2 ring-blue-400 ring-offset-1' : '',
          ].join(' ')}
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
          title="タップ:極性切替 / ドラッグ:曲率変更 / ダブルタップ:リセット"
        >
          {polarity}
        </button>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(CLDEdge)
