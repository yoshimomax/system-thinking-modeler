import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'
import { useDiagramStore, type CLDEdge as CLDEdgeType } from '../store/diagramStore'

function CLDEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<CLDEdgeType>) {
  const { toggleEdgePolarity, setSelectedEdge } = useDiagramStore()
  const polarity = data?.polarity ?? '+'
  const isPositive = polarity === '+'

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const strokeColor = isPositive ? '#16a34a' : '#dc2626'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 3 : 2,
        }}
        markerEnd={`url(#arrow-${isPositive ? 'positive' : 'negative'})`}
      />
      <EdgeLabelRenderer>
        <button
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedEdge(id)
            toggleEdgePolarity(id)
          }}
          className={[
            'w-6 h-6 rounded-full border-2 text-xs font-bold flex items-center justify-center cursor-pointer shadow-sm',
            isPositive
              ? 'bg-green-100 border-green-600 text-green-700 hover:bg-green-200'
              : 'bg-red-100 border-red-600 text-red-700 hover:bg-red-200',
          ].join(' ')}
          title="クリックで極性を切り替え"
        >
          {polarity}
        </button>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(CLDEdge)
